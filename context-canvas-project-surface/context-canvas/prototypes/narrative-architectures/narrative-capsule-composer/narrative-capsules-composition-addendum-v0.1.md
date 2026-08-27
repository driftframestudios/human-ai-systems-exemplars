# Narrative Capsules — Composition and Core Architecture Landing Addendum v0.1

## Working read

The original `01_narrative-capsules-draft.md` identified the right interaction shape: module-oriented capsules, a full capsule assembled for a target landing, Strategy Canvas as a strong first comparison surface, and a reverse path that decomposes generated artifacts back into Narrative Architecture state.

The stabilized model sharpens that draft in five ways.

1. **Named module capsules remain profile aliases.** Expectation Capsule, Focalization Capsule, Ambiguity Capsule, Opportunity Capsule, and Defensibility Capsule are Narrative Capsule instances whose profile requires one primary module kind. This preserves a stable base type while keeping the authored names legible.
2. **Composition is explicit.** Independently versioned capsule sources join through `CapsuleCompositionRecord`; the result can remain projection-only, publish a composite capsule version, seed a target artifact, or carry a decomposition return.
3. **Strategy Canvas is the first exemplar, not a universal default.** Its NOW / NEXT / LATER and dimension structure makes gaps visible. The Core Architecture Orientation Index remains the runtime selector because the cognitive move should precede artifact form.
4. **The AI Prompt Capsule becomes an enriched `AIContextProjection`.** It can reference several capsule versions and selected modules, target slots, gaps, boundaries, requested outputs, verification conditions, and receipt expectations. The prompt remains a projection.
5. **Core Architecture requirements are target-specific.** The generic `core_architecture` capsule profile owns the common envelope. Required modules and artifact slots resolve from the selected `ProjectionTargetProfile`.

## Prototype seed

The included prototype starts with an Expectation Capsule and an Opportunity Capsule destined for the Strategy Canvas pair. It deliberately leaves evidence, focalization, defensibility, and open-question modules available as recommended additions. NOW scores are marked as target-local provisional entries, so the prototype demonstrates useful gap visibility rather than silently claiming source evidence.

## Reverse path

```text
Narrative Capsule source versions
  → CapsuleCompositionRecord
    → AIContextProjection
      → CoreArchitectureProjection
        → CoreArchitectureArtifactInstance
          → ProjectionReceipt and ProjectionReturnRecord
            → CapsuleDecompositionRecord or source-update candidate
```

## AI Prompt Capsule enrichment

The generated projection contains:

- stable source capsule and contract references;
- selected target pair and cognitive move;
- included, held-open, protected, and omitted modules;
- target slot bindings and value origins;
- explicit gaps and target-local provisional fields;
- boundary and publication statements;
- requested artifact outputs;
- verification and receipt requirements.

This shape supports combinations such as Expectation + Opportunity → Strategy Canvas while preserving the distinct identity and version lineage of each source capsule.
