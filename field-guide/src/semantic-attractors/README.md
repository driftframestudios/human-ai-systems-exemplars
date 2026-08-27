# Semantic Attractors

```yaml
folder_contract:
  id: "driftframe-constellation.field-guide.semantic-attractors.v0.1"
  status: "hydration_stub"
  source_truth_status: "package_owned_reader_entry"
  refactor_pass: "DCP-010-semantic-attractor-language-stabilization"
```

This Field Guide section holds language patterns that help AI and human
collaborators preserve the desired state under repeated use.

## Working Rule

Write guidance as a positive, verifiable target state:

- Name the desired behavior directly.
- Pair hard safety and privacy boundaries with the replacement state.
- Keep load-bearing negation where it defines the concept, then anchor it with
  the positive state first.
- Phrase code comments, identifiers, and assertions as stable invariants.

## Local Pattern

```text
TARGET: Context stays intact across the collaboration cycle.
BOUNDARY: Private evidence stays private; public summaries carry reviewed source status.
VERIFY: The docket, source-band row, and validation command identify the promoted state.
```

The source guidance for this pass is
`field-guide/src/semantic-attractors/Output Guidance Documentation \342\200\224 Semantic Attractor Design \342\200\224 Negation-Aware Instructions.md`.
