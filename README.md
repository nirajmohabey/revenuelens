# RevenueLens

RevenueLens investigates **current US retail and food services sales** using official Census Bureau data in **native USD**. A reader can inspect the national headline, sector contributions, adjustment basis, release status, uncertainty, and the source coordinates behind the reported estimates.

The current snapshot is the **November 17, 2026 Census release for October 2026**. The latest seasonally adjusted headline is **$748.2 billion**, with official month-over-month change **+0.2% ±0.4 percentage points at 90% confidence**. That interval includes zero, so the release does not establish a nonzero monthly change at that confidence level. The observations are **nominal**, not price-adjusted. [Official release](https://www.census.gov/retail/marts/www/marts_current.pdf), [Census Retail Trade program](https://www.census.gov/retail/index.html).

**Release status:** this is a local release. Remote publication has not completed; no live hosted release is claimed. Source and browser verification are separate from publication.

## Open the included application

Requires Node.js 22 or later. No frontend dependency installation, API key, database service, or analytics account is needed for local review.

```sh
npm run build
npm test
npm run serve
```

Open **http://127.0.0.1:4317** for the current US report. A separate **historical invoice lab** is available at **http://127.0.0.1:4317/lab.html**. Use `npm run serve -- --port 4318` for another local port and Ctrl+C to stop the server. Serve `dist/` over HTTP; `file://` cannot reliably load the report snapshots.

The primary report uses official national industry estimates. It does not represent a current retailer's customer data. The historical lab demonstrates invoice and cohort analysis on a different, clearly labeled source; it is not substituted for current US observations.

## Rebuild the current US snapshot

Requires Python 3.12 or later. Create a virtual environment, activate it, and install the pinned dependencies:

```sh
python -m venv .venv
```

Activation: `.venv\Scripts\Activate.ps1` on Windows PowerShell or `source .venv/bin/activate` on macOS/Linux.

```sh
python -m pip install -r requirements.txt
python -m pipeline.market download
python -m pipeline.market build
python -m pipeline.market validate
python -m unittest discover -s tests -p "test_*.py" -v
npm run build
npm test
```

`download` restores the bundled November 17 source originals from `data/snapshots/market/2026-11-17/` into `data/raw/market/` and records their hashes in `data/market-manifest.json`. It fetches a source only if its local original is missing, and refuses an unexpected checksum. `build` reads those local snapshots and exports `dist/data/market.json` plus `artifacts/market_*` evidence. `validate` checks the existing snapshot and outputs. The changing official current-release URL is not itself a reproducibility guarantee; the retained file hashes and source coordinates identify the actual analyzed release.

Source values are in **USD millions**. The browser multiplies by 1,000,000 to display full dollars; it applies **no FX rate**. SA and NSA calculations remain separate, and comparison periods use the same category, basis, and release vintage. Thirteen non-overlapping broad industries plus an explicit residual reconcile to the national level and change. Parent totals and nested child categories are not added together.

Definitions and methods: [current market metrics](docs/MARKET_METRICS.md), [methodology](docs/MARKET_METHODOLOGY.md), [declared hypotheses](docs/ANALYSIS_PLAN_CURRENT.md), [executed verification](docs/MARKET_VERIFICATION.md), [currency policy](docs/CURRENCY_POLICY.md).

## Historical invoice lab

The separate lab uses **UCI Online Retail II**, attributed to **Daqing Chen**, under **CC BY 4.0**: [dataset and license](https://archive.ics.uci.edu/dataset/502/online%2Bretail%2Bii), [DOI](https://doi.org/10.24432/C5CG6D). It covers December 2009 to December 2011 and defaults to November 2011 versus November 2010. It is a historical UK retailer case, not the current US market source.

Its workbook, SQLite model, SQL, and pipeline exports retain exact **GBP** amounts. Its optional US-audience display uses one fixed historical rate, **1 GBP = 1.5705 USD**, from the November 30, 2011 [Federal Reserve H.10 / FRED DEXUSUK observation](https://fred.stlouisfed.org/data/DEXUSUK). That convention applies only to the historical lab. It is neither current FX nor a conversion of the primary Census data.

To reproduce the full million-row historical lab, reserve at least **3 GB** of free local disk space and run:

```sh
python -m pipeline.cli download
python -m pipeline.cli build
python -m pipeline.cli validate
```

The historical database is `data/revenuelens.sqlite3`. Original workbook files in `data/raw/` and the database are excluded from Git. The optional 124 MB `artifacts/FactInvoiceLine.csv` is generated locally for Power BI import and excluded from Git; small monthly/cohort CSVs and the report JSON remain reviewable. To regenerate lab exports from its existing database, use `python -m pipeline.cli export`.

The lab preserves duplicate candidates, quarantines inconsistent invoices, reconciles source movement exactly in integer units of 1/10,000 GBP, separates anonymous-customer coverage, and keeps mature cohort denominators fixed. See [historical metrics](docs/METRICS.md), [historical verification](docs/VERIFICATION.md), and [optional Power BI integration](docs/POWER_BI.md). No `.pbix` or executed PostgreSQL deployment is claimed.

## Repository map

```text
web/                 Current US report and separate historical lab source
dist/                Static application with data/market.json and data/dashboard.json
pipeline/market.py   Current Census source-to-report commands
pipeline/cli.py      Historical invoice lab commands
sql/                 Historical local relational schema and analytical queries
data/                Source manifests, mappings, and ignored raw/database files
artifacts/           Reproducible validation outputs and small analytical exports
tests/               Offline analytical fixtures and browser-model checks
docs/                Current and historical methods, definitions, and limits
scripts/             Dependency-free build, validation, and local server
.openai/hosting.json  Configured Sites identity; not evidence of publication
```

## Verification and limits

`npm test` checks both retained payloads and their browser models. The Python fixture suite runs offline and uses temporary or in-memory databases. Current-market checks cover source identity, native USD units, matching adjustment bases, category overlap, reconciliation with a residual, and official headline uncertainty. Historical checks cover all 528 country/month comparisons, exact dispositions, source coverage, mature cohorts, and hand-checkable boundary cases. A configured CI workflow is not evidence of an executed remote CI run; saved local evidence is under `artifacts/`.

The current source cannot support retailer order counts, customer retention, cancellation matching, firm profit, campaign lift, or regional market estimates. Nominal growth does not establish real volume growth. Neither experience measures a causal intervention effect or a global quality percentile. [Release scope and tradeoffs](docs/RELEASE_SCOPE.md) records the implementation boundary.

`dist/` is the static deployment artifact after successful build and checks. The local server binds only to loopback. Remote publication has not completed and remains a separate authorized deployment; a currency or data-source edit does not itself publish the application. Keep credentials out of source and exports.
