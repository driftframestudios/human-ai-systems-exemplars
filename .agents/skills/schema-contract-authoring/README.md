# Schema contract authoring

Shape a schema family that another producer or consumer can locate, interpret,
validate, and extend. This skill keeps identity, retrieval, authority,
compatibility, examples, and dependency closure distinct and inspectable.

## Start here

- [Read the authoritative skill contract](SKILL.md)
- [Return to the repository skills catalog](../README.md)

## Use it when

Use this skill when a schema root, exact version, semantic context, example
family, public retrieval route, or cross-repository projection changes. Start
with the receiving objects and decisions before selecting fields.

## What it returns

- a bounded schema family with a distinct canonical identity;
- documented source, schema, instance, and publication authority;
- representative examples and complete receiving dependencies; and
- one material-use validation result with an explicit evidence boundary.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | A schema is served from a canonical host and a GitHub-backed mirror, and a local consumer needs an offline exact version with complete dependency closure. |
| Use | Preserve one `$id`, separate both retrieval routes from identity, carry dependency closure in the distribution, and validate a representative instance. |
| Observable return | Both routes deliver the same identity-bearing version, the local consumer resolves every dependency, and the validation record names the exercised instance and validator posture. |

## Working route

1. Name the objects, decisions, compatibility direction, and authority roles.
2. Separate canonical identity from repository and public retrieval locations.
3. Choose the narrow core, reuse boundaries, extension model, and semantic representation.
4. Supply examples and the dependency closure required by the receiver.
5. Exercise one real or repository-truthful instance through the intended validation mode.
6. Route discovery from the root index to the family README and exact contract.

JSON Schema carries structural validity. The family README carries use,
authority, versioning, retrieval, and extension guidance.
