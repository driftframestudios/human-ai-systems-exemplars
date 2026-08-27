# GitHub Actions policy

## Effective repository settings

The repository API reported this state on 2026-08-26:

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

## Immutable GitHub-owned actions

The public-boundary, schema receiver-route, schema publication, schema delivery,
prototype-unit, and two LIMS/ELN proof workflows use only these reviewed
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

The workflows use read-only contents permission unless the connected Pages job
needs `pages: write` and `id-token: write`. None calls a reusable workflow
through `jobs.<job_id>.uses`.

## Receiver and budget boundary

`main` remains a budget-active evidence receiver. Its successor-owned
public-boundary job has a two-minute ceiling and a one-day aggregate receipt.
Its schema receiver-route job has a six-minute ceiling, reads the shared route
map through the schema check and Pages build, and contributes an advisory
summary for matching changes while preserving the review path.
The prototype-unit job has its own resting switch:
`PROTOTYPE_UNIT_TESTS_AUTOMATIC=false` keeps matching pull-request execution at
rest while explicit dispatch remains available. The LIMS/ELN proof jobs require
both `ENABLE_GITHUB_ACTIONS=true` and a selected confirmation.

`release` and `prod` each have an approved 300-minute allocation for the current
collaboration cycle. One shared schema-delivery workflow gives both branches a
12-minute automatic contract and an eight-minute connected deployment ceiling.
The contract stays with the established schema, Static Assets, Wrangler, and
secret-material readers. Visual review, unit proof, scheduling, and broader
package questions retain their own deliberately selected routes. Superseded
contracts cancel; deployments serialize by receiver and finish their current
upload.

The Pages workflow remains the standing `docs` publication path. Evidence
budgets and deployment authority stay independent:
`DEPLOYMENT_ACTIVE_RECEIVERS=[]` currently lets release and production checks
run while their Worker uploads rest. Naming a receiver in that list admits its
connected deployment only after the matching branch-restricted environment
provides its account coordinate and least-privilege token. The repository's
paid-overage boundary remains $0; a named human can return a receiver variable
to its resting value when its allocation or useful receipt settles.

Third-party Marketplace actions, external actions outside the allowed
organizations, hosted visual sweeps, broad package validation, and recurring
general CI remain outside the current receiver set. A concrete receiving job
and approved budget can introduce the smallest fitting addition.

## Sources

- [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
