# Current US market verification

Executed locally on November 23, 2026 against the frozen November 17, 2026 Census release for October 2026. This document applies to the primary US report, not the separate historical invoice lab. The private deployment is separately confirmed by the platform; [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) records its access and live-test status.

## Recorded evidence

- `artifacts/market_validation.json`: **19 full-snapshot checks passed**.
- `artifacts/market_run_manifest.json`: source/output identities, code version, and execution environment.
- `artifacts/market_reconciliation.json`: overlapping workbook comparisons, independent text total-series comparison, national identity, and SA/NSA bridge residuals.
- `artifacts/market_source_observations.csv`: extracted source observations and provenance.
- `artifacts/market_points.csv`: native USD-million monthly/category levels, status, and release vintage.
- `data/market-source-lock.json` and `data/market-manifest.json`: frozen official-file checksums and retrieval metadata.

The shipped snapshot contains **644 category-month points** and **68 separate SA/NSA bridges**. The visible period selector contains 34 months through October 2026; additional comparison points support preceding-month and preceding-year calculations.

## Executed commands

```sh
python -m pipeline.market validate
python -m unittest discover -s tests -p "test_*.py" -v
npm run build
npm test
```

The market validator passed all 19 source/model checks. The offline Python suite passed **14 tests**, comprising seven current-market tests and seven historical-lab tests. The fixture cases include source-header/provenance parsing, missing/suppressed tokens remaining unavailable, rejection of changed source content, non-overlapping sector bridges, and residual/contribution calculations.

The JavaScript suite passed **five tests**, including **2,925 current-report route/filter renders** and the historical-lab route/model checks. The report checker validated native USD-million units, source coordinates and file identities, frozen vintage, separate matching SA/NSA comparisons, 13 broad sector identities, exact sector-plus-residual reconciliation, official uncertainty semantics, and all 528 historical comparisons. These model/render checks are supplemented by the separately recorded [authenticated live-browser verification](LIVE_VERIFICATION.md), including actual downloads and layouts at 1440×1024 and 390×844.

## Headline cross-check

The latest total SA level is **748,220 USD millions**, or **$748.22 billion** before the release's one-decimal-billion display rounding. The official release reports **+0.2% month over month, ±0.4 percentage points at 90% confidence**, with an interval from **−0.2% to +0.6%**. That includes zero, so the release does not establish a nonzero monthly change at that confidence level. The latest official year-over-year estimate is **+6.8%, ±0.5 percentage points** at the same confidence level.

The [official Census release](https://www.census.gov/retail/marts/www/marts_current.pdf) was inspected independently of the payload. It identifies the same date, period, nominal adjustment basis, headline amount, and sampling-error qualification. The raw local source files and their hashes preserve this evidence after the changing current-release URL advances.

These checks do not establish real inflation-adjusted growth, causal sector drivers, tested differences across industries, or current retailer customer behavior. Authenticated live verification passed for the recorded scope against private version 3, source `d045c03eea0db1d42810f60415c60b89b18a1946`. Actual evidence CSV and audit JSON passed 20 independent checks, including all 644 points and 1,288 source coordinates. Native print preview remains unverified because the in-app browser's print call stalled. See [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md), [browser evidence](../artifacts/live-browser-verification.json), and [export evidence](../artifacts/live-export-verification.json).
