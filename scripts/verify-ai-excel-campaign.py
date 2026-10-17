"""Verify the published historical campaign package, without rerunning AI/Office.

Checks hashes, retained attempts, saved answers and native saved results. The
private application's formula evaluator and live API are deliberately not called.
"""
from collections import Counter
from copy import deepcopy
from decimal import Decimal
from io import BytesIO
from pathlib import Path, PurePosixPath
import hashlib
import json
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / 'reports/ai-excel-2026-10-16'
ARCHIVE_SHA256 = '100391672277949a80c8b9981658185d721542f9cc43dd7216c8dcbbcaec293c'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def close(actual, expected):
    require(not isinstance(actual, bool), 'Boolean substituted for numeric output')
    a, b = Decimal(str(actual)), Decimal(str(expected))
    return a.is_finite() and abs(a - b) <= max(Decimal('1e-8'), abs(b) * Decimal('1e-9'))


def aggregate(attempts, report):
    require(len(attempts) == report['liveAttempts'] == report['fullEvidenceAttempts'] == 212,
            'Live attempt history changed')
    require(sum(not x['passed'] for x in attempts) == report['failedAttempts'] == 8,
            'Historical failures removed')
    require(sum(x['automaticRepairs'] for x in attempts) == report['automaticRepairs'] == 8,
            'Repair history changed')
    no_response = sum(not any(isinstance(a.get('status'), int) for a in r['actions']) for r in attempts)
    require(no_response == report['noResponseAttempts'] == 1, 'No-response attempt miscounted')
    latest, first = {}, {}
    for result in sorted(attempts, key=lambda r: r['startedAt']):
        first.setdefault(result['id'], result)
        latest[result['id']] = result
    require(len(latest) == 200 and all(r['passed'] for r in latest.values()), 'Latest scenario failure')
    require(sum(r['passed'] for r in first.values()) == 193, 'Raw initial delivery count changed')
    require(sum(r['firstPass'] for r in first.values()) == 189, 'Raw first-pass count changed')
    require(sum(r['independentProbes'] for r in latest.values()) == 510, 'Probe count changed')
    require(Counter(r['runTag'] for r in latest.values()) ==
            {'repeat-v381': 189, 'followup-v382': 10, 'empty-criteria-v383': 1}, 'Version scope changed')
    for item in report['cases']:
        r = latest[item['id']]
        require(item['status'] == 'passed' and item['resultPath'] == r['_path'], 'Report latest run drift')
        require(item['independentProbes'] == r['independentProbes'], 'Per-scenario probe drift')
    return latest


def cache_free_copy(original, uncached):
    with zipfile.ZipFile(BytesIO(original)) as a, zipfile.ZipFile(BytesIO(uncached)) as b:
        require(set(a.namelist()) == set(b.namelist()), 'Uncached copy parts changed')
        count = 0
        for name in a.namelist():
            x, y = a.read(name), b.read(name)
            if re.fullmatch(r'xl/worksheets/[^/]+\.xml', name):
                expected, actual = ET.fromstring(x), ET.fromstring(y)
                for cell in expected.findall('.//s:c', NS):
                    if cell.find('s:f', NS) is not None:
                        count += 1
                        for v in cell.findall('s:v', NS):
                            cell.remove(v)
                require(ET.tostring(expected) == ET.tostring(actual), 'Cache-free copy altered formulas/data')
                require(all(c.find('s:v', NS) is None for c in actual.findall('.//s:c', NS)
                            if c.find('s:f', NS) is not None), 'Formula cache remains')
            else:
                require(x == y, 'Non-worksheet part changed')
        return count


def native_values(data):
    with zipfile.ZipFile(BytesIO(data)) as archive:
        rels = {r.attrib['Id']: r.attrib['Target'] for r in
                ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        result = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = rels[sheet.attrib[REL]]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            require(target.startswith('xl/'), 'Unexpected native worksheet path')
            cells = {}
            for c in ET.fromstring(archive.read(target)).findall('.//s:c', NS):
                v = c.find('s:v', NS)
                if c.attrib.get('t', 'n') == 'n' and v is not None and v.text:
                    cells[c.attrib['r']] = Decimal(v.text)
            result[sheet.attrib['name']] = cells
        return result


def run():
    archive_bytes = (EVIDENCE / 'arexai-excel-test-kanitlari.zip').read_bytes()
    require(sha(archive_bytes) == ARCHIVE_SHA256, 'Frozen archive hash mismatch')
    with zipfile.ZipFile(BytesIO(archive_bytes)) as archive:
        names = archive.namelist()
        require(len(names) == len(set(names)), 'Duplicate archive entry')
        require(all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts
                    for n in names), 'Unsafe archive path')
        data = {n: archive.read(n) for n in names}
    read = lambda name: json.loads(data[name])
    manifest = read('evidence-sha256.json')
    require({r['file'] for r in manifest} == set(data) - {'evidence-sha256.json'}, 'Manifest coverage')
    require(len(manifest) == 481, 'Original evidence file count changed')
    for entry in manifest:
        require(sha(data[entry['file']]) == entry['sha256'], 'Evidence hash: ' + entry['file'])
    for name in ['report.json', 'campaign-metadata.json', 'repeat-findings.json', 'native-parity.json',
                 'chart-harness-correction.json']:
        require((EVIDENCE / name).read_bytes() == data[name], 'Readable evidence copy changed: ' + name)
    report, meta, spec = read('report.json'), read('campaign-metadata.json'), read('specs.json')
    require(meta['synthetic'] is True, 'Synthetic scope missing')
    require(sha(data['specs.json']) == meta['specSha256'], 'Frozen expectations changed')
    require(len(spec['analysis']) == len(spec['creation']) == len(meta['inputSha256']) == 100,
            'Scenario/source count changed')
    require(len({c['topic'] for c in spec['creation']}) == 100, 'Creation topics changed')
    for case_id, digest in meta['inputSha256'].items():
        require(sha(data['inputs/' + case_id + '.xlsx']) == digest, 'Source changed: ' + case_id)
    attempts = [dict(read(n), _path=n) for n in data if n.startswith('runs/') and n.endswith('.result.json')]
    for attempt in attempts:
        if 'outputSha256' in attempt:
            require(sha(data[attempt['_path'].replace('.result.json', '.xlsx')]) == attempt['outputSha256'],
                    'Actual output changed')
    latest = aggregate(attempts, report)
    answers = 0
    for case in spec['analysis']:
        result = latest[case['id']]
        require(result['sourceSha256'] == meta['inputSha256'][case['id']], 'Analysis source mismatch')
        candidates = []
        for match in re.finditer(r'```[^\n]*\n([\s\S]*?)```', result['text']):
            try:
                value = json.loads(match.group(1))
                if isinstance(value, dict) and set(case['expected']).issubset(value):
                    candidates.append(value)
            except json.JSONDecodeError:
                pass
        require(len(candidates) == 1, 'Saved scalar answer missing/ambiguous')
        for key, expected in case['expected'].items():
            require(close(candidates[0][key], expected), case['id'] + ' saved answer differs')
            answers += 1
    native = read('native-parity.json')
    require(native['passed'] == native['completed'] == native['planned'] == 20, 'Native evidence incomplete')
    selected = {c['id']: c for c in spec['creation'][::5]}
    require({r['id'] for r in native['results']} == set(selected), 'Native representative coverage')
    native_cells = 0
    for r in native['results']:
        original = data[r['resultPath'].replace('.result.json', '.xlsx')]
        uncached = data['native-uncached-inputs/' + r['id'] + '.xlsx']
        converted = data['native-recalculated/' + r['id'] + '.xlsx']
        require((sha(original), sha(uncached), sha(converted)) ==
                (r['sourceSha256'], r['uncachedSha256'], r['nativeSha256']), 'Native hashes mismatch')
        require(cache_free_copy(original, uncached) == r['formulas'], 'Formula copy count mismatch')
        saved = native_values(converted)
        for cell in selected[r['id']]['outputs']:
            require(close(saved[cell['sheet']][cell['cell']], cell['expected']), 'Native saved result differs')
            native_cells += 1
    # Fail closed if someone drops failures, changes latest outcomes or alters totals.
    bad_latest = deepcopy(attempts); max(bad_latest, key=lambda r: r['startedAt'])['passed'] = False
    bad_report = deepcopy(report); bad_report['liveAttempts'] = 200
    rejected = 0
    for changed_attempts, changed_report in [(attempts[:-1], report), (bad_latest, report), (attempts, bad_report)]:
        try:
            aggregate(changed_attempts, changed_report)
        except ValueError:
            rejected += 1
        else:
            raise ValueError('Damaged campaign history accepted')
    print(json.dumps({'passed': True, 'manifest_files': len(manifest), 'historical_live_attempts': len(attempts),
                      'latest_scenarios': len(latest), 'raw_first_pass': 189, 'historical_numeric_probes': 510,
                      'saved_analysis_values_checked': answers, 'native_saved_workbooks_checked': 20,
                      'native_saved_cells_checked': native_cells, 'damaged_history_rejections': rejected}))
    print('Integrity/reference replay only: no new live AI, private application, native Office or browser execution.')


if __name__ == '__main__':
    run()
