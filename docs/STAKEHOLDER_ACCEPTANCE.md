# Stakeholder decision, acceptance, and handoff

Recorded November 23, 2026 (America/New_York). This is a **simulated commercial-manager review**, supported by dated technical evidence and actual project-owner feedback. No outside customer participated, no independent stakeholder sign-off was obtained, and no paid engagement or business savings are claimed.

This packet implements the RevenueLens addition in the revised *Four project portfolio improvement handbook*, pages 1-3. The current application is the implementation baseline; the original build backlog is design history. Handbook SHA-256: `583c0c51fe2afc1e4afd0ecbd9d04cee96ce0fb0f16fd094cac36fac2ae200cd`.

## Stakeholder need and constraints

The simulated stakeholder is a commercial analytics lead preparing a monthly US market review. The question is: **does the October retail headline justify changing a company's commercial forecast, and what evidence should be requested next?**

The starting task is to read a national release, keep its units and adjustment basis consistent, check the uncertainty and industry contributions, and communicate a bounded recommendation. No existing company workflow, elapsed-time baseline, company sales, prices, units, campaign exposure, or commercial outcome was observed. This scenario describes a review task, not an interviewed customer's current process.

The desired outcomes are:

- State the selected month, industry, adjustment basis, USD units, and frozen publication vintage together.
- Distinguish an observed national sales change from statistical evidence, a causal explanation, or a retailer-specific result.
- Hand off a decision brief with reproducible scope, source evidence, caveats, and an explicit next action.

The current report contains aggregate Census estimates. Customer identity, invoices, retention, margin, marketing spend, and campaign effects are not present. The separate historical transaction lab has a different population, period, and currency convention. Neither experience authorizes a commercial action.

## Decision and evidence boundary

For October 2026, total seasonally adjusted nominal sales are **$748.220 billion**, compared with **$746.637 billion** in September and **$700.427 billion** a year earlier. The published monthly change is **+0.2% with a +/-0.4 percentage-point margin at 90% confidence**. Its interval, **-0.2% to +0.6%**, includes zero. That is insufficient evidence of a nonzero monthly change at that confidence level; it does not establish that the actual change was exactly zero.

**Decision:** keep a broad company forecast change conditional on more evidence. Use the release as a market benchmark, inspect industry exposure, request comparable company sales plus price and unit-sales evidence, and review the next vintage and revisions before changing commercial plans. The simulated commercial analytics lead owns that review; no actual company forecast or intervention was changed.

Industry contributions allocate arithmetic change. They do not establish why sales changed, and sector differences have not been tested for significance. Nominal USD growth is not inflation-adjusted volume growth. The full reasoning is retained in [the current executive memo](EXECUTIVE_MEMO_CURRENT.md) and [analysis plan](ANALYSIS_PLAN_CURRENT.md).

## Existing-system mapping

| Stakeholder concept | Existing report representation | Boundary |
| --- | --- | --- |
| Market-review scope | Observation month, industry ID, and SA/NSA basis in the URL and filters | Scope uses one frozen release vintage; it is not a company or customer selection. |
| Comparable measures | `dist/data/market.json` points keyed by industry and month | Source levels are USD millions; display formatting scales them to dollars. SA and NSA are not mixed. |
| Source evidence | File, worksheet, row, column, and frozen fingerprints | A mutable official URL alone does not identify the analyzed vintage. |
| Decision | Existing Decision brief view and executive memo | The recommendation is descriptive and provisional. |
| Handoff | CSV/source-audit exports, selected-brief Download PDF, and native Print | These are report artifacts, not approvals, commercial orders, or campaign execution. |
| Historical customer methods | Separately labeled `lab.html`, SQL/SQLite pipeline, and historical exports | UCI 2009-2011 records do not provide current US retailer customer evidence. |

## Acceptance review

The table reuses **recorded executions**, rather than presenting them as newly run stakeholder UAT. The authenticated private-site browser/export record is version 3 at source commit `d045c03eea0db1d42810f60415c60b89b18a1946`. The later native Chrome print record is from the public portfolio. The runtime baseline for this documentation update is local source commit `8119cfdcdb33164b907acb1b6bec3c009c2efaeb`, which includes the verified print/PDF and keyboard fixes.

| ID and review task | Expected outcome | Recorded actual outcome | Evidence and review status |
| --- | --- | --- | --- |
| RL-SA-01: interpret the headline | Keep the monthly uncertainty beside the point estimate and make a conditional recommendation. | The report displayed $748.22B, +0.2% MoM, and the 90% interval -0.2% to +0.6%. The memo does not treat the point estimate as proven acceleration. | Browser case `current-sa`; current executive memo. Recorded technical result supports the expectation. |
| RL-SA-02: preserve units and basis | Show nominal native USD and release 2026-11-17; do not reuse an SA confidence interval for an unmatched NSA cut. | Latest total NSA displayed $761.38B. Its unmatched interval remained unavailable; current-source amounts required no FX conversion. | Browser cases `current-sa` and `current-nsa`; [market metric definitions](MARKET_METRICS.md). Recorded technical result supports the expectation. |
| RL-SA-03: retain a selected comparison | A saved October 2025 / gasoline / NSA view must survive reload and export the same scope. | Reload retained the selected view. Downloaded levels were 55,322 / 54,234 / 54,791 USD millions for current / prior month / prior year. Unmatched uncertainty exported empty. | Browser case `saved-query-and-reload`; [export verification](../artifacts/live-export-verification.json). Recorded technical result supports the expectation. |
| RL-SA-04: trace a figure to source | An analyst must be able to find the exact source level and inspect the full audit. | Latest total SA matched MARTS Table 1, row 12, column J: 748,220 USD millions. The downloaded audit matched 644 points and 1,288 SA/NSA source coordinates. | Browser case `source-dialog`; export verification. Recorded technical result supports the expectation. |
| RL-SA-05: reject an unsupported customer claim | Keep current national data separate from the historical lab and disclose missing current customer evidence and cohort maturity. | Current and historical experiences were separately labeled. Historical mature 90-day populations were 5,252 customers / 2,443 repeat buyers, with immature outcomes unavailable. These are historical methods evidence, not current retention or achieved lift. | Browser cases `historical-separation` and `cohort-maturity`; [historical metric definitions](METRICS.md). Recorded technical result supports the expectation. |
| RL-SA-06: deliver a readable brief | Current and historical briefs must retain figures, sources, uncertainty or fixed FX notes through printing and PDF handoff. | Four actual native Chrome PDFs passed: eight US Letter pages and 108 content segments. Both desktop and Responsive 390 x 844 cases retained the required notes without clipping; mobile report bodies matched desktop. | [Native print verification](../artifacts/public-native-print-verification.json); [release-channel scope](PUBLIC_RELEASE.md). Recorded technical result supports the expectation; physical mobile devices were not tested. |

The complete recorded browser cases are in [live browser verification](../artifacts/live-browser-verification.json). The [live verification narrative](LIVE_VERIFICATION.md) preserves the version-3 print limitation and the later public follow-up. No prior result has been relabeled as a fresh execution. Independent human acceptance remains **not performed**.

## Feedback and response

The project owner supplied the following requirements during implementation. They are actual owner feedback, not an outside customer interview.

| Owner feedback | Observed gap or constraint | Implemented response | Evidence and remaining limit |
| --- | --- | --- | --- |
| Use USD for a US audience. | The historical source is a UK retailer dataset in GBP. Currency presentation could be mistaken for US market coverage. | The primary current report uses official US Census estimates in native USD. The separate historical lab retains exact source GBP and clearly discloses its fixed 1 GBP = 1.5705 USD display convention. | [Currency policy](CURRENCY_POLICY.md), the two report entry points, and recorded current/historical checks. Conversion does not turn the historical source into current US data. |
| Explain why the original data was old and use recent US evidence. | UCI 2009-2011 transactions cannot establish current US sales or retention. | Added the distinct current-market report with a frozen 2026-11-17 Census vintage and October 2026 observation, retaining the historical lab as methods evidence. | Current memo, source manifest, and market validation. The report is a frozen release snapshot and does not refresh automatically. |
| Verify print/PDF behavior; the video was accepted as working. | Native preview was initially unobservable through the in-app browser. Long-panel print rules also warranted pagination review; that source review was not a reproduced Chrome clipping failure. | Improved Letter pagination and retained print disclosures, added a local selected-brief PDF download, then completed real Chrome Print/Save as PDF checks. | Four saved native PDFs / eight reviewed pages / 108 content checks. The video remained unchanged. No time saving or business lift was measured. |
| Make the full project findable locally and on GitHub. | The initial branch query found an empty repository; uploading the CI workflow required an additional OAuth permission. | After the owner authorized workflow access, published the full source, pipelines, snapshots, checks, and this handoff in the public repository. The public demo and private Site remain separate channels. | Public `main` was verified at `0fd06f0`, and [GitHub Actions run 45318929950](https://github.com/nirajmohabey/revenuelens/actions/runs/45318929950) completed successfully. Publication closes this source-discovery gap; it does not establish independent customer acceptance. |

The print and source-publication feedback have closed technical responses with before/after evidence. There is no measured business baseline, treatment effect, commercial saving, or independent customer satisfaction result.

## Reviewer and operator handoff

1. Read the README's release-channel status. The public demo and complete GitHub source are available without sign-in. Review the linked executed CI results for the relevant commit. The private Site requires the owner's authorized ChatGPT sign-in.
2. For local review, use Node.js 22 or later, run `npm run build`, `npm test`, then `npm run serve`. Open `http://127.0.0.1:4317`; the historical lab is `/lab.html`. The existing report snapshots need no API key, external database, or new data download for this path.
3. Select the month, industry, and adjustment basis. Confirm the displayed scope and release vintage before comparing figures. To replay RL-SA-03, choose October 2025, Gasoline stations, and Not seasonally adjusted.
4. Inspect Source evidence and Data trust. Use the original level and source coordinates when reconciling a figure. Reopen the saved URL to check that a chosen view is retained.
5. Open Decision brief, read its limits, and export the selected evidence or Download PDF. For browser printing, use Print brief / Save as PDF with Letter portrait and all pages. Confirm the final Source trail; in the historical lab also confirm the fixed FX note and Measurement boundaries.
6. Record the recommendation, its owner, the missing company evidence, and the condition for revisiting it. Do not turn an unsupported retailer retention, margin, or campaign-impact question into an estimated answer from national aggregates.

Escalate a missing source, failed fingerprint, unavailable comparison, or reconciliation discrepancy to the project maintainer before using that result. Reproduce it with the saved scope, source vintage, original value/coordinates, and an existing export. Preserve the frozen snapshot; follow the documented pipeline download/build/validate process for a deliberately new vintage. A new data release requires a new review rather than silently replacing old evidence.

An outside reviewer can complete a later sign-off with the review date, role, saved report scope, expected versus observed outcome for each case, one concrete friction point, and the replayed result after any justified correction. Those fields are not populated here because that participation has not happened.

## Review disposition

The simulated decision, scope mapping, six evidence-backed checkpoints, owner-feedback trace, and handoff are documented. The full source is published with an executed successful CI run. The record strengthens the explanation of the existing product without asserting independent stakeholder approval. A later actual reviewer session can supply the outstanding independent acceptance evidence when available.
