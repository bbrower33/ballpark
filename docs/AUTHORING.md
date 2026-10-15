# Scheduling and Authoring Ballpark Days

The schedule editor is intentionally localhost-only. GitHub Pages and other
public hosts redirect `author.html` to the game, and the authoring module also
refuses to initialize outside a loopback hostname.

Ballpark supports two kinds of daily editions:

- **Seeded editions:** generated automatically from the UTC date.
- **Curated editions:** explicitly defined in `data/schedule.json` and used instead of the seeded edition on that date.

Any date absent from `data/schedule.json` continues to work automatically.

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
9. Replace `data/schedule.json` with the downloaded file. Browsers may name repeat downloads `schedule (1).json`; rename it to exactly `schedule.json`.
10. Refresh the game page and open that date to verify the edition.
11. Run `npm test` before committing or publishing.

The editor loads the current schedule first, so downloading after adding a day preserves the other scheduled dates.

## Round types

### City-to-city distance

Choose two different cities. The answer is calculated from their coordinates using great-circle distance.

### Distance to coast

Choose one city. The answer uses the preprocessed Natural Earth coastline distance in `data/cities.json`.

### Elevation

Choose one city with usable elevation data. Cities below approximately -90 meters are intentionally unavailable to the elevation game logic.

## Manual schedule format

You can also edit `data/schedule.json` directly:

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

City labels must exactly match the labels in `data/cities.json`. The schedule editor is safer because its autocomplete supplies exact labels and validates the chosen rounds.

## Important publishing rules

- Treat dates as UTC, matching the public game.
- Schedule as many future dates as you like in one file.
- Do not alter a curated date after players have started it. Saved progress contains guesses and scores, so changing its questions mid-day would make resumed games inconsistent.
- Commit or back up `data/schedule.json` after every authoring session.
- Test coast and elevation selections through the editor; it rejects missing or unusable values.
- The schedule file is public game data. Never put secrets, private notes, or unpublished credentials in it.

## Publish a curated edition

1. Add and validate the day in the schedule editor.
2. Replace `data/schedule.json` with the downloaded file.
3. Run `npm test`. The test suite resolves every scheduled city and verifies that each edition produces five finite answers.
4. Serve the project locally and open the scheduled UTC date through the archive date picker.
5. Verify every prompt, unit, answer reveal, and round recap.
6. Commit and push `data/schedule.json`. GitHub Pages will publish it with the rest of the static site.

The first curated launch edition is `2026-10-01`. It deliberately covers all three round types with recognizable cities and also serves as the authoring-workflow reference edition.

## What happens on game day

The browser loads `data/schedule.json` when the game starts. If today has a curated five-round entry, Ballpark uses it. Otherwise it generates the normal shared seeded edition. Archives use the same rule for their selected UTC date.
