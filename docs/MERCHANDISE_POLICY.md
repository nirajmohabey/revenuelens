# Classification and sensitivity policy

The baseline uses a conservative, explicit stock-code policy over the preserved workbook. This is an analyst's recorded-movement definition, not an audited accounting classification.

## Code review

| Excluded code | Observed description family | Reason for separate reporting |
| --- | --- | --- |
| `ADJUST`, `ADJUST2` | Adjustment entries | Explicit adjustments rather than ordinary sale lines. |
| `AMAZONFEE` | Amazon fee | Fee movement without product cost or recognition context. |
| `B` | Adjust bad debt | Bad-debt adjustment. |
| `BANK CHARGES` | Bank charges | Financial charge. |
| `C2` | Carriage | Delivery charge. |
| `CRUK` | Commission | Commission movement. |
| `D` | Discount | Adjustment rather than standalone merchandise quantity. |
| `DOT` | Dotcom postage | Delivery charge. |
| `M` (case-insensitive) | Manual | Ambiguous manual entries kept separate until reviewed. |
| `POST` | Postage | Delivery charge. |
| `S` | Samples | Sample movements kept outside ordinary positive merchandise sales. |

Descriptions were inspected in the source; the actual classifier uses the explicit, case-insensitive code list rather than a fuzzy description match. A missing description alone does not eliminate a valid numeric line. Other codes remain eligible if they satisfy the parsing, invoice-consistency, quantity, price, and invoice-prefix rules. An unlisted unusual code is not evidence that its semantics have been audited.

`PADS` is deliberately **included**. Its observed description is “PADS TO MATCH ALL CUSHIONS,” which indicates physical merchandise. Nineteen source rows contain that code: 17 positive-price sale lines, one cancellation, and one zero-price movement. A generic alphabetic-code exclusion would have discarded merchandise here. The tiny 0.001 GBP sale prices are preserved exactly, not rounded to zero before aggregation.

## Invoice and duplicate decisions

An invoice with inconsistent timestamp, customer, or country metadata is quarantined in full. The baseline does not resolve an inconsistency by inventing a composite order key. Its original row payloads and signed movement remain in quality reconciliation so a reviewer can inspect the cost of this conservative rule.

Repeated content at different sheet/row positions remains in the baseline. There are three distinct counts: repeated-content groups, all source rows in those groups, and excess rows beyond the first row per group. None establishes an audited duplicate transaction. The two source sheets overlap during early December 2010; source boundaries and cross-sheet candidates must be considered when interpreting that month.

## Two sensitivity exercises

The duplicate-content sensitivity retains one row per content group and recalculates sale movement. This is an alternative rule, not an assertion that every discarded candidate was wrong. Source-row identities and the retained baseline remain available.

The concentration sensitivity removes the five largest eligible sale invoices independently from each selected comparison period and recalculates positive sales. It tests dependence on exceptional invoice magnitude; it is not a cleaning rule. In a small market with five or fewer eligible invoices, it can remove the entire population, so its resulting comparison should not be generalized.

Every displayed sensitivity must state its rule and use the same currency, comparison periods, country filter, and accepted-line definitions as the baseline. Unsupported costs, acquisition channels, or treatment effects are not filled in to make a scenario look complete.
