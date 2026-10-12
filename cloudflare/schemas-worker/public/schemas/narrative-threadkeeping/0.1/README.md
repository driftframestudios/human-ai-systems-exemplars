# Narrative Architecture and Threadkeeping schema cohort 0.1

This cohort gives four existing prototype contracts stable public retrieval paths while preserving their established identities and source ownership. The Narrative Architecture package owns the reusable meaning of the three Narrative contracts. The Field Guide package owns the reusable meaning of Threadkeeping. Context Canvas owns the checked-in runnable implementations and their source-adjacent projections.

## Selected contracts

| Contract | Canonical identity | Receiver path | Semantic owner | Material example |
|---|---|---|---|---|
| Narrative Capsule Composition | `https://schemas.driftframestudios.org/na/schema/narrative-capsule-composition.schema.v0.1.json` | `na/schema/narrative-capsule-composition.schema.v0.1.json` | Narrative Architecture | public-safe capsule composition adaptation |
| Narrative Sampling Tableau state | `https://schemas.driftframestudios.org/na/schema/narrative-sampling-tableau-state.schema.v0.1.json` | `na/schema/narrative-sampling-tableau-state.schema.v0.1.json` | Narrative Architecture | public-safe terminology sampling state |
| Technology Fit Sampling Tableau state | `https://schemas.driftframestudios.org/na/schema/technology-fit-sampling-tableau-state.schema.v0.1.json` | `na/schema/technology-fit-sampling-tableau-state.schema.v0.1.json` | Narrative Architecture | public-safe stack-comparison adaptation |
| Threadkeeping Ledger | `https://schemas.driftframestudios.org/fg/schema/threadkeeping-ledger.schema.v0.1.json` | `fg/schema/threadkeeping-ledger.schema.v0.1.json` | Field Guide | public-safe continuity ledger |

Each contract uses JSON Schema Draft 2020-12 and local fragment references only. The complete dependency closure therefore travels inside the schema file. Unknown additive properties remain compatible at the current open object boundaries; named required fields, constant types, and enumerated routing states remain closed where the contract declares them.

## Identity, retrieval, and exact versions

The `schemas.driftframestudios.org` values are canonical identifiers for these exact contracts. They remain stable even when a different host delivers an equivalent copy. The next Pages and Worker publication cycles will expose the same accepted bytes at the receiver paths above on `schemas.radiantnull.com` and `schemas.vik.guru`.

Version `v0.1` identifies each contract. Its accepted schema bytes are immutable after publication. A contract change receives a new exact-version identity and path. JSON-LD contexts, representative examples, and this orientation remain typed companions and revalidate with their receiving site release.

The checked-in source paths remain the authored review coordinates. A generated receiver is a delivery projection, and its host remains a delivery operator. Passing source checks establishes structure, identity, dependency closure, representative use, and the declared route. The successor publication cycles establish public availability, response behavior, and cross-host byte parity.

## Companion resources

Each contract travels with one adjacent JSON-LD context and one representative instance. The standalone Narrative Capsule context intentionally contains a broader vocabulary than the smaller context embedded in its material example; every embedded term remains defined by the standalone context. The other three standalone contexts match their material inline contexts.

Three previously selected visual families also publish their existing JSON-LD contexts as companions. Those additions improve semantic discovery while the selected JSON Schema contract count remains unchanged for those families.

## Remaining family dispositions

| Family | Current disposition | Re-entry condition |
|---|---|---|
| Supportive Change Writing | Identity and dependency work required | Settle canonical identifiers, version boundaries, dependency closure, and representative examples as one family decision. |
| LIMS/ELN Enterprise Reference | Package-owned continuation | Complete its public-repository posture and make a family-level identity and dependency decision. |
| LIMS/ELN Functional Nucleus | Package-owned continuation | Preserve its package subdivisions and select a cohort only with the full required dependency closure. |
| Shared schema-extraction example | Exemplar-only | Replace the illustrative identity only when a real receiver and semantic owner are accepted. |

These dispositions keep useful local validation in place while leaving public selection with each family's material owner and receiving use.
