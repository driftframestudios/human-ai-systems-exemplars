# Bounded hosted automation

The repository carries two bounded automatic `main` receipts, one standing
documentation publication path, one connected release-and-production schema
path, one configurable prototype-unit receiver, and two explicitly dispatched
proof paths. Every external action reference uses a reviewed full-length commit
SHA. Local commands remain the immediate edit loop.

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
`main` while `ACTIONS_BUDGET_MAIN=true`. It runs the existing schema-surface
check and Pages build through one explicit map from repository files to durable
schema identities and receiver paths. The build copies each mapped schema into
the projection and confirms byte equality. This keeps a schema's semantic
identity distinct from its source revision and its current retrieval or
publication receiver.

The receipt is advisory: a finding appears in the run summary while the job
keeps the pull request available for collaboration. Manual dispatch uses the
same budget switch. The workflow has read-only contents permission, a six-minute
ceiling, and full-length action pins.

## Schema publication

`schema-pages.yml` is the manual source-to-receiver verification and publication
path. One dispatch names an exact accepted source commit and an exact reviewed
`docs` commit. The read-only verification job:

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
6. confirms the projection worktree remains unchanged, then compares complete
   file membership and bytes with the named `docs` commit;
   and
7. proves the checksum-verified secret scanner before inspecting that exact
   artifact, including its required hidden files.

The default dispatch ends after verification. Selecting deployment uploads the
verified artifact and gives a separate `github-pages` environment job the
minimal `pages: write` and `id-token: write` permissions needed by GitHub's
official Pages actions. This keeps publication selection separate from source
and projection agreement.

The first hosted verification pair begins with a `main` commit that already
contains this workflow and its receiver checker, followed by the `docs`
projection built from that commit. Before selecting deployment, retain the
environment's existing `docs` rule and also allow the workflow's `main` branch
to enter `github-pages`. Keep legacy branch delivery active through the first
successful verification-only run; the Pages build-source setting moves to
GitHub Actions only when the same accepted pair is ready for deployment.

Pages settings remain the custom-domain authority. The current collaboration
family is `schemas.radiantnull.com`; `schemas.vik.guru` remains the later
staging, release, and production family described in
[ENVIRONMENTS.md](ENVIRONMENTS.md). The current live site continues through
legacy branch delivery until the verified workflow route is explicitly
selected in the repository's Pages settings.

## Release and production schema delivery

`schema-delivery.yml` receives every non-draft pull request into and every push
to `release` or `prod` while that receiver's approved budget is active. One
read-only contract job installs the locked toolchain, checks the mapped schema
surface, verifies the explicit Static Assets closure, dry-runs the matching
Wrangler environment, proves the pinned secret-material reader with a fresh
canary, and observes the candidate tree and locally available history.

The contract has a twelve-minute ceiling and cancels superseded candidates.
The connected deployment has an eight-minute ceiling and serializes by
receiver. A release push targets an un-routed named Wrangler environment. A
production push targets the top-level Worker through the exact-branch `prod`
GitHub environment and its accepted human handoff. Both deployment jobs also
require their name in
`DEPLOYMENT_ACTIVE_RECEIVERS`; the current empty list keeps uploads resting
while automatic contracts begin using their approved 300-minute allocations.

The workflow uses GitHub-owned checkout and Node setup actions at the reviewed
full commit SHAs, then calls the repository's locked Wrangler CLI directly.
Environment-scoped Cloudflare credentials enter only the deployment job.

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

## Core and Narrative prototype-unit path

`prototype-unit-tests.yml` gives the Core and Narrative strengthening route one
approved standard-runner receiver. A manual dispatch selects `core`,
`narrative`, or `all` and requires `confirm_run`. `include_browser=true` adds
the fitting Chromium contract to that selected family. The workflow installs
the locked root toolchain with lifecycle scripts at rest, then calls the same
family commands documented for local use.

Matching non-draft pull requests into `main` can run the complete unit baseline
when `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true`. The unset or `false` value keeps
automatic execution at rest while manual selection remains available. An
active pull-request receiver includes the two rendered family contracts so its
result covers direct and browser-owned behavior. Path filters cover the two
source families, their tests and browser contracts, package lock,
cross-prototype exchange tool, and workflow. One read-only job, one standard
Linux runner, superseded-run cancellation, and a ten-minute ceiling keep the
receiver proportional to the protected behavior.

Local commands keep the focused route close to the source:

```sh
npm run test:core-architectures
npm run test:core-browser
npm run test:narrative-architectures
npm run test:narrative-browser
npm run test:prototype-units
npm run test:prototype-exchanges
```

## LIMS/ELN proof paths

Two manual workflows preserve reviewed remote proofs for an allocated dispatch:

- **LIMS and ELN enterprise reference proof** covers the reference pack and its
  PostgreSQL rehearsal.
- **LIMS and ELN functional nucleus proof** covers one selected nucleus member
  or the five-member integrated proof on Python 3.12.

Each requires `ENABLE_GITHUB_ACTIONS=true` and an explicit `confirm_run`
selection. Selected reference-database artifacts expire after one day. After a
receipt is read, the variable can return to `false`.

## Resting routes

The dependency-update template remains discoverable as
`dependabot.manual.yml`. A future dependency-update receiver may rename it only
after the downstream pull-request cadence has an accepted job and budget.

Hosted visual checks, resolver inspection, broader history operations, and
general recurring CI retain their local, manual, or dormant routes. The named
schema delivery is the current Cloudflare exception, bounded by its two branch
receivers, budgets, credentials, and deployment switch. The effective action
allow list, immutable revisions, and billing posture live in
[ACTIONS-POLICY.md](ACTIONS-POLICY.md).
