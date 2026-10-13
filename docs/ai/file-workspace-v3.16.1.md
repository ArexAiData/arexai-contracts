# ArexAi AI file workspace — v3.16.0–v3.16.1

Published: 13 October 2026. Product: https://arexaidata.com/app. Release notes: https://arexaidata.com/updates.

This report documents the application, not a token deployment or Solidity release. It includes project-run evidence, not an independent audit or a general model-accuracy score.

## Published source identity

The application source is maintained in a separate private Site repository. These identifiers are not commits in this public contracts repository:

| Product version | Private application source commit | Publication |
| --- | --- | --- |
| v3.16.0 | `9939205061006d4fb3154f793ebe73d7ebd91fe9` | 13 October 2026, 18:09 UTC |
| v3.16.1 | `f1b3af85c0a65cf03497966244ae30149066a8b2` | 13 October 2026, 18:27 UTC |

## Delivered behavior

- AI can inspect uploaded XLSX/CSV files, calculate from actual cells and produce a separate downloadable XLSX copy.
- Follow-up requests use the latest generated file. Earlier outputs can be selected again within the browser session; this is not durable cloud version storage.
- AI instructions require reopening saved output, checking requested features and independently checking relevant calculations.
- Independent package checks reject malformed workbooks, formula-error cells, macros, external connections and unsupported embedded content. Rejected output may receive one repair attempt.
- Previews read the delivered XLSX bytes. Formula cells without a saved result show formula text and a recalculation notice rather than a fabricated zero.
- v3.16.1 preserves full uploaded CSV bytes for the AI request, supports follow-ups from locally generated workbook artifacts and presents AI answers as readable headings, lists and tables with HTML escaped.
- Progress, cancellation and processing limits are exposed. Controls and explanations support English, Turkish, German, Spanish and French.

## Processing and privacy

Local mode keeps its existing browser-only analysis and workbook tools. Local import remains bounded separately: 8 MB, 20 worksheets, 1,000 records and 100 fields under that flow.

AI full-file processing requires opt-in. The complete selected file, including names, hidden sheets and cell contents, plus the request and up to 12 recent messages is sent to OpenAI. Values are not automatically masked in this mode. Uploaded/generated workbooks are treated as data; macros and external links are not executed.

AI file limits are 6 MiB per input/output, 20 worksheets, 50,000 populated rows per sheet, 200 columns, 250,000 stored cells in total and 32 MiB expanded XLSX package size. Temporary workspace deletion is requested after the task; uploaded provider files also carry a 24-hour expiry. Provider retention policies apply. Users should download copies they want to retain.

## Actual model and workbook checks

Synthetic records were submitted to the deployed ArexAi workbook endpoint. Downloaded workbooks were independently reopened and inspected; the figures below were checked against the input data rather than accepted solely from the AI explanation.

| Scenario | Checked result |
| --- | --- |
| Inventory creation | Four products; remaining stock 110, 80, 35 and 100, totaling 325; formulas and summary chart present. |
| Inventory revision | Notes column added and remaining-stock column recolored. Every original cell value/formula, worksheet and chart count retained. |
| Inventory read-only analysis | First-product calculation 100 + 40 − 30 = 110 and total remaining stock 325, with source coordinates. |
| Leave tracking | Three fictional employees: remaining leave 16, 12 and 20 days from explicitly supplied allowances and usage. |
| Student grades | Weights 30%/30%/40%; calculated grades 78, 68 and 79; chart present. |
| Project tracking | Four fictional tasks, a status dropdown, two pending tasks and 84 planned hours. |
| Monthly budget | Budget 26,000 TRY, spending 23,700 TRY and difference 2,300 TRY; comparison chart present. |
| Complete CSV analysis | All 1,005 records read from source rows 2–1006; total 505,515; no output workbook created for the read-only request. |

The inventory, leave, grade, project and inventory-follow-up results were recovered from the preceding run and independently re-read during completion. Budget and complete-CSV requests completed during the final verification run. A prior inventory attempt recorded HTTP 403 before later successful artifacts; that failed attempt is not counted as a pass.

## Automated checks and reproduction scope

The private application source passed:

- 24 workbook-agent boundary checks using a simulated provider transport, covering file validation, ownership/signatures, output access, repair, cleanup, consent and failure behavior.
- Workbook conversation/requirements (26), general workbook (61), intent (20), revision (42), and output/batch (41) checks.
- 173 existing local application checks, plus the separate correction verification suite.
- TypeScript checks, production build and React server-rendering checks for formatted answers and HTML escaping.

These counts are separate suites and are not combined into a unique test count or added to Solidity coverage. The actual API/model scenarios above are distinct from deterministic fixture and simulated-transport tests.

In this public repository, `npm run verify:ai-examples` continues to verify synthetic reference expectations only. It does not invoke the private application, reproduce the private application test suites or call the AI model.

## Verification limits

- No supported browser-control plugin was available for the completion run. Interactive browser, viewport and visual end-to-end checks remain unverified.
- Independent file checks validate selected structural properties, not every requested business rule or all possible Excel features.
- The revised inventory and project outputs contain formulas without saved cached results. The product discloses this; native Excel recalculation is still required for those results.
- The preview is approximate and does not establish exact Excel rendering. Charts, complex formatting and formula behavior should be checked in the intended spreadsheet application.
- Representative synthetic examples demonstrate the tested cases; they do not establish correctness for every domain, workbook or prompt.

No real customer files, API credentials, application backend source or private conversation content is included in this report.
