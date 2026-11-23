# Historical invoice analysis plan

This plan applies to the UCI 2009–2011 invoice lab. The primary current US Census report has a separate [current analysis plan](ANALYSIS_PLAN_CURRENT.md), source, population, and estimate-level grain.

Declared 2026-11-23, before inspecting the generated investigation results. This is a historical, observational investigation of the UCI Online Retail II snapshot, not a test of an intervention.

## Decision

Should a commercial manager prioritize a broad repeat-purchase intervention, investigate a concentrated account or product movement, or obtain better evidence first?

The default comparison is November 2011 versus November 2010: the same calendar month in two years, excluding the partial December 2011 tail. Other available complete months can be compared with their previous-year counterpart. Year-over-year calendar matching does not remove changes in trading days, assortment, prices, customer mix, or economic conditions.

## Competing explanations

| Question | Hypothesis | Competing explanation | Evidence to inspect |
| --- | --- | --- | --- |
| What accounts for the sales change? | A change in the number of purchasing customers dominates. | Invoices per customer or sales per invoice dominates; anonymous sales can also change independently. | Known-customer sales identity, all six substitution orders, anonymous sales bridge. |
| Is the movement broad? | Many customers or products move in the same direction. | A small number of wholesale-sized invoices or accounts dominate. | Country and product additive contributions, top-customer and top-invoice shares, exceptional-invoice sensitivity. |
| Do cancellations change the reading? | Cancellation movement rises alongside positive sales. | A cancellation concerns a purchase in a different period; sign anomalies or excluded adjustments dominate. | Separate positive sales and cancellation flows, source-invoice inspection, disposition reconciliation. |
| Does customer purchasing differ? | Mature first-observed cohorts show different repeat purchasing. | Incomplete observation, anonymous customers, cohort size, or first-purchase country mix explains the apparent difference. | Fixed cohort populations, complete calendar months, mature strict 90-day repurchase windows and denominators. |
| Is the recommendation robust? | The interpretation survives an explicit concentration sensitivity. | Removing a single exceptional invoice changes the direction or materially changes the magnitude. | Baseline and documented sensitivity using the same filter and rule version; exclusions remain visible. |

## Analysis commitments

- Preserve the unmodified workbook and source file hash, sheet, and row ordinal. An identical source-row import must be idempotent. Repeated content at different row positions remains a duplicate candidate.
- Inspect all sheets and actual headers. Use source-local timestamps without inventing a timezone. Make missing, malformed, adjustment, non-merchandise, and inconsistent-invoice dispositions visible.
- Publish exact reconciliation before a recommendation: retained rows and signed parsed amounts must account for the raw snapshot, including excluded categories. Unparseable amounts are an unresolved count, never a monetary zero.
- Keep one currency, GBP, and a single rule version. Overall sales may contain anonymous customers; customer factors and cohorts require known customers. Customer decomposition must not be compared directly with the full sales total without the anonymous component.
- Use null for unavailable ratios or immature cohort cells. An observed zero under adequate coverage is different from unavailable data.
- Treat the customer, not the invoice line, as the unit if resampling is later used. No confidence interval is needed around an exact descriptive total from this file.

## Decision rule

Recommend a bounded investigation when a contribution is concentrated or a material quality issue remains. Recommend collecting additional evidence when observation maturity, customer coverage, or missing cost inputs prevent the intended decision. A broad commercial rollout requires a separate prospective experiment or other suitable causal design; these historical comparisons cannot supply measured lift.

If an intervention is proposed later, declare the assignment unit, eligible population, primary outcome, practical effect threshold, observation window, sample size, cost guardrails, and launch/hold/reject rule before viewing experimental outcomes. No synthetic outcome belongs in the historical marts.

## Source

Daqing Chen, *Online Retail II*, UCI Machine Learning Repository, DOI [10.24432/C5CG6D](https://doi.org/10.24432/C5CG6D), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source attribution does not imply endorsement of the analysis.
