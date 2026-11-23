# Private deployment and live verification

This document retains the private version-3 deployment record. The separate public source, portfolio demo, and subsequent native Chrome print checks are described in [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md). They do not change the private Site's audience or retroactively update its saved-version evidence.

Recorded November 23, 2026. This document separates a successful platform deployment from source verification and interactive browser behavior.

## Confirmed deployment

| Item | Confirmed value |
| --- | --- |
| Site | [RevenueLens private site](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site) |
| Primary report | Current US Census retail report at `/` |
| Historical lab | Separate UCI invoice case at `/lab.html` |
| Saved version | Version 3 |
| Published source commit | `d045c03eea0db1d42810f60415c60b89b18a1946` |
| Platform deployment | Succeeded |
| Selected account role | Owner |
| Access configuration checked | Custom access; one owner entry and no allowed groups |
| Browser access | Authorized ChatGPT sign-in completed; authenticated private report observed |

The site remains private. A production URL and successful deployment do not establish public accessibility, a completed Power BI publication, or tested behavior for every browser interaction.

## Verification state

| Layer | State | Evidence boundary |
| --- | --- | --- |
| Source and analytical models | Passed locally | 19 current-market checks, 14 offline Python tests, source hashes and independent reconciliations. |
| Browser model rendering | Passed locally | Five JavaScript tests, including 2,925 current-report route/filter renders, plus historical-lab checks. These do not execute a full browser layout engine. |
| Platform deployment and private access | Confirmed | Successful saved-version deployment, source commit, owner/access response, and observed login gate. |
| Hosted asset identity and HTTP behavior | Passed | Thirteen authenticated routes/assets returned HTTP 200. Nine non-HTML assets matched release bytes exactly; four HTML responses preserved the expected core markup. Anonymous `/` and `/data/market.json` returned 401 without exposing the private content. |
| Authenticated live workflows and access | Passed for recorded scope | 27 live workflow/access cases on version 3, including both viewports, current/historical routes, source dialogs, filters, keyboard behavior, actual downloads, and private-access checks. Native print preview remains unverified. |
| Downloaded CSV and audit content | Passed | 20 independent checks; audit matches all 644 points and 1,288 SA/NSA source coordinates. |

The authenticated browser record is [artifacts/live-browser-verification.json](../artifacts/live-browser-verification.json), and the independent downloaded-content record is [artifacts/live-export-verification.json](../artifacts/live-export-verification.json). This is a scoped result for the observed workflows and viewports, not a guarantee for every browser, printer, or interaction. [MARKET_VERIFICATION.md](MARKET_VERIFICATION.md) records local checks; [VERIFICATION.md](VERIFICATION.md) records the historical source analysis.

## Executed live HTTP checks

Executed **November 23, 2026 at 18:08:38.168 UTC** against the version 3 private production origin. The checker used platform-provided, Site-scoped service access and followed only strict same-origin canonical redirects. That checker did not contact Google or establish an interactive browser session. The separate authenticated browser verification is recorded below. The machine-readable HTTP result is [artifacts/live-http-verification.json](../artifacts/live-http-verification.json).

| Case | Observed result |
| --- | --- |
| Authenticated `/` | HTTP 200; current-report title, script, and stylesheet references verified. |
| Authenticated `/index.html` | Same-origin HTTP 307 to `/`, then 200; expected current-report core HTML verified. |
| Authenticated `/lab.html` | Same-origin HTTP 307 to `/lab`, then 200; expected historical-lab core HTML verified. |
| Saved query route `/?view=trends&month=2025-10&sector=447&basis=nsa` | HTTP 200; expected current-report core HTML verified. Its selected context and reload were subsequently confirmed in the authenticated browser. |
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

## Executed authenticated browser cases

Recorded **November 23, 2026 at 18:15:36 UTC** after manual sign-in, on deployed version 3. The machine-readable result contains 27 passed live workflow/access cases and one explicit limitation. These combine UI observations, downloaded-file validation, and native access-policy verification; they are not 27 independent automated browser tests.

| Area | Observed result |
| --- | --- |
| Latest current report | October 2026 total SA displayed USD 748.22 billion, +0.2% MoM, +6.8% YoY, and the 90% monthly interval −0.2% to +0.6%. NSA displayed its own USD 761.378 billion source level without inheriting the SA interval. |
| Source evidence | Latest SA source was MARTS Table 1 row 12 column J, 748,220 USD millions; NSA was column E, 761,378 USD millions. |
| Saved state and scope | October 2025 gasoline NSA survived URL reload and showed USD 55.32 billion. Drivers retained national scope. Trust returned the latest total SA source regardless of hidden earlier filters. |
| Actual downloads | Live evidence CSV and full audit JSON downloaded. Twenty independent checks matched the frozen payload, including 644 points and 1,288 source coordinates. |
| Dictionary and keyboard | Dictionary opened; Escape closed dialogs and returned focus to the source trigger. Shift+Tab focused the September 2026 chart point and Enter selected that month. |
| Missing history | The exact trend table preserved unavailable prior-year history in the early window rather than displaying zero. |
| Desktop and mobile | All five current routes rendered at 1440×1024 and 390×844 without page overflow. Desktop routes and the mobile overview had no unnamed visible buttons. Mobile bottom navigation worked; the source dialog fitted at approximately 336.67 px width. |
| Historical route and invoice | The historical lab loaded and reloaded at canonical `/lab`, retained its 2009–2011 scope, and linked back to the current report. Invoice 574941 displayed original GBP/source evidence and an explicit 100-of-101-line preview. |
| Historical cohorts | Mature 90-day population was 5,252 with 2,443 repeat buyers. October–December 2011 immature rates remained unavailable. |
| Historical sensitivity and currency | December 2010 showed +48.2% baseline versus −2.8% under identical-content exclusion. The top-five sensitivity toggle displayed 43.7%. The 1.5705 GBP-to-USD policy remained confined to the historical lab. |
| Runtime and access | No error or warning entries were returned for the observed current/lab session. The platform remained active version 3 with one owner and zero allowed groups. |

Actual live captures are included as [desktop screenshot](../artifacts/RevenueLens_Live_Desktop.jpg) and [mobile screenshot](../artifacts/RevenueLens_Live_Mobile.jpg).

## Unverified print preview

Clicking **Print decision brief** stalled the in-app browser controls. Native print preview and physical printing could not be observed and are **not claimed as passed**. The decision brief itself rendered; the separately generated `RevenueLens_Executive_Brief.pdf` is available as a retained document. This limitation is recorded in the browser artifact with status `passed_with_print_preview_unverified`.
