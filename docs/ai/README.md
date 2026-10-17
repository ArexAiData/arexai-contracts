# ArexAi AI engineering reference

This directory documents the ArexAi Analyst product separately from the Solidity contracts. It contains **synthetic example data and reference expectations**, not real users' files or the private application implementation. AI product versions, Site publication numbers and contract repository release versions have independent meanings.

Product: https://arexaidata.com/app · Product release notes: https://arexaidata.com/updates

## Current published reference — v3.28.0 and 16 October hardening

The separate application source published as Site version 384 is commit `92d2942bc0fe6758dea494ae1e41e9b460cdaede`. Its product release notes identify v3.28.0; Site versions 381–384 are publication identifiers, not new AI semantic versions. This public repository contains documentation, synthetic fixtures and sanitized evidence, not the private application implementation.

- [200-scenario Excel campaign and limits](excel-campaign-2026-10-16.md): 100 fresh uploaded-file analyses and 100 fresh workbook-generation topics. After fixes and targeted retries, the latest result for each scenario passed. The raw initial repair-free count was 189/200, including one preserved chart-checker false alarm; 212 task attempts and all eight raw failures remain available.
- [Download the original hashed evidence ZIP](../../reports/ai-excel-2026-10-16/arexai-excel-test-kanitlari.zip), or inspect the [machine-readable report](../../reports/ai-excel-2026-10-16/report.json). Historical evidence includes 510 numerical probes and 20 representative files recalculated after removing formula caches from disposable copies.
- Current capabilities include conditional source calculations with distinct numeric/filled/record/distinct-ID counts, supported dependency-formula recalculation, reviewed scope pinning, verified generated tables and ratios, explicit-credit/refund settlement with approved conversion rates, and a complete source-linked analysis package. Unsupported formulas and unresolved business choices remain unverified; this is not an unrestricted Excel engine or a tax-compliance service.
- The general AI workspace permits up to three XLSX/CSV sources, 6 MiB per file and 12 MiB total. The reviewed analysis-package route has its own narrower limits: one original source up to 2 MiB, 10,000 selected rows, 50 columns and 100,000 source cells. Limits belong to their specific route; larger synthetic boundary tests are not a promise that every route accepts that size.
- [Decimal invoice example and fresh live observations](examples/v3.24-decimal-invoices.md) cover explicit per-line rounding, duplicate review, invalid prices, zero quantity and full discount. Its legacy filename identifies the original PR #48 fixture; it does not claim that the current application is v3.24.0.

`npm run verify:ai-examples` now also checks the frozen campaign archive, source/output hashes, preserved initial failures, saved answers, cache-free input copies, saved native results and exact-decimal invoice expectations. It uses standard-library Python and the existing Node reference checkers. These public CI checks do not call AI, run native Office, execute the private application or create new live accuracy measurements. Browser/mobile interaction and Microsoft Excel desktop UI were not exercised by the 16 October campaign. The narrower formula-empty-string cases explicitly identified in that report remain unverified.

## Historical v3.22.0 workspace and delivery — 14 October 2026

At v3.22.0, the Beta supported up to three XLSX/CSV sources, user-reviewed exact-key comparison, downloadable reviewed reports, continued workbook edits, four retained output versions and optional device-local recovery. It covers inventory, accounting, personnel, call records and other tabular domains; it does not provide a live ERP connector or country-specific tax-compliance engine.

v3.22.0 adds real task stages and timing, bounded retries of read-only polls/downloads, pausing and continuing the same received job within its 20-minute session, and source-address checks before delivery. Reviewed comparison explanations read the complete deterministic report. The original reviewed workbook remains the delivered file; four Summary checks gate the explanation, without certifying all qualitative prose.

- [Current capabilities, limits, verification and unresolved observations](reliable-delivery-v3.22.0.md).
- [Three downloadable synthetic cases and reproduction steps](examples/reliable-delivery-v3.22/README.md): 55 source records and 63 pairwise source occurrences, independently checked against saved report cells.
- [Historical application evidence](../../reports/ai-v3.22.0/provenance.json): 94 application regression groups; seven live attempts with five passes and two initial failures retained. Both targeted replays passed. These observations are not a model-accuracy benchmark.
- `npm run verify:ai-examples` now also checks these public source/report fixtures, their hashes and twelve damaged-report rejection cases using Python 3.10+ (standard library only). It does not execute the private application, rerun its 94 groups or call an AI provider.
- Browser/mobile interaction and actual IndexedDB reloads remain untested. The previous unrestricted three-source model-generation timeout is not claimed universally fixed.

ArexAi’s full-file AI mode sends complete selected file bytes (including hidden sheets), the request and applicable conversation context through ArexAi to an external AI service provider; raw values are not automatically masked. Optional device storage is off by default and expires after 24 hours of inactivity. That setting does not govern provider retention, extend the signed job's 20-minute lifetime or create account-backed cloud history. A task must have returned a checkpoint before it can be resumed. Local-only analysis remains separate.

The following sections retain dated historical scope. Their old version numbers and old local-import limits are not the current full-file workspace limits.

## v3.16.0–v3.16.1 Excel and CSV file workspace — 13 October 2026

At v3.16.1, the AI workspace could inspect complete selected XLSX/CSV files, create downloadable Excel copies and continue editing the latest generated workbook. Earlier copies remain available within the current browser session. Local mode retains its browser-only tools.

ArexAi AI file processing is a separate opt-in mode: the complete selected file (including names, hidden worksheets and cell contents), the request and up to 12 recent messages are sent through ArexAi to an external AI service provider. Sensitive values are not automatically masked in this mode. Local analysis limits and privacy behavior do not describe this full-file mode.

v3.16.1 retains uploaded CSV bytes for AI processing, continues edits from locally generated workbooks, formats AI answers as readable headings/lists/tables, and displays formula text when a workbook has no saved formula result.

- [Features, processing limits, test results and verification boundaries](file-workspace-v3.16.1.md).
- Actual model/file checks covered inventory, leave tracking, student grades, project tracking, monthly budgeting, continued edits, read-only analysis and a complete 1,005-record CSV.
- Structural output validation and an AI self-check do not certify every business rule or provide full Excel recalculation. Browser visual/end-to-end checks were not performed.
- The private application source remains separate from this public documentation and reference-fixture repository.

## Contribution applications from feedback — 13 October 2026

After a successful incorrect-answer report, the product offers an optional contribution application draft. The user writes a title and explanation, reviews the version/feedback reference and explicitly consents before opening the editable draft in another tab. Workbook files, filenames, rows, prompts, answers, email and wallet are not copied automatically. The form still requires evidence, contact details, a receiving wallet, consent and explicit submission. Reporting feedback alone does not apply for or guarantee a reward.

See the [contribution program guide](../CONTRIBUTION_REWARDS.md) for the 15-minute browser-local draft, public budget panel and private tracking links. This earlier contribution-flow update did not change the then-current AI engine v3.9.7; the synthetic reference checks here do not exercise its application implementation.

## v3.9.7 mapping preflight and quality evidence

Product feature source commit: `cf26e150f11fe9b396b27e8fe85eafd9a80bc28f` (9 October 2026), in the separate private Site repository. Before recurring analysis, the product shows missing/duplicate mappings, detected sensitive fields, identifier/status measures and explicit currency-header conflicts. Renamed fields require manual selection; no fuzzy matching or currency conversion is introduced.

[10 October quality report](quality-2026-10-10.md) records five synthetic cross-domain application source scenarios and explicit verification limits. Downloadable `period-*.csv` examples and `period-scenarios.json` hold independent reference expectations. `npm run verify:ai-examples` runs both the retained reference checks and the five new period fixture checks, not the private application or AI model.

## Retained browser-local analysis flow

1. Read bounded Excel/CSV data in the browser and retain source worksheet/row/column coordinates.
2. Propose field roles and possible contexts such as call records, accounting, personnel, inventory or surveys. Tentative context is not a confirmed business definition.
3. Let the user define what one row means, identifiers, units, blank handling and status-code labels. Definitions belong to the current file/sheet session.
4. Review table ranges, suspected total rows, exact filters and date formats. Date/duration conversion requires a preview and explicit approval; unparseable values require a separate exclusion choice.
5. Compute supported results locally, keep the calculation scope visible and attach source evidence. Identifier/status fields are not numeric measures. Two-list reconciliation leaves duplicate keys ambiguous and does not coerce or sum values.
6. The retained summary-only assistance flow uses a protected summary. These local calculation/reference tools do not send raw rows. The separately enabled full-file AI workspace described above does send the complete selected file.

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
