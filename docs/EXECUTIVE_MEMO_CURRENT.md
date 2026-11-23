# A small monthly gain is not yet a clear expansion signal

**Current U.S. market case study, prepared November 23, 2026.** Reference month: **October 2026**. Source vintage: **U.S. Census Bureau MARTS, November 17, 2026, release CB26-181**. Values are native USD and nominal; seasonal adjustment does **not** remove inflation. The independent plan was declared before inspecting the generated sector decomposition and ranks, after reading the published release headline.

## Decision

Keep a broad forecast change conditional on more evidence. Prioritize the business's exposure to nonstore retail, gasoline, and motor vehicle sales; obtain price and unit-sales evidence before treating dollar growth as higher physical demand. Reassess with revisions and the next advance release. The proposed owner is the commercial analytics lead.

## What changed

| Seasonally adjusted total | Comparison | October 2026 | Change |
| --- | ---: | ---: | ---: |
| Month over month | September 2026: $746.637 billion | $748.220 billion | +$1.583 billion; published +0.2% |
| Year over year | October 2025: $700.427 billion | $748.220 billion | +$47.793 billion; published +6.8% |

The **official 90% sampling interval for the monthly change is -0.2% to +0.6%**, from +0.2% plus or minus 0.4 percentage points. It contains zero, so the published estimate is not statistically distinguishable from zero at that confidence level. This is not evidence that the actual change was exactly zero.

The **official 90% sampling interval for the annual change is +6.3% to +7.3%**, from +6.8% plus or minus 0.5 percentage points. It excludes zero. The annual nominal signal is positive, while price effects and changes in sales volume remain unresolved. These intervals concern sampling error; nonsampling error also exists.

## The monthly composition matters

The following rows partition 13 non-overlapping top-level sectors. All amounts are seasonally adjusted nominal USD billions. The total is a summary, not an extra component.

| Sector group | September 2026 | October 2026 | Contribution to change |
| --- | ---: | ---: | ---: |
| Nonstore retailers | $126.661 | $128.232 | +$1.571 |
| Gasoline stations | $67.581 | $68.608 | +$1.027 |
| Motor vehicle and parts dealers | $139.228 | $136.994 | -$2.234 |
| Miscellaneous store retailers | $15.795 | $16.539 | +$0.744 |
| Health and personal care stores | $39.738 | $40.327 | +$0.589 |
| Other eight sectors | $357.634 | $357.520 | -$0.114 |
| **Retail and food services total** | **$746.637** | **$748.220** | **+$1.583** |

Nonstore and gasoline gains together exceed the small aggregate gain because declines, especially motor dealers, offset them. These are arithmetic contributions, not established economic causes. Differences between industries have not been tested for significance. Nonstore retail should not be relabeled as all e-commerce; gasoline dollar growth does not establish higher fuel volumes.

## Keep adjustment basis and vintage consistent

Unadjusted October sales were **$761.378 billion**, versus **$728.961 billion** in September: **+4.45%** calculated from published levels. The comparable seasonally adjusted change is **+0.21%** at two-decimal precision, or the release's printed **+0.2%**. The adjustment bases answer different questions and must remain separate. Use the adjusted series for recent direction; keep seasonal and holiday/trading-day effects in view when using unadjusted calendar-month dollars.

October is an advance estimate, September is preliminary, and marked earlier comparisons are revised in this release. A later source download can alter history as well as the newest month. Table 3's median variability measures describe recent historical estimates, based on unadjusted data; they are not current official intervals for every sector. Sector uncertainty cannot be recovered by assuming independent category errors.

## Next evidence

1. Compare the business's own sector exposure with the contribution table, then obtain price and unit-sales measures. Avoid inferring company-level opportunity from national dollar totals alone.
2. Review whether the mix persists when September and October are revised. The frozen release schedules November estimates for **December 16, 2026, at 8:30 a.m. EST**; verify the actual release when performing that review.
3. Update the recommendation using the new vintage and any suitable price/volume evidence. This descriptive report establishes no intervention effect or inflation-adjusted growth rate.

## Source and independent checks

The survey represents U.S. retail and food services employer businesses. An independent workbook reading matched **84 source values** to the frozen export: 13 sectors across current/prior/year-ago months and both adjustment bases, plus six totals. The 13 sectors reconcile exactly in all six cuts. Source values are integer USD millions; this memo displays USD billions. The application also retains the source sheet, row, and column for each estimate.

Source: [U.S. Census Bureau, October 2026 advance release](https://www.census.gov/retail/marts/www/marts_current.pdf), November 17, 2026, Tables 1-3 and explanatory notes. The current URL is mutable; the project's frozen originals preserve this vintage. Advance workbook SHA-256: `c15759cccb4bf0feb108921b6dcc583bc4592494311f7e3eca2fe5024901b75f`. Frozen application export SHA-256: `21ad5cd6ac4e8a0dbfef6ecaa68efd38a503c4532c13550be78608604ef44759`. Evidence: `dist/data/market.json`, `artifacts/market_points.csv`, `artifacts/market_validation.json`, and `data/snapshots/market/2026-11-17/`.
