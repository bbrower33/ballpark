import test from "node:test";
import assert from "node:assert/strict";
import {
  loadCities, makeRng, makeScheduledGame, score, shareText,
  toCanonicalUnit, toDisplayUnit, unitLabel, parseGuessInput,
} from "../assets/js/algorithms.js";
import {
  calculateStats, listDayStates, readDayState, storageKey, writeDayState,
} from "../assets/js/game-state.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("seeded RNG is repeatable", () => {
  const a = makeRng("same-day");
  const b = makeRng("same-day");
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("score awards 1000 for an exact guess and 0 at the miss factor", () => {
  assert.equal(score(500, 500, "distance"), 1000);
  assert.equal(score(2500, 100, "distance"), 0);
});

test("imperial display values convert back to identical canonical scoring values", () => {
  const miles = toDisplayUnit(100, "distance", "imperial");
  const canonical = toCanonicalUnit(miles, "distance", "imperial");
  assert.ok(Math.abs(canonical - 100) < 1e-9);
  assert.equal(score(canonical, 100, "distance"), 1000);
  assert.equal(unitLabel("elevation", "imperial"), "ft");
});

test("city rows expose full country display labels while retaining stable labels", () => {
  const [city] = loadCities([
    ["Paris", "Paris, FR", 48.8, 2.3, 1, 35, 170, "FR", "France", "Paris, France"],
  ]);
  assert.equal(city.label, "Paris, FR");
  assert.equal(city.countryName, "France");
  assert.equal(city.displayLabel, "Paris, France");
});

test("guess validation accepts elevation below sea level and rejects invalid distances", () => {
  assert.deepEqual(parseGuessInput("1,234.5", "distance"), { value: 1234.5, error: null });
  assert.equal(parseGuessInput("-12", "elevation").value, -12);
  assert.match(parseGuessInput("-12", "coast").error, /cannot be negative/);
  assert.match(parseGuessInput("", "distance").error, /Enter an estimate/);
  assert.match(parseGuessInput("not a number", "distance").error, /Enter a number/);
  assert.match(parseGuessInput("1,5", "distance").error, /Enter a number/);
});

test("scheduled rounds resolve city labels and calculate answers", () => {
  const cities = [
    { label: "Alpha, AA", displayLabel: "Alpha, A-land", lat: 0, lon: 0, pop: 1, elev: 50, coastKm: 4 },
    { label: "Beta, BB", displayLabel: "Beta, B-land", lat: 0, lon: 1, pop: 1, elev: 100, coastKm: 8 },
  ];
  const rounds = makeScheduledGame(cities, [
    { mode: "distance", a: "Alpha, AA", b: "Beta, BB" },
    { mode: "coast", city: "Alpha, AA" },
    { mode: "distance", a: "Beta, BB", b: "Alpha, AA" },
    { mode: "elevation", city: "Beta, BB" },
    { mode: "coast", city: "Beta, BB" },
  ]);
  assert.equal(rounds.length, 5);
  assert.equal(Math.round(rounds[0].answer), 111);
  assert.equal(rounds[3].answer, 100);
});

test("daily state round-trips and contributes to streak stats", () => {
  const storage = new MemoryStorage();
  writeDayState(storage, "2026-10-12", [{ guess: 10, score: 700 }], true);
  writeDayState(storage, "2026-10-13", [{ guess: 20, score: 900 }], true);
  writeDayState(storage, "2026-10-14", [{ guess: 30, score: 500 }], false);
  assert.equal(readDayState(storage, "2026-10-12").complete, true);
  assert.equal(storageKey("2026-10-12"), "ballpark:day:2026-10-12");
  assert.deepEqual(calculateStats(listDayStates(storage), "2026-10-14"), {
    played: 2, average: 800, streak: 2, bestStreak: 2,
  });
});

test("share text includes squares and total", () => {
  const text = shareText([1000, 750, 400, 0, 900], "2026-10-14", "Ballpark");
  assert.match(text, /3050\/5000/);
  assert.match(text, /Ballpark 2026-10-14/);
});
