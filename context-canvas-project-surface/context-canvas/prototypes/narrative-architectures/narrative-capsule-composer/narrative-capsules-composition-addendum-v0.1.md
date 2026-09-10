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

## Portable Markdown views

The Composer implements `prompt-capsule/0.1.0` as GitHub Flavored Markdown generated from the current represented composition. The plain view carries the complete request. The skill-assisted view adds three public collaboration skills with an immutable source revision and SHA-256 identity for each skill. Both views preserve one state-only fingerprint, so changing the presentation leaves the represented composition identity stable. Collaboration role is part of that represented state: generate, adapt, critique, decompose, continue, and orient each produce a purpose and requested return fitted to that role.

For the Strategy Canvas target, each dimension carries its definition, low/middle/high anchors, NOW/NEXT/LATER values, consequence weight, change direction, evidence basis, and value origin. This keeps the scores attached to the meaning and evidence a receiver needs to interpret them.

The projection includes two related loops whose fit follows the receiving work:

- `#repository-reentry` supports a resumed composition that needs current source, working state, verification, and handback reconstructed;
- `#visitor-surface-change` supports a target landing that becomes a visible or interactive artifact and needs source-owned browser evidence.

The authored HTML contains the complete initial plain Markdown. Progressive enhancement keeps the visible text, clipboard copy, Markdown download, and read-only public API byte-aligned as collaborators revise the composition. The existing structured `promptSections`, JSON export, JSON-LD graph, target adapter, and import recovery remain distinct semantic surfaces derived from the same accepted state.

The assisted view pins Source Authority Mapping, Stateful Artifact Behavior Contracts, and Bounded Support Routing to repository revision `b8b305c78b82a288ae2aca9574bb86d7d3d574d9`. These skills help a receiving collaboration trace ownership, keep semantic twins in agreement, and form a finite handoff while the structured composition retains authority.
