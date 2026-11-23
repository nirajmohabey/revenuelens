# Historical invoice lab metric dictionary

This document applies to `lab.html` and the UCI 2009–2011 invoice snapshot. The primary current US Census report uses a separate [market metric dictionary](MARKET_METRICS.md), national estimate-level grain, and native USD source.

All merchandise totals describe recorded movements in a historical file. They are not audited revenue recognition, profit, or current business performance. The source and analytical currency is **GBP**; the report presentation currency is **USD constant currency**. The analytical grain is one retained workbook invoice line; source identity is file hash, sheet, and row ordinal.

## Source and display currency

The browser converts unrounded GBP monetary aggregates to USD using the same fixed **1 GBP = 1.5705 USD** rate for every period. The reference is the November 30, 2011 observation in [Federal Reserve H.10 / FRED DEXUSUK](https://fred.stlouisfed.org/data/DEXUSUK). Monetary definitions below remain source-GBP definitions; their displayed USD equivalents are those amounts multiplied once by 1.5705. Exact integer reconciliation remains in units of 1/10,000 GBP.

The fixed rate preserves percentage changes and ratios. Counts, quantities, dates, customer populations, and retention rates are unaffected. Missing amounts stay unavailable. This historical display convention is neither daily conversion nor current FX, and it does not describe a US retail population. See [CURRENCY_POLICY.md](CURRENCY_POLICY.md) for rounding, export, and attribution details.

## Included movements

An eligible sale has a non-cancellation invoice, positive quantity, positive unit price, a valid timestamp, nonempty invoice and stock identifiers, consistent invoice metadata, and an included merchandise code. An eligible cancellation movement has a cancellation-prefixed invoice, negative quantity, positive unit price, and the same remaining requirements. Other sign combinations, adjustments, non-merchandise codes, and quarantined invoices remain visible in data-quality outputs.

An identical line at another source-row position is retained as a duplicate candidate. A cancellation is not matched automatically to an original purchase. A missing customer ID does not invalidate otherwise eligible overall sales; it prevents inclusion in known-customer behavior measures.

| Metric | Numerator | Denominator / population | Interpretation |
| --- | --- | --- | --- |
| Positive merchandise sales | Sum of quantity multiplied by unit price for eligible sale lines | Selected complete month and transaction-country filter | Additive source-GBP flow, displayed as USD constant currency; includes eligible anonymous purchases. |
| Cancellation value | Negative of signed amount for eligible cancellation lines | Same month and filter | Positive magnitude of a separate recorded movement. |
| Net merchandise movement | Positive sales minus cancellation value | Same month and filter | Excludes other movements; never labeled profit. |
| Sale invoices | Distinct validated invoice identifiers with eligible sale lines | Same month and filter | An invoice count, not a line count. |
| Average order value | Positive merchandise sales | Sale invoices under the identical filter | Unavailable when no eligible invoice exists. Never average subgroup AOVs without invoice weights. |
| Known purchasing customers | Distinct known IDs with an eligible sale | Same month and filter | Excludes the unknown member. |
| Invoices per known customer | Eligible sale invoices associated with known customers | Known purchasing customers | Frequency factor; both sides use the known-customer population. |
| Known-customer AOV | Positive sales associated with known customers | Eligible known-customer sale invoices | Value factor for the known-customer identity. |
| Anonymous sales share | Eligible sales with missing customer ID | All eligible positive sales | Customer-analysis coverage, not a missing transaction estimate. |
| Cancellation value ratio | Cancellation value | Positive merchandise sales | A flow ratio, not an order-return probability. It can exceed 100%. |
| Positive merchandise units | Eligible positive quantities | Selected month and filter | Excludes free or anomalous units. |
| Realized price per unit | Positive merchandise sales | Positive merchandise units | Quantity-weighted rate; product mix may change it. |

Percent changes use `(current - previous) / previous`; a zero previous denominator is unavailable. A comparison with unavailable data does not become 0% growth. An adequately observed period can legitimately have zero eligible cancellation value.

## Exact attribution

For the same known-customer population, sales equal purchasing customers multiplied by invoices per purchasing customer multiplied by positive sales per invoice. Shapley contributions average each factor's incremental contribution across all six factor substitution orders. They must sum to the known-customer sales difference, apart from displayed rounding. The anonymous-sales difference completes the bridge to overall sales change.

This is a descriptive arithmetic attribution. It does not show that acquiring customers, changing frequency, or changing order value caused the other factors. When a required denominator is zero, the multiplicative explanation is unavailable; use additive segment amounts instead.

Country and product contributions are the segment's current amount minus its previous amount. A displayed top list must retain an `Other` residual if it omits segments. Segment contributions and the residual must reconcile to the full selected sales change. Contribution percentages become unstable when the overall difference is close to zero; absolute monetary differences remain interpretable. The report scales each monetary contribution and the headline by the same fixed USD/GBP rate; the exact source-GBP identity is retained.

## Cohorts and repeat purchasing

A cohort is the month of the first observed eligible sale invoice in the full snapshot. It is not an acquisition cohort: purchases before the dataset begins are unknown. Cohort country is fixed to first-purchase country. Dashboard transaction-month changes do not rebuild cohort membership or its denominator.

Monthly purchase retention is cohort customers with at least one eligible sale in a target calendar month divided by the fixed cohort size. Month zero is 100% by construction for a complete observed cohort month. Future or partial target months are unavailable, not zero. A customer can purchase in any later month regardless of activity in the intervening month; this is repeated purchasing, not contractual subscription retention.

The 90-day repurchase rate includes only known customers whose first purchase is at least 90 days before the observation cutoff. Its numerator requires a second **distinct** eligible sale invoice strictly after the first invoice timestamp and at most 90 days later. A second line in the first invoice is not a repeat purchase; a simultaneous invoice does not qualify under this strict rule. Show the mature denominator beside every rate.

## Sensitivity and unsupported metrics

A concentration sensitivity excludes a documented exceptional-invoice selection symmetrically from each comparison period, recalculates the same metric, and labels the result as a sensitivity. It does not erase the retained baseline or establish that the exceptional transaction was wrong.

The workbook lacks reliable sessions, marketing spend, product costs, treatment assignment, and complete customer histories. Do not publish conversion, CAC, ROAS, profit margin, causal campaign lift, or true acquisition dates from this snapshot. An assumption-led scenario must be separately labeled and never merged into historical totals.
