---
name: cost-and-ownership-analysis
description: Maps scoped functions to algorithmic cost, input boundaries, and mutation ownership. Applies when a review raises complexity, repeated preparation, parsing, regex or prototype-chain behavior, path handling, or state-aliasing concerns that should change an implementation decision.
---

# Cost and ownership analysis

## Contract

- **What:** A source-grounded account of scoped function cost, input boundaries, and mutation ownership, followed by the smallest authorized repair and its decision-changing evidence.
- **When:** Complexity or resource use may change a design, a security-shaped concern needs a precise mechanism, or state crosses validation, computation, rendering, exchange, and filesystem boundaries. Ordinary edits use the smallest relevant call path; a complete function inventory follows the requested scope.
- **Boundaries:** Current intent selects observation or implementation, revision, and receiving surface. Shared generated copies point to their canonical owner. External library, engine, DOM, and I/O costs retain explicit terms until evidence resolves them. Source-derived mechanisms, observed exploitation, measured performance, and release approval each retain their own evidence and authority.
- **Result:** A scoped function inventory with interpreted bounds or explicit compositional costs, ownership and exposure findings, fitting repairs and acceptance evidence when authorized, and one clear receiving decision.

## Rules

### Rule: Coverage has a coordinate

Bind the inventory to the requested revision and pending changes. Identify callable definitions, callback multipliers, recursion, generated code, and excluded dependencies. Distinguish complete enumeration from complete closed-form cost resolution.
### Rule: Cost follows the whole receiving path

State the variables, caps, expected lookup assumptions, worst-case or amortized model, and output size. Include repeated admission, key sorting, copying, serialization, projection, and derived-view preparation. Keep allocation volume distinct from peak live memory and garbage-collection pauses.
### Rule: Construction and compilation carry separate claims

Source can establish repeated object or schema construction. Engine cache reuse, native compilation, tiering, and wall-clock impact require fitting observations. Finite source-owned patterns can be prepared once; their grammar and input budget still carry the matching boundary.
### Rule: Loop cost follows total work

Name each independent input dimension and the progress measure of each loop. Nested syntax with one monotone cursor can have linear total work; repeated prefix scans, copies, descendant walks, or growing-list membership checks can introduce additional factors. Account for library parsing and browser layout separately. Emitted labels, serialized records, and other output expansion carry their own size term. A source-derived bound and a measured growth curve answer different questions.
### Rule: Security findings name their actual mechanism

Separate prototype-chain lookup from prototype mutation, regex source injection from expensive matching, and lexical path containment from physical filesystem identity. Name the input's actor, size, ownership, reachability, and execution context before assigning consequence.
### Rule: Pure boundaries clarify ownership

Prefer owned return values and explicit path-copy transitions. Keep invocation-local counters, indexes, and collectors when they preserve linear work. Detached results own their nested mutable values; immutable shared projections declare their reading contract. Rendering derives from accepted business state, while UI retention and I/O remain named adapters.
### Rule: Preparation earns one authority

Keep public admission gates and compose trusted private calculation from admitted values. Cache by a complete semantic identity or immutable revision, preserve caller-owned inputs, and invalidate every dependent view when that identity changes.
### Rule: Evidence matches the claim

Use focused schema/runtime parity, state-immutability, round-trip, retained-UI-state, and path-boundary cases. Run adversarial matching in an isolated worker with an explicit timeout and cleanup. A timeout-bounded completion check establishes that budget; growth-rate or responsiveness claims require measured workloads and an appropriate environment.
### Rule: Return changes the next decision

Lead with actionable findings and their smallest repairs, retain valid boundaries, and name remaining uncertainty. Completion supplies the requested inventory, authorized changes, normalized evidence, and one receiving route. A new generic harness earns adoption through recurring turn savings or protection of a consequential boundary.

## Composition and receiving use

[Practitioner probe](../practitioner-probe/SKILL.md) supplies a focused mechanism question when the concern is ambiguous. [Stateful artifact behavior contracts](../stateful-artifact-behavior-contracts/SKILL.md) supplies behavior-specific acceptance. Desired-state, evidence-calibrated language shapes the handback, and [collaboration accounting](../collaboration-accounting/SKILL.md) carries decision-changing transfer evidence.

For engine claims, consult the runtime owner's current documentation. [V8 regex tier-up](https://v8.dev/blog/regexp-tier-up) explains why construction and native compilation differ. [OWASP prototype-pollution guidance](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html) supplies dictionary-boundary techniques; current source determines the specific mechanism and exposure.

Load [Python boundaries and traversal cost](references/python-boundaries-and-traversal-cost.md) when Python representation, source editing, package boundaries, or generated tests change the analysis. Other runtimes retain their own representation and enforcement rules.
