# Browser and production carrier timing study

[Implementation #975](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/975) carries review and acceptance. The [planning study on main](https://github.com/driftframestudios/human-ai-systems-exemplars/blob/main/planning/testing-suite-consolidation/browser-and-production-cost-spike.md) records the original decision and algorithmic costs. This record compares runs of the actual application source on main and its named PRs. The research branch stores the observations.

## Hosted observations before the change

| Workload | Wall time | Preparation | Execution or other observation |
| --- | ---: | ---: | --- |
| October 23 full selected prototype job | 17m29s | 46s | Selected contracts 16m28s. CSS parity occupied 17s. |
| Two attempts at `175ce02` | 30m16s and 30m14s | 18m32s and 15m44s | The 30-minute ceiling interrupted both attempts. [Run and attempts](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44650028158) |
| Completed PR #971 selected job, head `a8591a0` | 33m20s | 9m48s | Contracts 22m57s, other steps 35s. Ubuntu downloaded 126 MB in 8m46s. Browser binary transfers took about 18s. |
| Parallel jobs at that head | 41s public references, 1m05s media | Included in individual job wall times | The selected prototype job determined workflow completion. |
| Separate production carrier job | 43s | Included | Production tests took 9s. Forming and inspecting the tagged transfer took 5s. |

The complete #971 workflow spanned 33m25s from creation to final update. Its three parallel jobs consumed 35m06s of summed job wall time. This sum describes runner occupancy before billing rules.

Within the 22m57s selection, Core browser took 6m27s, CSS parity 5m24s, Showcase reading 3m00s, AI Systems reading 2m10s and site navigation 1m54s. Core includes its reference instruments. The earlier media optimization retained 79 source tests and three browser checks. Its 1m09s cold run and the October full suite are distinct populations. [October job](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/39888952557/job/120203794634) · [PR #971 workflow](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44658051374) · [Carrier workflow](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44658039633) · [Media investigation](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/598)

At the recorded execution speed, preparation below 6m28s would put the job under 30 minutes. A hypothetical two-minute setup would give 25m32s, and perfect two-way balancing would give about 11m29s of execution before setup. These are scenario calculations. The owner chose 30 minutes as the operational investigation boundary.

## Hosted observations after the change

| Run | Selected prototype job | Browser prerequisites | Selected contracts | Parallel siblings | Workflow wall / summed job time |
| --- | ---: | ---: | ---: | --- | --- |
| #971 comparison | 33m20s | 9m48s | 22m57s | Public references 41s, media 1m05s | 33m25s / 35m06s |
| [Cold, `0993177`](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44741179312) | 22m57s | 58s | 21m31s | Public references 48s, media 2m08s | 23m00s / 25m53s |
| [Second cold, `78e1456`](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44744681714) | 24m15s | 1m19s | 22m20s | Public references 38s, media 1m28s | 24m19s / 26m21s |
| [Warm, interrupted, `4cc0f5e5`](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44749134379) | 30m18s | 1m13s | 28m29s, incomplete | Public references 41s, media 1m25s | 30m24s / 32m24s |

The cold run queued for 3s. Package resolution took 9s, the restore lookup occupied less than one displayed second, installation took 49s, and saving the verified closure after the proof took 6s. The cache service reported a miss. APT downloaded the 126 MB package closure in 14s, compared with 8m46s on #971. Both runs needed the network. The 10m23s shorter job reflects mirror and runner variation alongside the implementation changes. The browser prerequisite interval contributed 8m50s of that difference.

| Selected browser command | #971 | First cold | Second cold | Warm, interrupted |
| --- | ---: | ---: | ---: | ---: |
| Core browser aggregate | 6m27s | 6m38s | 6m23s | 6m22s |
| About CSS parity | 5m24s | 4m22s | 5m00s | 8m25s |
| Showcase reading | 3m00s | 2m49s | 2m57s | 4m11s |
| AI Systems layout | 2m10s | 2m09s | 2m06s | 2m57s |
| Navigation | 1m54s | 1m49s | 1m55s | 2m20s |

The second run queued for 3s and confirmed a cache miss. It needed the same 126 MB and identical package-plan digest. GitHub assigned Ubuntu image `20261116.133.1` after the first run used `20261116.376.1`. Exact-image selection explained the missed reuse. Resolution took 19s, restore lookup under 1s, installation 60s, and saving the new entry 4s. APT downloaded 126 MB in 18s. This run included the accepted build changes and updated skill entries. Its suite commands and engines matched the first run.

[PR #983](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/983) moved the image revision to the end of the key. The restore action can now reuse a verified plan across images when OS, architecture, engines, Playwright version and all resolved package versions agree. Each archive still needs a fresh SHA-256 match. Independent review exercised those dimensions separately and verified migration against the original key generator. The two cold observations retain their original standing.

The next run restored the matching previous-format entry, verified 186 of 186 archive digests and needed 0 B of the 126 MB package closure from Ubuntu. Resolution took 10s, restore 4s and installation including browser engines 59s. The total 73s is between the two cold preparation observations. The 30-minute boundary interrupted Narrative after iframe ancestry. The final exchange command and trusted cache-save step had yet to run. Count this as verified warm preparation and incomplete full behavior. The largest new delay was CSS parity at 8m25s. Core still completed in 6m22s.

[PR #984](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/984) split the manual all-browser selection at whole npm command boundaries. The source checks run once. Reading and media use three engines for ten commands. Production CSS and the prototypes use Chromium for seven. Each group has its own 30-minute limit and per-engine package proof. The prior attempt supplies the measured reason to purchase the second runner.

### Full grouped run on accepted main

The [four-job workflow on `063f741`](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44755299355) passed in **14m28s** from creation to final update. The logs show one execution of each of the 17 original browser commands across the two groups. The reading group also ran the existing source selection. Public references passed in 36s and media preparation and delivery in 1m29s.

| Browser group | Job wall | Resolve / restore / install | Browser commands | Package observation |
| --- | ---: | --- | ---: | --- |
| Showcase, reading and media, three engines | 11m05s | 18s / 4s / 42s | 10 commands in 9m22s | The previous-format entry supplied all 186 verified archives. APT needed 0 B of the 126 MB closure. |
| Production CSS and prototypes, Chromium | 14m24s | 9s / 1s / 19s | 7 commands in 13m38s | The Chromium-only selection was cold. APT transferred 32.1 MB in 2s. |

Both groups completed their trusted cache saves. Core browser took 6m31s and CSS parity 5m47s on the longer job. Showcase reading took 3m01s, AI Systems layout 2m04s and navigation 1m49s on the other job.

Compared with the completed #971 workflow, elapsed time fell **18m57s (56.7%)** and summed job time fell **7m32s (21.5%)**, from 35m06s to 27m34s. Compared with the fastest completed sequential trial in this study, grouping returned the result **8m32s sooner** (23m00s to 14m28s) and used **1m41s more summed job time** (25m53s to 27m34s). These observations include runner, mirror and cache variation. They quantify the trade for this workload. The slower group finished 15m36s inside its 30-minute investigation boundary. A future boundary crossing reopens the group and command measurements.


## Local baseline and controlled comparisons

The original spike used Node 22.23.5 and a temporary checkout of `8b56400`, with a synthetic profile URL. One aggregate plan took 241 ms for 69 files. Composing the production plan with that aggregate took 11,180 ms for 615 files. Writing and checking that plan took 286 ms. Forming the 616-file carrier plan and index took 27 ms. The observed Git subprocess counts were 597 blob reads, three status calls, three revision resolutions and two tree listings.

The isolated read comparison covered 541 primary files totaling 45,197,517 bytes. Single/batch/batch/single trials took 4.505s, 0.088s, 0.088s and 4.329s. All four yielded the same aggregate digest. The matched full-build measurements below include additional work that stays necessary after batching.

### Chromium About CSS proof

On the same fixture source and origin, the CSS comparison used baseline `8b56400` and candidate `bb71c37`, Node 22.23.5 and Chromium 151.0.7922.34. A baseline run took 180.71s and the candidate took 169.36s, a difference of 11.35s (6.3%). All 15 scenario IDs, 30 full snapshots and emitted comparison results agreed. One enhanced desktop snapshot contained 10,929 elements. The baseline representative source and projected pages navigated and settled in parallel in 0.55s. Property and geometry capture took 11.654s before and 11.537s after, and style digest creation took 0.175s and 0.170s respectively. The baseline mutation’s repeated render capture took 12.026s. The candidate’s path, fragment and restoration check took 0.091s. Removing path or fragment sensitivity produced the intended independent failures. One sequential pair establishes parity and illustrates the local cost. Hosted runner timings have their own row.

### Production build and transfer

The candidate tooling matched `9aad41a` before integration of the indexed path checks. Independent review repeated output comparisons on integrated head `e78858c`. Neither the build nor the browser comparison recorded a filesystem cache flush. The controlled build comparison used the same clean `8b56400` payload, synthetic profile, reviewed Node 22 runtime, and fixed receipt timestamp. The transfer used the immutable `production-v0.2.0` tag, 322 files. Measurements below are seconds in execution order. The total sums these phases, including the separate historical transfer operation.

| Variant | Iframe plan | Production composition | Write and verify | Carrier index | Tagged ZIP and receipt | Sum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 0.249 | 14.363 | 0.203 | 0.024 | 4.935 | 19.774 |
| Batch | 0.228 | 7.726 | 0.206 | 0.024 | 0.946 | 9.130 |
| Batch | 0.229 | 7.348 | 0.202 | 0.024 | 0.989 | 8.792 |
| Original | 0.241 | 14.483 | 0.198 | 0.024 | 4.767 | 19.713 |

In the [candidate’s hosted carrier job](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44741338917), total time was 30s, including 13s for production tests and 3s to form and inspect the selected envelope. The earlier job’s corresponding values were 43s, 9s and 5s. These single hosted observations include runner variation.

An initial pair measured aggregate construction at 0.267/0.240s, composition at 15.035/7.576s, and tagged loading alone at 3.773/0.212s. The later four observations include full envelope creation. All 615 projected payloads, manifest, 616 indexed members and archive bytes matched. The receipt identified the changed tool revision and digest. Independent review also compared `production-v0.4.0`, finding 506 members, 49,354,212 payload bytes and a byte-identical 36,066,766-byte ZIP. All 144 production cases passed. The carrier and materializer index review exercised 146 cases across a different selection. The two counts overlap. [Lookup PR](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/978) · [Batch reader PR](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/980)

### Browser population and retained tests

October, November and the revised `all` workflow select the same four baseline and 17 browser-enabled commands within the selected-contract step. The October CSS proof covered eight stylesheet owners, increasing to 17 by November. Media moved its independent native-video observation to hosted Chrome. The iframe-only visual-media command remains separately selectable. A supplementary local Chromium check passed 39 routes, 93 rendered SVG instances and 33 zoomed fixed or sticky controls. The hosted comparisons describe the named workflow. The separate [Visual Fidelity job on the skills PR](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44743450364) passed in 2m25s, including 1m20s for engine setup and 41s for rendered checks across Chromium, Firefox and WebKit.

The Core reference audit exercised 14/14 cases. For Core source and its Context Canvas projection, respectively, Context Tree took 28.89/26.13s, Practitioner Probes 23.96/20.97s and Family Index 23.89/20.63s. The rejection shapes, two copy buttons and native disclosure exercise distinct observable behavior. One immediate repeated state read and copy in Practitioner Probes cost 1.84/2.07ms. The audit retained its surrounding recovery case and removed the consequential redundant CSS capture through [PR #979](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/979).

## Transfer to the next Pages projection

The [skills PR](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/981) adds build output equivalence and updates test suite composition. A local Pages build selected 31 public-ready skills and 33 schema receiver routes. All 41 Pages checks passed, including the script-free browser check. A scratch production build on `78e1456` emitted 615 files. Both affected catalog anchors resolved to the same HTML destinations as the generated Pages artifact. These measurements cover local release preparation. The next Pages release can verify those destinations on the published site.

## Comparison method

The [parity-bound workload measurement skill](https://github.com/driftframestudios/gist-registry/blob/main/.agents/skills/parity-bound-workload-measurement/SKILL.md) supplied the matched-workload and failed-attempt conventions. The [interruption-safe resource ownership skill](https://github.com/driftframestudios/gist-registry/blob/main/.agents/skills/interruption-safe-resource-ownership/SKILL.md) informed Git reader failure handling. The hosted runs use GitHub’s job and step timestamps. Parallel job durations contribute to aggregate runner time and overlap in wall time. Installation, execution, runner and queue time have separate boundaries.
