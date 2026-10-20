# Semantic Attractors

```yaml
folder_contract:
  id: "driftframe-constellation.field-guide.semantic-attractors.v0.1"
  status: "hydration_stub"
  source_truth_status: "package_owned_reader_entry"
  refactor_pass: "DCP-010-semantic-attractor-language-stabilization"
```

This Field Guide section holds language patterns that help human collaborators
and AI systems preserve the desired state under repeated use.

## Working Rule

Classify the job of a negation, then write guidance toward a positive,
verifiable target state where the meaning survives:

- Name the desired behavior directly.
- Keep qualifiers local to the claim or action they govern.
- Pair hard safety, privacy, legal, and compatibility boundaries with the
  permitted replacement state.
- Keep load-bearing negation where it defines the concept, then anchor it with
  the positive state first.
- Preserve quotations and executable assertions exactly when fidelity or
  runtime semantics require them.
- Validate consequential rewrites with the model, retrieval system, training
  process, interface, or runtime that receives them.

The three-rung ladder in the source guidance is a fitted authoring heuristic
for generative instructions. Training-time, prompt-level, lexical,
multilingual, embedding, and mechanistic studies measure different behavior;
the receiving task decides whether a rewrite improves fit.

## Local Pattern

```text
TARGET: Context stays intact across the collaboration cycle.
BOUNDARY: Private evidence stays private; public summaries carry reviewed source status.
VERIFY: The docket, source-band row, and validation command identify the promoted state.
```

The source guidance for this pass is
`field-guide/src/semantic-attractors/Output Guidance Documentation \342\200\224 Semantic Attractor Design \342\200\224 Negation-Aware Instructions.md`.
