# Optional Power BI integration

This guide describes the **historical invoice lab**. Its fact-table CSV, customer cohorts, and GBP-to-USD presentation measures do not apply to the primary current US report. The current report's `artifacts/market_*` exports retain native USD-million levels; import their documented month/category/basis/vintage grain and use no FX conversion. Keep SA and NSA as separate series and retain the national bridge residual. See [MARKET_METRICS.md](MARKET_METRICS.md).

The shipped interface is the browser application. No `.pbix` is included or claimed as tested. Power BI Desktop can be added as a second presentation layer over the same validated snapshot; these are integration instructions, not a completed report.

The browser report uses **USD constant currency** for presentation. All pipeline-produced import tables retain **source GBP**. Keep the GBP base measures below, then add the separate USD reporting measures in this guide. Merely changing a currency format from GBP to USD does not convert an amount.

## Import contract

Use one validated snapshot only. The build exports `artifacts/FactInvoiceLine.csv`, with pseudonymous customers and sheet/row provenance. Import it through Get data > Text/CSV. Keep `InvoiceKey`, `ProductKey`, and `CustomerKey` as text, `Quantity` as a whole number, and `UnitPriceGBP`/`SignedAmount` as decimal GBP. The decimal CSV values are derived from exact stored integers; avoid automatic currency conversions or treating a binary-float sum as the final independent reconciliation.

The pipeline database is `data/revenuelens.sqlite3`; it contains `fact_invoice_line`, `dim_customer`, `dim_product`, `dim_country`, `dim_invoice`, and the provenance/disposition table `raw_line`. Export those tables with a SQLite-capable client if additional model tables are needed. A direct SQLite connector is not assumed to be installed in Power BI Desktop. Import source provenance and quality dispositions separately so exclusions remain auditable.

The database's `amount_units` and `price_units` are exact integer ten-thousandths of GBP. Keep those original integers if importing from SQL. Create a date dimension from the validated `InvoiceDate` timestamps and mark it as the date table. Do not infer a timezone from these source-local timestamps.

For a smaller integration, `artifacts/monthly_metrics.csv` and `artifacts/cohorts.csv` are exported aggregate tables. They support the respective monthly and cohort reports, but do not support invoice drill-through or arbitrary distinct-customer counts. Never sum monthly distinct-customer counts to obtain a multi-month customer total.

Create single-direction one-to-many relationships from each dimension to the fact. The fact must remain one retained source invoice line after joins. Hide raw price/quantity fields from casual implicit aggregations. Do not join a cohort summary back to transaction lines: it has a different grain and would fan out denominators.

For the measures below, deliberately map the imported fact to `FactInvoiceLine` with `SignedAmount`, `LineClass`, `EligibleMerchandise`, and `InvoiceKey`. These names describe the semantic contract; they are not a claim about automatically generated Power BI table names.

```dax
Positive Sales GBP =
CALCULATE(
    SUM(FactInvoiceLine[SignedAmount]),
    FactInvoiceLine[LineClass] = "sale",
    FactInvoiceLine[EligibleMerchandise] = TRUE()
)

Cancellation Value GBP =
-CALCULATE(
    SUM(FactInvoiceLine[SignedAmount]),
    FactInvoiceLine[LineClass] = "cancellation",
    FactInvoiceLine[EligibleMerchandise] = TRUE()
)

Sale Invoices =
CALCULATE(
    DISTINCTCOUNT(FactInvoiceLine[InvoiceKey]),
    FactInvoiceLine[LineClass] = "sale",
    FactInvoiceLine[EligibleMerchandise] = TRUE()
)

Average Order Value GBP = DIVIDE([Positive Sales GBP], [Sale Invoices])

Cancellation Value Ratio = DIVIDE([Cancellation Value GBP], [Positive Sales GBP])
```

`DIVIDE` leaves a zero denominator unavailable. Apply an observed-zero cancellation display only after confirming the selected period has source coverage; do not blanket-fill all blanks with zero.

## Four report pages

| Page | Required evidence |
| --- | --- |
| Business overview | Selected and comparison complete periods, positive sales, cancellation value, net movement, sale invoices, AOV, country bridge, anonymous coverage. |
| Explanation | Known-customer Shapley contributions plus anonymous change, top contributions and residual, concentration, exceptional-invoice sensitivity, invoice drill-through. |
| Customer behavior | Fixed first-observed cohorts, cohort size, complete-month retention cells, mature strict 90-day repurchase numerator and denominator; cohort country fixed at first purchase. |
| Data trust | Source manifest, sheet and row provenance, dispositions, duplicate candidates, inconsistent invoices, completeness, exact row and signed-amount reconciliation. |

Keep the cohort mart separate from the transaction-date slicer. A transaction filter must not silently reconstruct cohort populations. Explicitly label whether a country control refers to transaction country or first-purchase cohort country.

## Measures for a fact-table import

These expressions use the actual columns of `artifacts/FactInvoiceLine.csv`, imported as `FactInvoiceLine`. Test the expressions against the exact snapshot before treating them as equivalent to the web report.

```dax
Positive Sales GBP =
CALCULATE(
    SUM(FactInvoiceLine[SignedAmount]),
    FactInvoiceLine[LineClass] = "sale"
)

Cancellation Value GBP =
-CALCULATE(
    SUM(FactInvoiceLine[SignedAmount]),
    FactInvoiceLine[LineClass] = "cancellation"
)

Sale Invoices =
CALCULATE(
    DISTINCTCOUNT(FactInvoiceLine[InvoiceKey]),
    FactInvoiceLine[LineClass] = "sale"
)

Average Order Value GBP = DIVIDE([Positive Sales GBP], [Sale Invoices])
Cancellation Value Ratio = DIVIDE([Cancellation Value GBP], [Positive Sales GBP])
```

The fact already contains only accepted merchandise sale/cancellation lines. Quality and excluded movement must come from `raw_line`, not from pretending those omitted lines never existed. Use `DIVIDE`'s unavailable value for zero denominators. Only convert a blank cancellation sum to zero after confirming an adequately observed selection; a no-data selection must remain distinguishable.

## USD constant-currency reporting measures

Use one fixed rate for all dates and both comparison periods: **1 GBP = 1.5705 USD**, the November 30, 2011 [Federal Reserve H.10 / FRED DEXUSUK observation](https://fred.stlouisfed.org/data/DEXUSUK). It is a historical reporting convention; it is not current FX, daily transaction conversion, or evidence about a US-market customer population. The full policy is in [CURRENCY_POLICY.md](CURRENCY_POLICY.md).

```dax
Reporting FX USD per GBP = 1.5705

Positive Sales USD =
VAR SourceGBP = [Positive Sales GBP]
RETURN
IF(
    ISBLANK(SourceGBP),
    BLANK(),
    SourceGBP * [Reporting FX USD per GBP]
)

Cancellation Value USD =
VAR SourceGBP = [Cancellation Value GBP]
RETURN
IF(
    ISBLANK(SourceGBP),
    BLANK(),
    SourceGBP * [Reporting FX USD per GBP]
)

Average Order Value USD = DIVIDE([Positive Sales USD], [Sale Invoices])
```

Format only the converted monetary measures as USD. Keep source-GBP measures available for reconciliation and hide them from the ordinary report field list if appropriate. Apply the same rate once to net merchandise movement, invoice prices and values, segment contributions, and monetary Shapley outputs. Convert an unrounded aggregate, not a sum of individually rounded USD lines. Do not multiply counts, units, cohort rates, concentration shares, cancellation ratios, or percentage changes by the FX rate.

Preserve unavailable results when the source population or denominator is missing. The example measures intentionally retain `BLANK()`; coverage-aware observed-zero cancellation handling is a separate step. Reconcile each displayed USD total to its source-GBP measure multiplied by 1.5705. Using the same rate on both periods preserves their percentage comparison.

## Reconciliation before sharing

Compare measures with saved SQL/Python outputs at the entire selected period, one country, and one customer cohort. Check clearing all filters, an empty country/month intersection, a zero previous denominator, the partial final month, and an immature cohort cell. Confirm join row counts and amount totals before and after relationships. Refresh the final report once and record its source snapshot and rule version.

Power BI online sharing and embedding depend on the chosen account, tenant, and license. Verify those capabilities before promising an online report. A static export is a fallback. The local browser report is available without a Power BI license; remote browser publication has not completed, and neither a live hosted report nor Power BI publication is claimed.

References: [Microsoft star-schema guidance](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema), [DAX DIVIDE](https://learn.microsoft.com/en-us/dax/divide-function-dax).
