# Schema fixtures

These fixtures turn the schema boundary into an inspectable example. Accepted
fixtures exercise the smallest complete record. Rejected fixtures isolate one
invalid condition so a failing assertion explains the intended boundary.

| Schema | Accepted fixture | Rejected fixture | Rejection under test |
| --- | --- | --- | --- |
| Visual Fidelity Contract | [`minimum-art-direction.v1.json`](./contracts/accepted/minimum-art-direction.v1.json) | [`missing-publication-owner.v1.json`](./contracts/rejected/missing-publication-owner.v1.json) | `sourceAuthority.publicationOwner` remains required |
| Lab State | [`retained-draft.v1.json`](./labs/accepted/retained-draft.v1.json) | [`unknown-phase.v1.json`](./labs/rejected/unknown-phase.v1.json) | `phase` accepts the named lifecycle states |
| Contract Catalog | [`minimum-catalog.v1.json`](./catalogs/accepted/minimum-catalog.v1.json) | [`art-direction-missing-public-route.v1.json`](./catalogs/rejected/art-direction-missing-public-route.v1.json) | An `art_direction_v1` entry carries its public route, record, tokens, and specimen |
| Example Catalog | [`minimum-example-catalog.v1.json`](./example-catalogs/accepted/minimum-example-catalog.v1.json) | [`empty-example-family.v1.json`](./example-catalogs/rejected/empty-example-family.v1.json) | The first pattern family carries four representative examples |
| Public Lineage | [`minimum-public-lineage.v1.json`](./lineage/accepted/minimum-public-lineage.v1.json) | [`non-public-route.v1.json`](./lineage/rejected/non-public-route.v1.json) | `publicRoute` resolves through the declared public kindlight.systems boundary |

The focused test validates each accepted fixture, confirms rejection, and
asserts the exact failing path and keyword. Add a paired accepted and rejected
fixture when a new schema version introduces a consequential boundary.
