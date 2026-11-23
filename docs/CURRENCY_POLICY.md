# Reporting currency policy

## Current US report: native USD

The primary report uses official US Census Bureau retail and food services estimates in **native USD millions**. It applies **no currency exchange rate**. Multiplication by 1,000,000 is only the conversion from source millions to full dollars for display. The observations are nominal, not price-adjusted. SA/NSA is an adjustment-basis choice, not a currency conversion. See [MARKET_METRICS.md](MARKET_METRICS.md) and [MARKET_METHODOLOGY.md](MARKET_METHODOLOGY.md).

The remaining fixed-rate policy applies **only to the separate historical invoice lab** at `lab.html`. It must never be applied to Census values or used to describe the primary report as converted UK data.

## Historical lab: fixed USD presentation over GBP

The historical lab presents monetary values in **USD for a US audience**, while retaining **GBP as the original source and analytical currency**. This is a constant-currency presentation of historical UK retail records. It does not turn the lab dataset into US-market sales or establish current business performance.

## Fixed reference rate

| Setting | Value |
| --- | --- |
| Source currency | GBP |
| Report display currency | USD |
| Fixed reporting rate | **1 GBP = 1.5705 USD** |
| Reference observation date | **November 30, 2011** |
| Reference series | Federal Reserve H.10, FRED **DEXUSUK** |
| Quotation | US dollars per one UK pound sterling |
| Source checked | November 23, 2026 |

The Federal Reserve observation is available in the [FRED DEXUSUK source table](https://fred.stlouisfed.org/data/DEXUSUK), with series information on the [FRED series page](https://fred.stlouisfed.org/series/DEXUSUK). The observation for November 30, 2011 is 1.5705 USD per GBP. That date is the end of the default current comparison month. The same fixed observation is deliberately applied to **every** month and comparison period in the report.

The reference is historical, not a live exchange-rate feed, a daily transaction conversion, or an amount actually settled in USD. No current exchange rate is implied. The report does not estimate the effect of historical exchange-rate fluctuations.

## Calculation and rounding

```text
reporting USD = source GBP × 1.5705
source GBP = exact stored amount_units ÷ 10,000
reporting USD = amount_units × 15,705 ÷ 100,000,000
```

Multiply rather than divide: the reference series is quoted as USD per GBP. Convert the unrounded source aggregate, then round the presentation to the displayed precision. Do not round individual source lines to USD cents before summing. Small differences between the sum of displayed rounded components and the displayed aggregate can arise from rounding; the exact GBP reconciliation remains authoritative.

For a direction and scale check, **GBP 100 becomes USD 157.05**. The validated November 2010 positive-sales source total of GBP 1,429,908.132 becomes USD 2,245,670.721306 before display rounding; November 2011 GBP 1,454,135.41 becomes USD 2,283,719.661405. Those are presentation equivalents of the retained GBP amounts.

## Which values change

- Sales, cancellation value, net merchandise movement, AOV, unit prices, invoice amounts, monetary segment contributions, and monetary Shapley contributions are displayed in USD using the same rate.
- Counts, quantities, dates, cohort membership, retention rates, cancellation ratios, concentration shares, and anonymous-sales shares do not change.
- Percentage changes do not change because both periods are multiplied by the same positive rate. For nonzero `previous`, `(1.5705 × current − 1.5705 × previous) ÷ (1.5705 × previous)` equals the source-currency percentage change.
- Missing values remain unavailable. Currency conversion must not create an observed zero or make an unsupported comparison available.

## Source artifacts and exports

The original workbook, raw rows, exact integer database columns, SQL calculations, analytical JSON payload, and pipeline-produced CSV artifacts retain their source **GBP** meaning. The payload's source-currency metadata continues to identify GBP. The browser presentation and report-generated monetary evidence exports identify **USD constant currency** and include the fixed-rate policy. Source/audit exports must preserve GBP labels and exact units so their reconciliation can be checked independently.

Do not relabel `SignedAmount`, `UnitPriceGBP`, or `amount_units` as USD without applying the presentation conversion. Do not apply the rate twice when importing a browser-generated USD export into another tool. The [Power BI guide](POWER_BI.md) keeps the GBP base measures and adds separate USD reporting measures.

## Release status

This policy documents the local application. Remote publication has not completed, and no live hosted release is claimed. A currency-display change does not itself publish the application.
