# Environment receivers

GitHub environments name durable receiving contexts. Repository variables stop
runner acquisition before evidence work begins. These are related controls with
different jobs:

- `ACTIONS_BUDGET_<RECEIVER>` decides whether a workflow for that receiver may
  acquire a GitHub-hosted runner.
- `DEPLOYMENT_ACTIVE_RECEIVERS` is a JSON list of receivers currently allowed to
  publish or deploy. Its resting value is `[]`.
- a job references its GitHub environment with `deployment: false` when it needs
  environment-scoped configuration while deployment history stays reserved for
  publishing work.

The current budget posture is:

| Receiver | Budget | Current service job |
| --- | --- | --- |
| `main` | `true` | One bounded, read-only public-boundary receipt on a non-draft pull request |
| `research` | `false` | Canonical future-state receiver at rest |
| `res/*` | `false` | Short-lived intake; inherits the `research` posture |
| `dev` | `false` | Sustained feature integration at rest |
| `docs` | `false` | Metered evidence at rest; standing Pages projection continues |
| `stg` | `false` | Candidate serving and Worker pilots at rest |
| `release` | `false` | Accepted integration at rest |
| `prod` | `false` | Accepted production receiver at rest |

Each dormant GitHub environment accepts deployment configuration only from its
matching long-lived branch. `res/*` carries no deployment environment or
credential boundary; it becomes eligible for `research` configuration only
after a reviewed merge reaches the canonical receiver.

Environment-level variables arrive after a job starts, so they fit runtime
configuration. Repository-level budget values provide the pre-run spend gate
and keep resting receivers from acquiring a runner.

## Serving posture

One stable published surface is the fitting present form. `docs` remains the
generated GitHub Pages projection, while the other branches express promotion
and evidence posture. GitHub treats standard Pages runner use as free; the
`docs` evidence budget can rest while the accepted projection continues.
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
- `release` credentials support an accepted upload or integration rehearsal;
- `prod` credentials reach the production resource only after the protected
  branch transition and an available deployment-approval boundary.

Worker configuration will declare required secret names per Wrangler
environment when a Worker exists. Secret values remain in their receiving
environment. Evidence-budget activation and deployment activation are
independent decisions; a receipt budget carries evidence authority while the
receiver list carries publication authority.

## Production boundary

The current private-repository plan supports environments and their variables;
environment-level required reviewers for private repositories begin with the
Enterprise capability. The `prod` branch therefore supplies the present
approval boundary: one approving pull-request review, stale-approval dismissal,
and administrator inclusion. The empty `prod` environment awaits a later
deployment job and the platform approval capability suited to it.

## Sources

- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub configuration-variable timing](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Cloudflare Wrangler environments and configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Workers through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
