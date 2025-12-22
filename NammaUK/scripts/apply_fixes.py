#!/usr/bin/env python3
"""
apply_fixes.py

Reads the CSV report produced by `scripts/validate_places.py` and updates
`data/places.json` for entries where the geocoded coordinates are available
and the distance to the provided coordinates is within a safe threshold.

Usage:
  python scripts/apply_fixes.py --report reports/places_validation.csv --places data/places.json --threshold 0.5 --apply

By default the script runs in dry-run mode and prints the intended changes.
Use `--apply` to actually modify `data/places.json`. A backup file will be
created before writing.
"""

import argparse
import csv
import json
import os
import shutil
import sys
import time


def load_places(path):
    with open(path, 'r', encoding='utf-8') as fh:
        return json.load(fh)


def save_places(path, data):
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


def find_place_entry(places_data, taluk, place_name):
    # Try exact case-insensitive match by `name` field
    arr = places_data.get(taluk) or []
    lname = place_name.strip().lower()
    for p in arr:
        if (p.get('name') or '').strip().lower() == lname:
            return p
    # fallback: substring match
    for p in arr:
        if lname in ((p.get('name') or '').strip().lower()):
            return p
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--report', default='reports/places_validation.csv', help='CSV report from validate_places.py')
    p.add_argument('--places', default='data/places.json', help='Path to places.json')
    p.add_argument('--threshold', type=float, default=0.5, help='Max distance (km) to auto-fix')
    p.add_argument('--apply', action='store_true', help='Actually write changes to places.json')
    args = p.parse_args()

    if not os.path.exists(args.report):
        print('Report not found:', args.report)
        sys.exit(1)
    if not os.path.exists(args.places):
        print('Places file not found:', args.places)
        sys.exit(1)

    places_data = load_places(args.places)
    changes = []
    flags_to_set = []

    with open(args.report, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            taluk = (row.get('taluk') or '').strip()
            name = (row.get('place_name') or '').strip().strip('"')
            geolat = row.get('geocoded_lat', '').strip()
            geolng = row.get('geocoded_lng', '').strip()
            dist = row.get('distance_km', '').strip()
            note = (row.get('note') or '').strip()

            if not geolat or not geolng:
                continue
            try:
                geolat_v = float(geolat)
                geolng_v = float(geolng)
            except Exception:
                continue

            # decide if we should auto-fix
            do_fix = False
            reason = ''
            try:
                dist_v = float(dist) if dist != '' else None
            except Exception:
                dist_v = None

            if note == 'no-provided-coords' and geolat and geolng:
                do_fix = True
                reason = 'no provided coords'
            elif dist_v is not None and dist_v <= args.threshold:
                do_fix = True
                reason = f'distance {dist_v} km <= {args.threshold} km'
            else:
                # mark entries with mismatches or no geocode as flagged so frontend will prefer names
                if (note and ('MISMATCH' in note or 'no-geocode-result' in note or 'geocode-parse-error' in note)) or (dist_v is not None and dist_v > args.threshold):
                    flags_to_set.append((taluk, name, note or f'distance {dist_v}'))

            if not do_fix:
                continue

            entry = find_place_entry(places_data, taluk, name)
            if not entry:
                print(f'WARN: Could not find entry for "{name}" in taluk "{taluk}"')
                continue

            old_lat = entry.get('lat')
            old_lng = entry.get('lng')
            # If old coords exist and equal geocoded, skip
            if old_lat == geolat_v and old_lng == geolng_v:
                continue

            changes.append((taluk, name, old_lat, old_lng, geolat_v, geolng_v, reason))

    if not changes:
        print('No coordinate updates within threshold.')
        if not flags_to_set:
            print('No flags to set. Nothing to do.')
            return
        else:
            print('Planned flags to set (prefer name over coords):')
            for t, n, nm in flags_to_set:
                print(f'- {t} | {n}  reason: {nm}')

    print('Planned changes:')
    for c in changes:
        taluk, name, old_lat, old_lng, new_lat, new_lng, reason = c
        print(f'- {taluk} | {name} | {old_lat},{old_lng} -> {new_lat},{new_lng}  ({reason})')

    if not args.apply:
        print('\nDry-run mode (no files changed). Re-run with --apply to write updates.')
        return

    # backup
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    bak_path = args.places + f'.bak_{timestamp}'
    shutil.copy2(args.places, bak_path)
    print('Backup saved to', bak_path)

    # apply
    for taluk, name, old_lat, old_lng, new_lat, new_lng, reason in changes:
        entry = find_place_entry(places_data, taluk, name)
        if not entry:
            continue
        entry['lat'] = new_lat
        entry['lng'] = new_lng

    # apply flags for problematic entries so frontend prefers names
    if flags_to_set:
        print('\nApplying flags for entries where coords are unreliable:')
        for taluk, name, note in flags_to_set:
            entry = find_place_entry(places_data, taluk, name)
            if not entry:
                print(f'WARN: Could not find to-flag entry for "{name}" in taluk "{taluk}"')
                continue
            entry['coords_flagged'] = True
            print(f'- Flagged {taluk} | {name}  ({note})')

    save_places(args.places, places_data)
    print('Applied changes to', args.places)


if __name__ == '__main__':
    main()
