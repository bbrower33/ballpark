// algorithms.js — core game logic (ES module, no dependencies)
// Expects cities as objects: { name, label, displayLabel, lat, lon, pop, elev, coastKm }
// (elev / coastKm may be null). Build them from cities.json rows with loadCities().

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d) => (d * Math.PI) / 180;

/* ---------- 1. Data loading ---------- */

// rows come from preprocess.py:
// [name, label, lat, lon, pop, elev, coastKm, countryCode, countryName, displayLabel]
export function loadCities(rows) {
  return rows.map(([
    name, label, lat, lon, pop, elev, coastKm,
    countryCode, countryName, displayLabel,
  ]) => ({
    name, label, lat, lon, pop, elev, coastKm, countryCode, countryName,
    displayLabel: displayLabel ?? label,
  }));
}

/* ---------- 2. Distance between two cities (haversine) ---------- */

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* ---------- 3. Scoring (log-ratio, 0-1000) ---------- */
// Each mode has an `offset` (keeps the log defined near 0) and `k`
// (the miss factor at which you score 0, e.g. k=25 means 25x off = 0 points).

export const MODES = {
  distance:  { offset: 0,   k: 25, unit: "km" },
  coast:     { offset: 10,  k: 25, unit: "km" },
  elevation: { offset: 100, k: 20, unit: "m"  },
};

const UNIT_FACTORS = {
  metric: { distance: 1, coast: 1, elevation: 1 },
  imperial: { distance: 0.6213711922, coast: 0.6213711922, elevation: 3.280839895 },
};

const UNIT_LABELS = {
  metric: { distance: "km", coast: "km", elevation: "m" },
  imperial: { distance: "mi", coast: "mi", elevation: "ft" },
};

export function unitLabel(mode, system = "metric") {
  return UNIT_LABELS[system]?.[mode] ?? MODES[mode].unit;
}

export function toDisplayUnit(value, mode, system = "metric") {
  return value * (UNIT_FACTORS[system]?.[mode] ?? 1);
}

export function toCanonicalUnit(value, mode, system = "metric") {
  return value / (UNIT_FACTORS[system]?.[mode] ?? 1);
}

export function parseGuessInput(rawValue, mode) {
  const text = String(rawValue ?? "").trim();
  if (!text) return { value: null, error: "Enter an estimate before locking it in." };

  const numberPattern = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  if (!numberPattern.test(text)) {
    return { value: null, error: "Enter a number using digits and an optional decimal point." };
  }
  const value = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(value)) {
    return { value: null, error: "Enter a number using digits and an optional decimal point." };
  }
  if ((mode === "distance" || mode === "coast") && value < 0) {
    return { value: null, error: "Distance estimates cannot be negative." };
  }
  if (Math.abs(value) > 1e12) {
    return { value: null, error: "That estimate is too large. Try a value below one trillion." };
  }
  return { value, error: null };
}

export function score(guess, actual, mode) {
  const { offset, k } = MODES[mode];
  const g = Math.max(guess + offset, 1);
  const a = Math.max(actual + offset, 1);
  const logErr = Math.abs(Math.log(g / a));
  return Math.round(1000 * Math.max(0, 1 - logErr / Math.log(k)));
}

export function percentError(guess, actual) {
  return actual === 0 ? null : ((guess - actual) / actual) * 100;
}

export function withinFactor(guess, actual, mode, factor = 2) {
  const { offset } = MODES[mode];
  const g = Math.max(guess + offset, 1);
  const a = Math.max(actual + offset, 1);
  return Math.max(g / a, a / g) <= factor;
}

/* ---------- 4. Seeded RNG (same daily puzzle for everyone) ---------- */

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

// mulberry32: tiny, fast, good enough for games
export function makeRng(seedString) {
  let a = hashString(seedString)();
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);
export const dailyRng = (date = todayUTC()) => makeRng("game-" + date);

/* ---------- 5. Picking rounds ---------- */

// Weighted pick; sqrt(pop) favors big (recognizable) cities without
// making every round Tokyo vs. Delhi.
function pickWeighted(rng, list) {
  const weights = list.map((c) => Math.sqrt(c.pop));
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// Distance round: choose a target distance log-uniformly, then find a pair
// near it. Without this, random pairs cluster around 5,000-10,000 km.
export function makeDistanceRound(cities, rng, minKm = 100, maxKm = 15000, tol = 0.15) {
  for (let tries = 0; tries < 300; tries++) {
    const target = Math.exp(Math.log(minKm) + rng() * (Math.log(maxKm) - Math.log(minKm)));
    const a = pickWeighted(rng, cities);
    const candidates = cities.filter((b) => {
      if (b === a) return false;
      const d = haversineKm(a.lat, a.lon, b.lat, b.lon);
      return d >= target * (1 - tol) && d <= target * (1 + tol);
    });
    if (candidates.length === 0) continue;
    const b = candidates[Math.floor(rng() * candidates.length)];
    return {
      mode: "distance",
      a, b,
      prompt: `How far is ${a.displayLabel} from ${b.displayLabel}?`,
      answer: haversineKm(a.lat, a.lon, b.lat, b.lon),
    };
  }
  throw new Error("Could not find a distance pair");
}

// Stratified single-city round: pick a value bucket first, then a city in it.
// Needed because most cities sit near sea level / near the coast.
function makeStratifiedRound(cities, rng, mode, valueOf, edges, prompt) {
  const usable = cities.filter((c) => valueOf(c) != null);
  const buckets = edges.slice(0, -1).map((lo, i) =>
    usable.filter((c) => valueOf(c) >= lo && valueOf(c) < edges[i + 1])
  ).filter((b) => b.length > 0);
  const bucket = buckets[Math.floor(rng() * buckets.length)];
  const city = pickWeighted(rng, bucket);
  return { mode, city, prompt: prompt(city), answer: valueOf(city) };
}

export const makeElevationRound = (cities, rng) =>
  makeStratifiedRound(
    cities, rng, "elevation",
    (c) => (c.elev != null && c.elev > -90 ? c.elev : null), // keep log scoring sane
    [-90, 50, 300, 1000, 9000],
    (c) => `What is the elevation of ${c.displayLabel}?`
  );

export const makeCoastRound = (cities, rng) =>
  makeStratifiedRound(
    cities, rng, "coast", (c) => c.coastKm,
    [0, 20, 200, 1000, 5000],
    (c) => `How far is ${c.displayLabel} from the nearest ocean coast?`
  );

function cityByLabel(cities, label) {
  const city = cities.find((candidate) => candidate.label === label);
  if (!city) throw new Error(`Scheduled city not found: ${label}`);
  return city;
}

// Scheduled rounds use city labels, keeping schedule.json compact and editable.
export function makeScheduledGame(cities, specs) {
  if (!Array.isArray(specs) || specs.length !== 5) {
    throw new Error("A scheduled day must contain exactly five rounds");
  }
  return specs.map((spec) => {
    if (spec.mode === "distance") {
      const a = cityByLabel(cities, spec.a);
      const b = cityByLabel(cities, spec.b);
      if (a === b) throw new Error("A distance round needs two different cities");
      return {
        mode: "distance", a, b,
        prompt: `How far is ${a.displayLabel} from ${b.displayLabel}?`,
        answer: haversineKm(a.lat, a.lon, b.lat, b.lon),
      };
    }
    if (spec.mode === "coast") {
      const city = cityByLabel(cities, spec.city);
      if (city.coastKm == null) throw new Error(`No coast distance for ${city.label}`);
      return {
        mode: "coast", city,
        prompt: `How far is ${city.displayLabel} from the nearest ocean coast?`,
        answer: city.coastKm,
      };
    }
    if (spec.mode === "elevation") {
      const city = cityByLabel(cities, spec.city);
      if (city.elev == null || city.elev <= -90) {
        throw new Error(`No usable elevation for ${city.label}`);
      }
      return {
        mode: "elevation", city,
        prompt: `What is the elevation of ${city.displayLabel}?`,
        answer: city.elev,
      };
    }
    throw new Error(`Unknown scheduled mode: ${spec.mode}`);
  });
}

const ROUND_MAKERS = {
  distance: makeDistanceRound,
  coast: makeCoastRound,
  elevation: makeElevationRound,
};

// Default: 5 rounds, mixed. Use only cities >= ~100k pop for recognizability.
export function makeGame(cities, rng, plan = ["distance", "coast", "distance", "elevation", "distance"]) {
  return plan.map((mode) => ROUND_MAKERS[mode](cities, rng));
}

/* ---------- 6. Share string ---------- */

export function shareText(scores, date = todayUTC(), title = "Game") {
  const sq = (s) => (s >= 800 ? "🟩" : s >= 500 ? "🟨" : s >= 250 ? "🟧" : "🟥");
  const total = scores.reduce((a, b) => a + b, 0);
  return `${title} ${date}\n${scores.map(sq).join("")} ${total}/${scores.length * 1000}`;
}
