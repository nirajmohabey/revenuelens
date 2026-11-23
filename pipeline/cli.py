"""Download, preserve, classify, reconcile and export UCI Online Retail II.

Run from any directory: python -m pipeline.cli download|build|validate|export.
Money in the database is exact integer 1/10,000 GBP. JSON presentation values
are GBP; exact reconciliation integers remain in artifacts/reconciliation.json.
"""
from __future__ import annotations

import argparse
import calendar
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, localcontext
import hashlib
import inspect
from itertools import permutations
import json
import math
from pathlib import Path
import platform
import sqlite3
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCALE = 10_000
RULE = 'retail-movement-v1.0.0'
SOURCE_URL = 'https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip'
DATASET_URL = 'https://archive.ics.uci.edu/dataset/502/online+retail+ii'
UNKNOWN = '__UNKNOWN__'
ALL = 'All markets'
# Explicit conservative code-based policy. Product descriptions are never used
# to infer a return, an acquisition, an intervention, or a product's margin.
NON_MERCHANDISE = frozenset({
    'AMAZONFEE', 'BANK CHARGES', 'C2', 'D', 'DOT', 'M', 'POST',
    'S', 'ADJUST', 'ADJUST2', 'CRUK', 'B',
})
HEADERS = ['Invoice', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'Price', 'Customer ID', 'Country']


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':')), encoding='utf-8')
    tmp.replace(path)


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def text_id(value):
    if value is None:
        return ''
    if isinstance(value, (int, float)) and math.isfinite(value) and value == int(value):
        return str(int(value))
    return str(value).strip()


def decimal_value(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        d = Decimal(str(value).strip())
        return d if d.is_finite() else None
    except (InvalidOperation, ValueError):
        return None


def classify(values):
    """Classify one source line without dropping it or repairing absent values."""
    invoice, stock, description, q, stamp, price, customer, country = values
    invoice, stock = text_id(invoice), text_id(stock)
    customer, country = text_id(customer) or UNKNOWN, text_id(country) or 'Unknown country'
    quantity, p = decimal_value(q), decimal_value(price)
    amount = quantity * p if quantity is not None and p is not None else None
    amount_units = int(amount * SCALE) if amount is not None and amount * SCALE == (amount * SCALE).to_integral_value() else None
    price_units = int(p * SCALE) if p is not None and p * SCALE == (p * SCALE).to_integral_value() else None
    parsed_stamp = stamp.isoformat(sep=' ', timespec='seconds') if isinstance(stamp, datetime) else None
    qty = int(quantity) if quantity is not None and quantity == quantity.to_integral_value() else None
    if amount_units is None or price_units is None or qty is None:
        disposition, reason = 'unparsed_amount', 'Quantity/price cannot be represented as an integer quantity and exact 1/10000 GBP.'
    elif parsed_stamp is None or not invoice or not stock:
        disposition, reason = 'quarantined', 'Missing or malformed timestamp, invoice identifier or stock code.'
    elif stock.upper() in NON_MERCHANDISE:
        disposition, reason = 'non_merchandise', 'Explicit reviewed service/adjustment stock-code exclusion.'
    elif qty > 0 and price_units > 0 and not invoice.upper().startswith('C'):
        disposition, reason = 'sale', 'Positive quantity/price and non-cancellation invoice.'
    elif qty < 0 and price_units > 0 and invoice.upper().startswith('C'):
        disposition, reason = 'cancellation', 'Cancellation-prefixed invoice, negative quantity, positive price.'
    else:
        disposition, reason = 'other_movement', 'Zero/nonpositive price or quantity/sign combination outside merchandise policy.'
    return (invoice, stock, str(description or ''), qty, price_units, parsed_stamp,
            customer, country, amount_units, disposition, reason)


def classification_hash():
    source = ''.join(inspect.getsource(fn) for fn in (text_id, decimal_value, classify))
    return hashlib.sha256((source + json.dumps(sorted(NON_MERCHANDISE)) + str(SCALE)).encode()).hexdigest()


def require_current_rules(profile):
    if profile.get('ruleVersion') != RULE or profile.get('classificationSha256') != classification_hash():
        raise ValueError('Stored classification rules differ from current code. Use a fresh database to rebuild from the immutable workbook.')


def connect(path=None):
    p = Path(path or ROOT / 'data/revenuelens.sqlite3')
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(p)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    con.execute('PRAGMA journal_mode=WAL')
    con.execute('PRAGMA synchronous=NORMAL')
    con.execute('PRAGMA cache_size=-96000')
    con.executescript((ROOT / 'sql/00_schema.sql').read_text(encoding='utf-8'))
    return con


def download():
    raw = ROOT / 'data/raw'
    raw.mkdir(parents=True, exist_ok=True)
    archive = raw / 'online-retail-ii.zip'
    workbook = raw / 'online_retail_II.xlsx'
    if not archive.exists():
        request = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'RevenueLens/1.0 educational analysis'})
        tmp = archive.with_suffix('.download')
        with urllib.request.urlopen(request, timeout=120) as response, tmp.open('wb') as stream:
            while chunk := response.read(1024 * 1024):
                stream.write(chunk)
        tmp.replace(archive)
    with zipfile.ZipFile(archive) as z:
        matches = [n for n in z.namelist() if Path(n).name == 'online_retail_II.xlsx']
        if len(matches) != 1:
            raise ValueError('Expected one official workbook in UCI archive')
        if not workbook.exists():
            with z.open(matches[0]) as src, workbook.open('wb') as dst:
                while chunk := src.read(1024 * 1024):
                    dst.write(chunk)
    manifest = {'dataset': 'Online Retail II', 'creator': 'Daqing Chen',
                'sourceUrl': SOURCE_URL, 'datasetUrl': DATASET_URL,
                'doi': '10.24432/C5CG6D', 'license': 'CC BY 4.0',
                'retrievedAt': now(), 'archiveSha256': digest(archive),
                'workbookSha256': digest(workbook), 'workbookBytes': workbook.stat().st_size}
    existing = ROOT / 'data/manifest.json'
    if existing.exists():
        previous = json.loads(existing.read_text(encoding='utf-8'))
        if previous.get('workbookSha256') == manifest['workbookSha256']:
            manifest['retrievedAt'] = previous['retrievedAt']
    write_json(existing, manifest)
    print(json.dumps({'download': 'ready', 'sha256': manifest['workbookSha256']}), flush=True)
    return workbook


def import_workbook(con, workbook=None):
    import openpyxl
    workbook = Path(workbook or ROOT / 'data/raw/online_retail_II.xlsx')
    if not workbook.exists():
        raise FileNotFoundError('Run python -m pipeline.cli download first.')
    sha = digest(workbook)
    existing = con.execute('SELECT row_count,profile_json FROM dataset WHERE sha256=?', (sha,)).fetchone()
    if existing and existing['row_count'] > 0:
        saved = json.loads(existing['profile_json'])
        require_current_rules(saved)
        print(json.dumps({'import': 'unchanged', 'rows': existing['row_count'], 'sha256': sha}), flush=True)
        return saved
    if con.execute('SELECT COUNT(*) FROM dataset').fetchone()[0]:
        raise ValueError('This database is a frozen single snapshot. Use a new database for a changed workbook.')
    wb = openpyxl.load_workbook(workbook, read_only=True, data_only=True)
    con.execute('INSERT INTO dataset(sha256,source_url,imported_at) VALUES (?,?,?)', (sha, SOURCE_URL, now()))
    profile = {'sha256': sha, 'sheets': [], 'rowCount': 0, 'numericMovementUnits': 0,
               'unparsedAmountRows': 0, 'sourceUrl': SOURCE_URL, 'unitScale': SCALE,
               'ruleVersion': RULE, 'classificationSha256': classification_hash(),
               'excludedStockCodes': sorted(NON_MERCHANDISE)}
    sql = '''INSERT INTO raw_line(source_sha,sheet,source_row,content_hash,payload,
      invoice,stock,description,quantity,price_units,stamp,customer,country,amount_units,disposition,reason)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'''
    for sheet in wb:
        rows = iter(sheet.values)
        headers = list(next(rows))
        if headers != HEADERS:
            raise ValueError(f'Unexpected workbook headers for {sheet.title}: {headers}')
        record = {'name': sheet.title, 'headers': headers, 'rows': 0, 'start': None, 'end': None,
                  'missingCustomerRows': 0, 'quantityMin': None, 'quantityMax': None,
                  'priceMin': None, 'priceMax': None}
        batch = []
        for ordinal, values in enumerate(rows, 2):
            values = tuple(values[:8])
            typed = classify(values)
            original = [v.isoformat(sep=' ') if isinstance(v, datetime) else v for v in values]
            payload = json.dumps(dict(zip(HEADERS, original)), ensure_ascii=False, separators=(',', ':'), default=str)
            content_hash = hashlib.sha256(payload.encode()).hexdigest()
            batch.append((sha, sheet.title, ordinal, content_hash, payload, *typed))
            record['rows'] += 1
            profile['rowCount'] += 1
            if typed[6] == UNKNOWN:
                record['missingCustomerRows'] += 1
            if typed[5]:
                record['start'] = min(record['start'] or typed[5], typed[5])
                record['end'] = max(record['end'] or typed[5], typed[5])
            for field, val in [('quantity', typed[3]), ('price', typed[4] / SCALE if typed[4] is not None else None)]:
                if val is not None:
                    record[field + 'Min'] = min(record[field + 'Min'] if record[field + 'Min'] is not None else val, val)
                    record[field + 'Max'] = max(record[field + 'Max'] if record[field + 'Max'] is not None else val, val)
            if typed[8] is None:
                profile['unparsedAmountRows'] += 1
            else:
                profile['numericMovementUnits'] += typed[8]
            if len(batch) >= 5000:
                con.executemany(sql, batch)
                batch.clear()
        if batch:
            con.executemany(sql, batch)
        profile['sheets'].append(record)
        print(json.dumps({'importedSheet': sheet.title, 'rows': record['rows']}), flush=True)
    profile['snapshotStart'] = min(s['start'] for s in profile['sheets'])
    profile['snapshotEnd'] = max(s['end'] for s in profile['sheets'])
    # The final source month is incomplete. Its rows remain visible in quality.
    cutoff = datetime.fromisoformat(profile['snapshotEnd']).replace(day=1, hour=0, minute=0, second=0)
    profile['completeThrough'] = (cutoff - timedelta(days=1)).date().isoformat()
    profile['completeMonthCutoff'] = cutoff.isoformat(sep=' ')
    profile['cohortObservationCutoff'] = profile['snapshotEnd']
    con.execute('UPDATE dataset SET row_count=?,profile_json=? WHERE sha256=?',
                (profile['rowCount'], json.dumps(profile), sha))
    con.commit()
    wb.close()
    write_json(ROOT / 'artifacts/profile.json', profile)
    return profile


def build_facts(con):
    con.execute('CREATE INDEX IF NOT EXISTS ix_raw_invoice ON raw_line(invoice)')
    con.execute('CREATE INDEX IF NOT EXISTS ix_raw_content ON raw_line(content_hash)')
    con.execute('DROP TABLE IF EXISTS invoice_collision')
    con.execute('''CREATE TABLE invoice_collision AS SELECT invoice,COUNT(*) AS rows,
       SUM(amount_units) AS amount_units FROM raw_line WHERE invoice<>''
       GROUP BY invoice HAVING COUNT(DISTINCT COALESCE(stamp,'[missing]'))>1
       OR COUNT(DISTINCT COALESCE(customer,'[missing]'))>1
       OR COUNT(DISTINCT COALESCE(country,'[missing]'))>1''')
    con.execute('CREATE UNIQUE INDEX ix_collision_invoice ON invoice_collision(invoice)')
    # Rebuilding is deterministic: colliding invoices stay quarantined, and
    # immutable payloads/source ordinals remain available to inspect the choice.
    con.execute("UPDATE raw_line SET disposition='invoice_collision',reason='Whole invoice quarantined: inconsistent timestamp, customer or country.' WHERE invoice IN (SELECT invoice FROM invoice_collision)")
    con.execute('DROP TABLE IF EXISTS duplicate_group')
    con.execute('CREATE TABLE duplicate_group AS SELECT content_hash,COUNT(*) AS n,MIN(id) AS retained_id FROM raw_line GROUP BY content_hash HAVING COUNT(*)>1')
    con.execute('CREATE UNIQUE INDEX ix_duplicate_hash ON duplicate_group(content_hash)')
    con.execute('UPDATE raw_line SET duplicate_candidate=1 WHERE content_hash IN (SELECT content_hash FROM duplicate_group)')
    con.execute('DELETE FROM fact_invoice_line')
    con.execute('DELETE FROM dim_invoice')
    con.execute('DELETE FROM dim_customer')
    con.execute('DELETE FROM dim_product')
    con.execute('DELETE FROM dim_country')
    condition = "disposition IN ('sale','cancellation')"
    con.execute(f"INSERT INTO dim_customer SELECT DISTINCT customer,customer='{UNKNOWN}' FROM raw_line WHERE {condition}")
    con.execute(f'INSERT INTO dim_product SELECT stock,MIN(description) FROM raw_line WHERE {condition} GROUP BY stock')
    con.execute(f'INSERT INTO dim_country SELECT DISTINCT country FROM raw_line WHERE {condition}')
    con.execute(f'INSERT INTO dim_invoice SELECT invoice,MIN(stamp),MIN(customer),MIN(country) FROM raw_line WHERE {condition} GROUP BY invoice')
    con.execute(f'''INSERT INTO fact_invoice_line SELECT id,invoice,stock,customer,country,stamp,
      SUBSTR(stamp,1,7),quantity,price_units,amount_units,disposition,duplicate_candidate
      FROM raw_line WHERE {condition}''')
    con.executescript((ROOT / 'sql/20_marts.sql').read_text(encoding='utf-8'))
    con.commit()
    con.execute('PRAGMA optimize')
    print(json.dumps({'facts': con.execute('SELECT COUNT(*) FROM fact_invoice_line').fetchone()[0],
                      'collidingInvoices': con.execute('SELECT COUNT(*) FROM invoice_collision').fetchone()[0]}), flush=True)


def gbp(n):
    return n / SCALE if n is not None else None


def metrics(row=None):
    if row is None:
        return {'sales': None, 'cancellations': None, 'net': None, 'invoices': 0, 'aov': None,
                'customers': 0, 'knownSales': None, 'knownInvoices': 0, 'anonymousSales': None,
                'anonymousShare': None, 'units': 0, 'rows': 0}
    d = dict(row)
    sales, cancellations = gbp(d['sales_units']), gbp(d['cancellation_units'])
    return {'sales': sales, 'cancellations': cancellations, 'net': sales - cancellations,
            'invoices': d['invoices'], 'aov': sales / d['invoices'] if d['invoices'] else None,
            'customers': d['customers'], 'knownSales': gbp(d['known_sales_units']),
            'knownInvoices': d['known_invoices'], 'anonymousSales': gbp(d['anonymous_sales_units']),
            'anonymousShare': d['anonymous_sales_units'] / d['sales_units'] if d['sales_units'] else None,
            'units': d['units'], 'rows': d['rows']}


def shapley(previous, current):
    if not all(m['customers'] and m['knownInvoices'] for m in (previous, current)):
        return None
    a = [previous['customers'], previous['knownInvoices'] / previous['customers'], previous['knownSales'] / previous['knownInvoices']]
    b = [current['customers'], current['knownInvoices'] / current['customers'], current['knownSales'] / current['knownInvoices']]
    out = [0.0, 0.0, 0.0]
    for order in permutations(range(3)):
        state = a[:]
        for index in order:
            before = math.prod(state)
            state[index] = b[index]
            out[index] += (math.prod(state) - before) / 6
    return [{'factor': name, 'previous': a[i], 'current': b[i], 'contribution': out[i]}
            for i, name in enumerate(['Purchasing customers', 'Invoices per customer', 'Sales per invoice'])]


def pseudonym(customer):
    return 'Anonymous' if customer == UNKNOWN else 'C-' + hashlib.sha256(customer.encode()).hexdigest()[:8].upper()


def bridge(previous, current, limit=9, labels=None):
    labels = labels or {}
    keys = set(previous) | set(current)
    entries = [{'name': labels.get(k, k), 'key': k,
                'previous': gbp(previous.get(k, 0)), 'current': gbp(current.get(k, 0)),
                'delta': gbp(current.get(k, 0) - previous.get(k, 0))} for k in keys]
    entries.sort(key=lambda x: (-abs(x['delta']), x['key']))
    top, rest = entries[:limit], entries[limit:]
    if rest:
        top.append({'name': 'Other', 'key': '__OTHER__', 'previous': sum(x['previous'] for x in rest),
                    'current': sum(x['current'] for x in rest), 'delta': sum(x['delta'] for x in rest)})
    return top


def delta(previous, current):
    out = {}
    for key in ('sales', 'net', 'invoices', 'aov', 'cancellations', 'customers'):
        a, b = previous[key], current[key]
        out[key] = b - a if a is not None and b is not None else None
        out[key + 'Pct'] = (b - a) / a if a not in (None, 0) and b is not None else None
    return out


def export_cohorts(con, profile):
    first = [dict(r) for r in con.execute('SELECT * FROM mart_customer_first')]
    observations = defaultdict(set)
    repeated = set()
    first_by = {r['customer_key']: r for r in first}
    for r in con.execute("SELECT DISTINCT customer_key,month,stamp,invoice_key FROM mart_invoice WHERE customer_key<>'__UNKNOWN__'"):
        observations[r['customer_key']].add(r['month'])
        f = first_by[r['customer_key']]
        start = datetime.fromisoformat(f['first_stamp'])
        stamp = datetime.fromisoformat(r['stamp'])
        if r['invoice_key'] != f['first_invoice'] and start < stamp <= start + timedelta(days=90):
            repeated.add(r['customer_key'])
    cutoff = datetime.fromisoformat(profile['cohortObservationCutoff'])
    last_complete = profile['completeThrough'][:7]
    by_country = defaultdict(lambda: defaultdict(list))
    for f in first:
        by_country[ALL][f['cohort']].append(f)
        by_country[f['first_country']][f['cohort']].append(f)
    result = {}
    for country, groups in by_country.items():
        output = []
        for cohort in sorted(groups):
            group = groups[cohort]
            mature = [f for f in group if datetime.fromisoformat(f['first_stamp']) + timedelta(days=90) <= cutoff]
            repeats = sum(f['customer_key'] in repeated for f in mature)
            cells = []
            for offset in range(13):
                year, month = map(int, cohort.split('-'))
                absolute = year * 12 + month - 1 + offset
                target = f'{absolute // 12:04d}-{absolute % 12 + 1:02d}'
                buyers = sum(target in observations[f['customer_key']] for f in group) if target <= last_complete else None
                cells.append({'offset': offset, 'month': target, 'buyers': buyers,
                              'rate': buyers / len(group) if buyers is not None else None})
            output.append({'cohort': cohort, 'size': len(group), 'mature90': len(mature),
                           'repeat90': repeats, 'repeat90Rate': repeats / len(mature) if mature else None,
                           'cells': cells})
        result[country] = output
    return result


def quality_export(con, profile):
    counts = [{'disposition': r[0], 'rows': r[1], 'amount': gbp(r[2]), 'amountUnits': r[2]}
              for r in con.execute('SELECT disposition,COUNT(*),COALESCE(SUM(amount_units),0) FROM raw_line GROUP BY disposition ORDER BY COUNT(*) DESC')]
    duplicate = con.execute('SELECT COUNT(*),COALESCE(SUM(n),0),COALESCE(SUM(n-1),0) FROM duplicate_group').fetchone()
    duplicate_amount = con.execute("SELECT COALESCE(SUM(amount_units),0) FROM raw_line WHERE disposition='sale' AND id NOT IN (SELECT retained_id FROM duplicate_group) AND content_hash IN (SELECT content_hash FROM duplicate_group)").fetchone()[0]
    cross_sheet = con.execute('''SELECT COUNT(*),COALESCE(SUM(n),0),COALESCE(SUM(n-1),0)
        FROM (SELECT r.content_hash,COUNT(*) AS n FROM duplicate_group d
        JOIN raw_line r ON r.content_hash=d.content_hash GROUP BY r.content_hash
        HAVING COUNT(DISTINCT r.sheet)>1)''').fetchone()
    collisions = con.execute('SELECT COUNT(*),COALESCE(SUM(rows),0),COALESCE(SUM(amount_units),0) FROM invoice_collision').fetchone()
    raw = con.execute('SELECT COUNT(*),SUM(amount_units),SUM(amount_units IS NULL) FROM raw_line').fetchone()
    parsed_total = raw[1] or 0
    reconciliation = {'rawNumericMovement': gbp(parsed_total), 'rawNumericMovementUnits': parsed_total,
                      'classifiedMovement': sum(c['amount'] for c in counts),
                      'classifiedMovementUnits': sum(c['amountUnits'] for c in counts),
                      'unparsedAmountRows': raw[2], 'differenceUnits': parsed_total - sum(c['amountUnits'] for c in counts)}
    by_disposition = {c['disposition']: c['amount'] for c in counts}
    reconciliation.update({
        'rawMovement': gbp(parsed_total), 'sales': by_disposition.get('sale',0),
        'cancellationMovement': by_disposition.get('cancellation',0),
        'otherMovement': by_disposition.get('other_movement',0) + by_disposition.get('non_merchandise',0),
        'quarantinedMovement': by_disposition.get('quarantined',0) + by_disposition.get('invoice_collision',0) + by_disposition.get('unparsed_amount',0),
        'unparsedRows': raw[2], 'difference': gbp(reconciliation['differenceUnits'])})
    samples = []
    for disposition in [c['disposition'] for c in counts]:
        for r in con.execute('SELECT * FROM raw_line WHERE disposition=? ORDER BY id LIMIT 5', (disposition,)):
            samples.append({'sheet': r['sheet'], 'row': r['source_row'], 'invoice': r['invoice'],
                            'stock': r['stock'], 'description': r['description'],
                            'quantity': r['quantity'], 'price': gbp(r['price_units']),
                            'amount': gbp(r['amount_units']), 'disposition': r['disposition'], 'reason': r['reason']})
    return {'counts': counts, 'reconciliation': reconciliation,
            'duplicates': {'groups': duplicate[0], 'rows': duplicate[1], 'excessRows': duplicate[2],
                           'crossSheetGroups': cross_sheet[0], 'crossSheetRows': cross_sheet[1],
                           'crossSheetExcessRows': cross_sheet[2],
                           'policy': 'All distinct source rows retained; identical content is a review candidate.',
                           'deduplicatedSaleDifference': gbp(duplicate_amount)},
            'collisions': {'invoices': collisions[0], 'rows': collisions[1], 'amount': gbp(collisions[2]),
                           'policy': 'Entire invoice quarantined if timestamp, customer or country differs.'},
            'samples': samples, 'excludedStockCodes': sorted(NON_MERCHANDISE),
            'incompleteMonth': profile['snapshotEnd'][:7],
            'overlapCaveat': 'Workbook sheets overlap during December 2010. Identical-content rows are retained; the duplicate scenario removes excess identical-content rows and is a sensitivity analysis, not a certified correction.',
            'cohortCutoff': profile['cohortObservationCutoff'],
            'rules': {'amountPrecision': 'Integer 1/10000 GBP; source-local timestamps.',
                      'sensitivity': 'Remove the five largest eligible sale invoices independently in each compared period.',
                      'cohortCountry': 'Country on first observed eligible invoice; ties resolved by invoice identifier.',
                      'completeMonths': 'Only months strictly before final source month; final month never treated as zero.',
                      'repeat90': 'Second distinct invoice strictly later and within 90 days, mature at last source timestamp.'}}


def export(con, profile=None):
    start = time.perf_counter()
    profile = profile or json.loads(con.execute('SELECT profile_json FROM dataset').fetchone()[0])
    require_current_rules(profile)
    cutoff = profile['completeThrough'][:7]
    monthly = {}
    for row in con.execute('SELECT * FROM mart_monthly'):
        monthly[(row['month'], row['country'])] = metrics(row)
    # Aggregate directly from facts for ALL; never sum distinct customer counts.
    all_sql = '''SELECT month, SUM(CASE WHEN line_class='sale' THEN amount_units ELSE 0 END) sales_units,
      -SUM(CASE WHEN line_class='cancellation' THEN amount_units ELSE 0 END) cancellation_units,
      COUNT(DISTINCT CASE WHEN line_class='sale' THEN invoice_key END) invoices,
      COUNT(DISTINCT CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN customer_key END) customers,
      SUM(CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN amount_units ELSE 0 END) known_sales_units,
      COUNT(DISTINCT CASE WHEN line_class='sale' AND customer_key<>'__UNKNOWN__' THEN invoice_key END) known_invoices,
      SUM(CASE WHEN line_class='sale' AND customer_key='__UNKNOWN__' THEN amount_units ELSE 0 END) anonymous_sales_units,
      SUM(CASE WHEN line_class='sale' THEN quantity ELSE 0 END) units,COUNT(*) rows
      FROM fact_invoice_line GROUP BY month'''
    for row in con.execute(all_sql):
        monthly[(row['month'], ALL)] = metrics(row)
    months = sorted({m for m, _ in monthly if m <= cutoff})
    countries = [ALL] + sorted({c for _, c in monthly if c != ALL})
    periods = []
    for m in months:
        previous = f'{int(m[:4])-1}{m[4:]}'
        if previous in months:
            periods.append({'id': m, 'label': datetime.strptime(m, '%Y-%m').strftime('%B %Y'),
                            'previous': previous, 'previousLabel': datetime.strptime(previous, '%Y-%m').strftime('%B %Y')})
    invoice_groups = defaultdict(list)
    customer_sales = defaultdict(lambda: defaultdict(int))
    for r in con.execute('SELECT * FROM mart_invoice'):
        item = dict(r)
        invoice_groups[(r['month'], r['country_key'])].append(item)
        invoice_groups[(r['month'], ALL)].append(item)
        if r['customer_key'] != UNKNOWN:
            customer_sales[(r['month'], r['country_key'])][r['customer_key']] += r['sales_units']
            customer_sales[(r['month'], ALL)][r['customer_key']] += r['sales_units']
    for values in invoice_groups.values():
        values.sort(key=lambda r: (-r['sales_units'], r['invoice_key']))
    product_sales = defaultdict(lambda: defaultdict(int))
    for r in con.execute("SELECT month,country_key,product_key,SUM(amount_units) amount FROM fact_invoice_line WHERE line_class='sale' GROUP BY month,country_key,product_key"):
        product_sales[(r['month'], r['country_key'])][r['product_key']] += r['amount']
        product_sales[(r['month'], ALL)][r['product_key']] += r['amount']
    descriptions = {r[0]: r[1] for r in con.execute('SELECT * FROM dim_product')}
    labels = {key: f'{key} · {value}' for key, value in descriptions.items()}
    duplicate_excess = defaultdict(int)
    for r in con.execute('''SELECT SUBSTR(r.stamp,1,7) month,r.country,SUM(r.amount_units) amount
         FROM duplicate_group d JOIN raw_line r ON r.content_hash=d.content_hash
         WHERE r.id<>d.retained_id AND r.disposition='sale' GROUP BY month,r.country'''):
        duplicate_excess[(r['month'],r['country'])] += r['amount']
        duplicate_excess[(r['month'],ALL)] += r['amount']
    comparisons, invoice_ids = {}, set()
    for period in periods:
        month, prev = period['id'], period['previous']
        for country in countries:
            current, previous = monthly.get((month, country), metrics()), monthly.get((prev, country), metrics())
            invoices = invoice_groups[(month, country)]
            current_customers = sorted(customer_sales[(month, country)].values(), reverse=True)
            current_products = sorted(product_sales[(month, country)].values(), reverse=True)
            known = current['knownSales'] or 0
            headline = current['sales'] or 0
            top = []
            for r in invoices[:8]:
                invoice_ids.add(r['invoice_key'])
                top.append({'id': r['invoice_key'], 'date': r['stamp'], 'country': r['country_key'],
                            'customer': pseudonym(r['customer_key']), 'sales': gbp(r['sales_units']), 'lines': r['line_count']})
            country_current = {c: int(round((monthly[(month, c)]['sales'] or 0) * SCALE)) for c in countries[1:] if (month, c) in monthly and (country == ALL or country == c)}
            country_previous = {c: int(round((monthly[(prev, c)]['sales'] or 0) * SCALE)) for c in countries[1:] if (prev, c) in monthly and (country == ALL or country == c)}
            old_top = invoice_groups[(prev, country)][:5]
            new_top = invoices[:5]
            old_sens = previous['sales'] - sum(gbp(r['sales_units']) for r in old_top) if previous['sales'] is not None else None
            new_sens = current['sales'] - sum(gbp(r['sales_units']) for r in new_top) if current['sales'] is not None else None
            sens_delta = new_sens - old_sens if new_sens is not None and old_sens is not None else None
            duplicate_current = gbp(duplicate_excess[(month,country)])
            duplicate_previous = gbp(duplicate_excess[(prev,country)])
            dedup_current = current['sales'] - duplicate_current if current['sales'] is not None else None
            dedup_previous = previous['sales'] - duplicate_previous if previous['sales'] is not None else None
            dedup_delta = dedup_current-dedup_previous if dedup_current is not None and dedup_previous is not None else None
            comparisons[month + '|' + country] = {
                'current': current, 'previous': previous, 'delta': delta(previous, current),
                'shapley': shapley(previous, current),
                'countryBridge': bridge(country_previous, country_current),
                'productBridge': bridge(product_sales[(prev, country)], product_sales[(month, country)], labels=labels),
                'topInvoices': top,
                'concentration': {'top1CustomerShare': gbp(sum(current_customers[:1])) / known if known else None,
                                  'top10CustomerShare': gbp(sum(current_customers[:10])) / known if known else None,
                                  'top10ProductShare': gbp(sum(current_products[:10])) / headline if headline else None},
                'sensitivity': {'removeTopN': 5, 'currentSales': new_sens, 'previousSales': old_sens,
                                'delta': sens_delta, 'deltaPct': sens_delta / old_sens if old_sens and sens_delta is not None else None,
                                'duplicateExcessCurrent': duplicate_current, 'duplicateExcessPrevious': duplicate_previous,
                                'deduplicatedCurrentSales': dedup_current, 'deduplicatedPreviousSales': dedup_previous,
                                'deduplicatedDelta': dedup_delta,
                                'deduplicatedDeltaPct': dedup_delta/dedup_previous if dedup_previous and dedup_delta is not None else None,
                                'currentRemoved': len(new_top), 'previousRemoved': len(old_top)}}
    invoices_detail = {}
    for invoice in sorted(invoice_ids):
        summary = con.execute('SELECT * FROM mart_invoice WHERE invoice_key=?', (invoice,)).fetchone()
        items = []
        for r in con.execute('''SELECT r.* FROM fact_invoice_line f JOIN raw_line r ON r.id=f.raw_id
                                 WHERE f.invoice_key=? ORDER BY r.sheet,r.source_row LIMIT 100''', (invoice,)):
            items.append({'sheet': r['sheet'], 'row': r['source_row'], 'stock': r['stock'],
                          'description': r['description'], 'quantity': r['quantity'],
                          'price': gbp(r['price_units']), 'amount': gbp(r['amount_units'])})
        invoices_detail[invoice] = {'id': invoice, 'date': summary['stamp'], 'country': summary['country_key'],
                                   'customer': pseudonym(summary['customer_key']), 'sales': gbp(summary['sales_units']),
                                   'lineCount': summary['line_count'], 'items': items,
                                   'truncated': summary['line_count'] > len(items)}
    quality = quality_export(con, profile)
    meta = {'title': 'RevenueLens', 'sourceName': 'UCI Online Retail II', 'sourceUrl': DATASET_URL,
            'creator': 'Daqing Chen', 'license': 'CC BY 4.0', 'doi': '10.24432/C5CG6D',
            'sourceSha256': profile['sha256'], 'snapshotStart': profile['snapshotStart'],
            'snapshotEnd': profile['snapshotEnd'], 'completeThrough': profile['completeThrough'],
            'rowCount': profile['rowCount'], 'ruleVersion': RULE, 'generatedAt': now(),
            'unitScale': SCALE, 'sheets': profile['sheets'],
            'cohortCutoff': profile['cohortObservationCutoff'],
            'historical': True, 'currency': 'GBP', 'timeZone': 'Source-local, unspecified',
            'policy': quality['rules'], 'excludedStockCodes': sorted(NON_MERCHANDISE),
            'ruleSha256': digest(Path(__file__))}
    meta['classificationSha256'] = profile.get('classificationSha256',classification_hash())
    dashboard = {'meta': meta, 'periods': periods, 'countries': countries,
                 'monthly': [{'month': m, 'country': c, **v} for (m, c), v in sorted(monthly.items()) if m <= cutoff],
                 'comparisons': comparisons, 'cohorts': export_cohorts(con, profile),
                 'quality': quality, 'invoices': invoices_detail}
    write_json(ROOT / 'dist/data/dashboard.json', dashboard)
    write_json(ROOT / 'artifacts/reconciliation.json', {'sourceSha256': profile['sha256'], 'ruleVersion': RULE,
               'unitScale': SCALE, **quality['reconciliation'], 'dispositions': quality['counts'],
               'independentImportMovementUnits': profile['numericMovementUnits']})
    write_json(ROOT / 'artifacts/profile.json', profile)
    import csv
    for name, rows in [('monthly_metrics', dashboard['monthly']),
                       ('cohorts', [{'country': c, **{k: v for k, v in row.items() if k != 'cells'}} for c, values in dashboard['cohorts'].items() for row in values])]:
        target = ROOT / 'artifacts' / (name + '.csv')
        if rows:
            with target.open('w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)
    # BI-friendly fact snapshot preserves grain and pseudonymous identifiers.
    target = ROOT / 'artifacts/FactInvoiceLine.csv'
    with target.open('w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['RawID','InvoiceKey','ProductKey','CustomerKey','Country','InvoiceDate','Month','Quantity','UnitPriceGBP','SignedAmount','LineClass','EligibleMerchandise','SourceSheet','SourceRow'])
        for r in con.execute('''SELECT f.*,r.sheet,r.source_row FROM fact_invoice_line f JOIN raw_line r ON r.id=f.raw_id ORDER BY f.raw_id'''):
            writer.writerow([r['raw_id'],r['invoice_key'],r['product_key'],pseudonym(r['customer_key']),r['country_key'],r['stamp'],r['month'],r['quantity'],str(Decimal(r['price_units'])/SCALE),str(Decimal(r['amount_units'])/SCALE),r['line_class'],'TRUE',r['sheet'],r['source_row']])
    with target.open('r',encoding='utf-8',newline='') as src, (ROOT/'artifacts/invoice_line_sample.csv').open('w',encoding='utf-8',newline='') as dst:
        reader, writer = csv.reader(src), csv.writer(dst)
        for i,row in enumerate(reader):
            writer.writerow(row)
            if i>=100:
                break
    manifest = {'generatedAt': now(), 'command': 'python -m pipeline.cli ' + (sys.argv[1] if len(sys.argv)>1 else 'export'), 'python': sys.version,
                'platform': platform.platform(), 'sqlite': sqlite3.sqlite_version, 'sourceSha256': profile['sha256'],
                'ruleVersion': RULE, 'ruleSha256': meta['ruleSha256'], 'unitScale': SCALE,
                'dashboardBytes': (ROOT / 'dist/data/dashboard.json').stat().st_size,
                'dashboardSha256': digest(ROOT / 'dist/data/dashboard.json'),
                'artifactHashes': {p.name: digest(p) for p in sorted((ROOT / 'artifacts').glob('*')) if p.is_file() and p.name not in ('run-manifest.json','validation.json')},
                'exportSeconds': round(time.perf_counter()-start, 3)}
    write_json(ROOT / 'artifacts/run-manifest.json', manifest)
    print(json.dumps({'export': 'complete', 'comparisons': len(comparisons), 'dashboardBytes': manifest['dashboardBytes']}), flush=True)
    return dashboard


def validate(con, dashboard=None):
    dashboard = dashboard or json.loads((ROOT / 'dist/data/dashboard.json').read_text(encoding='utf-8'))
    profile = json.loads(con.execute('SELECT profile_json FROM dataset').fetchone()[0])
    checks = []
    def check(name, passed, detail=None):
        checks.append({'name': name, 'passed': bool(passed), 'detail': detail})
    check('foreign_key_integrity', not con.execute('PRAGMA foreign_key_check').fetchall())
    check('source_row_count', con.execute('SELECT COUNT(*) FROM raw_line').fetchone()[0] == profile['rowCount'])
    raw_total = con.execute('SELECT SUM(amount_units) FROM raw_line').fetchone()[0]
    check('independent_streaming_raw_movement', raw_total == profile['numericMovementUnits'], raw_total)
    check('exact_disposition_reconciliation', dashboard['quality']['reconciliation']['differenceUnits'] == 0)
    source_coverage = True
    for kind in ('sale','cancellation'):
        raw_count, raw_amount = con.execute('SELECT COUNT(*),COALESCE(SUM(amount_units),0) FROM raw_line WHERE disposition=?',(kind,)).fetchone()
        fact_count, fact_amount = con.execute('SELECT COUNT(*),COALESCE(SUM(amount_units),0) FROM fact_invoice_line WHERE line_class=?',(kind,)).fetchone()
        source_coverage &= (raw_count,raw_amount) == (fact_count,fact_amount)
    check('accepted_source_to_fact_row_and_amount_coverage', source_coverage)
    # Independent Python aggregation over invoice facts, distinct from mart SQL.
    independent = defaultdict(int)
    for month, country, amount in con.execute("SELECT month,country_key,amount_units FROM fact_invoice_line WHERE line_class='sale'"):
        independent[(month, country)] += amount
        independent[(month, ALL)] += amount
    check('independent_python_month_country_totals', all(abs(independent[(r['month'],r['country'])]/SCALE - (r['sales'] or 0)) < 0.00001 for r in dashboard['monthly']))
    check('no_colliding_invoice_in_fact', con.execute('SELECT COUNT(*) FROM fact_invoice_line WHERE invoice_key IN (SELECT invoice FROM invoice_collision)').fetchone()[0] == 0)
    check('no_join_fanout', con.execute('SELECT COUNT(*) FROM fact_invoice_line').fetchone()[0] == con.execute('''SELECT COUNT(*) FROM fact_invoice_line f JOIN raw_line r ON r.id=f.raw_id JOIN dim_invoice i ON i.invoice_key=f.invoice_key JOIN dim_customer c ON c.customer_key=f.customer_key JOIN dim_product p ON p.product_key=f.product_key JOIN dim_country g ON g.country_key=f.country_key''').fetchone()[0])
    shapley_ok = bridge_ok = True
    for c in dashboard['comparisons'].values():
        if c['shapley']:
            expected = c['current']['knownSales'] - c['previous']['knownSales']
            shapley_ok &= abs(sum(s['contribution'] for s in c['shapley']) - expected) < 0.00001
        if c['current']['sales'] is not None and c['previous']['sales'] is not None:
            for key in ['countryBridge','productBridge']:
                bridge_ok &= abs(sum(s['delta'] for s in c[key]) - c['delta']['sales']) < 0.00001
    check('six_order_shapley_identity', shapley_ok)
    check('additive_bridges_with_other_reconcile', bridge_ok)
    cohort_ok = all(cell['rate'] is None if cell['month'] > profile['completeThrough'][:7] else cell['rate'] is not None
                    for rows in dashboard['cohorts'].values() for row in rows for cell in row['cells'])
    check('immature_months_are_null', cohort_ok)
    check('anonymous_customers_absent_from_cohorts', con.execute('SELECT COUNT(*) FROM mart_customer_first WHERE customer_key=?', (UNKNOWN,)).fetchone()[0] == 0)
    check('fact_money_is_integer', con.execute("SELECT COUNT(*) FROM fact_invoice_line WHERE typeof(amount_units)<>'integer' OR typeof(price_units)<>'integer'").fetchone()[0] == 0)
    check('dashboard_under_12mb', (ROOT / 'dist/data/dashboard.json').stat().st_size < 12_000_000)
    result = {'validatedAt': now(), 'sourceSha256': profile['sha256'], 'ruleVersion': RULE,
              'checks': checks, 'passed': all(c['passed'] for c in checks)}
    write_json(ROOT / 'artifacts/validation.json', result)
    print(json.dumps(result), flush=True)
    if not result['passed']:
        raise ValueError('Validation failed: ' + ', '.join(c['name'] for c in checks if not c['passed']))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['download','build','validate','export'])
    args = parser.parse_args()
    if args.command == 'download':
        download()
        return
    con = connect()
    try:
        if args.command == 'build':
            profile = import_workbook(con)
            build_facts(con)
            dashboard = export(con, profile)
            validate(con, dashboard)
        elif args.command == 'export':
            dashboard = export(con)
            validate(con, dashboard)
        else:
            validate(con)
    finally:
        con.close()


if __name__ == '__main__':
    main()
