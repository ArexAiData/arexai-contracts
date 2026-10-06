# ArexAi AI engineering reference — v3.8.0

This directory documents the ArexAi Analyst product separately from the Solidity contracts. It contains **synthetic example data and reference expectations**, not real users' files or the private application implementation. AI product v3.8.0 and contract repository release versions have independent meanings.

Product: https://arexaidata.com/app · Product release notes: https://arexaidata.com/updates

## Analysis flow

1. Read bounded Excel/CSV data in the browser and retain source worksheet/row/column coordinates.
2. Propose field roles and possible contexts such as call records, accounting, personnel, inventory or surveys. Tentative context is not a confirmed business definition.
3. Let the user define what one row means, identifiers, units, blank handling and status-code labels. Definitions belong to the current file/sheet session.
4. Review table ranges, suspected total rows, exact filters and date formats. Date/duration conversion requires a preview and explicit approval; unparseable values require a separate exclusion choice.
5. Compute supported results locally, keep the calculation scope visible and attach source evidence. Identifier/status fields are not numeric measures. Two-list reconciliation leaves duplicate keys ambiguous and does not coerce or sum values.
6. Optional AI assistance uses a protected summary under the product's opt-in flow. Raw file rows are not sent by these local calculation/reference tools.

## v3.8.0 supported additions

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
| `lists.json` | Identifiers with leading zeros and duplicate keys | One changed value, one missing record on each side, one ambiguous key |

Run `npm run verify:ai-examples`. This script is an independent, deterministic **reference-fixture consistency check**. It does not invoke the application, test the AI model, measure accuracy, or certify that the deployed product handles every workbook. Product source verification separately ran 173 existing application checks, 15 confirmed-definition checks and 19 advanced-analysis checks for the v3.8.0 source commit `c0a4b1607e56f1808594ed440812c40909f97a99`; those counts are not Solidity tests and cannot be reproduced from this contracts repository alone.

Use synthetic names and identifiers when reporting a problem. Never attach confidential accounting data, call recordings, personal contact information, credentials or real customer files to public issues.
