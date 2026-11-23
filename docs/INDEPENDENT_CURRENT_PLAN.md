# Current U.S. retail investigation plan

Declared 2026-11-23 before inspecting the application's generated sector decomposition, ranks, or reconciliation. The published release headline has already been inspected. This is a descriptive plan, not a preregistered intervention or a claim to have been blind to all source values.

## Question and vintage

What does the October 2026 advance U.S. retail and food services estimate support about the recent sales direction and sector composition? Use the U.S. Census Bureau's **November 17, 2026** MARTS release, release **CB26-181**. Freeze the downloaded release and checksum; the `marts_current.pdf` address is mutable and can later contain a different month.

Keep seasonally adjusted (SA) and not seasonally adjusted (NSA) estimates separate. USD is native to this dataset; no GBP conversion belongs in the main analysis. Both adjusted and unadjusted dollar amounts are nominal, not adjusted for price changes.

## Competing hypotheses

| Question | Working hypothesis | Competing explanation | Planned check |
| --- | --- | --- | --- |
| Is month-to-month growth broad? | Most top-level industries add to the point-estimated increase. | A few positive sectors offset declines elsewhere. | Signed dollar changes for a non-overlapping set of industry categories; contribution sum and positive/negative sector counts. |
| Is the raw monthly movement representative? | NSA and SA month-to-month changes give similar readings. | Seasonal, holiday, or trading-day patterns explain much of the difference. | Compare each adjustment basis separately, with source labels; do not splice NSA levels into an SA bridge. |
| Is the estimated direction resolved? | The published interval excludes zero. | Sampling uncertainty leaves the monthly direction unresolved. | Official headline 90% interval; label a zero-containing interval as statistically unresolved at that confidence level. |
| Can stronger sectors be ranked confidently? | Point estimates establish a meaningful relative ordering. | Differences between sectors may be sampling variation; ranking is descriptive only. | Preserve official standard errors/qualifiers; do not invent covariance or significance tests for pairwise rankings. |
| Is the change stable? | The advance vintage remains close to later releases. | Survey responses, revisions, and concurrent seasonal adjustment change it. | Freeze this vintage, identify advance/preliminary/revised status, and compare future vintages only when actually collected. |

## Commitments

- Reconcile the displayed industry universe to the corresponding published total using one adjustment basis and one vintage. Parent totals and subcategories must never be summed together.
- Use the 13 top-level groups, including food services, for a full retail-and-food-services bridge if their supplied values reconcile. Keep exclusions, residuals, and rounding visible.
- Use October 2026 versus September 2026 for month-to-month analysis; October 2026 versus October 2025 for year-over-year analysis. Do not label a one-month comparison as a quarter or annual trend.
- Keep estimated dollar totals, calculated dollar changes, published rounded percentage changes, and published sampling uncertainty distinguishable. Rounding can make a recomputed percentage differ slightly from the release's printed percentage.
- Use the published headline 90% confidence interval directly. Do not derive a sector contribution interval by adding standard errors, assume category independence, or treat a rounded zero as certainty.
- Treat NSA year-to-date measures as a separate basis. There is no published SA year-to-date total in this release.
- The source describes employer businesses in the United States, not retailer transactions, invoices, identified customers, retention, conversion, profit, units sold, or inflation-adjusted demand.

## Decision boundary

Use the report to prioritize a sector-level investigation and the next release review. A weak or uncertain aggregate monthly signal can justify waiting for revisions rather than acting on a narrow point estimate. Industry contribution arithmetic does not identify economic causes, pricing effects, company-level opportunity, or a measured intervention result.

Source: [U.S. Census Bureau, October 2026 advance release](https://www.census.gov/retail/marts/www/marts_current.pdf), November 17, 2026. The source's explanatory notes and tables govern the labels and uncertainty statements.
