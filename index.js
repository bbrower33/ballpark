import {
  loadCities, makeGame, dailyRng, makeRng, score, percentError,
  withinFactor, shareText, todayUTC, MODES,
} from "./algorithms.js";

const TITLE = "Ballpark";
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString();

let cities = [];
let rounds = [], scores = [], i = 0, dateLabel = "";

async function init() {
  try {
    const res = await fetch("cities.json");
    if (!res.ok) throw new Error(res.status);
    cities = loadCities(await res.json());
  } catch (e) {
    $("error").hidden = false;
    $("error").textContent =
      "Couldn't load cities.json. Serve this folder over HTTP (e.g. `python -m http.server`) instead of opening the file directly.";
    return;
  }
  startGame(dailyRng(), todayUTC());
}

function startGame(rng, label) {
  const hasCoast = cities.some((c) => c.coastKm != null);
  const plan = hasCoast
    ? ["distance", "coast", "distance", "elevation", "distance"]
    : ["distance", "elevation", "distance", "elevation", "distance"];
  rounds = makeGame(cities, rng, plan);
  scores = []; i = 0; dateLabel = label;
  $("meta").textContent = label === todayUTC() ? `Daily game, ${label}` : "Random game";
  $("end").hidden = true;
  $("game").hidden = false;
  showRound();
}

function showRound() {
  const r = rounds[i];
  $("progress").textContent = `Round ${i + 1} of ${rounds.length}`;
  $("prompt").textContent = r.prompt;
  $("unit").textContent = MODES[r.mode].unit;
  $("result").hidden = true;
  $("guess-form").hidden = false;
  $("guess").value = "";
  $("guess").focus();
}

$("guess-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const guess = parseFloat($("guess").value.replace(/,/g, ""));
  if (Number.isNaN(guess)) return;
  const r = rounds[i];
  const pts = score(guess, r.answer, r.mode);
  scores.push(pts);

  const unit = MODES[r.mode].unit;
  const err = percentError(guess, r.answer);
  const close = withinFactor(guess, r.answer, r.mode, 2);
  $("answer").textContent = `${fmt(r.answer)} ${unit}`;
  $("detail").innerHTML =
    `You said ${fmt(guess)} ${unit}` +
    (err === null ? "" : ` (${err > 0 ? "+" : ""}${Math.round(err)}%)`) +
    `. <b>${pts} points</b>` +
    (close ? ` <span class="good">Within 2x.</span>` : ` <span class="bad">More than 2x off.</span>`);
  $("next").textContent = i === rounds.length - 1 ? "See results" : "Next round";
  $("guess-form").hidden = true;
  $("result").hidden = false;
  $("next").focus();
});

$("next").addEventListener("click", () => {
  if (++i < rounds.length) return showRound();
  const total = scores.reduce((a, b) => a + b, 0);
  $("game").hidden = true;
  $("end").hidden = false;
  $("total").textContent = `${total} / ${rounds.length * 1000}`;
  $("share").textContent = shareText(scores, dateLabel, TITLE);
});

$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("share").textContent);
  $("copy").textContent = "Copied";
});
$("again").addEventListener("click", () => {
  $("copy").textContent = "Copy result";
  startGame(makeRng("random-" + Math.random()), "random");
});

init();