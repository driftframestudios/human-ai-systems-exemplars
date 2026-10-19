# Shared Schema Envelope Extraction v0.1

## Core Architectures chimeric artifact extraction baseline

```yaml
spec_identity:
  display_name: "Shared Schema Envelope Extraction"
  version: "0.1"
  artifact_family: "Core Architectures"
  status: "draft extraction baseline"
  purpose:
    - "preserve the shared structure now visible across the generated chimeric prototypes"
    - "separate shared envelope fields from card-specific artifact models"
    - "establish a local JSON-LD vocabulary before deeper validation work"
    - "prepare repository/gist structure without locking production packaging too early"
```

## Working read

The chimeric artifact work is no longer mainly a schema-invention problem. It is now a preservation and extraction problem:

```text
How do we preserve stabilized recipe, relationship, recovery, source, semantic-locality, state, and artifact-specific fields in a form that humans can use and AI systems can parse?
```

The current prototype set demonstrates that each artifact has four synchronized layers:

```yaml
chimeric_artifact_layers:
  human_recipe_layer:
    purpose: "Debrief / Snag / Read / Move / Cure, usage guidance, recovery calibration"

  visible_work_layer:
    purpose: "editable diagram, matrix, card surface, treemap, heatmap, scenario set, or routing atlas"

  semantic_graph_layer:
    purpose: "JSON-LD graph with stable nodes, relationships, provenance, source notes, semantic locality, and handoff routes"

  extraction_layer:
    purpose: "portable JSON, schema, validation, and AI collaboration handoff"
```

## Core finding

```yaml
core_finding:
  relationship_contract:
    status: "central structure"
    note: "Not optional metadata. Each artifact should know what it consumes, produces, receives from, and hands to."

  recovery_calibration:
    status: "central structure"
    note: "Not optional metadata. Strain cues, stabilizing read, restored state, and architecture routes are part of the artifact’s function."

  semantic_locality:
    status: "central structure"
    note: "Preferred phrasing, replacement-state guidance, route labels, and avoid/translate terms make artifacts usable out of context."

  source_note:
    status: "central structure"
    note: "Source-banding preserves lineage without letting provenance dominate local method adaptation."

  view_state:
    status: "central interaction model"
    note: "Visual order, hidden items, selected items, and text mode are presentation state, not semantic identity."
```

---

# 1. Shared envelope

Every Core Architecture chimeric artifact should support the following shared envelope.

```yaml
core_architecture_artifact_envelope:
  artifact_identity:
    id:
    display_name:
    subtitle:
    version:
    family:
    placement:
    primary_cognitive_move:
    secondary_cognitive_moves:
    source_band:
    aliases:
    prototype_file:

  quick_use:
    use_when:
    restores:
    good_next_question:
    usually_hands_to:
    strain_cues:

  recipe:
    debrief:
    the_snag:
    the_read:
    the_move:
    the_cure:

  relationship_contract:
    consumes:
    produces:
    receives_from:
    hands_to:

  recovery_calibration:
    strain_cues:
    stabilizing_read:
    restored_state:
    recovery_moves:
    adjacent_architectures:
    named_failure_geometries:

  source_note:
    source_band:
    public_anchor:
    author_adaptation:
    local_recipe_boundary:
    provenance_questions:
    technical_veracity_status:

  semantic_locality:
    glossary_terms:
    preferred_phrasing:
    replacement_state_guidance:
    retrieval_aliases:
    avoid_or_translate:

  ai_collaboration:
    current_context_summary:
    visible_scope:
    hidden_scope:
    preserve:
    revise_or_explore:
    open_discoverables:
    next_decision:
    output_request:
    probability_instruction:

  view_state:
    active_view_id:
    views:
      - id:
        name:
        order:
        hidden:
        selected:
        text_mode:
        display_options:
        active_intensity_bases:

  artifact_model:
    shape_type:
    model_version:
    entities:
    relations:
    completion_signals:
```

## 1.1 Identity and view-state principle

```yaml
identity_view_state_principle:
  rule:
    "Stable IDs describe what a thing is. View state describes where and whether it appears."

  stable_identity_examples:
    - "goal ID"
    - "actor ID"
    - "cell ID"
    - "dimension ID"
    - "stage ID"
    - "shared asset ID"
    - "scenario ID"
    - "failure geometry ID"

  view_state_examples:
    - "column order"
    - "row order"
    - "hidden rows"
    - "hidden stages"
    - "selected cell"
    - "text preview mode"
    - "active intensity bases"
    - "visible focus scope"
```

This principle has already proven itself in Context Tree, Strategy Canvas, Shared Surface Priority Map, Service-design Blueprint, HEART Chart, and the Root Atlas.

---

# 2. Local vocabulary strategy

```yaml
vocabulary_strategy:
  local_first:
    prefix: "ca"
    purpose:
      - "represent Core Architecture terms without forcing them into schema.org too early"
      - "preserve terms such as Discoverable, StrainCue, RecoveryMove, RelationshipContract, SemanticLocality, HandoffRoute, ViewConfiguration"

  schema_org_second:
    prefix: "schema"
    purpose:
      - "provide outward compatibility for broad web semantics"
      - "use CreativeWork, Dataset, Action, DefinedTerm, Review, SoftwareApplication where appropriate"

  defer:
    - "full production ontology"
    - "complete schema.org mapping"
    - "SHACL shapes for every artifact"
```

## 2.1 Required local classes

```yaml
local_classes:
  shared:
    - CoreArchitectureArtifact
    - ArtifactIdentity
    - QuickUse
    - RecipeSpine
    - RelationshipContract
    - RecoveryCalibration
    - SourceNote
    - SemanticLocality
    - AIContextPacket
    - ViewConfiguration
    - HandoffRoute
    - StrainCue
    - FailureGeometry
    - RecoveryMove
    - RestoredState
    - Discoverable
    - StatusMarker
    - VeracityStatus

  artifact_specific_examples:
    - ImpactMap
    - ContextTree
    - StrategyCanvas
    - FirstResponsibleVersionMatrix
    - CrossChannelBlueprint
    - SharedSurfacePriorityMap
    - ServiceDesignBlueprint
    - AISystemsServiceBlueprint
    - SpecificationByExample
    - SoftwareArchitectureViews
    - HEARTChart
    - PlusDelta
    - PractitionerJudgmentProbes
    - PatternProblemSurfaceMatrix
    - JobsToBeDoneTreemap
    - UnitTestFirstDesign
    - UpstreamRevisionLoop
    - RecoveryRoutingAtlas
```

---

# 3. Shared state model

The earlier missing-item list named “state model” as the largest easily missed item. The prototype family now confirms that state belongs at the center of the schema.

```yaml
state_model:
  semantic_state:
    description: "what the artifact means"
    examples:
      - "nodes"
      - "cells"
      - "cards"
      - "scenarios"
      - "routes"
      - "status"
      - "source notes"
      - "semantic-locality fields"
      - "recovery calibration"

  presentation_state:
    description: "how the artifact is currently shown"
    examples:
      - "visible columns"
      - "hidden rows"
      - "selected cell"
      - "stage visibility"
      - "shared asset focus"
      - "text preview mode"

  interaction_state:
    description: "what a visitor is currently doing"
    examples:
      - "selected item"
      - "inspector open"
      - "active intensity basis"
      - "visible focus scope"

  export_state:
    description: "what should persist"
    examples:
      - "full data"
      - "view state"
      - "hidden item IDs"
      - "revision notes"
      - "route registry"
```

## 3.1 Hide/display rule

```yaml
hide_display_rule:
  hide_means:
    - "not visible in current focus view"
    - "not included in screenshot-like surface"
    - "summarized as hidden in AI prompt capsule"

  hide_does_not_mean:
    - "deleted"
    - "redacted"
    - "removed from JSON"
    - "removed from JSON-LD"
    - "safe to share"

  redaction:
    status: "separate future feature"
    requires:
      - "explicit mode"
      - "visible warning"
      - "export without hidden data"
      - "provenance note"
```

---

# 4. Validation strategy

```yaml
validation_strategy:
  phase_1:
    name: "Plain JSON Schema"
    purpose:
      - "check required shared envelope fields"
      - "check stable ID presence"
      - "check valid status values"
      - "check handoff route structure"
      - "check artifact-specific structural integrity"
    status: "started with core-architecture-envelope.schema.v0.1.json"

  phase_2:
    name: "JSON-LD graph inspection"
    purpose:
      - "ensure graph can be parsed"
      - "ensure IDs and relationships are stable"
      - "ensure view state is represented without changing semantic identity"
    status: "started with core-architecture.context.v0.1.jsonld"

  phase_3:
    name: "SHACL"
    purpose:
      - "validate RDF graph shapes"
      - "support future UI generation, data integration, and stronger schema contracts"
    status: "deferred"
```

## 4.1 Generic quality checks

```yaml
generic_quality_checks:
  identity:
    - "artifact has stable ID"
    - "all major entities have stable IDs"
    - "view state uses IDs rather than labels"

  relationships:
    - "handoff routes include target and reason"
    - "relationship contract includes consumes / produces / receives_from / hands_to"

  recovery:
    - "strain cues are present"
    - "stabilizing read is present"
    - "restored state is present"

  semantic_locality:
    - "preferred phrasing is present"
    - "replacement-state guidance is present"
    - "avoid/translate terms are present"

  ai_collaboration:
    - "AI prompt capsule or AI context packet exists"
    - "visible / hidden scope is described where view state exists"
    - "probability-of-what instruction is preserved"
```

---

# 5. Artifact-specific model registry

The system now has enough prototypes to maintain an artifact model registry. The companion JSON file `core-architecture-artifact-model-registry-v0.1.json` extracts this from the current manifest.

```yaml
artifact_specific_model_principle:
  shared_envelope:
    role: "consistent across all artifacts"

  artifact_specific_model:
    role: "describes each artifact’s visible work structure"

  examples:
    impact_map:
      shape: "directed graph"
      core_entities:
        - Goal
        - Actor
        - Impact
        - Discoverable
        - HandoffRoute

    context_tree:
      shape: "role-context matrix"
      core_entities:
        - Group
        - ContextQuestion
        - ContextCell
        - ViewConfiguration

    shared_surface_priority_map:
      shape: "heatmap + shared asset spans"
      core_entities:
        - Stage
        - Surface
        - HeatmapCell
        - SharedAsset
        - ViewConfiguration

    service_design_blueprint:
      shape: "layered service matrix"
      core_entities:
        - ServiceStage
        - ServiceLayer
        - ServiceCell
        - SharedAsset
        - ViewConfiguration

    specification_by_example:
      shape: "scenario graph"
      core_entities:
        - Rule
        - Scenario
        - Given
        - When
        - Then
```

---

# 6. Research tracks preserved

```yaml
research_tracks:
  artifact_graph_model:
    question: "What local vocabulary represents Core Architecture cards, nodes, edges, routes, recovery cues, and semantic-locality fields?"
    current_artifacts:
      - "core-architecture.context.v0.1.jsonld"
      - "core-architecture-envelope.schema.v0.1.json"

  accessible_interactive_diagrams:
    question: "How should editable maps, matrices, and voting surfaces remain keyboard-usable, readable, and exportable?"
    current_principles:
      - "HTML/table source of truth"
      - "SVG as generated visualization"
      - "explicit controls"
      - "no drag-and-drop"
      - "text preview with reveal"

  provenance_and_revision:
    question: "How should source notes, author adaptations, revisions, upstream loops, and generated artifacts preserve lineage?"
    current_artifacts:
      - "Upstream Revision Loop prototype"
      - "source_note envelope"
      - "revision_history schema placeholder"

  validation_and_quality_checks:
    question: "How should each artifact know when it is complete enough, routeable, or structurally coherent?"
    current_artifacts:
      - "core-architecture-envelope.schema.v0.1.json"
      - "completion_signals field"

  portable_ai_collaboration:
    question: "What exact bundle should a human hand to an AI collaborator?"
    current_answer:
      - "single HTML artifact"
      - "visible SVG/table"
      - "embedded JSON-LD"
      - "plain JSON export"
      - "visible AI prompt capsule"
      - "source note"
      - "revision note"

  domain_exemplar_adaptation:
    question: "How do genomics, healthcare, and ecology examples shape required fields, privacy/provenance needs, and diagram complexity?"
    current_pattern:
      - "realistic synthetic genomics / healthcare examples"
      - "source-sensitive hidden/display language"
      - "redaction deferred as separate feature"
```

---

# 7. Repository / gist structure sketch

```text
core-architectures/
  README.md
  manifest.json

  cards/
    impact-map/
      impact-map.prototype.html
      impact-map.example.json
      impact-map.model.md
    context-tree/
      context-tree.prototype.html
      context-tree.example.json
      context-tree.model.md
    strategy-canvas/
      strategy-canvas.prototype.html
      strategy-canvas.example.json
      strategy-canvas.model.md
    ...

  shared/
    core-architecture-envelope.schema.v0.1.json
    core-architecture.context.v0.1.jsonld
    core-architecture-artifact-model-registry-v0.1.json
    route-registry.json
    status-registry.json
    view-configuration.schema.json
    semantic-locality.schema.json

  examples/
    genomics/
      variant-review-impact-map.example.json
      variant-review-context-tree.example.json
      variant-review-service-design-blueprint.example.json
    ecology/
      field-monitoring-cross-channel.example.json
    healthcare/
      care-coordination-heart.example.json

  docs/
    shared-schema-envelope-extraction-v0.1.md
    repository-structure-sketch-v0.1.md
    validation-strategy.md
    accessibility-notes.md
    source-banding-notes.md

  prototypes/
    current/
      *.html
    archive/
      previous-versions/
```

## 7.1 Single-file vs repository

```yaml
portability_unit:
  now:
    preferred: "single-file HTML artifact"
    reason:
      - "easiest to hand to an AI collaborator"
      - "easy to inspect manually"
      - "portable across contexts"

  next:
    preferred: "small repository or gist"
    use_when:
      - "shared schema files are stable"
      - "examples need versioning"
      - "validation scripts become useful"
      - "shared components should be extracted"
```

---

# 8. Next recommended work

```yaml
recommended_next_steps:
  immediate:
    - "Review shared envelope schema for missing common fields."
    - "Review local JSON-LD context terms for name stability."
    - "Compare artifact model registry against generated prototypes."

  then:
    - "Draft route-registry.json from root atlas."
    - "Draft status-registry.json including status, evidence, veracity, and scenario states."
    - "Create ViewConfiguration schema as a reusable shared component."
    - "Create CellTextPreview schema as a reusable shared component."

  later:
    - "Add JSON Schema validation to one existing prototype."
    - "Start with Context Tree or Impact Map for in-page validation."
    - "Explore SHACL only after JSON-LD context stabilizes."
```

## Working conclusion

```text
The prototype family is ready for shared envelope extraction.

The first shared schema should remain modest: preserve identity, recipe, relationship contract, recovery calibration, source note, semantic locality, AI collaboration, view state, and artifact-specific model boundaries.

The next durable step after this extraction is not a large framework rewrite. It is a small shared folder containing JSON Schema, JSON-LD context, artifact model registry, route registry, status registry, and repository/gist structure notes.
```
