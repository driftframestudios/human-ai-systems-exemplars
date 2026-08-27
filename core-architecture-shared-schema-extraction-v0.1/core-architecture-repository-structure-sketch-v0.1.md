# Repository / Gist Structure Sketch v0.1

## Purpose

This sketch describes how the Core Architecture chimeric artifacts can move from single-file prototypes into a small, coherent repository or gist structure without losing portability.

```yaml
repository_goal:
  preserve:
    - "single-file handoff usefulness"
    - "human-readable recipes"
    - "SVG/table visual surfaces"
    - "JSON export/import"
    - "embedded JSON-LD"
    - "AI prompt capsules"
    - "semantic locality"
    - "source-banding"
    - "recovery routing"

  add:
    - "shared schema envelope"
    - "local JSON-LD context"
    - "route registry"
    - "status registry"
    - "artifact-specific model docs"
    - "example data"
    - "validation scripts later"
```

## Suggested structure

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
    first-responsible-version-matrix/
    cross-channel-blueprint/
    service-design-blueprint/
    ai-systems-service-blueprint/
    specification-by-example/
    software-architecture-views/
    heart-chart/
    plus-delta/
    practitioner-judgment-probes/
    pattern-problem-surface-matrix/
    jobs-to-be-done-treemap/
    unit-test-first-design/
    upstream-revision-loop/
    recovery-routing-atlas/
    poda/
    alignment-worksheet/

  shared/
    core-architecture-envelope.schema.v0.1.json
    core-architecture.context.v0.1.jsonld
    core-architecture-artifact-model-registry-v0.1.json
    route-registry.json
    status-registry.json
    view-configuration.schema.json
    text-preview.schema.json
    semantic-locality.schema.json

  examples/
    genomics/
      variant-review-impact-map.example.json
      variant-review-context-tree.example.json
      variant-review-service-blueprint.example.json
    healthcare/
    ecology/

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

## Folder roles

```yaml
folder_roles:
  cards:
    role: "one folder per Core Architecture"
    contains:
      - "current single-file prototype"
      - "example JSON"
      - "artifact-specific model note"

  shared:
    role: "schema, context, registries, and reusable components"
    contains:
      - "shared envelope schema"
      - "local JSON-LD context"
      - "route registry"
      - "status registry"
      - "ViewConfiguration model"

  examples:
    role: "realistic synthetic domain exemplars"
    contains:
      - "genomics"
      - "healthcare"
      - "ecology"

  docs:
    role: "human-readable architecture and research notes"

  prototypes:
    role: "current and archived standalone HTML artifacts"
```

## Portability principle

```text
The repository should improve maintainability without breaking single-file artifact handoff.
```

Each card should still be exportable as a standalone HTML file with embedded data and JSON-LD.
