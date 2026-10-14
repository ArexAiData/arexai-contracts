# Synthetic source and reviewed-report examples — v3.22.0

All names, identifiers and records are artificial. These are unchanged copies from the private application's 14 October verification evidence, not real customer workbooks. [Provenance and SHA-256 hashes](../../../../reports/ai-v3.22.0/provenance.json) cover every copied source/report and historical evidence file.

| Case | Original source files | Saved reviewed result |
| --- | --- | --- |
| Inventory | [Stock plan](stock-shipments/stock-plan.xlsx), [shipments](stock-shipments/shipments.csv), [warehouse count](stock-shipments/warehouse-count.xlsx) | [XLSX](stock-shipments/reviewed-report.xlsx) / [JSON](stock-shipments/reviewed-report.json) |
| Accounting | [Invoices](invoice-payments/invoices.csv), [payments](invoice-payments/payments.csv) | [XLSX](invoice-payments/reviewed-report.xlsx) / [JSON](invoice-payments/reviewed-report.json) |
| Personnel | [Staff summary](staff-calls/staff-summary.xlsx), [call summary](staff-calls/call-summary.csv) | [XLSX](staff-calls/reviewed-report.xlsx) / [JSON](staff-calls/reviewed-report.json) |

`cases.json` declares the original headers/rows, sheet names, selected numeric formats, tolerance and expected counts. Review the first header row, all subsequent records, column A as the exact text key and column B as the compared value. Trim keys, preserve case and leading zeros. S1 is compared independently with each later source.

- Inventory: quantities in one warehouse; native numbers, zero tolerance. Duplicate keys require review; `0001` differs from `1`.
- Accounting: EUR only, semicolon-separated CSV, decimal-comma values and inclusive 0.01 tolerance. Negative amounts and real zero are valid. Duplicate partial payments are not aggregated. Blank or malformed numbers remain review items; no exchange-rate conversion or tax conclusion is supplied.
- Personnel: employee identifiers and recorded call counts; native numbers, zero tolerance. Match identifiers, not displayed names; `007` differs from `7`. A former-staff label does not authorize automatic exclusion.

From the repository root, run `python3 scripts/verify-ai-delivery-fixtures.py` with Python 3.10+, or the existing aggregate `npm run verify:ai-examples`. No Python third-party packages are needed. The oracle reads the original XLSX/CSV bytes, independently reconstructs expected classification records with exact decimal comparisons, compares row multiplicity/provenance against JSON, and checks every populated saved XLSX cell. It validates 55 source records and 63 pairwise occurrences, plus twelve deliberately damaged record variants.

This is a fixture consistency check, not execution of the private application, an AI model or browser. The limited data-only XLSX reader is not a general Excel implementation. The [product report](../../reliable-delivery-v3.22.0.md) distinguishes 94 historical application regression groups and seven historical live attempts from these reproducible public checks. Do not add these counts to the Solidity suite.
