# Release scope and tradeoffs

RevenueLens combines a primary current US market investigation with a separate historical invoice lab. The handbook is design context; its proposed PostgreSQL and Power BI implementation is not evidence that those components already exist. The standalone source repository and portfolio demo are public; the separate [private RevenueLens site](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site) requires authorized ChatGPT sign-in. Its recorded version-3 authenticated checks and the public portfolio's later successful native Chrome print checks are distinct evidence. [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md) and [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) define the release channels and exact tested scopes.

## Primary current US report

The primary browser application uses the **November 17, 2026 Census release for October 2026**. It presents national sales, separate SA and NSA trends, 13 non-overlapping broad-sector contributions with an explicit residual, release status, source coordinates, and the official sampling-error qualification. A Python pipeline freezes source files and emits a portable read-only payload. Levels are nominal USD millions; no FX conversion or inflation adjustment is applied.

The official latest SA monthly estimate is +0.2% with a 90% margin of ±0.4 percentage points. Its interval includes zero, so a confident monthly acceleration claim is unsupported. Sector arithmetic does not establish causal drivers or tested differences between industries. The national source has no retailer invoices, customer cohorts, state-level detail, or experimental intervention outcomes. These are not manufactured from aggregate estimates. See [MARKET_METHODOLOGY.md](MARKET_METHODOLOGY.md), [MARKET_METRICS.md](MARKET_METRICS.md), and the [current analysis plan](ANALYSIS_PLAN_CURRENT.md).

The report is a snapshot of one official release vintage, not a live connection that refreshes itself. Advance estimates and comparison periods can be revised. Refreshing sources requires a new download, build, validation, and source manifest. A changing current-release URL does not replace the frozen local files and hashes.

## Separate historical invoice lab

The historical lab presents business overview, change drivers, customer cohorts, and data trust, with a decision memo and source invoices from UCI Online Retail II. Python, SQL, and SQLite provide a source-to-report path without a separate database service. Exact GBP storage, explicit row identity, dispositions, idempotent imports, and complete observation windows are retained.

This lab uses the original 2009–2011 UK retailer records. Its source data, database, SQL, and pipeline exports remain GBP. Its US-audience presentation applies one fixed historical rate, **1 GBP = 1.5705 USD**, the November 30, 2011 [Federal Reserve H.10 / FRED DEXUSUK observation](https://fred.stlouisfed.org/data/DEXUSUK). That constant-currency convention applies only to the lab and does not create current US observations. The primary Census report is already native USD and receives no FX conversion. See [CURRENCY_POLICY.md](CURRENCY_POLICY.md).

Anonymous customers limit behavioral coverage. First observed purchasing is not acquisition; calendar repeat purchasing is not subscription retention. Recorded cancellations are not linked to original sales. Retained duplicate candidates, excluded non-merchandise categories, inconsistent-invoice handling, and extreme invoices can influence totals and remain inspectable.

## Power BI and PostgreSQL

The release does not claim a tested `.pbix`, a deployed PostgreSQL warehouse, a randomized campaign, or a live retailer integration. The [Power BI guide](POWER_BI.md) is an optional historical-lab integration path, not a completed desktop report. Native USD market exports and historical GBP invoice exports have different units and grains.

Move to PostgreSQL when shared ingestion, concurrent analysts, access-controlled views, or scheduled refresh justifies a managed database. Preserve provenance, exact numeric types, dispositions, and snapshot versioning. SQLite tests do not establish PostgreSQL behavior; the deployed database and actual serving roles require their own verification.

## Application and evidence boundaries

The static application reads public aggregate snapshots and a bounded set of pseudonymous historical invoice evidence. It has no live retailer upload, user workspace, private customer data, write API, scheduled refresh, or multi-tenant administration. These would require separate implementation and testing.

Source validation, browser behavior, remote publication, public accessibility, Power BI reconciliation, and real business impact are separate claims. A polished release and passing tests do not establish a global percentile rank. Quality claims should refer to executed checks, traceable evidence, and reproducible behavior.

`dist/` is the packaged static artifact. Each private deployment is confirmed by the platform against its saved source version. [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md) distinguishes deployment/access confirmation from live asset checks and interactive browser verification. Publishing the source repository and portfolio demonstration preserves the separate Site's private audience; local source updates alone do not establish a later private deployment.
