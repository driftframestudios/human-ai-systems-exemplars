# GitHub Actions policy

## Effective repository settings

The repository API reported this state on 2026-08-26. These values retain that
observation date:

| Setting | Effective value |
|---|---|
| Actions | enabled |
| Selection mode | selected actions and reusable workflows |
| GitHub-owned actions | allowed |
| Marketplace actions from verified creators | blocked |
| Additional allow or block patterns | none |
| Full-length action SHA pinning | required |

Local actions and reusable workflows remain available under the selected-actions
model. Organization or enterprise policy can further narrow this repository
view. A new external action receives a deliberate policy and workflow review
before use.

The Issue #63 reconciliation on 2026-10-03 reads workflow source at
`3355430196a8732cf8b5a2e3d90cb6cc38dbe11c`. Current live account settings,
repository and environment variables, usage, and remaining allocations are
unknown in that source-only observation. This document preserves the recorded
policy and resting activation values; it changes no account setting.

## Immutable GitHub-owned actions

The public-boundary, schema receiver-route, schema publication, schema delivery,
prototype, production-carrier, and two LIMS/ELN proof workflows use these reviewed
GitHub-owned action revisions:

| Action | Reviewed tag | Pinned commit |
|---|---|---|
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | `v7.0.0` | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/setup-python` | `v7.0.0` | `5fda3b95a4ea91299a34e894583c3862153e4b97` |
| `actions/configure-pages` | `v6.0.0` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| `actions/upload-pages-artifact` | `v5.0.0` | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| `actions/deploy-pages` | `v5.0.0` | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` |
| `actions/upload-artifact` | `v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |

The workflows use read-only contents permission. The connected Pages job also
declares `pages: write` and `id-token: write` at job scope, including
verification-only dispatches; its activation input gates the upload and deploy
steps. None calls a reusable workflow through `jobs.<job_id>.uses`.

## Receiver and budget boundary

The recorded policy keeps `main` a budget-active evidence receiver. Its two
advisory jobs require `ACTIONS_BUDGET_MAIN=true`. The successor-owned
public-boundary job has a two-minute ceiling and a one-day aggregate receipt.
Its schema receiver-route job has a six-minute ceiling, runs
`npm run check:schemas && npm run test:schema-pages`, and contributes an
advisory summary for matching changes while preserving the review path.
The prototype-unit job has its own resting switch:
`PROTOTYPE_UNIT_TESTS_AUTOMATIC=false` keeps matching pull-request execution at
rest while confirmed manual dispatch remains available. Its `core`, `iframe`,
`narrative`, and `all` selections share one ten-minute job; manual browser
coverage requires `include_browser=true`, while an enabled PR receiver includes
the selected browser contracts. Same-ref manual suites can supersede one
another. The LIMS/ELN proof jobs require both `ENABLE_GITHUB_ACTIONS=true` and a
selected confirmation. Nucleus jobs have a thirty-minute ceiling; enterprise
offline and database matrix jobs have fifteen- and thirty-minute ceilings
respectively. Those ceilings remain distinct from approved allocations.

The production-carrier lane accepted in PR #255 receives matching `main` pull
requests, including drafts, and manual dispatch. Its read-only ten-minute job
tests production contracts and exercises the immutable `production-v0.2.0`
archive using the candidate tool. Its source declares no budget-variable or
confirmation gate and grants no host credential or deployment action. Preserve
that trigger posture. The human budget owner has approved **300 minutes per
month** for this lane, adjustable through a later explicit budget decision.
The allowance is a human-held budget; automated monthly metering is outside
the declared workflow contract. Current usage and remaining allocation stay
unknown in this source inventory. Workflow triggers, permissions, and activation
remain unchanged.

`release` and `prod` each retain the recorded approved 300-minute allocation
per collaboration cycle. One shared schema-delivery workflow gives both branches a
12-minute automatic contract and an eight-minute connected deployment ceiling.
The contract stays with the established schema, Static Assets, Wrangler, and
secret-material readers. Visual review, unit proof, scheduling, and broader
package questions retain their own deliberately selected routes. Superseded
contracts cancel; deployments serialize by receiver and finish their current
upload.

The Pages workflow receives an exact accepted source commit, reviewed `docs`
commit, and `pages-vMAJOR.MINOR.PATCH` release tag through manual dispatch. One
connected fifteen-minute standard-runner job verifies the source, projection,
tag, and artifact, then conditionally uploads and deploys in the same job.
The default `activate_deployment=false` keeps publication steps resting. Pages permissions
are job-level, and the `schema-pages` concurrency group serializes runs with
`cancel-in-progress: false`. PRs #308/#309 and the 2026-10-01 #63 receipt record
the accepted tagged-release transition and its dated deployment observation.
Each selected pair starts after its source reaches `main` and its projection
reaches `docs`; the documented `github-pages` environment admits both branches.
The recorded legacy `docs:/` source remains the recovery route.
Evidence budgets and deployment authority stay independent:
the documented `DEPLOYMENT_ACTIVE_RECEIVERS=[]` posture lets release and
production checks run while their Worker uploads rest. Naming a receiver admits its
connected deployment only after the matching branch-restricted environment
provides its account coordinate and least-privilege token. The repository's
paid-overage boundary remains $0; a named human can return a receiver variable
to its resting value when its allocation or useful receipt settles.

[AUTOMATION.md](AUTOMATION.md) inventories all eight workflows and their source
owners. [ENVIRONMENTS.md](ENVIRONMENTS.md) retains environment and variable
ownership. Record month-level allocation when an authorized activation change
occurs. Current usage and account enforcement require a separately scoped live
observation; the historical settings and declared workflow gates remain useful
without presenting them as newly observed account state.

Third-party Marketplace actions, external actions outside the allowed
organizations, hosted visual sweeps, broad package validation, and recurring
general CI remain outside the current receiver set. A concrete receiving job
and approved budget can introduce the smallest fitting addition.

## Sources

- [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
