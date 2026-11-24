# Source, demo, and private deployment

RevenueLens has separate source and hosting channels:

| Channel | Location | Audience and purpose |
| --- | --- | --- |
| Standalone source | Local checkout; [created public repository](https://github.com/nirajmohabey/revenuelens) | Full application, pipelines, snapshots, methods, and checks are present locally. The November 23 publication check found the GitHub repository still empty; its source upload is pending the owner's workflow-permission choice. |
| Portfolio demo | [Current US report](https://portfolio-niraj-mohabeys-projects.vercel.app/revenuelens/demo/index.html) | Public demonstration with the separate [historical lab](https://portfolio-niraj-mohabeys-projects.vercel.app/revenuelens/demo/lab.html). |
| Private Site | [RevenueLens retail intelligence](https://revenuelens-retail-intelligence.flowerycider4.chatgpt.site) | Owner-only hosted Site, requiring authorized ChatGPT sign-in. Public source publication does not change this access policy. |

The private Site's saved version, source commit, access gate, and recorded authenticated workflows are documented separately in [LIVE_VERIFICATION.md](LIVE_VERIFICATION.md). Local source changes and GitHub publication do not prove that a newer private Site version has deployed; that requires a successful platform deployment result for the matching source.

## Stakeholder decision and handoff

The [stakeholder acceptance record](STAKEHOLDER_ACCEPTANCE.md) applies the revised handbook's RevenueLens addition: a simulated commercial-manager scenario, its conditional decision and caveats, six expected-versus-recorded-result checkpoints, actual project-owner feedback, and a reviewer/operator handoff. Independent stakeholder participation and measured commercial impact remain unclaimed. The current report, historical lab, static/SQLite delivery, data, and exports are unchanged by this documentation update.

At the start of this handbook review, the platform confirmed private Site version 4 active with owner-only access, using source `8119cfdcdb33164b907acb1b6bec3c009c2efaeb`. That platform check is separate from the authenticated version-3 browser record and the public native Chrome print follow-up below. A later documentation/source publication does not turn those earlier observations into new application tests.

## Native Chrome print verification

On November 23, 2026, the public portfolio's current report and historical lab passed native Chrome Print preview and Save as PDF on desktop and in Chrome Responsive mode at **390 × 844**. Four actual PDFs were saved and independently checked: **eight US Letter pages** and **108 content segments**.

All current-report source trails, selected USD figures, and uncertainty notes were retained. The historical lab retained its fixed **£1 = $1.5705** conversion note, measurement boundaries, CC BY 4.0 attribution, and complete source hash. The mobile print body matched the desktop body on every page. Both experiences also provide a selected-brief Download PDF action, capturing the displayed report scope before loading the local PDF library.

The machine-readable record is [public native-print verification](../artifacts/public-native-print-verification.json). The verification used Chrome Responsive emulation, not a physical mobile device. It establishes behavior for the recorded current and historical brief cases, rather than every possible printer, report state, or browser.

The earlier private version-3 record correctly reported that its in-app browser print invocation stalled. The successful native Chrome follow-up occurred on the public portfolio, and is not retroactive evidence of a newer private deployment.

## Reproducible checkout

Downloaded historical workbooks, the local SQLite warehouse, virtual environments, and the large optional invoice-line CSV are excluded from Git. The source manifests retain their identities and the README provides rebuild commands. Generated report JSON and the frozen current Census source snapshots are included so reviewers can build and open the static application without a live database or credentials.

```sh
npm run build
npm test
npm run serve
```

The checked-in jsPDF browser bundle is local and loaded only by Download PDF. Its MIT license, bundled notices, package version, and integrity are preserved in `web/vendor/` and copied to `dist/vendor/` by the normal build.
