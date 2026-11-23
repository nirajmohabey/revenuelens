# Private deployment and live verification

Recorded November 23, 2026. This document separates a successful platform deployment from source verification and interactive browser behavior.

## Confirmed deployment

| Item | Confirmed value |
| --- | --- |
| Site | [RevenueLens private site](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site) |
| Primary report | Current US Census retail report at `/` |
| Historical lab | Separate UCI invoice case at `/lab.html` |
| Saved version | Version 1 |
| Published source commit | `9846ca4f036afc1c978e5286d627bd3b91dcec36` |
| Platform deployment | Succeeded |
| Selected account role | Owner |
| Access configuration checked | Custom access; one owner entry and no allowed groups |
| Browser access gate observed | Requires authorized ChatGPT sign-in |

The site remains private. A production URL and successful deployment do not establish public accessibility, a completed Power BI publication, or tested behavior for every browser interaction.

## Verification state

| Layer | State | Evidence boundary |
| --- | --- | --- |
| Source and analytical models | Passed locally | 19 current-market checks, 14 offline Python tests, source hashes and independent reconciliations. |
| Browser model rendering | Passed locally | Five JavaScript tests, including 2,925 current-report route/filter renders, plus historical-lab checks. These do not execute a full browser layout engine. |
| Platform deployment and private access | Confirmed | Successful saved-version deployment, source commit, owner/access response, and observed login gate. |
| Hosted asset identity and HTTP behavior | Passed | Thirteen authenticated routes/assets returned HTTP 200. Nine non-HTML assets matched release bytes exactly; four HTML responses preserved the expected core markup. Anonymous `/` and `/data/market.json` returned 401 without exposing the private content. |
| Full interactive live-browser behavior | Pending authentication | The browser reached the ChatGPT sign-in gate. Automated approval review rejected following the Google sign-in redirect; manual sign-in is needed before authenticated browser checks can continue. |

No claim is made that every live chart, filter, download, keyboard interaction, or responsive layout has passed. [MARKET_VERIFICATION.md](MARKET_VERIFICATION.md) records the executed local checks; [VERIFICATION.md](VERIFICATION.md) records the historical source analysis.

## Executed live HTTP checks

Executed **November 23, 2026 at 17:56:18 UTC** against the private production origin. The checker used platform-provided, Site-scoped service access and followed only strict same-origin canonical redirects. It did not contact Google or establish an interactive browser session. The machine-readable result is [artifacts/live-http-verification.json](../artifacts/live-http-verification.json).

| Case | Observed result |
| --- | --- |
| Authenticated `/` | HTTP 200; current-report title, script, and stylesheet references verified. |
| Authenticated `/index.html` | Same-origin HTTP 307 to `/`, then 200; expected current-report core HTML verified. |
| Authenticated `/lab.html` | Same-origin HTTP 307 to `/lab`, then 200; expected historical-lab core HTML verified. |
| Saved query route `/?view=trends&month=2025-10&sector=447&basis=nsa` | HTTP 200; expected current-report core HTML verified. Browser application of those query parameters remains an interactive check. |
| `/market.js`, `/market-model.mjs`, `/app.js`, `/model.mjs`, `/fx.mjs` | HTTP 200; exact release-byte matches; JavaScript MIME types, including `.mjs`, were correct. |
| `/styles.css` and `/favicon.svg` | HTTP 200; exact release-byte matches; CSS/SVG content types were correct. |
| `/data/market.json` and `/data/dashboard.json` | HTTP 200 with `application/json`; exact full-payload byte matches, including the complete 6,561,501-byte historical payload. |
| Anonymous `/` and `/data/market.json` | HTTP 401 sign-in gate; checked private page/data content was not exposed. |

All **13 authenticated response cases passed**. The **nine JavaScript, CSS, SVG, and JSON assets matched byte-for-byte**. The platform adds markup to HTML responses, so their response hashes differ from the local HTML files; the expected original title, module script, and stylesheet references were verified instead. This distinction is recorded in the artifact rather than claiming an HTML byte match.

## Verified live snapshot identities

Both hosted JSON responses matched these release-local SHA-256 values exactly:

| Asset | Verified hosted SHA-256 |
| --- | --- |
| `data/market.json` | `21ad5cd6ac4e8a0dbfef6ecaa68efd38a503c4532c13550be78608604ef44759` |
| `data/dashboard.json` | `56e075a69440e274a46b4f99e7b98b64a40b9dfb5a85e9b01277b8bb9bd1270e` |

## Remaining authenticated browser cases

1. Open the primary page and `/lab.html` directly, reload both, and follow the links between them. Confirm their datasets remain clearly separated.
2. Open a saved current-report URL such as `/?view=trends&month=2026-09&sector=447&basis=nsa`; verify the route, month, industry, and adjustment basis survive authentication and reload.
3. Confirm October 2026 total SA is displayed as USD 748.22 billion and the official +0.2% monthly estimate has a 90% margin of ±0.4 percentage points. NSA must show its own USD 761.378 billion value and must not inherit the SA confidence interval.
4. Inspect a source observation, a matching sector comparison, national contributions with their residual, and a month with unavailable comparison history. Confirm unavailable values remain distinct from zero.
5. Download evidence CSV and audit JSON, open the metric dictionary, and inspect decision-brief print preview. Check units, source identities, and adjustment basis in the exported state.
6. Check keyboard navigation, dialog Escape and focus behavior, chart controls, and desktop/narrow mobile layouts. In the historical lab, inspect an invoice, a mature cohort, and the December 2010 overlap warning.

The browser checks should use the published private hostname after authorized manual sign-in. Service-level HTTP asset verification cannot replace these interactions.
