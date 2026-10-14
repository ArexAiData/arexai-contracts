"""Independent public fixture oracle; standard library only, no private app/model.

The small XLSX reader below supports these committed data-only fixtures. It is
not a general workbook validator, formula evaluator or Excel implementation.
"""
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
import csv
import hashlib
import json
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "docs/ai/examples/reliable-delivery-v3.22"
EVIDENCE = ROOT / "reports/ai-v3.22.0"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
STATUSES = ["matched", "different", "unmatched", "review"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def workbook(path):
    result = {}
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(n.itertext()) for n in
                      ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        relations = {r.attrib["Id"]: r.attrib["Target"] for r in
                     ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
            target = relations[sheet.attrib[REL]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            require(target.startswith("xl/"), "Unexpected fixture worksheet path")
            cells = {}
            for cell in ET.fromstring(archive.read(target)).findall(".//s:sheetData/s:row/s:c", NS):
                require(cell.find("s:f", NS) is None, "Executable formula in data-only fixture")
                kind = cell.attrib.get("t", "n")
                value = cell.find("s:v", NS)
                if kind == "inlineStr":
                    value = "".join(n.text or "" for n in cell.findall("s:is//s:t", NS))
                elif kind == "s":
                    value = shared[int(value.text)]
                elif value is None or value.text is None:
                    value = None
                elif kind == "n":
                    value = Decimal(value.text)
                elif kind == "b":
                    value = value.text == "1"
                elif kind == "str":
                    value = value.text
                else:
                    raise ValueError("Unsupported fixture cell type: " + kind)
                require(cell.attrib["r"] not in cells, "Duplicate cell address")
                cells[cell.attrib["r"]] = value
            result[sheet.attrib["name"]] = cells
    return result


def number(value, fmt):
    if value is None or str(value).strip() == "":
        return None
    text = str(value).strip()
    if fmt == "decimal-comma" and isinstance(value, str):
        text = text.replace(".", "").replace(",", ".")
    try:
        parsed = Decimal(text)
        return parsed if parsed.is_finite() else None
    except InvalidOperation:
        return None


def normalized(value, fmt):
    parsed = number(value, fmt)
    return str(parsed.normalize()) if parsed is not None else str(value or "")


def oracle(case):
    sources = []
    for index, source in enumerate(case["sources"], 1):
        path = FIXTURES / case["id"] / source["name"]
        if path.suffix == ".csv":
            with path.open(encoding="utf-8", newline="") as file:
                rows = list(csv.reader(file, delimiter=";" if case["format"] == "decimal-comma" else ","))
        else:
            cells = workbook(path)[source["sheet"]]
            rows = [[cells.get(f"{col}{row}", "") for col in "ABC"]
                    for row in range(1, len(source["rows"]) + 2)]
            require(all(int(re.search(r"\d+$", a).group()) <= len(rows) for a in cells), "Extra source row")
        require(rows == [source["headers"], *source["rows"]], "Source file differs from declared fixture")
        sources.append([{"key": str(row[0] or "").strip(), "value": row[1],
                         "keyRef": f"S{index} · {source['sheet']}!A{n}",
                         "valueRef": f"S{index} · {source['sheet']}!B{n}"}
                        for n, row in enumerate(rows[1:], 2)])
    expected = []

    def record(status, key, left=None, right=None, reason="", value_ref=False):
        ref = "valueRef" if value_ref else "keyRef"
        expected.append((status, key, left[ref] if left else "", right[ref] if right else "",
                         normalized(left["value"] if left else None, case["format"]),
                         normalized(right["value"] if right else None, case["format"]), reason))

    for other in sources[1:]:
        left, right = defaultdict(list), defaultdict(list)
        for rows, grouped, is_left in [(sources[0], left, True), (other, right, False)]:
            for row in rows:
                if not row["key"]:
                    record("review", "", row if is_left else None, None if is_left else row, "blank")
                else:
                    grouped[row["key"]].append(row)
        for key in sorted(left.keys() | right.keys()):
            a, b = left[key], right[key]
            if len(a) > 1 or len(b) > 1:
                for row in a:
                    record("review", key, row, None, "duplicate")
                for row in b:
                    record("review", key, None, row, "duplicate")
            elif not a or not b:
                record("unmatched", key, a[0] if a else None, b[0] if b else None, "missing")
            else:
                x, y = number(a[0]["value"], case["format"]), number(b[0]["value"], case["format"])
                if x is None or y is None:
                    record("review", key, a[0], b[0], "number", True)
                elif abs(x - y) <= Decimal(str(case["tolerance"])):
                    record("matched", key, a[0], b[0], "equal", True)
                else:
                    record("different", key, a[0], b[0], "different", True)
    return expected, sum(map(len, sources))


def compare(actual, expected):
    require(Counter(actual) == Counter(expected), "Missing, duplicate, altered or misclassified report row")


def run():
    manifest = json.loads((EVIDENCE / "provenance.json").read_text())
    require(manifest["synthetic"] is True, "Only synthetic fixtures may be published")
    require(len({f["path"] for f in manifest["files"]}) == len(manifest["files"]), "Duplicate provenance entry")
    for file in manifest["files"]:
        path = (ROOT / file["path"]).resolve()
        require(path.is_relative_to(ROOT), "Invalid provenance path")
        require(hashlib.sha256(path.read_bytes()).hexdigest() == file["sha256"], "Evidence hash mismatch: " + file["path"])
    independent = {c["case"]: c for c in json.loads((EVIDENCE / "independent-checks.json").read_text())}
    total_records = total_occurrences = rejection_checks = 0
    cases = json.loads((FIXTURES / "cases.json").read_text())
    require([c["id"] for c in cases] == ["stock-shipments", "invoice-payments", "staff-calls"], "Unexpected cases")
    for case in cases:
        expected, records = oracle(case)
        require(dict(Counter(row[0] for row in expected)) == case["counts"], "Oracle counts changed")
        folder = FIXTURES / case["id"]
        report = json.loads((folder / "reviewed-report.json").read_text())
        actual = [(r["status"], r["key"], r["left"], r["right"], normalized(r["leftValue"], case["format"]),
                   normalized(r["rightValue"], case["format"]), r["reason"]) for r in report["rows"]]
        compare(actual, expected)
        sheets = workbook(folder / "reviewed-report.xlsx")
        require(list(sheets) == ["Summary", *STATUSES, "Sources"], "Unexpected report sheets")
        require(report["counts"] == case["counts"], "JSON counts changed")
        require(report["settings"] == {"trim": True, "caseSensitive": True, "format": case["format"], "tolerance": case["tolerance"]}, "Settings changed")
        for i, source in enumerate(report["sources"]):
            spec = case["sources"][i]
            require(source == {"id": f"S{i+1}", "name": spec["name"], "sha256": hashlib.sha256((folder/spec["name"]).read_bytes()).hexdigest(), "sheet": spec["sheet"], "header": 1, "end": len(spec["rows"])+1, "key": spec["headers"][0], "value": spec["headers"][1], "rows": len(spec["rows"])}, "Source metadata changed")
        require(len(report["sources"]) == len(case["sources"]), "Source count changed")
        expected_sheets = {
            "Summary": [["Status", "Entries"], *[[s, case["counts"][s]] for s in STATUSES], ["Source records", records], ["Fingerprint", report["fingerprint"]], ["Method", "S1 compared separately with each other source; a pair is one entry, ambiguous records stay separate."]],
            **{s: [["Key", "Source1", "Source2", "Value1", "Value2", "Reason"], *[[r[k] for k in ["key", "left", "right", "leftValue", "rightValue", "reason"]] for r in report["rows"] if r["status"] == s]] for s in STATUSES},
            "Sources": [["Source", "File", "SHA-256", "Sheet", "Header row", "Last row", "Key", "Value", "Records"], *[[s[k] for k in ["id", "name", "sha256", "sheet", "header", "end", "key", "value", "rows"]] for s in report["sources"]], ["Settings", json.dumps(report["settings"], separators=(",", ":"))]]}
        for name, rows in expected_sheets.items():
            wanted = {f"{chr(65+c)}{r}": value for r, row in enumerate(rows, 1) for c, value in enumerate(row) if value is not None and value != ""}
            present = {a: value for a, value in sheets[name].items() if value is not None and value != ""}
            require(present == wanted, "XLSX cell/type/scope mismatch in " + name)
        occurrences = sum(bool(r[2]) + bool(r[3]) for r in expected)
        old = independent[case["id"]]
        require(old["passed"] and old["counts"] == case["counts"] and old["sourceRows"] == records and old["accountedSourceOccurrences"] == occurrences, "Historical oracle disagrees")
        require(hashlib.sha256((folder / "reviewed-report.xlsx").read_bytes()).hexdigest() == old["sha256"], "Historical workbook changed")
        # Exercise the oracle's multiplicity, provenance and classification gates.
        changed_ref = list(actual[0]); changed_ref[2] = "S9 · Missing!B999"
        changed_status = list(actual[0]); changed_status[0] = "different" if actual[0][0] != "different" else "matched"
        for damaged in [actual[:-1], actual + [actual[0]], [tuple(changed_ref), *actual[1:]], [tuple(changed_status), *actual[1:]]]:
            try:
                compare(damaged, expected)
            except ValueError:
                rejection_checks += 1
            else:
                raise ValueError("Damaged report accepted")
        total_records += records; total_occurrences += occurrences
        print(f"PASS {case['id']}: {records} source records, {occurrences} pairwise occurrences, exact saved XLSX cells")
    require((total_records, total_occurrences, rejection_checks) == (55, 63, 12), "Coverage changed")
    validation = json.loads((EVIDENCE / "release-validation.json").read_text())
    require(sum(validation["regressionGroups"].values()) == validation["totalGroups"] == 94, "Historical group count")
    attempts = [r for name in ["live-checks.json", "live-checks-stock-shipments-repeat.json", "live-checks-source-address-delivery-final.json"] for r in json.loads((EVIDENCE/name).read_text())["results"]]
    require(len(attempts) == 7 and sum(r["passed"] for r in attempts) == 5, "Live failure history lost")
    require({r["error"] for r in attempts if not r["passed"]} == {"REVIEWED_EXPLANATION_UNVERIFIED", "AI_REQUEST_FAILED"}, "Initial failures changed")
    print("PASS 3 public fixture scenarios, 55 records, 63 occurrences and 12 damaged-report rejection checks.")
    print("Historical application evidence checked for integrity/consistency only; no app, model, browser or blockchain execution.")


if __name__ == "__main__":
    run()
