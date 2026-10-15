import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCities, makeScheduledGame } from "../assets/js/algorithms.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function localReferences(contents) {
  return [...contents.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1].split("?")[0])
    .filter((reference) => reference && !reference.startsWith("http") && !reference.startsWith("#"));
}

test("static page asset references resolve from the project root", () => {
  for (const page of ["index.html", "author.html"]) {
    const contents = readFileSync(resolve(projectRoot, page), "utf8");
    for (const reference of localReferences(contents)) {
      assert.ok(existsSync(resolve(projectRoot, reference)), `${page} is missing ${reference}`);
    }
  }
});

test("stylesheet font references resolve relative to the stylesheet", () => {
  const cssPath = resolve(projectRoot, "assets/css/styles.css");
  const contents = readFileSync(cssPath, "utf8");
  const references = [...contents.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
  for (const reference of references) {
    assert.ok(existsSync(resolve(dirname(cssPath), reference)), `styles.css is missing ${reference}`);
  }
});

test("deployable JSON data is present and valid", () => {
  const cities = JSON.parse(readFileSync(resolve(projectRoot, "data/cities.json"), "utf8"));
  const schedule = JSON.parse(readFileSync(resolve(projectRoot, "data/schedule.json"), "utf8"));
  assert.ok(Array.isArray(cities) && cities.length > 0);
  assert.equal(typeof schedule.days, "object");
});

test("displayed app version matches package.json", () => {
  const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
  const page = readFileSync(resolve(projectRoot, "index.html"), "utf8");
  assert.match(page, new RegExp(`>v${packageJson.version.replaceAll(".", "\\.")}<`));
});

test("every curated schedule resolves to five playable rounds", () => {
  const cityRows = JSON.parse(readFileSync(resolve(projectRoot, "data/cities.json"), "utf8"));
  const schedule = JSON.parse(readFileSync(resolve(projectRoot, "data/schedule.json"), "utf8"));
  const cities = loadCities(cityRows);
  for (const [date, edition] of Object.entries(schedule.days)) {
    const rounds = makeScheduledGame(cities, edition.rounds);
    assert.equal(rounds.length, 5, `${date} should contain five rounds`);
    assert.ok(rounds.every((round) => Number.isFinite(round.answer)), `${date} has an invalid answer`);
  }
});
