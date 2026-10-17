# Excel campaign — 16 October 2026

Published to this repository on 17 October. This is dated application evidence,
not a new live evaluation performed by GitHub Actions or an independent audit.

## Results and version scope

| Measure | Observed result |
| --- | --- |
| Fresh source workbooks analysed | 100/100 latest results passed |
| Fresh workbook-generation topics | 100/100 latest results passed |
| Initial delivery result, including automatic repair | 193/200 passed |
| Initial result without application repair or scenario retry | 189/200 passed, raw record |
| Additional targeted attempts | 12 attempts, 11 passes; 11 distinct scenarios now pass |
| Total task-request attempts | 212 detailed records; 211 with HTTP response evidence, one without |
| Retained raw failed attempts | 8, including the C095 harness false alarm |
| Application repair/resume actions | 8; none in the 12 targeted follow-up attempts |
| Independent numerical probes in the final scenario results | 510: 215 analysis, 295 creation |
| Cache-free native-office representatives | 20/20 files; 24 requested output cells matched |

All initial 200 requests ran freshly on Site publication 381. Eleven affected
scenarios were repeated on publication 382; C078 needed a further repeat on 383.
The final aggregate contains 189 latest results from the initial run, ten from
382 and one from 383. It is **not** 200 new requests against publication 383 or
384. The 100 source files and precomputed specifications retained their original
hashes throughout. First-pass counts measure application repair/retry, not the
absence of internal model tool attempts.

| Site publication | Private application source commit | Role |
| --- | --- | --- |
| 381 | `b99015d0c4d232ce27a26c6b1d51783abfd35ae9` | Fresh baseline |
| 382 | `19b12ef13c8e67b8b5e1c9d3d1363d9c14f5a782` | Source, delivery, repair and reader fixes |
| 383 | `df1e4c2cc4d4ad65d528dab4bb16eccbcea2b38e` | Bounded literal-empty criteria support |
| 384 | `92d2942bc0fe6758dea494ae1e41e9b460cdaede` | Final evidence and development-tool publication |

These hashes identify the separate application repository, not commits in this
public contracts repository. The application's release notes still identify
product v3.28.0; publication numbers are not AI semantic versions.

## Problems observed and fixes

| Cases | Observation and bounded change |
| --- | --- |
| A006, A008 | Header names were confused with physical Excel columns, or a final record after a blank was omitted. Source instructions now require explicit header/address mapping and complete row bounds. |
| A031 | Correct numbers arrived in double-escaped JSON with a duplicate internal evidence block. Numeric answer-format normalization is bounded; only the validated outer evidence envelope is authoritative. |
| A077 | A threshold sum was reported as 8 instead of 7. The source check withheld the answer. Evidence repair now receives the full source/formula contract and requires programmatic row reduction. |
| C039 | Fixed summary metrics were mistaken for input columns needing fill-down metadata. Only independently declared summary outputs reducing other tables receive the bounded exception. Invalid input-column metadata remains rejected. |
| C044; related repair cases C052, C060 | Repair could replace a broken growing-table reference with a fixed range. Signed structural requirements, real table names, growth checks and metadata must survive repair. |
| C079 | A single-cell merge reference reproduced the worksheet-reader exception. That valid case is supported; malformed/reversed/out-of-range merges still fail. The original rejected C079 workbook was unavailable; the local reproduction used a modified passing workbook and the fresh live repeat passed. |
| C078 | The first request timed out without HTTP evidence; its network/queue cause is unknown. A later correct file exposed unsupported literal-empty COUNTIFS criteria. Literal empty cells now have bounded support while formula-produced empty text remains unverified. Both failed attempts remain archived. |
| C095 | The actual workbook contained the requested chart. The old harness incorrectly inferred absence from the model-authored plan. Checks now follow the saved drawing/chart relationships, type, source and anchor. The raw initial failure was retained and a fresh live repeat also passed. |

The detailed [findings](../../reports/ai-excel-2026-10-16/repeat-findings.json)
distinguish synthetic reproductions, replayed responses, live repeats and missing
original artifacts. The C095 correction does not retroactively inflate the raw
189/200 or 193/200 initial statistics.

## Download and reproduce public checks

- [Original evidence ZIP](../../reports/ai-excel-2026-10-16/arexai-excel-test-kanitlari.zip)
- [Machine-readable report](../../reports/ai-excel-2026-10-16/report.json)
- [Campaign metadata](../../reports/ai-excel-2026-10-16/campaign-metadata.json)
- [Native parity evidence](../../reports/ai-excel-2026-10-16/native-parity.json)

The ZIP is 3,249,527 bytes and has SHA-256
`100391672277949a80c8b9981658185d721542f9cc43dd7216c8dcbbcaec293c`.
It contains 481 original evidence files plus `evidence-sha256.json`, including
the 100 uploaded sources, prompts, frozen expectations, detailed attempts,
downloaded outputs, targeted regressions and native input/output copies. Extract
it locally and open `report.html` to browse the scenario table and evidence links.
Only synthetic data and sanitized responses are included; private application
source and task credentials are not published.

```bash
npm run verify:ai-examples
# Or check only the archived campaign, using Python 3.10+ standard library:
python3 scripts/verify-ai-excel-campaign.py
```

The public checker verifies the complete ZIP/manifest, immutable source files,
all saved output hashes, the 212-attempt history and the final run selection. It
compares 215 saved analysis values with the frozen expectations. For 20 native
files it verifies original/copy/output hashes, confirms only formula caches were
removed from the disposable inputs, and compares 24 saved native output values.
It also rejects three damaged history variants. These are offline integrity and
reference checks. They do not rerun the private formula evaluator, the 510 live
probes, the AI service or the office executable.

## Native method and limits

Plain XLSX conversion was discovered to retain deliberately wrong cached formula
values. The earlier 20-file conversion-only record is therefore preserved as
superseded evidence, not counted as independent recalculation. The final method
removed all formula-cell cached values from disposable copies before importing
and exporting with **LibreOfficeDev 26.8.0.0.alpha0**. Original delivered files
were unchanged. Infrastructure timeouts and exit-137 interruptions are retained
separately and are not silently counted as AI calculation failures or new passes.

The corpus spans 20 operation families, different header/layout arrangements,
blank versus zero, returns, separate currencies, formulas, multiple sheets,
charts, dropdowns and selected 1,000–25,000-row scenarios. It does not establish
universal customer-file accuracy, arbitrary natural-language intent, all Excel
formulas, legal/tax correctness, live exchange rates or accounting completeness.
Formula-generated empty text in the identified criteria edge cases remains
unverified. This campaign did not exercise browser/mobile interaction or the
Microsoft Excel desktop UI. General application statistics use bounded numeric
arithmetic; the separate Decimal fixture does not turn every calculation into
exact-decimal accounting.
