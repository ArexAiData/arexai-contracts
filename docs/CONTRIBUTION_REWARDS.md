# ARXAI contribution rewards

The funded program budget is **28,750,000 ARXAI (2.875% of the original supply)**, held by contribution Safe `0x5B784DE88871484e6662e27046315DAC1c399B70`. It is separate from staking governance. The [13 October snapshot](../reports/reserve-allocation-2026-10-13.json) records a 2-of-3 contribution threshold and matching owner lists for the two Safes at block 127300237.

## Apply

Use https://arexaidata.com/contributions, or the `/tr/contributions`, `/de/contributions`, `/es/contributions` and `/fr/contributions` translations. The website links the form from the homepage contribution section, footer and mobile menu. No wallet connection, signature or payment is required to apply.

The form requests contribution category, title, explanation, evidence URL, email, BSC reward wallet and consent. Do not include seed phrases, private keys, real user datasets or exploitable vulnerability details. Follow [SECURITY.md](../SECURITY.md) for private security disclosure.

## Public budget panel

The application page shows the fixed **28,750,000 ARXAI** budget, paid rewards, approved/reserved rewards and the available amount. Paid + reserved + available must equal the total. These figures come from the application ledger, not a live Safe balance or an on-chain proof of available funds.

The panel displays its last-checked time, refreshes every 30 seconds while the page is visible and offers manual refresh. If a refresh fails, the last valid figures remain visible with a warning; before the first successful load, dynamic amounts remain unknown rather than being shown as zero.

Applications remain open while the budget is reserved but not fully paid, with a warning that all remaining funds may already be committed. Submissions close when the ledger's paid total reaches the program budget. An open form does not guarantee an available award.

## From AI feedback to an application

After successfully reporting an incorrect AI answer, the applicant can choose the contribution-reward invitation. They write their own title and explanation, review the product version and feedback reference, and explicitly consent to transferring that draft. No file, filename, raw row, prompt, answer, email or wallet is copied automatically.

The editable draft opens in a separate tab, preserving the analysis session. It is transferred through browser-local storage with a random draft identifier in the URL fragment, expires after 15 minutes and is removed when imported. It does not transfer across devices. If local storage is unavailable, the blank application remains accessible.

The applicant still supplies an evidence URL, contact email, receiving wallet and application consent, then submits explicitly. Reporting feedback or opening a draft is not an application. A feedback reference supplies context for human review, not proof of ownership or entitlement to a reward. Budget and draft notices are available in EN/TR/DE/ES/FR; this feature does not change the AI engine version.

## Private application tracking

New successful applications display a reference and a separate private tracking link. Save that link from the confirmation screen using its copy/open controls; no automatic confirmation email is sent. The contribution page also links to [application tracking](https://arexaidata.com/contributions/track), with the same four translated variants.

The link contains a randomly generated secret in its URL fragment. Anyone holding it can view the limited tracking result, so never post it in a GitHub issue, PR, screenshot or public message. The server stores only its hash. A reference number or unverified email address cannot unlock online tracking. The tracking page is excluded from the sitemap and indexing.

Tracking shows the reference, submission/update dates and one of five states: pending, reviewing, approved, rejected or paid. Approved amounts appear only for approved/paid applications; a BscScan transaction link appears only after payment verification. It does not reveal the application text, email, wallet, internal notes or administrator identity. Applicants can refresh manually and see the last-checked time or an explicit stale/error state.

Older applications created before tracking was introduced have no online tracking link. For an old application or a lost link, contact info@arexaidata.com with the reference for a status inquiry; this is not automatic link recovery. Tracking is read-only and cannot approve an application or authorize payment.

## Review and payment

1. The team reviews importance and impact. Submission, issue creation, PR acceptance and approval do not guarantee a particular reward amount.
2. Approved rewards reserve an amount within the fixed program budget. Applications remain open until the ledger's paid total reaches the budget, including periods when all remaining funds are reserved.
3. Authorized Safe owners execute payments manually. Awards are unlocked; the website does not sign or send transactions.
4. The private administration panel records payment only after checking a successful BSC receipt, at least 12 confirmations, a block timestamp after approval and the exact ARXAI transfer from the contribution Safe to the approved wallet for the approved amount. A transaction cannot be reused for another application.

Applications and contact details are private. The public contracts repository documents the program and dated evidence; the application implementation and administration remain in the separate website repository. The budget is an allocation, not a real-time spendable wallet balance. See [the current allocation table](RESERVE_ALLOCATION.md) for the reserve reconciliation and evidence limitations.

Contact: info@arexaidata.com.

## Documentation scope

This description reflects the separately maintained website source commits `c24c465f05f0dba52b627ced103064c499030f36` (budget panel and feedback drafts) and `1dec0bdf1b81635e3f50bab01d71fda1ef40d362` (private tracking), published on 13 October 2026. These are website source references, not commits in this public contracts repository. Contract tests and synthetic AI reference checks in this repository do not execute those website features.
