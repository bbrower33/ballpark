import { loadCities, makeScheduledGame, todayUTC } from "./algorithms.js";

const $ = (id) => document.getElementById(id);
const DEFAULT_MODES = ["distance", "coast", "distance", "elevation", "distance"];
let cities = [];
let schedule = { version: 1, days: {} };
let downloadUrl = null;

async function init() {
  try {
    const [citiesResponse, scheduleResponse] = await Promise.all([
      fetch("cities.json"),
      fetch("schedule.json"),
    ]);
    if (!citiesResponse.ok) throw new Error("Could not load cities.json");
    cities = loadCities(await citiesResponse.json());
    if (scheduleResponse.ok) schedule = await scheduleResponse.json();
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
    return;
  }

  $("schedule-date").value = todayUTC();
  $("city-options").replaceChildren(...cities.map((city) => {
    const option = document.createElement("option");
    option.value = city.label;
    return option;
  }));
  $("round-editors").replaceChildren(...DEFAULT_MODES.map(makeRoundEditor));
}

function cityInput(name, placeholder, labelText, id) {
  const control = document.createElement("div");
  control.className = "city-control";
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.placeholder = placeholder;
  input.setAttribute("list", "city-options");
  input.required = true;
  control.append(label, input);
  return control;
}

function makeRoundEditor(mode, index) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = `Round ${index + 1}`;
  const select = document.createElement("select");
  select.id = `round-${index + 1}-mode`;
  select.name = "mode";
  for (const value of ["distance", "coast", "elevation"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "distance" ? "City-to-city distance" :
      value === "coast" ? "Distance to coast" : "City elevation";
    option.selected = value === mode;
    select.append(option);
  }
  const fields = document.createElement("div");
  fields.className = "city-fields";
  const modeControl = document.createElement("div");
  const modeLabel = document.createElement("label");
  modeLabel.htmlFor = select.id;
  modeLabel.textContent = "Question type";
  modeControl.append(modeLabel, select);
  const renderFields = () => {
    fields.replaceChildren(
      cityInput(
        select.value === "distance" ? "a" : "city",
        "Start typing a city…",
        select.value === "distance" ? "First city" : "City",
        `round-${index + 1}-city-a`,
      ),
      ...(select.value === "distance" ? [cityInput(
        "b", "Second city…", "Second city", `round-${index + 1}-city-b`,
      )] : []),
    );
  };
  select.addEventListener("change", renderFields);
  renderFields();
  fieldset.append(legend, modeControl, fields);
  return fieldset;
}

$("schedule-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const labels = new Set(cities.map((city) => city.label));
    const rounds = [...$("round-editors").querySelectorAll("fieldset")].map((fieldset) => {
      const mode = fieldset.querySelector("select").value;
      const inputs = [...fieldset.querySelectorAll("input")];
      const round = { mode };
      for (const input of inputs) {
        if (!labels.has(input.value)) {
          throw new Error(`Choose a listed city for ${input.placeholder}`);
        }
        round[input.name] = input.value;
      }
      return round;
    });
    makeScheduledGame(cities, rounds);
    const date = $("schedule-date").value;
    schedule.days ??= {};
    schedule.days[date] = { rounds };
    const json = JSON.stringify(schedule, null, 2) + "\n";
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    $("download-schedule").href = downloadUrl;
    $("schedule-preview").textContent = json;
    $("schedule-output").hidden = false;
    $("error").hidden = true;
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
  }
});

init();
