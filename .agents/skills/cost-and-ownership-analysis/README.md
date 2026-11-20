# Cost and ownership analysis

Use this skill to connect an implementation concern to the full call-path cost, admitted input, mutable-state owner, smallest repair, and evidence that can change the decision.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Bind the review to a revision and scope: callable definitions, callback multipliers, recursion, generated code, dependencies, and exclusions.
- Name every independent input dimension, cap, lookup assumption, copied or serialized output, and mutable owner.
- Separate source-derived complexity from measured runtime behavior and observed exploitation.

## Concrete example

**Situation:** For each of `R` records, a helper scans all `A` allowlisted fields, sorts `K` accepted keys, emits `S` total bytes of normalized output across the completed call, and appends values into an array supplied by the caller.

**Use:** Express the visible work as `O(R × A + R × K log K + S)` under the stated lookup assumptions. Trace whether the caller-owned array can be observed elsewhere. Reuse an existing admission helper only when its contract and lifecycle fit; otherwise return an invocation-local owned result.

**Observable return:** The review names the cost variables and caps, distinguishes allocation volume from peak live memory, identifies the state-aliasing boundary, and proposes a bounded repair. Focused parity and immutability tests establish accepted output and caller-state preservation; wall-clock improvement remains a separately measured claim.

## Supporting material

- [Python boundaries and traversal cost](references/python-boundaries-and-traversal-cost.md) supports Python representation, package boundaries, source editing, and generated tests.
- [Ownership-preserving reuse](references/ownership-preserving-reuse.md) supports helper discovery, contract comparison, fresh state, and dependent-evidence invalidation.
- [Practitioner probe](../practitioner-probe/SKILL.md) sharpens an ambiguous mechanism question.

## Boundaries

Prototype lookup, prototype mutation, regex source injection, expensive matching, lexical path containment, and filesystem identity are distinct mechanisms. Name the actor, input size, reachability, and execution context before assigning consequence.

[Return to the repository skill collection](../README.md).
