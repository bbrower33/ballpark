# Ballpark

A dependency-free daily geography estimation game built with plain HTML, CSS, and JavaScript.

## Run locally

Serve the project root over HTTP:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/`. The schedule editor is available locally at
`http://localhost:8000/author.html`; public hosts redirect that URL to the game.

## Project structure

```text
assets/       Browser JavaScript, CSS, and bundled fonts
data/         Deployable city data and curated daily schedule
docs/         Authoring guide and visual style bible
scripts/      Offline data preprocessing tools
source-data/  Ignored GeoNames source downloads
tests/        Dependency-free Node tests
```

The root HTML files remain in place so GitHub Pages serves `/` and
`/author.html` without redirects. `data/cities.json` is generated but tracked
because it is required by the deployed static site.

The repository includes `.nojekyll`, so GitHub Pages publishes these files
directly without applying Jekyll processing.

## Verify

```powershell
npm test
node --check assets/js/index.js
node --check assets/js/author.js
python -m py_compile scripts/preprocess.py
```

See [docs/AUTHORING.md](docs/AUTHORING.md) for scheduling editions and
[docs/STYLE_BIBLE.md](docs/STYLE_BIBLE.md) for interface guidance.

## Regenerate city data

Keep the GeoNames downloads `cities15000.txt` and `countryInfo.txt` in the
ignored `source-data/` directory, then run:

```powershell
python scripts/preprocess.py
```

Pass a Natural Earth coastline `.shp` file or its directory when coastline
distances need to be recomputed. Without one, the script preserves the coast
distances already stored in `data/cities.json`.
