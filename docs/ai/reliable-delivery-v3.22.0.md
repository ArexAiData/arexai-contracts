# ArexAi AI v3.22.0 — reviewed reports and reliable delivery

Recorded 14 October 2026. Product: https://arexaidata.com/app · Updates: https://arexaidata.com/updates.

The separate private Site repository identifies the final documented product source as `b567b1ae729aacbd15a7211dbc6c8b457d65b59f`. This is not a commit in this public contracts repository. The final runtime change was `3071bb809244f2261238e646c53dfd9ca47c961d`; the final commit adds evidence. The initial live-test build was `c0ffd256c44956c9b429b5d48afae59dbb97bfc6`.

## Current behavior

| Area | Behavior and boundary |
| --- | --- |
| Sources | Up to three XLSX/CSV files, 6 MiB each and 12 MiB combined; up to 100 sheets per workbook, 50,000 populated rows per sheet, 200 columns and 250,000 stored cells per workbook; uncompressed package up to 32 MiB. These are bounded inputs, not a promise that every task within them will succeed. |
| Reviewed comparison | User selects sheets, row bounds, keys, number format and tolerance. Exact-key one-to-one comparisons use S1 against each other source, with at most 10,000 selected records. Duplicate keys, missing numeric values and ambiguous values remain review items. No fuzzy joins, partial-payment aggregation or currency conversion is implied. |
| Reviewed XLSX | Summary, matched, different, unmatched, review and Sources sheets retain the complete approved scope. A fingerprint guards scope changes. The saved report is reopened and checked cell by cell, including row multiplicity, zeros and text identifiers. |
| AI explanation | The complete reviewed workbook is sent for explanation. Four source arithmetic checks must match Summary B2:B5; one bounded evidence repair may be attempted. The delivered report remains the original deterministic bytes. The checks do not certify every sentence, inferred cause or recommendation. |
| Task state | Actual stages, elapsed time and last server observation are shown; no invented progress percentage. Transient read-only poll/file requests have two bounded retries. Start/repair creation is not automatically retried. |
| Pause and continuation | Pausing stops client waiting, not provider execution. A received checkpoint can continue the same task within its signed 20-minute session. The eight-minute waiting deadline remains; it preserves a recoverable checkpoint. Recovery is not guaranteed before a checkpoint arrives or after expiry. |
| Source addresses | Explicit whole-cell `S1 · Worksheet!B2` citations are checked against uploaded source identities, real sheet names and bounds. Exact inherited historical references are counted separately as unverified. This is address validity, not proof that arbitrary report content covers every input record or has correct business meaning. |
| Delivery repair | A hash of the original source catalogue is signed into new jobs; altered client source context is rejected. Repairs cannot evade rejected citations by deleting their original target cells. The final server implementation avoids redownloading original files from the provider; the client also checks against its original File bytes. |
| Continued work | The latest generated workbook can be edited again; four output versions and value/formula/style comparisons are retained. Chart/pivot layout equivalence is outside those comparisons. Portable reviewed mapping templates and approved instructions remain available. |
| Device persistence | Optional device-local storage is off by default with a 24-hour inactivity lifetime and a memory fallback when storage fails. This is not account-backed company history. Pending jobs retain their shorter 20-minute expiry. |

Controls and messages support EN/TR/DE/ES/FR. Accounting, inventory, personnel, call-center and project records are possible domains; no live ERP integration or country-specific tax compliance is currently certified or supplied by this release.

## Privacy and processing scope

Full-file AI mode sends the complete selected file bytes, including hidden worksheets and sensitive values, plus the request and applicable recent context to OpenAI. It does not automatically mask raw values. The reviewed-explanation route sends the complete reviewed report, without reconstructing its original sources or carrying unrelated prior instructions. Local-only analysis and its bounded, masked reference views have a separate scope. Device retention settings do not describe provider retention. Never post customer workbooks, signed task tokens or private tracking links in public issues.

## Recorded private application verification

| Suite | Passing groups |
| --- | ---: |
| Reliable delivery | 13 |
| Workspace | 28 |
| Recovery/session | 13 |
| Source evidence | 16 |
| Workbook agent | 24 |
| Total | 94 |

Type checking and the production build passed. These application regression groups used synthetic fixtures and simulated provider transport; they are not 94 live-model trials and cannot be rerun from this public repository. The [copied summary](../../reports/ai-v3.22.0/release-validation.json) and [13 delivery-group results](../../reports/ai-v3.22.0/checks.json) retain that scope.

An independent Python Decimal/openpyxl oracle read all original source files and saved reviewed XLSX reports. The public standard-library oracle now independently rechecks the published copies without importing application code:

| Synthetic case | Source records | Pairwise source occurrences | Matched | Different | Unmatched | Review |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stock / shipments / warehouse | 21 | 29 | 7 | 2 | 3 | 8 |
| Invoice / payments | 19 | 19 | 3 | 1 | 2 | 7 |
| Personnel / calls | 15 | 15 | 3 | 1 | 3 | 4 |
| Total | 55 | 63 | 13 | 4 | 8 | 19 |

A matched pair is one classification entry but contains two source occurrences. S1 is reused for each other source in the stock case, so neither entry counts nor pairwise occurrences equal distinct source-record counts. Duplicate records are not silently merged.

## Recorded live attempts

These are synthetic API/client runs, not browser/mobile tests. The initial build produced the first five observations; a diagnostic stock replay followed, then a final source-delivery replay used the revised signed-catalogue runtime.

| Attempt | Outcome | Time | Observation |
| --- | --- | ---: | --- |
| Stock explanation | Passed | 68.496 s | Injected one polling HTTP 502; one start, no repair, original reviewed report preserved. |
| Invoice explanation | Passed | 43.357 s | No repair; original reviewed report preserved. |
| Personnel explanation | Passed | 41.149 s | No repair; original reviewed report preserved. |
| Stock repetition | Withheld | 60.139 s | `REVIEWED_EXPLANATION_UNVERIFIED` after one evidence repair. Final evidence envelope was not retained, so root cause is unknown; cleanup was recorded as failed. |
| Ordinary two-source delivery | Failed | 52.150 s | `AI_REQUEST_FAILED`; worker logs showed repeated delivery HTTP 502 without enough upstream detail to establish the original cause. |
| Unchanged-prompt stock replay | Passed | 53.746 s | One evidence repair; does not erase or explain the initial failure. |
| Final two-source delivery replay | Passed | 47.176 s | No repair; four original source records and references checked, server header recorded four checked references. No provider redownload of original files. |

Five of seven attempts passed. This is a small, selected development record across revisions, not a success-rate benchmark. Passing replays do not establish consistent model reliability. The final source-delivery change removes an observed failure-prone dependency; the initial provider failure's precise cause remains unknown.

Raw synthetic results and delivered files are in [reports/ai-v3.22.0](../../reports/ai-v3.22.0/). [provenance.json](../../reports/ai-v3.22.0/provenance.json) binds the copied files to their hashes and identifies the private source commit. These hashes establish integrity, not an independent attestation. Live reviewed files were prepared separately and can have different byte hashes from the static reference reports while containing the same reviewed records.

## Public reproduction and remaining work

Run `npm run verify:ai-examples` (Node.js and Python 3.10+; no Python third-party packages) or `python3 scripts/verify-ai-delivery-fixtures.py`. See the [fixture guide](examples/reliable-delivery-v3.22/README.md). The public check validates the committed source/report files, source metadata, exact XLSX cells and expected classifications, and rejects missing, duplicate, wrongly cited and misclassified records. It checks historical evidence integrity/consistency; it does not rerun the private app, call OpenAI, test UI controls or validate on-chain contracts.

Browser/mobile interaction, actual IndexedDB reloads and real customer pilots were not performed. A historical unrestricted three-source AI-generated report timed out; this release does not claim a universal fix. The reviewed deterministic-report route avoids asking the model to reconstruct those joins. Unrestricted AI generation, supported formula verification and qualitative explanations still have their documented limits.
