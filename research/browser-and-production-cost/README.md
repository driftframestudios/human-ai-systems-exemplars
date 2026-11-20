# Browser and production carrier timing study

[Implementation #975](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/975) carries review and acceptance. The [planning study on main](https://github.com/driftframestudios/human-ai-systems-exemplars/blob/main/planning/testing-suite-consolidation/browser-and-production-cost-spike.md) records the original decision and algorithmic costs. This record compares runs of the actual application source on main and its named PRs. The research branch stores the observations.

## Hosted observations before the change

| Workload | Wall time | Preparation | Execution or other observation |
| --- | ---: | ---: | --- |
| October 23 full selected prototype job | 17m29s | 46s | Selected contracts 16m28s. CSS parity occupied 17s. |
| First two PR #971 attempts | 30-minute ceiling reached | 18m32s and 15m44s | Both attempts ended before completing the selected proof. |
| Completed PR #971 selected job, head `a8591a0` | 33m20s | 9m48s | Contracts 22m57s, other steps 35s. Ubuntu downloaded 126 MB in 8m46s. Browser binary transfers took about 18s. |
| Parallel jobs at that head | 41s public references, 1m05s media | Included in individual job wall times | The selected prototype job determined workflow completion. |
| Separate production carrier job | 43s | Included | Production tests took 9s. Forming and inspecting the tagged transfer took 5s. |

The complete #971 workflow spanned 33m25s from creation to final update. Its three parallel jobs consumed 35m06s of summed job wall time. This sum describes runner occupancy before billing rules.

Within the 22m57s selection, Core browser took 6m27s, CSS parity 5m24s, Showcase reading 3m00s, AI Systems reading 2m10s and site navigation 1m54s. Core includes its reference instruments. The earlier media optimization retained 79 source tests and three browser checks. Its 1m09s cold run and the October full suite are distinct populations. [October job](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/39888952557/job/120203794634) · [PR #971 workflow](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44658051374) · [Carrier workflow](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44658039633) · [Media investigation](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/598)

At the recorded execution speed, preparation below 6m28s would put the job under 30 minutes. A hypothetical two-minute setup would give 25m32s, and perfect two-way balancing would give about 11m29s of execution before setup. These are scenario calculations. The owner chose 30 minutes as the operational investigation boundary.

## Hosted observations after the change

The [first full run](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44741179312) on `0993177` reached contract execution after 9s of package resolution, a subsecond restore lookup, and 49s of system-package and browser installation. The completed job and the subsequent trusted-cache run supply the final comparisons below.

## Local baseline and controlled comparisons

The original spike used Node 22.23.5 and a temporary checkout of `8b56400`, with a synthetic profile URL. One aggregate plan took 241 ms for 69 files. Composing the production plan with that aggregate took 11,180 ms for 615 files. Writing and checking that plan took 286 ms. Forming the 616-file carrier plan and index took 27 ms. The observed Git subprocess counts were 597 blob reads, three status calls, three revision resolutions and two tree listings.

The isolated read comparison covered 541 primary files totaling 45,197,517 bytes. Single/batch/batch/single trials took 4.505s, 0.088s, 0.088s and 4.329s. All four yielded the same aggregate digest. The matched full-build measurements below include additional work that stays necessary after batching.

### Chromium About CSS proof

On the same fixture source and origin, a baseline run took 180.71s and the candidate took 169.36s, a difference of 11.35s (6.3%). All 15 scenario IDs, 30 full snapshots and emitted comparison results agreed. One enhanced desktop snapshot contained 10,929 elements. Navigation and settling took 0.55s for the baseline representative page. Property and geometry capture took 11.654s before and 11.537s after, and style digest creation took 0.175s and 0.170s respectively. The baseline mutation’s repeated render capture took 12.026s. The candidate’s path, fragment and restoration check took 0.091s. Removing path or fragment sensitivity produced the intended independent failures. One sequential pair establishes parity and illustrates the local cost. Hosted runner timings have their own row.

### Production build and transfer

The controlled comparison used the same clean `8b56400` payload, synthetic profile, reviewed Node 22 runtime, and fixed receipt timestamp. The transfer used the immutable `production-v0.2.0` tag, 322 files. Measurements below are seconds in execution order. The total sums these phases, including the separate historical transfer operation.

| Variant | Iframe plan | Production composition | Write and verify | Carrier index | Tagged ZIP and receipt | Sum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original | 0.249 | 14.363 | 0.203 | 0.024 | 4.935 | 19.774 |
| Batch | 0.228 | 7.726 | 0.206 | 0.024 | 0.946 | 9.130 |
| Batch | 0.229 | 7.348 | 0.202 | 0.024 | 0.989 | 8.792 |
| Original | 0.241 | 14.483 | 0.198 | 0.024 | 4.767 | 19.713 |

In the [candidate’s hosted carrier job](https://github.com/driftframestudios/human-ai-systems-exemplars/actions/runs/44741338917), total time was 30s, including 13s for production tests and 3s to form and inspect the selected envelope. The earlier job’s corresponding values were 43s, 9s and 5s. These single hosted observations include runner variation.

An initial pair measured aggregate construction at 0.267/0.240s, composition at 15.035/7.576s, and tagged loading alone at 3.773/0.212s. The later four observations include full envelope creation. All 615 projected payloads, manifest, 616 indexed members and archive bytes matched. The receipt identified the changed tool revision and digest. Independent review also compared `production-v0.4.0`, finding 506 members, 49,354,212 payload bytes and a byte-identical 36,066,766-byte ZIP. All 144 production cases passed. The carrier and materializer index review exercised 146 cases across a different selection. The two counts overlap. [Lookup PR](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/978) · [Batch reader PR](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/980)

### Browser population and retained tests

October, November and the revised `all` workflow select the same four baseline and 17 browser-enabled commands within the selected-contract step. The October CSS proof covered eight stylesheet owners, increasing to 17 by November. Media moved its independent native-video observation to hosted Chrome. The iframe-only visual-media command remains separately selectable. A supplementary local Chromium check passed 39 routes, 93 rendered SVG instances and 33 zoomed fixed or sticky controls. The hosted comparisons below describe the named workflow.

The Core reference audit exercised 14/14 cases. For Core source and its Context Canvas projection, respectively, Context Tree took 28.89/26.13s, Practitioner Probes 23.96/20.97s and Family Index 23.89/20.63s. The rejection shapes, two copy buttons and native disclosure exercise distinct observable behavior. One immediate repeated state read in Practitioner Probes cost 1.84/2.07ms. The audit retained its surrounding recovery case and removed the consequential redundant CSS capture through [PR #979](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/979).

## Comparison method

The [parity-bound workload measurement skill](https://github.com/driftframestudios/gist-registry/blob/main/.agents/skills/parity-bound-workload-measurement/SKILL.md) supplied the matched-workload and failed-attempt conventions. The [interruption-safe resource ownership skill](https://github.com/driftframestudios/gist-registry/blob/main/.agents/skills/interruption-safe-resource-ownership/SKILL.md) informed Git reader failure handling. The hosted runs use GitHub’s job and step timestamps. Parallel job durations contribute to aggregate runner time and overlap in wall time. Installation, execution, runner and queue time have separate boundaries.
