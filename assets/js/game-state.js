const PREFIX = "ballpark:day:";

export function storageKey(date) {
  return PREFIX + date;
}

export function readDayState(storage, date) {
  try {
    const value = JSON.parse(storage.getItem(storageKey(date)));
    if (
      value?.version !== 1 || value.date !== date ||
      !Array.isArray(value.entries) || typeof value.complete !== "boolean"
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeDayState(storage, date, entries, complete) {
  const state = {
    version: 1,
    date,
    entries: entries.map(({ guess, score }) => ({ guess, score })),
    complete,
  };
  storage.setItem(storageKey(date), JSON.stringify(state));
  return state;
}

export function listDayStates(storage) {
  const states = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    const state = readDayState(storage, key.slice(PREFIX.length));
    if (state) states.push(state);
  }
  return states.sort((a, b) => a.date.localeCompare(b.date));
}

export function shiftUTCDate(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calculateStats(states, today) {
  const completed = states.filter((state) => state.complete);
  const totals = completed.map((state) =>
    state.entries.reduce((sum, entry) => sum + entry.score, 0)
  );
  const completedDates = new Set(completed.map((state) => state.date));
  let cursor = completedDates.has(today) ? today : shiftUTCDate(today, -1);
  let streak = 0;
  while (completedDates.has(cursor)) {
    streak++;
    cursor = shiftUTCDate(cursor, -1);
  }

  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const date of [...completedDates].sort()) {
    run = previous && shiftUTCDate(previous, 1) === date ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = date;
  }
  return {
    played: completed.length,
    average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
    streak,
    bestStreak,
  };
}
