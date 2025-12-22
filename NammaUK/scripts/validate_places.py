#!/usr/bin/env python3
"""
validate_places.py

Scan data/places.json, forward-geocode each place name (with taluk context)
using Nominatim (OpenStreetMap), compare returned lat/lon with existing values
and write a CSV report listing distances and flags for likely-bad coordinates.

Usage:
  python scripts/validate_places.py --places data/places.json --out reports/places_validation.csv

Notes:
 - The script uses the public Nominatim service: it sleeps 1s between queries
   and sends a proper User-Agent header. For heavy usage, run your own
   Nominatim instance or use a paid geocoding API.
 - The script does NOT modify `places.json`; it only reports suspected issues.
"""

import argparse
import json
import math
import os
import sys
import time
from urllib import parse, request


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def nominatim_search(q, email=None):
    base = 'https://nominatim.openstreetmap.org/search'
    params = {'q': q, 'format': 'json', 'limit': 1, 'addressdetails': 0}
    url = base + '?' + parse.urlencode(params)
    headers = {'User-Agent': f'NammaUK-places-validator/1.0 (contact: {email or "onepieze1999@gmail.com"})'}
    req = request.Request(url, headers=headers)
    with request.urlopen(req, timeout=20) as resp:
        data = resp.read().decode('utf-8')
    return json.loads(data)


def ensure_dir(path):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--places', default='data/places.json', help='Path to places.json')
    p.add_argument('--out', default='reports/places_validation.csv', help='CSV output path')
    p.add_argument('--threshold-km', type=float, default=5.0, help='Distance threshold to flag mismatch (km)')
    p.add_argument('--email', default=None, help='Contact email to include in User-Agent (recommended)')
    args = p.parse_args()

    if not os.path.exists(args.places):
        print('places file not found:', args.places)
        sys.exit(1)

    with open(args.places, 'r', encoding='utf-8') as fh:
        places_data = json.load(fh)

    ensure_dir(args.out)
    out_lines = []
    header = ['taluk', 'place_name', 'provided_lat', 'provided_lng', 'geocoded_lat', 'geocoded_lng', 'distance_km', 'note']
    out_lines.append(','.join(header))

    total = 0
    for taluk in places_data:
        total += len(places_data.get(taluk) or [])

    print(f'Found {total} places across {len(places_data)} taluks. Starting geocoding (this may take a while).')
    seen = 0
    for taluk in places_data:
        for place in places_data.get(taluk) or []:
            seen += 1
            name = place.get('name') or place.get('place') or ''
            provided_lat = place.get('lat')
            provided_lng = place.get('lng')
            # Try multiple query variants to improve match rate:
            # 1) name + taluk + district
            # 2) name + taluk
            # 3) name + district
            # 4) name only
            queries = []
            if name:
                if taluk:
                    queries.append(f"{name}, {taluk}, Uttara Kannada, Karnataka, India")
                    queries.append(f"{name}, {taluk}")
                queries.append(f"{name}, Uttara Kannada, Karnataka, India")
                queries.append(name)

            geolat = ''
            geolng = ''
            dist = ''
            note = ''
            matched_query = ''
            results = []
            for qi, q in enumerate(queries, start=1):
                try:
                    results = nominatim_search(q, email=args.email)
                except Exception as e:
                    print(f'Geocode error for "{q}":', e)
                    results = []

                if isinstance(results, list) and len(results) > 0:
                    matched_query = q
                    # found a result; stop trying further variants
                    break
                # still no result — respect Nominatim usage policy between attempts
                time.sleep(1.0)

            if matched_query == '':
                note = 'no-geocode-result'
            else:
                r = results[0]
                try:
                    geolat = float(r.get('lat'))
                    geolng = float(r.get('lon'))
                    if provided_lat is not None and provided_lng is not None:
                        try:
                            dist = haversine_km(float(provided_lat), float(provided_lng), geolat, geolng)
                            dist = round(dist, 3)
                            if dist > args.threshold_km:
                                note = f'MISMATCH (>{args.threshold_km} km)'
                        except Exception:
                            note = 'bad-provided-coords'
                    else:
                        note = 'no-provided-coords'
                except Exception:
                    note = 'geocode-parse-error'
                if matched_query:
                    note = (note + ' ; found_by: "' + matched_query.replace(',', ' ') + '"').strip(' ;')

            out_line = [
                taluk.replace(',', ' '),
                ('"' + name.replace('"', '\\"') + '"'),
                str(provided_lat) if provided_lat is not None else '',
                str(provided_lng) if provided_lng is not None else '',
                str(geolat) if geolat != '' else '',
                str(geolng) if geolng != '' else '',
                str(dist) if dist != '' else '',
                note
            ]
            out_lines.append(','.join(out_line))

            # Respect Nominatim usage policy: no more than 1 request per second
            time.sleep(1.0)

            if seen % 50 == 0:
                print(f'Processed {seen}/{total} places...')

    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(out_lines))

    print('Report saved to', args.out)


if __name__ == '__main__':
    main()
