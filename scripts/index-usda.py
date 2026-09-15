"""Build a queryable USDA snapshot without extracting multi-gigabyte CSVs.

Usage: python3 scripts/index-usda.py archive.zip destination.sqlite
Builds a separate .building database; never overwrites an existing live index.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone

archive, destination = map(Path, sys.argv[1:3])
building = destination.with_suffix('.building.sqlite')
if destination.exists() or building.exists():
    raise SystemExit('Choose a new destination: the live index and partial builds are never overwritten.')
csv.field_size_limit(10_000_000)
connection = sqlite3.connect(building)
connection.executescript('''
PRAGMA journal_mode=OFF;
CREATE TABLE food(id INTEGER PRIMARY KEY, name TEXT, type TEXT, brand TEXT DEFAULT '', barcode TEXT DEFAULT '', serving REAL, unit TEXT, household TEXT, calories REAL, protein REAL, carbs REAL, fat REAL);
CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT);
''')
types = {'foundation_food': 'Foundation', 'sr_legacy_food': 'SR Legacy', 'survey_fndds_food': 'Survey (FNDDS)', 'branded_food': 'Branded'}
with zipfile.ZipFile(archive) as zipped:
    def rows(name):
        path = next(n for n in zipped.namelist() if n.endswith('/' + name + '.csv'))
        return csv.DictReader(io.TextIOWrapper(zipped.open(path), encoding='utf-8-sig', newline=''))

    def number(value):
        try:
            return float(value) if value else None
        except ValueError:
            return None

    print('Importing generic and branded food names…', flush=True)
    connection.executemany('INSERT INTO food(id,name,type) VALUES(?,?,?)', ((r['fdc_id'], r['description'], types[r['data_type']]) for r in rows('food') if r['data_type'] in types))
    connection.commit()
    print('Importing brand, barcode, and label-serving metadata…', flush=True)
    connection.executemany('UPDATE food SET brand=?,barcode=?,serving=?,unit=?,household=? WHERE id=?', ((r.get('brand_owner') or r.get('brand_name') or '', r.get('gtin_upc', ''), number(r.get('serving_size')), r.get('serving_size_unit', ''), r.get('household_serving_fulltext', ''), r['fdc_id']) for r in rows('branded_food')))
    connection.commit()
    print('Importing available energy and macronutrients…', flush=True)
    nutrients = {'1008': 'calories', '2047': 'calories', '1003': 'protein', '1005': 'carbs', '1004': 'fat'}
    batches = {key: [] for key in nutrients.values()}
    for row in rows('food_nutrient'):
        column = nutrients.get(row['nutrient_id'])
        if column:
            batches[column].append((number(row['amount']), row['fdc_id']))
            if len(batches[column]) >= 20000:
                connection.executemany(f'UPDATE food SET {column}=? WHERE id=?', batches[column])
                batches[column] = []
    for column, batch in batches.items():
        connection.executemany(f'UPDATE food SET {column}=? WHERE id=?', batch)
    connection.commit()
print('Building full-text, barcode, and type indexes…', flush=True)
connection.executescript('''
CREATE INDEX food_barcode ON food(barcode);
CREATE INDEX food_type ON food(type);
CREATE VIRTUAL TABLE food_search USING fts5(name, brand, content='food', content_rowid='id', tokenize='unicode61');
INSERT INTO food_search(food_search) VALUES('rebuild');
''')
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
metadata = {'schema': '1', 'archive': archive.name, 'sha256': digest, 'indexedAt': datetime.now(timezone.utc).isoformat(), 'counts': json.dumps(dict(connection.execute('SELECT type,COUNT(*) FROM food GROUP BY type')))}
connection.executemany('INSERT INTO metadata VALUES(?,?)', metadata.items())
connection.commit()
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
connection.close()
building.rename(destination)
print(json.dumps(metadata, indent=2), flush=True)
