# Current US retail methodology

RevenueLens's primary report is a frozen analysis of US Census Bureau retail and food services estimates. It uses real national US observations in native USD. The historical UCI invoice lab is a separate experience, with a different population, grain, and source currency.

## Source snapshot and reproducibility

The baseline release is **November 17, 2026**, covering **October 2026**. The primary reference is the [Census advance retail release](https://www.census.gov/retail/marts/www/marts_current.pdf), supported by official monthly retail tables available through the [Retail Trade program](https://www.census.gov/retail/index.html). The current-release URL can change; locally frozen original files and their SHA-256 hashes establish what was actually analyzed.

`python -m pipeline.market download` restores the bundled original files from `data/snapshots/market/2026-11-17/` into `data/raw/market/` and verifies their hashes against `data/market-source-lock.json`. It fetches a file from the official URL only when the original is absent and fails closed if the checksum differs from the frozen release. The manifest is `data/market-manifest.json`. `python -m pipeline.market build` reads the frozen local files and exports `dist/data/market.json` plus `artifacts/market_*` evidence. `python -m pipeline.market validate` validates the existing source/output snapshot. No historical GBP amount is used to create a current US estimate.

Each published point retains category, month, adjustment basis, release vintage, estimate status, and file/sheet/row/column source coordinates. Source suppression, unavailability, and missing values remain explicit. A missing estimate is not an observed zero. Do not silently fill it with another basis or a value from a different release. The current Census vintage covers employer businesses; do not splice an older release that included a different nonemployer population.

## Units, adjustment, and revisions

Only the directly published latest total SA headline margins are used as current-release confidence intervals. Table 3's recent-12-month median variability measures for NSA estimates are not converted into current-sector SA confidence intervals. Ranking industry dollar contributions does not test whether the industries differ significantly.

Source levels are in **millions of US dollars**. Full-dollar display multiplies by 1,000,000; that is a unit conversion, not currency conversion. No FX rate is applied to the current US report.

Seasonally adjusted estimates account for seasonal variation and holiday/trading-day differences. The unadjusted estimates preserve the calendar pattern. Both are nominal and are not adjusted for price changes. Keep SA and NSA in separate views and calculations. The report does not claim that nominal growth equals real sales-volume growth.

Advance estimates can be revised. The report retains advance/preliminary/revised/historical status and a single release vintage. A later source release requires a new downloaded snapshot and fresh validation; it must not silently overwrite one side of a saved comparison.

## Comparison and contribution calculations

For a matching category, basis, and vintage, subtract the prior calendar month for month-over-month change or the year-earlier calendar month for year-over-year change. Divide the dollar difference by that same comparison level for the percentage change. Keep the official rounded reported change distinct from a value recomputed from rounded level estimates.

The national bridge uses the 13 non-overlapping broad categories listed in [MARKET_METRICS.md](MARKET_METRICS.md). For each period, retain:

```text
published total = sum(broad-sector levels) + residual
national dollar change = sum(sector dollar changes) + residual change
sector contribution pp = 100 × sector dollar change / national comparison level
```

The residual is visible rather than forced to zero or hidden in a chosen sector. Parent totals and nested subcategories never appear together as additive components. Contributions explain an arithmetic change, not its underlying cause. Industry rankings are not significance tests.

## Uncertainty and inference

Census's latest official SA total month-over-month estimate is +0.2% with a ±0.4 percentage-point margin at 90% confidence, giving an interval from −0.2% to +0.6%. Because zero is included, the data does not establish a nonzero monthly change at that confidence level. The headline and decision memo must carry that qualification.

The stated interval describes sampling uncertainty in the published estimate. Nonsampling error and future revisions remain separate limitations. The application does not generate undocumented confidence intervals for sectors, infer cross-industry statistical differences, or interpret an observational sector contribution as an intervention effect. See the [declared current analysis plan](ANALYSIS_PLAN_CURRENT.md).

## Scope and release status

This report supports an inspectable national market investigation. It has no current retailer invoices, customer identities, cohorts, cancellation records, costs, campaign exposure, or subnational estimates. Its evidence cannot establish customer retention, firm profitability, or causal business impact.

The application is validated locally and platform deployment is confirmed at the [private RevenueLens site](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site). Authorized ChatGPT sign-in is required. Full interactive live-browser checks await authentication. [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) records deployment, access, source identity, and the remaining verification boundary separately.
