# Historical invoice lab: investigate basket value and customer coverage before a broad retention rollout

Historical UK-retailer case study. Prepared 2026-11-23 from UCI Online Retail II; comparison: **November 2011 versus November 2010, all markets**, rule `retail-movement-v1.0.0`. The analysis plan was declared before inspecting the results. Values describe recorded merchandise movements, not audited revenue or profit.

## USD reporting policy

The US-audience presentation converts original GBP values at one fixed rate: **USD 1.5705 per GBP**, the **2011-11-30** observation in the Federal Reserve H.10 series [DEXUSUK via FRED](https://fred.stlouisfed.org/data/DEXUSUK). The same rate applies to both periods, keeping percentage changes and shares unchanged. This is a constant-rate reporting conversion, not transaction-date FX, actual USD receipts, a current exchange rate, or a change to the retailer's country. Exact original GBP facts remain unchanged; a source-value table appears below.

## Decision requested

Prioritize a focused investigation of known-customer order value and anonymous invoice coverage. The positive headline alone does not justify a broad retention campaign. In a real operating setting, the proposed owners would be the commercial analyst and data steward; the next decision would follow an invoice audit and a prospectively designed pilot. No commercial lift is assumed from this historical file.

## What the evidence supports

**Sales rose slightly, while known-customer sales fell.** Positive merchandise sales increased from **$2,245,670.72 to $2,283,719.66**, a **$38,048.94 increase (+1.69%)**. Known-customer sales fell **$28,088.21**, from $1,821,084.66 to $1,792,996.46. Anonymous sales rose **$66,137.15**, more than offsetting the decline. Anonymous sales therefore account for **21.49%** of current sales, versus **18.91%** previously. Anonymous purchases remain in overall sales but cannot support customer-level behavioral conclusions.

**The known-customer change is associated with lower sales per invoice.** Purchasing customers increased from 1,604 to 1,659; known-customer invoices increased from 2,564 to 2,640. Known-customer AOV fell from $710.25 to $679.17. Averaging all six factor substitution orders gives this descriptive bridge in USD:

| Component | Contribution to sales change, USD |
| --- | ---: |
| Purchasing customers | +$60,940.95 |
| Invoices per known customer | -$8,141.07 |
| Sales per known-customer invoice | -$80,888.09 |
| Known-customer subtotal | **-$28,088.21** |
| Anonymous sales | +$66,137.15 |
| Overall change | **+$38,048.94** |

Displayed rounding can produce a one-cent difference between components and totals. The underlying unrounded GBP decomposition reconciles. These arithmetic contributions do not establish causation. Product mix, prices, wholesale purchasing, and identifier coverage remain competing explanations. Lower AOV does not establish lower profit because costs are unavailable.

**The positive direction survives two explicit sensitivities.** Removing the five largest eligible sale invoices independently from each period gives $2,079,172.24 versus $2,015,000.00: **+$64,172.24 (+3.18%)**. Retaining one row per identical-content group instead gives **+$38,619.57 (+1.73%)**. These support the direction under those specific rules; they do not prove all transactions are representative or identify audited duplicates. The two largest current invoices, `574941` ($83,143.75) and `576365` ($79,551.97), are anonymous and together represent $162,695.71. Inspect their source rows before attributing them to a broad customer pattern.

Recorded cancellation value fell from $55,157.34 to $39,279.05. Net recorded merchandise movement consequently increased by $53,927.23. The dataset does not match those cancellations to original purchases; this is not an audited order-return-rate improvement.

## Original GBP source values

These exact source-level totals preserve three decimal places where present. The database retains integer units of 1/10,000 GBP; original timestamps and source-row identities are unchanged.

| Measure | November 2010, original GBP | November 2011, original GBP |
| --- | ---: | ---: |
| Positive merchandise sales | GBP 1,429,908.132 | GBP 1,454,135.410 |
| Known-customer sales | GBP 1,159,557.252 | GBP 1,141,672.370 |
| Anonymous sales | GBP 270,350.880 | GBP 312,463.040 |
| Cancellation value | GBP 35,120.880 | GBP 25,010.540 |
| Net merchandise movement | GBP 1,394,787.252 | GBP 1,429,124.870 |

Sale invoices are 2,712 and 2,748; customer and invoice counts are not currency-converted.

## Confidence and limits

The complete workbook contains **1,067,371 rows**. An independent streaming Decimal calculation and the modeled disposition reconciliation agree on **GBP 19,287,250.568** of signed raw movement, with an exact zero residual. Reconciliation includes excluded categories, not just sales. Entire invoices with inconsistent timestamp/customer/country metadata are quarantined rather than silently split. Repeated content remains in the baseline as review candidates, with a separate sensitivity.

Coverage is **2009-12-01 07:45:00 to 2011-12-09 12:50:00**, source-local and timezone unspecified. Source sheets overlap in early December 2010, affecting that month's retained baseline; this memo uses November. December 2011 is partial and excluded from complete-month comparisons. October and November 2011 first-observed customers cannot have mature 90-day outcomes at the final timestamp; unavailable outcomes must not become zero repurchase. Purchases before December 2009 are unknown. Calendar matching does not remove trading-day or customer-mix differences.

## Next evidence and decision

1. Audit the two anonymous large invoices and the largest negative product/country contributions. Establish whether basket-value change reflects price, mix, bulk orders, or identifier coverage before choosing a treatment.
2. If a retention treatment remains plausible, preregister a customer-randomized pilot. Define eligible known customers, one fixed observation window, an any-repeat-purchase primary outcome, a practical minimum effect, a power-based sample size, and contact-cost/complaint guardrails. Retain all eligible assigned customers in their assigned arm and wait for full observation maturity.
3. Hold a rollout until the pilot supports a useful effect with acceptable uncertainty and guardrails. No treatment lift, profit benefit, acquisition effect, or expected cash return has been measured.

Evidence: `dist/data/dashboard.json` -> `comparisons["2011-11|All markets"]`; `artifacts/monthly_metrics.csv`; `artifacts/reconciliation.json`; `artifacts/validation.json`; source rows in invoice drill-through and `artifacts/FactInvoiceLine.csv`. Workbook SHA-256: `bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980`.

Dataset: Daqing Chen, [Online Retail II](https://archive.ics.uci.edu/dataset/502/online+retail+ii), UCI Machine Learning Repository, [DOI 10.24432/C5CG6D](https://doi.org/10.24432/C5CG6D), CC BY 4.0. FX reference: [Federal Reserve H.10, DEXUSUK via FRED](https://fred.stlouisfed.org/data/DEXUSUK), 2011-11-30, USD 1.5705 per GBP.
