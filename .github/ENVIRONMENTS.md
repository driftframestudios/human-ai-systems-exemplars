# Environment receivers

GitHub environments name durable receiving contexts. Repository variables stop
runner acquisition before evidence work begins. These are related controls with
different jobs:

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
| `docs` | `false` | Metered evidence at rest; standing Pages projection continues |
| `stg` | `false` | Candidate serving and Worker pilots at rest |
| `release` | `true` · 300 minutes | Automatic schema contract; connected un-routed release Worker deployment |
| `prod` | `true` · 300 minutes | Automatic schema contract; protected production deployment receiver |

Each GitHub environment accepts deployment configuration only from its matching
long-lived branch. `res/*` uses the `research` configuration after a reviewed
merge reaches the canonical receiver.

Environment-level variables arrive after a job starts, so they fit runtime
configuration. Repository-level budget values provide the pre-run spend gate
and keep resting receivers from acquiring a runner.

The release and production allocation markers describe the current approved
collaboration pool; GitHub remains the billing record. Their shared workflow
has a twelve-minute contract ceiling and an eight-minute deployment ceiling.
The normal path uses substantially less; a profile threshold notification can
return either budget switch to `false`.

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
generated GitHub Pages projection at `schemas.radiantnull.com`, while the other
branches express promotion and evidence posture. GitHub treats standard Pages
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
- `release` credentials support an accepted upload to the named, un-routed
  Wrangler environment after a passing contract;
- `prod` credentials reach the production resource only after the protected
  branch transition and environment approval.

The asset-only Worker operates entirely from public static assets. Each
connected deployment uses the non-sensitive `CLOUDFLARE_ACCOUNT_ID` variable
and a least-privilege `CLOUDFLARE_API_TOKEN` secret from its matching GitHub
environment. Secret values remain in that receiver and enter only the
credential-confirmation and deployment steps. Evidence-budget activation and
deployment activation are independent decisions; a receipt budget carries
evidence authority while the receiver list carries upload or publication
authority.

## Production boundary

The `prod` branch supplies the source approval boundary: one approving
pull-request review, stale-approval dismissal, and administrator inclusion. Its
GitHub environment accepts deployment only from the exact `prod` branch. Before
connected production activation, that environment receives its named human
reviewer and the selected administrator-bypass posture. Release deployment is
automatic after its contract and activation switch; production deployment
retains both source review and a separately accepted environment handoff.

## Sources

- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub configuration-variable timing](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Wrangler environments and configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
