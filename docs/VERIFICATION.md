# Historical analytical verification

This document verifies the UCI 2009–2011 invoice lab. The primary current US Census report has a different source, grain, and [methodology](MARKET_METHODOLOGY.md); its evidence is saved separately under `artifacts/market_*`.

Executed 2026-11-23 on the supplied full UCI workbook. Machine-readable validation and run evidence are in `artifacts/validation.json`, `artifacts/run-manifest.json`, and `artifacts/independent_workbook_review.json`. Browser and hosting verification are separate release checks.

**Currency distinction:** all source calculations and analytical totals below remain **GBP**. The report presents their **USD constant-currency equivalents**, using **1 GBP = 1.5705 USD** for every period. The rate is the November 30, 2011 observation in [Federal Reserve H.10 / FRED DEXUSUK](https://fred.stlouisfed.org/data/DEXUSUK), checked on November 23, 2026. It is a historical display convention, not daily conversion, current FX, or new US-market evidence. See [CURRENCY_POLICY.md](CURRENCY_POLICY.md).

**Hosting status:** local validation is recorded here. Private version 3 is deployed at the [RevenueLens site](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site), requiring authorized ChatGPT sign-in. Authenticated live checks covered the historical lab's direct load/reload, return link, invoice preview, mature cohorts, unavailable immature windows, December 2010 sensitivity, and historical-only FX policy. Native print preview remains unverified because the in-app browser's print call stalled. See [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) for the exact current-report and historical-lab scope.

## Independent source calculation

A separate streaming `openpyxl` reader summed original workbook quantities and prices using Python `Decimal`, without importing the pipeline classifier or querying its marts.

| Source sheet | Rows | Signed raw movement, GBP | Observed timestamp range |
| --- | ---: | ---: | --- |
| Year 2009-2010 | 525,461 | 9,539,484.634 | 2009-12-01 07:45 to 2010-12-09 20:01 |
| Year 2010-2011 | 541,910 | 9,747,765.934 | 2010-12-01 08:26 to 2011-12-09 12:50 |
| Total | 1,067,371 | **19,287,250.568** | Source-local, timezone unspecified |

The independent reader found 243,007 missing-customer-ID rows. The source range confirms an overlapping early-December 2010 window. The pipeline's exact signed raw total is **192,872,505,680 units of 1/10,000 GBP**, equal to the independent total. Every raw row retains a disposition, including excluded categories.

The default November comparison was also recomputed from original JSON row payloads using `Decimal`, explicit sign/code rules, and the quarantined-invoice set. It agrees with the source-GBP dashboard payload exactly: November 2010 sales £1,429,908.132, known-customer sales £1,159,557.252, cancellations £35,120.88; November 2011 sales £1,454,135.41, known-customer sales £1,141,672.37, cancellations £25,010.54. Independently counted invoice/customer denominators agree: 2,712/1,604 in 2010 and 2,748/1,659 in 2011, with 2,564 and 2,640 known-customer invoices.

These values agree with the source-GBP payload; the browser's USD presentation multiplies the monetary values by 1.5705. Independent decimal conversion gives November 2010 positive sales USD 2,245,670.721306 and November 2011 positive sales USD 2,283,719.661405 before display rounding. The same scaling cancels out of their percentage change. GBP source validation does not by itself verify every USD label or export; browser presentation checks must separately cover unit labels, one-time conversion, null preservation, and fixed-rate disclosure.

## Hand-checkable acceptance suite

`python -m unittest discover -s tests -v` passed all seven tests. The fixtures exercise exact sub-penny money and explicit dispositions; duplicate candidate retention; whole-invoice quarantine; idempotent workbook import; fixed first-purchase cohort country; a second distinct invoice strictly later than the first; month-boundary and 90-day maturity behavior; zero denominators; the six-order Shapley identity; an `Other` contribution residual; and refusal to reuse stale classification rules.

The fixture tests use temporary or in-memory databases and do not overwrite the production profile artifact.

## Full-snapshot release checks

The generated validator passes 14 checks covering foreign keys, raw source count, independent streaming movement, exact disposition reconciliation, accepted-source-to-fact row and amount coverage, Python-versus-SQL monthly/country sales, exclusion of colliding invoices, join fanout, Shapley and additive bridge identities, unavailable immature months, exclusion of anonymous customers from cohorts, integer fact money, and the dashboard payload size bound. Read the saved artifact for the exact run timestamp and rule identity.

These checks support the reproducible historical investigation. They do not establish treatment effects, current retailer outcomes, PostgreSQL behavior, or Power BI report reconciliation.
