"""Exact-decimal oracle for the public invoice fixture; no model or network calls."""
from collections import Counter
from copy import deepcopy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
import csv
import json
import hashlib
import posixpath
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / 'docs/ai/examples'
CENT = Decimal('0.01')
FIELDS = ['base', 'discount', 'net', 'tax', 'gross']
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def decimal(text):
    value = Decimal(text)
    require(value.is_finite(), 'Non-finite amount')
    return value


def calculate(row):
    quantity, price, discount, tax = [decimal(row[k]) for k in
                                    ['quantity', 'unit_price', 'discount_percent', 'tax_percent']]
    require(quantity >= 0 and price >= 0, 'Negative fixture inputs require a separate policy')
    require(0 <= discount <= 100 and 0 <= tax <= 100, 'Rate outside fixture bounds')
    base = quantity * price
    deduction = (base * discount / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    net = base - deduction
    tax_amount = (net * tax / 100).quantize(CENT, rounding=ROUND_HALF_UP)
    return dict(zip(FIELDS, [base, deduction, net, tax_amount, net + tax_amount]))


def validate(rows, expected):
    require(expected['synthetic'] is True, 'Synthetic scope missing')
    counts = Counter(row['invoice_id'] for row in rows)
    duplicates = sorted(key for key, n in counts.items() if n > 1)
    invalid = []
    for row in rows:
        try:
            decimal(row['unit_price'])
        except (InvalidOperation, ValueError):
            invalid.append(row['invoice_id'])
    require(duplicates == expected['review']['duplicate_ids'], 'Duplicate review changed')
    require(invalid == expected['review']['invalid_price_ids'], 'Invalid-price review changed')
    # Physical rows identify occurrences. A repeated ID never implies a choice.
    selected = expected.get('approved_subset_csv_rows')
    require(selected == [2, 3, 4, 5, 6], 'Explicit reviewed physical-row selection required')
    require(set(expected['excluded_csv_rows']) == {'7', '8'}, 'Exclusion decisions missing')
    totals = {k: Decimal(0) for k in ['net', 'tax', 'gross']}
    calculated = []
    for row_number in selected:
        row = rows[row_number - 2]
        values = calculate(row)
        require(values == {k: Decimal(v) for k, v in expected['lines'][row['invoice_id']].items()},
                'Line arithmetic or per-line rounding changed at CSV row ' + str(row_number))
        for key in totals:
            totals[key] += values[key]
        calculated.append({'csv_row': row_number, 'id': row['invoice_id'],
                           **{k: format(v, '.2f') for k, v in values.items()}})
    require(totals == {k: Decimal(v) for k, v in expected['oracle_subset_totals'].items()},
            'Approved-subset totals changed')
    return calculated


def verify_live(rows, expected):
    folder = ROOT / 'reports/ai-decimal-2026-10-17'
    manifest = json.loads((folder / 'validation.json').read_text())
    require(manifest['synthetic'] is True, 'Live evidence must be synthetic')
    for item in manifest['files']:
        path = (ROOT / item['path']).resolve()
        require(path.is_relative_to(ROOT), 'Invalid evidence path')
        require(hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], 'Live evidence hash mismatch')
    records = {key: json.loads((folder / (key + '.result.json')).read_text())
               for key in ['D001', 'D002', 'D003', 'D004']}
    require([records[k]['passed'] for k in records] == [False, True, False, True],
            'Raw live classifications changed')
    require(records['D001']['evidence']['clarification'] and
            records['D001']['evidence']['calculations'] == [], 'First decision was not requested')
    require(not (records['D003'].get('evidence') or {}).get('clarification'), 'D003 observation changed')
    require(records['D004']['evidence']['clarification'] and
            records['D004']['evidence']['calculations'] == [] and
            'INV-005' in records['D004']['text'], 'Explicit unique-ID policy was not gated')
    output = folder / 'D002.xlsx'
    require(hashlib.sha256(output.read_bytes()).hexdigest() == records['D002']['outputSha256'],
            'Delivered workbook changed')
    with zipfile.ZipFile(output) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(n.itertext()) for n in
                      ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rels = {r.attrib['Id']: r.attrib['Target'] for r in
                ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            require(target.startswith('xl/'), 'Unexpected worksheet path')
            cells = {}
            for cell in ET.fromstring(archive.read(target)).findall('.//s:c', NS):
                f, v = cell.find('s:f', NS), cell.find('s:v', NS)
                kind = cell.attrib.get('t', 'n')
                if kind == 'inlineStr':
                    value = ''.join(n.text or '' for n in cell.findall('s:is//s:t', NS))
                elif kind == 's':
                    value = shared[int(v.text)]
                elif v is None or v.text is None:
                    value = None
                elif kind == 'n':
                    value = Decimal(v.text)
                else:
                    value = v.text
                cells[cell.attrib['r']] = {'value': value, 'formula': f.text if f is not None else None}
            sheets[sheet.attrib['name']] = cells
    with (FIXTURES / expected['fixture']).open(newline='', encoding='utf-8') as stream:
        source = list(csv.reader(stream))
    for row_number, row in enumerate(source, 1):
        for column, value in enumerate(row):
            cell = sheets['Veriler'][chr(65 + column) + str(row_number)]
            wanted = Decimal(value) if row_number > 1 and column >= 2 and value != 'INVALID' else value
            require(cell['formula'] is None and cell['value'] == wanted, 'Original source cell changed')
    # This reader does not evaluate arbitrary Excel. It verifies the complete
    # declared dependency formulas, then derives their values independently.
    checks = {(x['cell']): x for x in records['D002']['checks']}
    for row in range(2, 7):
        formula = {'A': f'Veriler!A{row}', 'B': f'Veriler!C{row}*Veriler!D{row}',
                   'C': f'ROUND(B{row}*Veriler!E{row}/100,2)', 'D': f'B{row}-C{row}',
                   'E': f'ROUND(D{row}*Veriler!F{row}/100,2)', 'F': f'D{row}+E{row}'}
        for column, text in formula.items():
            require(sheets['Hesaplar'][column + str(row)]['formula'] == text, 'Saved dependency formula differs')
        values = calculate(rows[row - 2])
        for column, key in zip('BCDEF', FIELDS):
            observed = checks['Hesaplar!' + column + str(row)]
            require(abs(Decimal(str(observed['actual'])) - values[key]) < Decimal('1e-9'),
                    'Recorded application result differs from Decimal oracle')
    for row, column, key in [(2, 'D', 'net'), (3, 'E', 'tax'), (4, 'F', 'gross')]:
        require(sheets['Ozet']['B' + str(row)]['formula'] == f'SUM(Hesaplar!{column}2:{column}6)',
                'Saved total formula differs')
        require(abs(Decimal(str(checks['Ozet!B' + str(row)]['actual'])) - Decimal(expected['oracle_subset_totals'][key])) < Decimal('1e-9'),
                'Recorded application total differs')
    require(len(checks) == 28, 'Live amount coverage changed')
    print('Saved live evidence verified: 4 attempts with raw outcomes retained; 48 source cells, 33 formulas, 28 Decimal amount comparisons. No new AI call.')


def run():
    expected = json.loads((FIXTURES / 'v3.24-decimal-invoices-expected.json').read_text())
    with (FIXTURES / expected['fixture']).open(newline='', encoding='utf-8') as stream:
        reader = csv.DictReader(stream)
        require(reader.fieldnames == ['invoice_id', 'customer', 'quantity', 'unit_price',
                                     'discount_percent', 'tax_percent'], 'CSV schema changed')
        rows = list(reader)
    require(len(rows) == 7, 'Fixture record count changed')
    result = validate(rows, expected)
    damaged = []
    bad = deepcopy(expected); bad['lines']['INV-005']['tax'] = '0.00'; damaged.append((rows, bad))
    bad = deepcopy(expected); bad['lines']['INV-001']['discount'] = '5.99'; damaged.append((rows, bad))
    bad = deepcopy(expected); bad['oracle_subset_totals']['gross'] = '65.12'; damaged.append((rows, bad))
    bad = deepcopy(expected); bad['approved_subset_csv_rows'].append(7); damaged.append((rows, bad))
    bad = deepcopy(expected); del bad['approved_subset_csv_rows']; damaged.append((rows, bad))
    bad_rows = deepcopy(rows); bad_rows[5]['invoice_id'] = 'INV-007'; damaged.append((bad_rows, expected))
    bad_rows = deepcopy(rows); bad_rows[6]['unit_price'] = '0'; damaged.append((bad_rows, expected))
    rejected = 0
    for changed_rows, changed_expected in damaged:
        try:
            validate(changed_rows, changed_expected)
        except (ValueError, InvalidOperation):
            rejected += 1
        else:
            raise ValueError('Damaged fixture accepted')
    print(json.dumps({'fixture': expected['fixture'], 'records': len(rows),
                      'approved_csv_rows': expected['approved_subset_csv_rows'],
                      'line_values': result, 'totals': expected['oracle_subset_totals'],
                      'damaged_variants_rejected': rejected, 'passed': True}))
    print('Public Decimal reference checks only; this command does not execute the private application or AI.')
    verify_live(rows, expected)


if __name__ == '__main__':
    run()
