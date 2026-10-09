# ArexAi AI engineering reference — v3.9.6

This directory documents the ArexAi Analyst product separately from the Solidity contracts. It contains **synthetic example data and reference expectations**, not real users' files or the private application implementation. AI product v3.9.6 and contract repository release versions have independent meanings.

Product: https://arexaidata.com/app · Product release notes: https://arexaidata.com/updates

## Analysis flow

1. Read bounded Excel/CSV data in the browser and retain source worksheet/row/column coordinates.
2. Propose field roles and possible contexts such as call records, accounting, personnel, inventory or surveys. Tentative context is not a confirmed business definition.
3. Let the user define what one row means, identifiers, units, blank handling and status-code labels. Definitions belong to the current file/sheet session.
4. Review table ranges, suspected total rows, exact filters and date formats. Date/duration conversion requires a preview and explicit approval; unparseable values require a separate exclusion choice.
5. Compute supported results locally, keep the calculation scope visible and attach source evidence. Identifier/status fields are not numeric measures. Two-list reconciliation leaves duplicate keys ambiguous and does not coerce or sum values.
6. Optional AI assistance uses a protected summary under the product's opt-in flow. Raw file rows are not sent by these local calculation/reference tools.

## v3.9.6 saved source row inspection

Product source commit: `64db1feb20cf4bccba40d8b2ba4b82549817dacc` (9 October 2026), from the separate private Site repository.

- Resolvable cited cells can open an answer-time row snapshot with the first 24 original columns and their worksheet/cell coordinates.
- The cited cell is highlighted. Sensitive fields detected by the product are masked; detection is heuristic and is not a guarantee that all personal data is recognized.
- Snapshots retain saved values after the active source is replaced. They are browser-local examples, not all calculation inputs or the whole worksheet.
- Missing or unresolvable source references do not create invented cells. Existing complete reviewed-query traces remain a separate inspection tool.
- Inspection controls are localized in EN/TR/DE/ES/FR.
- Source-evidence checks covered original row/column offsets, masking, saved-value stability, source isolation and the 24-column display bound. Type checking and the product build passed. No browser/device QA or model accuracy claim is made.

## v3.9.5 file overview

Product source commit: `35820df1e192ac6754c1df69b99dd7d1ec510032` (9 October 2026), from the separate private Site repository.

Worksheet summaries show imported row/column counts, missing cells, exact duplicate rows and column types/missing/distinct counts. Date ranges are withheld when formats need review. Suggestions use available non-sensitive status and numeric fields; context labels remain tentative. Selecting a suggestion fills the question for the user to submit rather than starting analysis automatically. Overview controls support five languages. Source files remain unchanged.

Product verification included file-overview, dataset-understanding and source-evidence checks, type checking and a build. Repository fixtures below remain independent reference checks and do not exercise these UI features.

## Historical v3.9.2 pre-analysis review

Product source commit: `d771473c5caf5fde7744d1d37218603732f563bb` (8 October 2026). This private Site source commit identifies the reviewed application version; it is not a commit in this public contracts repository.

- On upload, the first imported worksheet shows missing-cell, trimmed exact-row duplicate and fully empty-column counts.
- Day/month ambiguity, mixed date formats, unrecognized dates, non-numeric values in predominantly numeric fields and duration columns without explicit units are review signals.
- Multiple plausible header contexts stay tentative; mixed or tied contexts do not establish one business domain.
- Fully empty columns remain categorical, with no inferred numeric or date measure.
- Review text is available in EN/TR/DE/ES/FR. Signals cover imported rows only and do not modify source cells.
- This release does not certify business correctness, normalize values automatically or block every possible analysis based on a warning. Existing explicit format/definition approvals remain separate.

Product verification ran dataset-understanding checks (including new empty-column, mixed-context, invalid-date, numeric-contamination, unit and row-offset assertions), 15 existing confirmed-definition checks and source-evidence checks. Type checking and the application build passed. No new model-accuracy score or combined application-test count is claimed.

## Retained v3.9.0–v3.9.1 capabilities

Reviewed portable analysis plans and period comparisons; answer-specific file/worksheet context; resolvable source-cell examples with sensitive values masked; explicit limits when complete exact-cell evidence is unavailable. Supported chat calculations require review of ambiguous dates or duration units.

## Retained v3.8.0 supported additions

- Suggested table areas plus manual range review; suspected total rows are excluded only with approval.
- Median, mode (all ties), type-7 linear-interpolated percentiles and count cross-tabs.
- Explicit ISO/DMY/MDY/Excel-1900 dates and selected duration units/clock formats.
- Exact-key reconciliation with missing records, value changes, duplicate keys and source coordinates.
- Visible included/excluded records, filters, scope and downloadable local JSON evidence.

Range detection is heuristic. Review is necessary for merged layouts, repeated headers and irregular tables. Imports remain bounded (8 MB, up to 20 worksheets, 1,000 records and 100 fields under the existing import flow); cross-tabs support up to 20 categories per field. Definitions and local review state reset with a new file/sheet/session. Numeric formatting outside supported formats must not be silently interpreted.

## Synthetic examples

| Fixture | Purpose | Reference result |
| --- | --- | --- |
| `call-records.json` | Call outcomes and explicit mm:ss durations | Median 150 seconds; p90 270 seconds; confirmed outcome labels |
| `company-records.json` | Multiple companies with separate currencies | EUR 400 and USD 250 separately; no mixed-currency grand total |
| `survey.json` | Categorical data with no financial metric | Tied modes; count cross-tab |
| `pre-analysis-review.json` | Missing cells, exact duplicates, empty fields, ambiguous/invalid dates, unit review and numeric contamination | Explicit issue counts and original row offsets; no corrections |
| `mixed-context.json` | Call and accounting header hints tied in one table | General context; both possibilities retained, no domain assumption |
| `lists.json` | Identifiers with leading zeros and duplicate keys | One changed value, one missing record on each side, one ambiguous key |

Run `npm run verify:ai-examples`. This script is an independent, deterministic **reference-fixture consistency check**. It does not invoke the application, test the AI model, measure accuracy, or certify that the deployed product handles every workbook. Product source verification separately ran 173 existing application checks, 15 confirmed-definition checks and 19 advanced-analysis checks for the v3.8.0 source commit `c0a4b1607e56f1808594ed440812c40909f97a99`; those counts are not Solidity tests and cannot be reproduced from this contracts repository alone.

Use synthetic names and identifiers when reporting a problem. Never attach confidential accounting data, call recordings, personal contact information, credentials or real customer files to public issues.
