# Bounded hosted automation

The repository carries eight workflows: two bounded automatic `main` receipts,
one production-carrier contract, one standing documentation publication path,
one connected release-and-production schema path, one configurable prototype
and media receiver, and two explicitly dispatched proof paths. Every external action
reference uses a reviewed full-length commit SHA. Local commands remain the
immediate edit loop.

## Inventory coordinate and evidence boundary

The initial source inventory was reconciled on 2026-10-03 against
`3355430196a8732cf8b5a2e3d90cb6cc38dbe11c` for Issue #63; that coordinate remains
its dated receipt. This document follows the current workflow source. Workflow
files own exact triggers, path filters, arguments, job permissions, and action
pins. The table below names every workflow; the following sections explain each
receiving job.

| Workflow in `.github/workflows/` | Trigger and activation | Job ceiling | Superseded-run behavior | Related receiver record |
| --- | --- | --- | --- | --- |
| `res-public-boundary-intake.yml` | Non-draft `main` PR; `ACTIONS_BUDGET_MAIN=true` | 2 minutes | Cancel superseded PR run | #63 inventory |
| `schema-receiver-routes.yml` | Matching non-draft `main` PR or manual dispatch; `ACTIONS_BUDGET_MAIN=true` | 6 minutes | Cancel same PR/ref run | #18 schema contracts; #63 inventory |
| `schema-pages.yml` | Manual exact source, projection, and release-tag selection; `activate_deployment=false` by default | 15 minutes | Serialize the Pages group; finish the current run | PRs #308 and #309 |
| `schema-delivery.yml` | Non-draft PR or push to budget-enabled `release`/`prod`; only an accepted `prod` push can deploy, with the receiver and dependency gate open | Contract 12; production deployment 8 minutes | Cancel superseded contracts; serialize the production deployment | #18, #402, #406, and #531 schema delivery; #63 inventory |
| `prototype-unit-tests.yml` | Confirmed manual suite; matching `main` PRs receive the public-reference and media jobs, while a matching non-draft PR also receives the prototype job when `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true` | Public reference 5; prototype 30; media 10 minutes | Cancel same PR/ref run, including another manual suite on that ref | PRs #97 and #287; Issues #430, #433, #434, and #540 |
| `production-carrier-contracts.yml` | Matching `main` PR or manual dispatch with an explicit production tag | 10 minutes | Cancel same PR/ref run | #540 current release; #464, #253, and PR #255 precedents |
| `lims-eln-functional-nucleus.yml` | Manual selected proof; `ENABLE_GITHUB_ACTIONS=true` and `confirm_run` | 30 minutes | Cancel same workflow/ref run | #63 proof inventory |
| `lims-eln-enterprise-reference.yml` | Manual offline, database, or full proof; `ENABLE_GITHUB_ACTIONS=true` and `confirm_run` | Offline 15; database 30 minutes per matrix job | Separate dispatches remain independent | #63 proof inventory |

The policy and environment documents retain their dated settings observations
and standing allocations. Live account settings, current variable values,
remaining minutes, and current hosted durations are **unknown in this
reconciliation**: source inspection supplied this receipt. A job timeout is a
per-job ceiling, distinct from an approved cycle or month-level allocation.
The human-approved production-carrier monthly allocation is recorded below.

Preserve the 2026-08-28 run `33182993332` as a historical 4m24s observation of
PR #95's then-selected contract. PR #97 subsequently restored the earlier
hosted suite boundary. That duration describes the earlier run, rather than
the current suite. The same-date cancellation observation remains useful:
different manual suite selections on one ref can supersede one another.

## Main public-boundary receipt

`res-public-boundary-intake.yml` reads tracked text on non-draft pull requests
into `main` while `ACTIONS_BUDGET_MAIN=true`. One read-only Ubuntu job checks out
the candidate, runs the successor-owned Python boundary reader, and retains an
aggregate receipt for one day. It uses no secrets or cache, has a two-minute
ceiling, and cancels superseded runs for the same pull request.

The receipt is advisory. It highlights gated workspace routes, workstation
coordinates, and external GitHub receivers so a collaborator can choose an
accepted public destination, stable source key, or repository-local
explanation. Accepted public-possible Practitioner Registry routes remain
visible for human review. Merge authority stays with current reviewers.

The source comparison tool remains locally available through
`npm run check:research-projection`. Its earlier hosted workflow stays with the
retained source because the successor intake already owns this receiving job.

## Schema receiver route receipt

`schema-receiver-routes.yml` receives matching non-draft pull requests into
`main` while `ACTIONS_BUDGET_MAIN=true`. Its advisory step runs exactly
`npm run check:schemas && npm run test:schema-pages` after installing the locked
Node 22 toolchain. Those commands exercise the schema surface and Pages
contracts through the repository's source-to-receiver map. This keeps a
schema's semantic identity distinct from its source revision and its current
retrieval or publication receiver. The publication workflow owns the selected
release build and deployment evidence.

The receipt is advisory: a finding appears in the run summary while the job
keeps the pull request available for collaboration. Manual dispatch uses the
same budget switch. The workflow has read-only contents permission, a six-minute
ceiling, and full-length action pins.

## Schema publication

`schema-pages.yml` is the manual source-to-receiver verification and publication
path. One dispatch names an exact accepted source commit, an exact reviewed
`docs` commit, and a `pages-vMAJOR.MINOR.PATCH` release tag. One connected
standard-runner `publish` job has a fifteen-minute ceiling and uses the
`github-pages` environment. Its job-level permissions are `contents: read`,
`pages: write`, and `id-token: write`, including verification-only dispatches.
The workflow:

1. runs from the accepted `main` workflow definition and requires both
   coordinates as full lowercase Git SHAs;
2. checks out complete source and projection histories side by side without
   retained Git credentials, then uses workflow-owned commands to prove each
   revision belongs to `main` or `docs` before any selected-source command can
   run;
3. installs the locked source toolchain;
4. checks the schema and Pages behavior;
5. requires the source CNAME to agree with the active Pages host and rebuilds
   from the Pages-reported HTTPS base URL;
6. confirms the projection worktree remains unchanged, then uses the
   workflow-owned release verifier to bind the selected tag, source, projection,
   complete file membership, and bytes;
   and
7. proves the checksum-verified secret scanner before inspecting that exact
   artifact, including its required hidden files.

The default `activate_deployment=false` dispatch ends after verification. Selecting
activation admits upload and deployment steps in that same connected job.
The `schema-pages` concurrency group serializes dispatches with
`cancel-in-progress: false`, allowing the current run to finish. PR #308 owns
the accepted release transition; PR #309 supplied its reviewed projection.

Each hosted verification pair begins with an accepted `main` commit and the
reviewed `docs` projection built from it. The `github-pages` environment keeps
its existing `docs` rule and also admits the workflow's `main` branch. GitHub
Pages now uses the Actions delivery route: each deployment names both immutable
commits, rebuilds from source, and requires complete file membership and byte
equality before upload.

Pages settings remain the custom-domain authority. The recorded Pages family
is `schemas.radiantnull.com`; completed Issue #406 preserves the
`schemas.vik.guru` v0.3.0 Worker activation and recovery lineage. Completed
Issue #531 records the active v0.3.1 Worker publication and live parity. The
generated public
`release.json`, accepted annotated tag, and matching workflow receipt identify
the active Pages coordinate. The `pages-v0.3.1` tag at docs commit
`fbf568496b90` with recorded source commit `c1e35fdd57c2` is active.
`pages-v0.3.0`, `pages-v0.2.0`, and the earlier `pages-v0.1.0` observation
remain historical evidence.
The recorded `docs:/` source setting remains the recovery coordinate: an
authorized recovery can restore legacy mode, verify the accepted `docs` bytes,
and return the environment allowlist to its prior state when needed. Current
live settings and delivery are separate observations from this inventory.

## Release and production schema delivery

`schema-delivery.yml` receives every non-draft pull request into and every push
to `release` or `prod` while that receiver's approved budget is active. One
read-only contract job checks out complete history and tags, installs the root
and schema Worker toolchains from their separate locks, observes the installed
Wrangler dependency path, checks the mapped schema surface, verifies the
checked-in accepted publication independently from later source drift, runs the
Worker unit tests, and dry-runs the Worker bundle through its nested Wrangler CLI. The
pinned secret-material reader proves its fresh canary before inspecting the
selected `cloudflare/schemas-worker/public` artifact.

The contract has a twelve-minute ceiling and cancels superseded candidates.
The `Schema delivery contract` job name remains the required status context for
both protected branches. Release provides the complete contract observation;
deployment belongs only to a successful `prod` push. That production job has
an eight-minute ceiling, serializes in one production group, uses the
branch-restricted `prod` GitHub environment, and also requires `prod` in
`DEPLOYMENT_ACTIVE_RECEIVERS` plus the repository variable
`SCHEMA_WORKER_DEPENDENCY_GATE=open`. The receiver's documented resting value is
`[]`. The reviewed Wrangler `4.149.0` / Miniflare / Sharp `0.35.5` locks satisfy
the dependency floor owned by Issue #402; the dependency gate remains a separate
human-held activation control. Preserve that activation posture and the recorded 300-minute allocation for
each branch per collaboration cycle. Current live variable values and remaining
allocation require their own account observation.

The workflow uses GitHub-owned checkout and Node setup actions at the reviewed
full commit SHAs. Root commands retain repository-wide checks, while
`cloudflare/schemas-worker/` supplies the publication, tests, deployment
configuration, and locked Wrangler CLI for `schemas.vik.guru`.
Environment-scoped Cloudflare credentials enter only the production deployment
job. The earlier asset-only adapter retains its shared source inputs and local
build or dry-run checks; it no longer owns a root deployment command or this
production workflow.

The first connected production activation retained exact
`prod@369b61b79dfe3d245c1193567d9f715263927670`. Its initial push completed the
contract while held repository gates skipped deployment. Opening both gates
later did not create another push event, so the authorized activation reran the
complete original workflow. GitHub retained the original `GITHUB_SHA` and
`GITHUB_REF`; the contract passed and the deployment job was admitted. Both
repository gates returned to rest before the admitted deployment completed and
the signed-out checks began. GitHub's
[rerun contract](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
states that a rerun uses the original commit SHA and Git ref. This exact-run
rerun is the bounded activation path for an accepted production push whose
deployment was deliberately held: recheck the immutable coordinate, open both
gates for a bounded window, rerun the complete push workflow, observe the
receiver, and restore both gates.

Cloudflare deployment history and the completed Issue receipt name the deployed
and preceding Worker versions. The workflow summary records the accepted
repository coordinate and directs recovery to those durable identifiers.

The 2026-10-18 v0.3.1 activation exercised the same route at exact
`prod@a2545cb03e2e3767cfa5abd167f017944498dcd7`. Following explicit human
authorization, an operator opened the bounded activation window for run
`39166814705` attempt 2. The run passed the contract and admitted the deployment
job. The operator returned both repository gates to rest while the admitted job
completed. Issue #531 records the active Worker, Cloudflare deployment,
signed-out route observations, and v0.3.0 recovery coordinate.

## Production-carrier contract

`production-carrier-contracts.yml` is the source-owned CI lane accepted in
PR #255 for historical Issue #253. Its matching `main` pull-request paths cover
the workflow, root package and lock files, production and public-reference
inputs, Context Canvas and iframe source families, `deployment/cpanel/**`,
`tests/prod-deployment/**`, and the complete `tools/**` implementation seam.
Manual dispatch requires one explicit annotated `production-vMAJOR.MINOR.PATCH`
tag. The declared trigger includes draft PRs; this lane has no budget-variable
condition or deployment authority.

One read-only Ubuntu 24.04 job uses pinned checkout and Node setup actions,
Node 22, the locked toolchain, and a ten-minute ceiling. It runs
`npm run test:prod-deployment`, forms the selected transfer envelope, verifies
its receipt against that explicit tag, and exercises the ZIP with `unzip -t`.
Pull requests use immutable `production-v0.2.0` as a historical regression
fixture; a manual run uses its required selected tag. The immutable tag is the
payload input; the candidate checkout supplies the packaging implementation.
The workflow performs read-only contract verification. Issue #540's
human-operated receiver retains artifact transfer, host activation, and live
acceptance authority; #464 retains the immutable `production-v0.3.0` receipt,
and #118 and #251 retain their historical `production-v0.2.0` standing.

The human budget owner has approved **300 minutes per month** for this lane,
adjustable through a later explicit budget decision. The allowance records
human authorization; the ten-minute timeout remains a per-job bound. Current
usage and remaining monthly allocation stay unknown in this source inventory.
Workflow triggers, permissions, and activation remain unchanged. A later
rest, removal, or trigger change needs the lane's receiver decision and a
separate reviewed workflow change. A stopped contract can receive a corrected
candidate or an explicitly selected manual rerun.

## Secret-material inspection posture

`npm run security:secrets` is the standing local and manual repository-wide
route. It verifies a checksum-pinned Betterleaks 1.8.1 installation, proves the
detector and sanitizer with a generated canary, then observes the working tree,
exact staged index, and diff-visible history across locally available refs.
Named generated artifacts have a separate command. Provider validation is off,
and raw scanner JSON, diagnostics, and candidate values remain in process
memory rather than an artifact or cache.

Secret-material inspection currently uses the local and manual route. The
selected-actions policy admits GitHub-owned actions, while the third-party
Betterleaks Marketplace Action sits outside that set. A later named receiver
can use the repository-owned installer after GitHub-owned, full-SHA-pinned
checkout and toolchain steps. Its contract will acquire complete history and
the refs named by its evidence question, carry read-only contents permission,
leave checkout credentials and repository or environment secrets at rest,
retain only locator-safe aggregate evidence, and require the canary before
interpreting a clean result. Runner budget, activation events, timeout,
retention, and an off switch arrive with that receiver.

The full scope and successor handoff live in the
[repository secret-material boundary](../threadkeeping/repository-secret-material-boundary.md).

## Public-reference build posture

`npm run build:public-references` is the current dependency-free build-time
route for approved Context Canvas Registry destinations. Its ignored input and
output remain local: tracked HTML carries semantic keys, `.env.public` or
matching process values supply human-approved destinations, and the generated
subtree contains ordinary static links. The focused local observation is
`npm run test:public-reference-materializer`.

The main public-boundary receipt independently observes tracked candidate text
and established stable-key families. Route configuration and configured
publication remain with the materializer and its eventual delivery receiver.

A named documentation or Context Canvas delivery receiver can later call the
same materializer immediately before its connected upload step. That job will
own the complete public asset closure, reviewed environment configuration,
budget gate, and delivery receipt. The current local route keeps those inputs
ready for that connected receiver.

## Core, iframe, Narrative, and media paths

`prototype-unit-tests.yml` gives Core, iframe, Narrative, and media contracts
approved standard-runner receivers. A manual dispatch selects `core`, `iframe`,
`narrative`, `media`, or `all` and requires `confirm_run`.
`include_browser=true` adds the rendered-page contracts owned by the selected
prototype family. Chromium supports every browser-enabled selection; WebKit
joins the `iframe` and `all` selections, and Firefox joins `all`. The media
selection exercises its Chromium receiver contract in its own job.

Matching pull requests into `main` run the public-reference and
media-publication jobs for matching paths. On a non-draft pull request,
`PROTOTYPE_UNIT_TESTS_AUTOMATIC=true` also admits the complete prototype-unit
baseline; the unset or `false` value keeps that third job at rest while manual
selection remains available. All three jobs install the locked root toolchain
with lifecycle scripts at rest.
The media job additionally
installs Chromium and FFmpeg, exercises preparation and delivery contracts,
observes the native-video receivers, and dry-runs the Worker package. Path
filters cover the source families, iframe and carrier owners, collaboration
and Context Canvas sources, media planning contracts, attribution, focused
tests and tools, root package and lock files, and the workflow. The workflow
file owns the exact filter list. Three read-only jobs, standard Linux runners,
superseded-run cancellation, and the declared five-, thirty-, and ten-minute
ceilings keep each receiver proportional to the protected behavior.

| Selection | Source contract | Additional browser work when selected |
| --- | --- | --- |
| `core` | Attribution, iframe package, and Core units | Core browser and iframe-ancestry contracts |
| `iframe` | Attribution and iframe package contracts | Case Brief catalog, prototype-control, iframe-carrier, and iframe-ancestry contracts |
| `narrative` | Narrative units | Narrative browser contract |
| `media` | Media preparation, manifest, delivery, and Worker contracts | Native-video receiver contract at narrow, medium, and wide viewports |
| `all` | Attribution, iframe package, combined prototype units, public-reference contracts, and media contracts | About media; Case Brief catalog; Debrief reading, figures, captions, and link cues; AI Systems reading; site navigation; visitor image delivery; Who To Believe graph; production CSS; prototype controls; Core, Canvas, iframe ancestry, Narrative, prototype exchange, and native-video receiver contracts |

The shared iframe-carrier source contract precedes the selection. PR #287 added
the focused label-retention contract to the existing browser lanes. The
standalone Strategy Canvas command remains independently available following
PR #97; the historical #95 run retains its earlier coverage. For independent
manual receipts on one ref, let the selected suite finish before dispatching
another; a future concurrent-suite requirement receives its own decision.

Local commands keep the focused route close to the source:

```sh
npm run test:core-architectures
npm run test:core-browser
npm run test:iframe-routes
npm run check:iframe-routes
npm run test:prototype-control-labels
npm run test:iframe-browser
npm run test:narrative-architectures
npm run test:narrative-browser
npm run test:prototype-units
npm run test:prototype-exchanges
npm run test:media-publication
npm run test:video-receivers-browser
npm run dry-run:r2-video-delivery
```

## LIMS/ELN proof paths

Two manual workflows preserve reviewed remote proofs for an allocated dispatch:

- **LIMS and ELN enterprise reference proof** covers the reference pack and its
  PostgreSQL rehearsal. Its offline Python 3.12/3.13 jobs each have a
  fifteen-minute ceiling; its pinned PostgreSQL 16/18 database jobs each have a
  thirty-minute ceiling. Separate dispatches remain independent because this
  workflow declares no concurrency group.
- **LIMS and ELN functional nucleus proof** covers one selected nucleus member
  or the five-member integrated proof on Python 3.12, through one thirty-minute
  job with same-ref cancellation.

Each uses read-only repository authority, pinned GitHub-owned actions, and
requires `ENABLE_GITHUB_ACTIONS=true` plus explicit `confirm_run`. Reference
database credentials belong to the local proof fixture. Selected database
artifacts expire after one day. The authorized receiver can return the variable
to `false` after the allocated proof settles; current live values and remaining
proof allocation are outside this source-only receipt.

## Resting routes

The dependency-update template remains discoverable as
`dependabot.manual.yml`. A future dependency-update receiver may rename it only
after the downstream pull-request cadence has an accepted job and budget.

Hosted visual checks, resolver inspection, broader history operations, and
general recurring CI retain their local, manual, or dormant routes. The named
schema delivery is the current Cloudflare exception, bounded by its two branch
contract receivers and one production branch, environment, credential,
dependency gate, and deployment switch. The effective action allow list,
immutable revisions, and billing posture live in
[ACTIONS-POLICY.md](ACTIONS-POLICY.md).

Issue #63 receives inventory reconciliation. Each later workflow or matrix
addition starts with a material receiving job and an explicit budget decision.
Record month-level allocation when activation changes; retain dated durations
and scope instead of inferring them from job ceilings or older suite receipts.
