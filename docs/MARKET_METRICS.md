# Current US market metric dictionary

The primary RevenueLens report uses US Census Bureau retail and food services estimates. These are national survey estimates in **native USD millions**, not individual transaction records. The source is nominal: seasonal adjustment does not remove price changes. This dictionary does not apply to the separate historical invoice lab.

| Measure | Definition | Interpretation and boundary |
| --- | --- | --- |
| Sales level | Published category-month estimate under the selected adjustment basis | Native USD millions. Multiply by 1,000,000 only to format full USD; do not apply an FX rate. |
| Month-over-month dollar change | Current level minus previous-calendar-month level | Same category, SA/NSA basis, and release vintage on both sides. |
| Month-over-month percentage change | 100 × (current − previous) / previous | Percentage units: `0.2` means 0.2%. An unavailable or zero denominator does not become 0% growth. |
| Year-over-year dollar change | Current level minus the same calendar month one year earlier | Same category, adjustment basis, and vintage. |
| Year-over-year percentage change | 100 × (current − year-earlier) / year-earlier | Nominal growth, not real growth or a retailer's achieved impact. |
| Sector dollar contribution | Sector current level minus its matching comparison level | Arithmetic component of the national change. Use only the 13 non-overlapping broad categories. |
| Sector contribution in percentage points | 100 × sector dollar change / national comparison-period level | These components plus the residual reconcile to the level-derived national percentage change; they are not sector growth rates. |
| Residual | Published total minus the sum of the chosen broad sectors, for each period | Retained explicitly. Differences can reflect independent seasonal adjustment, rounding, and published aggregation; do not silently assign the residual to a sector. |
| Official reported change | The change printed by Census for the release | May differ slightly from a recomputation using rounded published levels. Preserve its associated error margin and status. |
| Confidence interval | Official reported change ± its reported margin of sampling error | The release uses 90% confidence. A margin around a percentage change is in percentage points. It does not cover all nonsampling error. |

## Adjustment and period rules

**SA** means adjusted for seasonal variation and holiday/trading-day differences. **NSA** means not adjusted. A chart or bridge uses one basis for every value in that calculation. The report does not mix an SA current value with an NSA comparison, average the two, or treat their difference as an industry contribution. Both remain nominal, not price-adjusted.

The published status is retained: advance, preliminary, revised, or historical. The snapshot is the November 17, 2026 release, with October 2026 as the latest published month. It is a frozen release, not a live continuously refreshed feed.

## Latest headline uncertainty

For October 2026 total retail and food services, Census reports **SA month-over-month +0.2% ±0.4 percentage points at 90% confidence**. The interval is **−0.2% to +0.6%** and includes zero; there is insufficient evidence at that confidence level to conclude that the monthly change differs from zero. The latest official SA year-over-year estimate is **+6.8% ±0.5 percentage points**. The report does not invent sector confidence intervals or infer that a difference between sector estimates is statistically significant.

## Non-overlapping bridge categories

The additive set is NAICS **441, 442, 443, 444, 445, 446, 447, 448, 451, 452, 453, 454, and 722**. These broad categories cover the report's retail and food services bridge. Totals, exclusion aggregates, and nested subcategories such as 4411 or 4451 are not added as extra sectors. An explicit residual completes the reconciliation to the published total for both periods and their difference.

This source cannot support customer retention, invoice AOV, order counts, cancellation matching, regional performance, causal campaign lift, or firm-level profitability. Those would require different evidence. The separate historical lab demonstrates invoice-level analysis without being substituted for current US observations.

Sources: [Census October 2026 release and tables](https://www.census.gov/retail/marts/www/marts_current.pdf), [Census Retail Trade program](https://www.census.gov/retail/index.html).
