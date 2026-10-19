#!/usr/bin/env python3
"""Regenerates the two saved geometry fixtures the corridor comparison relies on.

  fixtures/trips-links.json  road geometry of every DCC TRIPS link, in WGS84
  fixtures/pathways.json     saved road route (OSRM) for each incident -> hospital pathway

Inputs: TRIPS routes.csv from data.smartdublin.ie (CC BY 4.0), passed as the first argument.
TRIPS publishes link geometry in Irish Grid (EPSG:29902), converted here with the Airy Modified
transverse Mercator inverse and the EPSG:1641 (TM65 -> WGS84) Helmert shift, good to a few metres.

Usage: python3 scripts/build-trips-fixtures.py /path/to/routes.csv
"""
import csv, json, math, re, subprocess, sys

A, B, F0 = 6377340.189, 6356034.447, 1.000035
LAT0, LON0, E0, N0 = math.radians(53.5), math.radians(-8.0), 200000, 250000
N = (A - B) / (A + B)
E2 = 1 - (B * B) / (A * A)


def _m(lat):
    d, s = lat - LAT0, lat + LAT0
    return B * F0 * ((1 + N + 5 / 4 * N**2 + 5 / 4 * N**3) * d
                     - (3 * N + 3 * N**2 + 21 / 8 * N**3) * math.sin(d) * math.cos(s)
                     + (15 / 8 * N**2 + 15 / 8 * N**3) * math.sin(2 * d) * math.cos(2 * s)
                     - 35 / 24 * N**3 * math.sin(3 * d) * math.cos(3 * s))


def irish_grid_to_wgs84(e, n):
    lat = LAT0
    while True:
        lat = (n - N0 - _m(lat)) / (A * F0) + lat
        if abs(n - N0 - _m(lat)) < 1e-5:
            break
    nu = A * F0 / math.sqrt(1 - E2 * math.sin(lat) ** 2)
    rho = A * F0 * (1 - E2) / (1 - E2 * math.sin(lat) ** 2) ** 1.5
    eta2 = nu / rho - 1
    t, s = math.tan(lat), 1 / math.cos(lat)
    vii = t / (2 * rho * nu)
    viii = t / (24 * rho * nu**3) * (5 + 3 * t**2 + eta2 - 9 * t**2 * eta2)
    ix = t / (720 * rho * nu**5) * (61 + 90 * t**2 + 45 * t**4)
    x = s / nu
    xi = s / (6 * nu**3) * (nu / rho + 2 * t**2)
    xii = s / (120 * nu**5) * (5 + 28 * t**2 + 24 * t**4)
    xiia = s / (5040 * nu**7) * (61 + 662 * t**2 + 1320 * t**4 + 720 * t**6)
    de = e - E0
    lat2 = lat - vii * de**2 + viii * de**4 - ix * de**6
    lon = LON0 + x * de - xi * de**3 + xii * de**5 - xiia * de**7
    # TM65 -> WGS84 (EPSG:1641, position-vector Helmert)
    nu = A / math.sqrt(1 - E2 * math.sin(lat2) ** 2)
    px, py, pz = nu * math.cos(lat2) * math.cos(lon), nu * math.cos(lat2) * math.sin(lon), (1 - E2) * nu * math.sin(lat2)
    rx, ry, rz = [math.radians(v / 3600) for v in (-1.042, -0.214, -0.631)]
    sc = 8.15e-6
    x2 = 482.5 + (1 + sc) * (px - rz * py + ry * pz)
    y2 = -130.6 + (1 + sc) * (rz * px + py - rx * pz)
    z2 = 564.6 + (1 + sc) * (-ry * px + rx * py + pz)
    a2, b2 = 6378137.0, 6356752.314245
    ee = 1 - (b2 * b2) / (a2 * a2)
    p = math.hypot(x2, y2)
    la = math.atan2(z2, p * (1 - ee))
    for _ in range(6):
        nu2 = a2 / math.sqrt(1 - ee * math.sin(la) ** 2)
        la = math.atan2(z2 + ee * nu2 * math.sin(la), p)
    return math.degrees(la), math.degrees(math.atan2(y2, x2))


# Simulated incident scenes and candidate hospitals, mirroring src/fleet/fixtures.ts.
SCENES = {"tallaght": (53.2862, -6.3641), "dublin2": (53.3382, -6.2591)}
HOSPITALS = {"tuh": (53.2886, -6.3787), "stjames": (53.3414, -6.2954), "beaumont": (53.3889, -6.2297)}
PATHWAYS = [("tallaght", "tuh"), ("tallaght", "stjames"), ("dublin2", "beaumont"), ("dublin2", "stjames")]


def osrm(frm, to):
    url = "https://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=full&geometries=geojson" % (frm[1], frm[0], to[1], to[0])
    out = subprocess.run(["curl", "-s", "-m", "30", url], capture_output=True, text=True, check=True).stdout
    route = json.loads(out)["routes"][0]
    return [[round(c[1], 5), round(c[0], 5)] for c in route["geometry"]["coordinates"]]


def main(routes_csv):
    links = []
    with open(routes_csv, newline="") as f:
        for r in csv.DictReader(f):
            pts = re.findall(r"(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)", r["WKT"])
            if len(pts) < 2:
                continue
            geom = [[round(v, 5) for v in irish_grid_to_wgs84(float(x), float(y))] for x, y in pts]
            links.append({"route": int(r["Route"]), "link": int(r["Link"]), "direction": int(r["Direction"]), "points": geom})
    with open("fixtures/trips-links.json", "w") as f:
        json.dump(links, f, separators=(",", ":"))
    paths = {"%s:%s" % (s, h): osrm(SCENES[s], HOSPITALS[h]) for s, h in PATHWAYS}
    with open("fixtures/pathways.json", "w") as f:
        json.dump(paths, f, separators=(",", ":"))
    print("links:", len(links), "pathways:", {k: len(v) for k, v in paths.items()})


if __name__ == "__main__":
    main(sys.argv[1])
