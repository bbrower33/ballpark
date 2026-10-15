"""
preprocess.py — turn GeoNames cities15000.txt and countryInfo.txt into cities.json.

Put both GeoNames files in the project root. If cities.json already contains
coast distances, running without a coastline argument preserves those values.

Usage:
    python processing/preprocess.py
    python processing/preprocess.py C:\\path\\to\\ne_10m_coastline.shp
    python processing/preprocess.py C:\\path\\to\\ne_10m_coastline

"""
import argparse
import csv
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
CITIES_FILE = PROJECT_DIR / "cities15000.txt"
COUNTRIES_FILE = PROJECT_DIR / "countryInfo.txt"
OUT_FILE = PROJECT_DIR / "cities.json"
MIN_POP = 100_000          # keep recognizable cities only (~4-5k cities)
EARTH_RADIUS_KM = 6371.0088


def load_country_names():
    if not COUNTRIES_FILE.is_file():
        raise FileNotFoundError(
            f"Country data not found: {COUNTRIES_FILE}\n"
            "Download https://download.geonames.org/export/dump/countryInfo.txt "
            "to the project root."
        )
    names = {}
    with open(COUNTRIES_FILE, encoding="utf-8") as f:
        for row in csv.reader((line for line in f if not line.startswith("#")), delimiter="\t"):
            if len(row) >= 5:
                names[row[0]] = row[4].strip()
    return names


def load_cities():
    country_names = load_country_names()
    cities = []
    with open(CITIES_FILE, encoding="utf-8") as f:
        # GeoNames columns (tab-separated):
        # 0 id, 1 name, 2 asciiname, 3 altnames, 4 lat, 5 lon, 6 fclass, 7 fcode,
        # 8 country, 9 cc2, 10 admin1, 11-13 admin2-4, 14 population,
        # 15 elevation, 16 dem, 17 timezone, 18 modified
        for row in csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            pop = int(row[14] or 0)
            if pop < MIN_POP:
                continue
            # elevation is often blank; dem (SRTM) is the fallback. -9999 = no data.
            elev = None
            if row[15].strip():
                elev = int(row[15])
            elif row[16].strip() and int(row[16]) != -9999:
                elev = int(row[16])
            country, admin1 = row[8], row[10]
            country_name = country_names.get(country, country)
            # Disambiguate (Springfield, OH vs Springfield, MA)
            suffix = admin1 if country == "US" and admin1 else country
            display_label = (
                f"{row[1]}, {admin1}, {country_name}"
                if country == "US" and admin1
                else f"{row[1]}, {country_name}"
            )
            cities.append({
                "name": row[1],
                "label": f"{row[1]}, {suffix}",
                "displayLabel": display_label,
                "countryCode": country,
                "countryName": country_name,
                "lat": round(float(row[4]), 3),
                "lon": round(float(row[5]), 3),
                "pop": pop,
                "elev": elev,
                "coast": None,
            })
    return cities


def preserve_existing_coast_distances(cities):
    """Keep computed coast values when rebuilding metadata without a shapefile."""
    if not OUT_FILE.is_file():
        return 0
    with open(OUT_FILE, encoding="utf-8") as f:
        rows = json.load(f)
    existing = {(row[0], row[1], row[2], row[3]): row[6] for row in rows if len(row) > 6}
    restored = 0
    for city in cities:
        key = (city["name"], city["label"], city["lat"], city["lon"])
        if existing.get(key) is not None:
            city["coast"] = existing[key]
            restored += 1
    return restored


# ---------- distance to coast ----------
# Idea: put coastline vertices (densified) on a unit sphere as 3D points, build
# a KD-tree, and find each city's nearest vertex. Chord length -> great-circle km.

def to_xyz(lat_deg, lon_deg):
    import numpy as np
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    return np.column_stack([np.cos(lat) * np.cos(lon),
                            np.cos(lat) * np.sin(lon),
                            np.sin(lat)])


def resolve_shapefile(shp_path):
    """Return an existing .shp path, accepting either a file or its directory."""
    supplied = Path(shp_path).expanduser()
    if supplied.is_absolute():
        candidates = [supplied]
    else:
        candidates = [
            Path.cwd() / supplied,
            PROJECT_DIR / supplied,
            Path.home() / "Downloads" / supplied,
        ]

    checked = []
    for candidate in candidates:
        candidate = candidate.resolve()
        if candidate.is_dir():
            candidate = candidate / "ne_10m_coastline.shp"
        checked.append(candidate)
        if candidate.is_file():
            return candidate

    attempted = "\n".join(f"  - {path}" for path in dict.fromkeys(checked))
    raise FileNotFoundError(
        "Coastline shapefile not found. Checked:\n"
        f"{attempted}\n"
        "Pass the .shp path or its containing directory."
    )


def coast_points(shp_path, step_deg=0.05):
    import numpy as np
    import shapefile
    out = []
    for shape in shapefile.Reader(shp_path).shapes():
        pts = np.array(shape.points)
        if len(pts) == 0:
            continue
        bounds = list(shape.parts) + [len(pts)]
        for a, b in zip(bounds[:-1], bounds[1:]):
            seg = pts[a:b]
            out.append(seg)
            for p, q in zip(seg[:-1], seg[1:]):       # densify long segments (~5 km)
                n = int(max(abs(q - p)) // step_deg)
                if n > 0:
                    t = np.linspace(0, 1, n + 2)[1:-1, None]
                    out.append(p + (q - p) * t)
    return np.vstack(out)                              # columns: lon, lat


def add_coast_distances(cities, shp_path):
    import numpy as np
    from scipy.spatial import cKDTree
    coast = coast_points(resolve_shapefile(shp_path))
    tree = cKDTree(to_xyz(coast[:, 1], coast[:, 0]))
    pts = to_xyz(np.array([c["lat"] for c in cities]),
                 np.array([c["lon"] for c in cities]))
    chord, _ = tree.query(pts)
    km = 2 * np.arcsin(np.clip(chord / 2, 0, 1)) * EARTH_RADIUS_KM
    for c, d in zip(cities, km):
        c["coast"] = round(float(d))


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "coastline",
        nargs="?",
        help="Natural Earth coastline .shp file or the directory containing it",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    cities = load_cities()
    if args.coastline:
        add_coast_distances(cities, args.coastline)
    else:
        restored = preserve_existing_coast_distances(cities)
        if restored:
            print(f"Preserved coast distances for {restored} cities from {OUT_FILE}")
    rows = [[
        c["name"], c["label"], c["lat"], c["lon"], c["pop"], c["elev"], c["coast"],
        c["countryCode"], c["countryName"], c["displayLabel"],
    ]
            for c in cities]
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(rows)} cities to {OUT_FILE}")
