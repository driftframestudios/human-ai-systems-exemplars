# Environment receivers

GitHub environments name durable receiving contexts. Repository variables admit
runners or a specific deployment job before its work begins. These are related
controls with different jobs:

- `ACTIONS_BUDGET_<RECEIVER>` decides whether a workflow for that receiver may
  acquire a GitHub-hosted runner.
- `ACTIONS_BUDGET_<RECEIVER>_MINUTES` records a human-approved cycle allocation
  for legible receipts. Per-job timeouts bound individual runs; the account
  threshold and budget switch remain the cumulative stop mechanism.
- `PROTOTYPE_UNIT_TESTS_AUTOMATIC` independently selects whether matching
  non-draft pull requests acquire the Core and Narrative unit runner. Explicit
  manual dispatch remains available.
- `DEPLOYMENT_ACTIVE_RECEIVERS` is a JSON list of receivers currently allowed to
  publish or deploy. Its resting value is `[]`.
- `SCHEMA_WORKER_DEPENDENCY_GATE` is the repository-level production dependency
  prerequisite. Its resting, held state is unset or any value other than
  `open`. The reviewed Wrangler `4.155.0` / Miniflare `5.20261023.2-beta` /
  Undici `7.30.1` / Sharp `0.35.5` locks satisfy the dependency floor owned
  by Issue #659. Set this gate to `open` only
  for an explicitly selected production activation. This gate applies only to
  the `prod` deployment job and grants no runner or deployment authority by
  itself.
- a job references its GitHub environment with `deployment: false` when it needs
  environment-scoped configuration while deployment history stays reserved for
  publishing work.

The current budget posture is:

| Receiver | Budget | Current service job |
| --- | --- | --- |
| `main` | `true` | Bounded public-boundary and advisory schema-route receipts, plus the independently configurable Core and Narrative unit receiver |
| `research` | `false` | Canonical future-state receiver at rest |
| `res/*` | `false` | Short-lived intake; inherits the `research` posture |
| `dev` | `false` | Sustained feature integration at rest |
| `docs` | `false` | Metered evidence at rest; reviewed Pages projection continues |
| `stg` | `false` | Candidate serving and Worker pilots at rest |
| `release` | `true` · 300 minutes | Automatic schema Worker contract; deployment remains at rest |
| `prod` | `true` · 300 minutes | Automatic schema Worker contract; protected production deployment when the receiver and dependency gates are open |

The named long-lived environments accept deployment configuration only from
their matching branches. `res/*` uses the `research` configuration after a
reviewed merge reaches the canonical receiver. The separate `github-pages`
environment admits `main` for the verified workflow and retains `docs` as its
recovery branch.

Environment-level variables arrive after a job starts, so they fit runtime
configuration. Repository-level budget values provide the pre-run spend gate
and keep resting receivers from acquiring a runner. The repository-level schema
dependency gate is narrower: contracts continue to run while a held gate keeps
the production deployment job from starting.

The release and production allocation markers describe the current approved
collaboration pool; GitHub remains the billing record. Their shared workflow
has a twelve-minute contract ceiling for both receiver branches. Only `prod`
admits the separate eight-minute deployment job. The normal path uses
substantially less; a profile threshold notification can return either budget
switch to `false`.

## Public-reference configuration at rest

The current public-reference build reads ignored `.env.public` locally. A later
authorized documentation or Context Canvas delivery can supply the same
`PUBLIC_URL_REGISTRY_*` names as environment-scoped variables after its
repository-level budget gate admits the job. The materializer reads only keys
required by authored source and keeps their values out of logs and retained
receipts.

These destinations become ordinary public links in a delivered artifact, so
the build seam is a history and change boundary rather than a secrecy claim.
Human review still confirms Registry ancestry, public-possible content
standing, signed-out availability, and audience. Credential material for a
future synchronization runtime receives its own environment secret, separate
from destination variables.

## Serving posture

Two live schema surfaces now serve distinct reader jobs. `docs` carries the
reviewed GitHub Pages projection at `schemas.radiantnull.com`; Cloudflare serves
the author-controlled Worker at `schemas.vik.guru`, while the `prod` GitHub
environment gates its deployment credentials. A deliberate Pages workflow
dispatch from `main` rebuilds the accepted source, compares it with the named
`docs` commit, and deploys only after that pair agrees. The recorded `docs:/`
source setting remains available for legacy Pages recovery. The repository and
Issue receipt retain the accepted Worker source and signed-out observation;
Cloudflare retains the active and recovery versions. Other branches continue
to express promotion and evidence posture.

When an interactive or request-shaped surface earns a runtime, a Cloudflare
Worker or Pages project can receive a selected `stg`, `release`, or `prod`
revision. Preview routes can remain ephemeral. A stable hostname follows an
accepted receiver and a named reader job.

## Credential routing at rest

Credentials belong to the narrowest GitHub environment that needs them:

- account and non-sensitive deployment coordinates become environment
  variables;
- a least-privilege Cloudflare API token becomes an environment secret;
- `dev` or `stg` credentials reach preview resources only;
- `release` runs contract evidence without Cloudflare deployment credentials;
- `prod` credentials reach the production resource only after the protected
  branch transition, active-receiver selection, dependency-gate opening, and
  explicit human activation.

The manifest-driven schema Worker publishes checked-in public artifacts. Each
connected production deployment uses the non-sensitive
`CLOUDFLARE_ACCOUNT_ID` variable and a least-privilege
`CLOUDFLARE_API_TOKEN` secret from the `prod` GitHub environment. Credential
values remain in GitHub environment settings and briefly enter process memory
for the combined credential-check and deployment step. Repository files,
generated assets, caches, logs, and retained receipts carry binding names and
redacted state only. Evidence-budget activation, production-receiver
activation, and dependency clearance are independent decisions: a receipt
budget carries evidence authority, the receiver list carries publication
authority, and the dependency gate records the separately accepted toolchain
posture.

## Production boundary

The `prod` ruleset names one approving pull-request review, stale-approval
dismissal, last-push separation, resolved conversations, and an administrator
repository-role bypass. Its GitHub environment is a separate control: it
accepts deployment only from the exact `prod` branch and keeps environment
administrator bypass disabled. The first connected activation carried explicit
human approval in the PR conversation and used the repository-role bypass;
Issue #481 retains the future formal environment-review handoff. `release`
supplies contract evidence; live-route authority remains with `prod`.
Production deployment retains source acceptance, active-receiver selection, the
dependency gate, and a separately accepted activation handoff.

The current plan makes a named required reviewer available after the deliberate
public transition; GitHub rejected that configuration while the repository was
private. The environment kept its exact-`prod` branch policy and disabled
administrator bypass. Issue
[#481](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/481)
owns the named `driftframestudios` reviewer, permitted self-review, and
held-gate exercise after the deliberate public transition. Until that feature
becomes available, explicit human source acceptance plus the two narrow
repository gates supply the bounded activation decision.

## First connected schema activation · 2026-10-13

PR #480 merged accepted production source
`369b61b79dfe3d245c1193567d9f715263927670` while both deployment gates remained
at rest. The resulting push completed the schema contract and skipped the
deployment job, establishing that credential presence alone leaves the receiver
held. After explicit human activation, the two repository gates opened for one
bounded window and the complete original push workflow was rerun. GitHub kept
the original production SHA and ref. The contract passed and the deployment job
was admitted; `DEPLOYMENT_ACTIVE_RECEIVERS` then returned to `[]` and
`SCHEMA_WORKER_DEPENDENCY_GATE` to its absent held state. The admitted Worker
deployment completed, and signed-out receiver and browser checks established
the live schema and skill routes. Issue
[#406](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/406)
retains the accepted source, workflow, live observation, Worker version, and
recovery receipt.

## Pages v0.3.1 schema activation · 2026-10-18

PR #536 merged accepted production source
`a2545cb03e2e3767cfa5abd167f017944498dcd7` while both deployment gates remained
at rest. The initial push completed the schema contract while deployment
retained its documented resting state. Following explicit human authorization,
an operator opened the bounded activation window; run `39166814705` attempt 2
rechecked the same production SHA and ref, then admitted the deployment job. The
operator restored both gates to their documented resting states while the
admitted job completed: the receiver list was `[]`, and the dependency-gate
variable was unset. Signed-out receiver and browser checks established all 160
allowlisted routes, exact selected bytes, named response policies, and the
JavaScript-disabled catalog at 390 px and 1280 px. Issue
[#531](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/531)
retains the accepted source, workflow, active Worker version, immediate recovery
coordinate, and live observations.

## Sources

- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub configuration-variable timing](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Wrangler environments and configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
