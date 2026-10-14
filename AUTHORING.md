# Scheduling and Authoring Ballpark Days

Ballpark supports two kinds of daily editions:

- **Seeded editions:** generated automatically from the UTC date.
- **Curated editions:** explicitly defined in `schedule.json` and used instead of the seeded edition on that date.

Any date absent from `schedule.json` continues to work automatically.

## Use the schedule editor

1. Open PowerShell in the project directory.
2. Start a local server:

   ```powershell
   python -m http.server 8000
   ```

3. Open `http://localhost:8000/author.html`.
4. Choose the edition’s UTC date. Future dates are allowed.
5. Configure all five rounds.
6. Start typing a city and select its complete label from the browser’s suggestions.
7. Select **Add day to schedule**.
8. Select **Download schedule.json**.
9. Replace the project-root `schedule.json` with the downloaded file. Browsers may name repeat downloads `schedule (1).json`; rename it to exactly `schedule.json`.
10. Refresh the game page and open that date to verify the edition.
11. Run `npm test` before committing or publishing.

The editor loads the current schedule first, so downloading after adding a day preserves the other scheduled dates.

## Round types

### City-to-city distance

Choose two different cities. The answer is calculated from their coordinates using great-circle distance.

### Distance to coast

Choose one city. The answer uses the preprocessed Natural Earth coastline distance in `cities.json`.

### Elevation

Choose one city with usable elevation data. Cities below approximately -90 meters are intentionally unavailable to the elevation game logic.

## Manual schedule format

You can also edit `schedule.json` directly:

```json
{
  "version": 1,
  "days": {
    "2026-10-20": {
      "rounds": [
        { "mode": "distance", "a": "Paris, FR", "b": "Rome, IT" },
        { "mode": "coast", "city": "Chicago, IL" },
        { "mode": "distance", "a": "Tokyo, JP", "b": "Seoul, KR" },
        { "mode": "elevation", "city": "Denver, CO" },
        { "mode": "distance", "a": "Lima, PE", "b": "Quito, EC" }
      ]
    }
  }
}
```

City labels must exactly match the labels in `cities.json`. The schedule editor is safer because its autocomplete supplies exact labels and validates the chosen rounds.

## Important publishing rules

- Treat dates as UTC, matching the public game.
- Schedule as many future dates as you like in one file.
- Do not alter a curated date after players have started it. Saved progress contains guesses and scores, so changing its questions mid-day would make resumed games inconsistent.
- Commit or back up `schedule.json` after every authoring session.
- Test coast and elevation selections through the editor; it rejects missing or unusable values.
- The schedule file is public game data. Never put secrets, private notes, or unpublished credentials in it.

## What happens on game day

The browser loads `schedule.json` when the game starts. If today has a curated five-round entry, Ballpark uses it. Otherwise it generates the normal shared seeded edition. Archives use the same rule for their selected UTC date.
