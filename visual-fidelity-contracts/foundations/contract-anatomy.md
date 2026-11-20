# Contract anatomy

A visual contract should let a cold collaborator answer four questions in one
route: what work fits this language, which meanings stay stable, who owns the
implementation, and which observation establishes the result.

## Required record

Every typed contract carries the fields validated by
[`visual-fidelity-contract.schema.json`](../schemas/visual-fidelity-contract.schema.json):

| Group | Required decision |
| --- | --- |
| Identity | Stable ID, title, semantic version, standing, review date, and supersession |
| Purpose | Plain-language job, populations served, and decisions supported |
| Fit | Fitting work, stronger neighboring fit, and smallest useful dose |
| Grammar | Invariants and permitted variation |
| Tokens | Authority mode, source path, palette closure, and tested color pairs |
| Type and geometry | Families, minimum sizes, reading measure, spacing, corners, targets, and depth |
| Behavior | Stable states, focus, keyboard, motion, failure, recovery, and scripting-disabled use |
| Alternate media | Narrow reflow, text resize, print, forced colors, reduced motion, SVG, and imagery |
| Evidence | What current checks establish, receiving boundaries, and re-entry events |
| Routing | Examples, code samples, tests, source owner, schema owner, publication owner, and public route |

## Human document

The README begins with the visual language's useful job. An ordinary example
comes before specialist detail. A reader can then move through fit, smallest
dose, composition, tokens, type, geometry, state, recovery, alternate media,
source authority, verification, and re-entry.

The contract states invariants as desired operating conditions. A hard safety,
privacy, authorization, or compatibility boundary stays explicit and sits next
to the permitted behavior. Quoted source material and executable assertions
retain their exact meaning.

## Machine record

`contract.v1.json` carries the same identity, owners, state commitments, token
authority, evidence standing, and routes in a closed JSON object. The schema
uses a stable absolute `$id`; the repository path remains a retrieval location.
Each contract instance identifies the schema version it implements.

`reference_mapping` means the token file is an inspectable starting map and the
receiving component owns its mapped variables. `authoritative_input` means a
named generator or build consumes the token source and parity becomes an exact
testable claim.

## Compatibility and extension

Versioned core fields remain closed. A new required meaning earns a schema
version. A contract-specific detail belongs in prose, a specimen, or a future
namespaced extension after a receiving implementation demonstrates the need.
Existing flat contract paths remain stable while the hub adds typed records
around them.

## Review probe

1. **Question:** Can another implementer distinguish invariant meaning from
   generative variation?
2. **Mechanism:** Compare the README, typed record, tokens, specimen, and
   receiving example.
3. **Observable evidence:** Stable IDs agree; every declared path resolves;
   token authority is explicit; named states and owners appear in both human and
   machine forms.
4. **Instruction yield:** Repair the smallest source that owns a mismatch, then
   rerun the focused contract checks.

## Completion

The anatomy is complete when a visitor can choose by task, an implementer can
build from explicit invariants, a reviewer can locate source and authority, and
a check can establish the bounded claims the contract makes.
