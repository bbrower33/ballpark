import {
  loadCities, makeGame, makeScheduledGame, dailyRng, makeRng, score,
  percentError, withinFactor, shareText, todayUTC, MODES,
} from "./algorithms.js";
import {
  readDayState, writeDayState, listDayStates, calculateStats, shiftUTCDate,
} from "./game-state.js";

const TITLE = "Ballpark";
const ARCHIVE_START = "2026-01-01";
const ARCHIVE_DAYS_SHOWN = 14;
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString();

let cities = [];
let schedule = { days: {} };
let rounds = [];
let entries = [];
let i = 0;
let dateLabel = "";
let isDaily = true;

async function init() {
  try {
    const [citiesResponse, scheduleResponse] = await Promise.all([
      fetch("cities.json"),
      fetch("schedule.json").catch(() => null),
    ]);
    if (!citiesResponse.ok) throw new Error(`cities.json: ${citiesResponse.status}`);
    cities = loadCities(await citiesResponse.json());
    if (scheduleResponse?.ok) schedule = await scheduleResponse.json();
  } catch {
    $("error").hidden = false;
    $("error").textContent =
      "Couldn't load the game data. Serve this folder over HTTP (for example, `python -m http.server`) instead of opening the file directly.";
    return;
  }

  setupArchive();
  startDaily(todayUTC());
}

function defaultPlan() {
  return cities.some((city) => city.coastKm != null)
    ? ["distance", "coast", "distance", "elevation", "distance"]
    : ["distance", "elevation", "distance", "elevation", "distance"];
}

function makeRoundsForDate(date) {
  const scheduled = schedule.days?.[date];
  return scheduled
    ? makeScheduledGame(cities, scheduled.rounds ?? scheduled)
    : makeGame(cities, dailyRng(date), defaultPlan());
}

function startDaily(date) {
  if (date < ARCHIVE_START || date > todayUTC()) return;
  try {
    rounds = makeRoundsForDate(date);
  } catch (error) {
    showError(`Could not build ${date}: ${error.message}`);
    return;
  }

  isDaily = true;
  $("error").hidden = true;
  dateLabel = date;
  const saved = readDayState(localStorage, date);
  entries = saved?.entries.slice(0, rounds.length) ?? [];
  i = entries.length;
  $("copy").textContent = "Copy result";
  $("meta").textContent = `Daily game, ${date}`;

  if (saved?.complete || entries.length >= rounds.length) {
    showEnd();
  } else {
    $("end").hidden = true;
    $("game").hidden = false;
    showRound();
  }
  updateArchive();
}

function startRandom() {
  isDaily = false;
  dateLabel = "random";
  rounds = makeGame(cities, makeRng(`random-${Math.random()}`), defaultPlan());
  entries = [];
  i = 0;
  $("copy").textContent = "Copy result";
  $("meta").textContent = "Random game";
  $("end").hidden = true;
  $("game").hidden = false;
  showRound();
}

function showRound() {
  const round = rounds[i];
  $("progress").textContent = `Round ${i + 1} of ${rounds.length}`;
  $("prompt").textContent = round.prompt;
  $("unit").textContent = MODES[round.mode].unit;
  $("result").hidden = true;
  $("guess-form").hidden = false;
  $("guess").value = "";
  $("guess").focus();
}

function showEnd() {
  const scores = entries.map((entry) => entry.score);
  const total = scores.reduce((a, b) => a + b, 0);
  $("game").hidden = true;
  $("end").hidden = false;
  $("end-title").textContent = isDaily ? `${dateLabel} complete` : "Random game complete";
  $("total").textContent = `${total} / ${rounds.length * 1000}`;
  $("share").textContent = shareText(scores, dateLabel, TITLE);
  updateArchive();
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = false;
}

$("guess-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const guess = Number($("guess").value.replace(/,/g, "").trim());
  if (!Number.isFinite(guess)) return;

  const round = rounds[i];
  const points = score(guess, round.answer, round.mode);
  if (isDaily) {
    const latest = readDayState(localStorage, dateLabel);
    if (latest?.complete || (latest && latest.entries.length !== entries.length)) {
      startDaily(dateLabel);
      showError("This day changed in another tab, so its saved state was reloaded.");
      return;
    }
  }
  entries.push({ guess, score: points });
  if (isDaily) {
    try {
      writeDayState(localStorage, dateLabel, entries, entries.length === rounds.length);
    } catch {
      entries.pop();
      showError("Your browser blocked local saving, so this daily guess was not accepted.");
      return;
    }
  }

  const unit = MODES[round.mode].unit;
  const error = percentError(guess, round.answer);
  const close = withinFactor(guess, round.answer, round.mode, 2);
  $("answer").textContent = `${fmt(round.answer)} ${unit}`;
  $("detail").innerHTML =
    `You said ${fmt(guess)} ${unit}` +
    (error === null ? "" : ` (${error > 0 ? "+" : ""}${Math.round(error)}%)`) +
    `. <b>${points} points</b>` +
    (close ? ` <span class="good">Within 2x.</span>` : ` <span class="bad">More than 2x off.</span>`);
  $("next").textContent = i === rounds.length - 1 ? "See results" : "Next round";
  $("guess-form").hidden = true;
  $("result").hidden = false;
  $("next").focus();
});

$("next").addEventListener("click", () => {
  i++;
  if (i < rounds.length) showRound();
  else showEnd();
});

$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("share").textContent);
    $("copy").textContent = "Copied";
  } catch {
    $("copy").textContent = "Select and copy the result";
  }
});

$("again").addEventListener("click", startRandom);

function setupArchive() {
  $("archive-date").min = ARCHIVE_START;
  $("archive-date").max = shiftUTCDate(todayUTC(), -1);
  $("archive-date").value = shiftUTCDate(todayUTC(), -1);
  $("archive-form").addEventListener("submit", (event) => {
    event.preventDefault();
    startDaily($("archive-date").value);
  });
  $("archive-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (button) startDaily(button.dataset.date);
  });
}

function updateArchive() {
  const states = listDayStates(localStorage);
  const status = new Map(states.map((state) => [state.date, state]));
  const dates = [];
  for (let offset = 1; offset <= ARCHIVE_DAYS_SHOWN; offset++) {
    const date = shiftUTCDate(todayUTC(), -offset);
    if (date < ARCHIVE_START) break;
    dates.push(date);
  }
  $("archive-list").replaceChildren(...dates.map((date) => {
    const button = document.createElement("button");
    const state = status.get(date);
    button.type = "button";
    button.dataset.date = date;
    button.className = "archive-day";
    button.textContent = state?.complete ? `${date} · Played` : state ? `${date} · In progress` : date;
    if (date === dateLabel && isDaily) button.setAttribute("aria-current", "true");
    return button;
  }));

  const stats = calculateStats(states, todayUTC());
  $("stats").textContent =
    `${stats.played} played · ${stats.streak} day streak · ${stats.bestStreak} best · ${stats.average.toLocaleString()} average`;
}

init();
