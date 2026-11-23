# Current US retail analysis plan

Declared November 23, 2026, before inspecting the application's derived sector results. The official October 2026 headline and its uncertainty were already known from the Census release when this plan was written. This is a reproducible investigation plan, not a preregistered randomized experiment.

## Decision and population

Use the latest frozen official US retail and food services release to assess whether the national sales movement supports a broad demand narrative or a more limited sector explanation. The unit is a published national industry-month estimate. No retailer invoices, customers, geography below the United States, or intervention assignments are available in this source.

The current snapshot is the Census Bureau's November 17, 2026 release for October 2026. The next scheduled release is not treated as observed data. The data is nominal USD, with separate seasonally adjusted and not-adjusted series. Findings apply to this release vintage and can change after revisions.

## Questions and competing explanations

| Question | Explanation to inspect | Competing explanation | Evidence boundary |
| --- | --- | --- | --- |
| Is the latest monthly direction clear? | A genuine increase in the national sales estimate | Sampling uncertainty is compatible with no change | Preserve the official 90% interval. Do not infer acceleration from a positive point estimate alone. |
| Is the change broad across industries? | Several non-overlapping sectors contribute in the same direction | A few large sectors offset declines elsewhere | Use additive dollar contributions from the 13 broad sectors and an explicit residual. Do not rank nested parents and children together. |
| Does the result depend on the adjustment basis? | The underlying seasonal-adjusted movement is consistent with the raw calendar comparison | Calendar or seasonal effects account for a large difference | Inspect SA and NSA in separate, fully labeled views. Never subtract one basis from another. |
| What does year-over-year growth mean? | Higher nominal spending is consistent with greater activity | Price changes, industry mix, or other composition changes explain part of the nominal growth | The source is not price-adjusted. No real-volume or inflation-adjusted demand claim follows without additional data and a justified deflator. |
| Is a narrative robust to release changes? | A conclusion persists after official revisions | Advance estimates or revised comparison periods materially change it | Freeze raw files and their hashes, retain advance/preliminary/revised status, and avoid mixing release vintages. |

## Planned calculations

1. Verify the total, period, units, source coordinates, release date, and source hashes before interpreting a chart.
2. Compute month-over-month and year-over-year changes from matching category, adjustment basis, and release vintage. Preserve the official rounded headline and its sampling-error statement separately from ratios recomputed from rounded levels.
3. Decompose the national dollar difference using 13 non-overlapping broad industry categories. Carry any difference between their sum and the separately published total as an explicit residual; do not force it to zero.
4. Show contribution percentage points as the sector's dollar change divided by the national comparison-period level. These are arithmetic contributions, not causal effects or tested differences between industries.
5. Inspect a trend over several complete published months. Do not infer statistical significance for sector differences or past months from the latest headline interval.

## Decision rule and limits

The official latest SA month-over-month estimate is +0.2% with a margin of ±0.4 percentage points at 90% confidence. Its interval includes zero, so the release does not establish a nonzero monthly change at that confidence level. Use a cautious interpretation of the monthly headline while examining sector contributions and the year-over-year context. An apparently large sector contribution does not, by itself, justify a causal business story or a firm-specific investment decision.

If adjustment basis, source status, missing values, category overlap, or reconciliation is unresolved, withhold the affected comparison. A defensible result may be that the evidence is insufficient for a broad demand claim. Additional price, volume, regional, or retailer-specific data would be needed for those separate questions.

Source: [US Census Bureau, October 2026 advance retail release](https://www.census.gov/retail/marts/www/marts_current.pdf), [Retail Trade program](https://www.census.gov/retail/index.html). The raw local snapshot, not a future version of the changing current-release URL, defines this investigation.
