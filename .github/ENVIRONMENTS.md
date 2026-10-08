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
  `open`. Set it to `open` only after Issue #402 accepts a normally published
  Wrangler/Miniflare/Sharp closure or a separately reviewed fallback. This gate
  applies only to the `prod` deployment job and grants no runner or deployment
  authority by itself.
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

One stable published surface is the fitting present form. `docs` remains the
reviewed GitHub Pages projection at `schemas.radiantnull.com`, while the other
branches express promotion and evidence posture. A deliberate workflow dispatch
from `main` rebuilds the accepted source, compares it with the named `docs`
commit, and deploys only after that pair agrees. The recorded `docs:/` source
setting remains available for legacy recovery. GitHub treats standard Pages
runner use as free; the `docs` evidence budget can rest while the accepted
projection continues.
Additional always-on surfaces follow a reader or operator job that benefits
from them.

When an interactive or request-shaped surface earns a runtime, a Cloudflare
Worker or Pages project can receive a selected `stg`, `release`, or `prod`
revision. Preview routes can remain ephemeral. A stable hostname follows an
accepted receiver and a named reader job.

## Credential routing at rest

Credential state begins empty. Future credentials belong to the narrowest
GitHub environment that needs them:

- account and non-sensitive deployment coordinates become environment
  variables;
- a least-privilege Cloudflare API token becomes an environment secret;
- `dev` or `stg` credentials reach preview resources only;
- `release` runs contract evidence without Cloudflare deployment credentials;
- `prod` credentials reach the production resource only after the protected
  branch transition, active-receiver selection, dependency-gate opening, and
  environment approval.

The manifest-driven schema Worker publishes checked-in public artifacts. Each
connected production deployment uses the non-sensitive
`CLOUDFLARE_ACCOUNT_ID` variable and a least-privilege
`CLOUDFLARE_API_TOKEN` secret from the `prod` GitHub environment. Secret values
remain in that receiver and enter only the credential-confirmation and
deployment steps. Evidence-budget activation, production-receiver activation,
and dependency clearance are independent decisions: a receipt budget carries
evidence authority, the receiver list carries publication authority, and the
dependency gate records the separately accepted toolchain posture.

Credential values live exclusively in GitHub environment settings and briefly
enter process memory for those two steps. Repository files, generated assets,
caches, logs, and retained receipts carry binding names and redacted state
only.

## Production boundary

The `prod` branch supplies the source approval boundary: one approving
pull-request review, stale-approval dismissal, and administrator inclusion. Its
GitHub environment accepts deployment only from the exact `prod` branch. Before
connected production activation, that environment receives its named human
reviewer and the selected administrator-bypass posture. `release` provides
contract evidence only and creates no live route. Production deployment retains
source review, active-receiver selection, the held dependency gate, and a
separately accepted environment handoff.

## Sources

- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub configuration-variable timing](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Wrangler environments and configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
