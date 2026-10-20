# Evidence-Guided Capability Transfer Atlas Bundle v0.2

This folder packages one semantic prototype: the Deep Research Atlas expansion of the Evidence-Guided Capability Transfer Model. It preserves the four-frame authority story from v0.1 while adding assurance, runtime/data, recovery/retirement, and evidence-provenance lenses.

## Open and embed

- `index.html` is the primary, self-contained research document. Its CSS, JavaScript, SVG generation, and runtime data are inline. External URLs are evidence links only; no runtime library or asset download is required.
- `embed.html` is the direct host-fragment delivery surface used by Codex inline visualizations. It is not a complete HTML document. It expects host design tokens and components such as `--foreground`, `--border`, `--viz-series-*`, `.btn`, and `.card`.

Open `index.html` directly in a modern browser. The lens and frame controls are keyboard-operable; the document also includes a complete registry, source ledger, text equivalent, and evidence inspector.

## Package map

| Path | Role |
| --- | --- |
| `model/a3-stacked-cube-canonical-v0.1.json` | Protected historical baseline and stable IDs |
| `model/a3-stacked-cube-expanded-canonical-delta-v0.2.json` | Research expansion as a semantic delta |
| `model/a3-stacked-cube-expanded-view-model-v0.2.json` | Exact portable data model extracted from `index.html` |
| `research/source-registry-v0.2.json` | Exact source registry extracted from the embedded view model |
| `research/coverage-ledger-v0.2.json` | External primary-source pass receipt |
| `research/research-plan-v0.2.md` | Research questions, method, and completion gate |
| `schema/*.schema.json` | Draft 2020-12 schemas for the delta, view model, source registry, and coverage ledger |
| `schema/a3-stacked-cube.context.jsonld` | Optional JSON-LD semantic context |
| `validation/validation-report.json` | Portable receipt for the 2026-09-30 bundle revision |
| `a3-stacked-cube-atlas-expanded-manifest-v0.2.json` | Publication paths, roles, byte counts, and SHA-256 inventory |

## Authoritative model

The authoritative semantic model is the pair of the v0.1 canonical base and the v0.2 delta. A single resolved JSON document is intentionally not materialized: the delta is an additive research layer, not an RFC 6902 patch or JSON Merge Patch, and no lossless merge order has been specified. Flattening it into the base would risk changing protected IDs or implying that conditional research claims are historical facts.

The extracted view model is authoritative for reproducing this particular visualization. It is a projection optimized for rendering and interaction, so its names and shapes intentionally differ from the canonical base-plus-delta pair.

## Source integrity

Every `source_ids` reference in the packaged delta resolves against `research/source-registry-v0.2.json`. The two obsolete aliases `SRC-HIPAA-308` and `SRC-HIPAA-312` were repaired in this package copy to the single registry entry `SRC-HIPAA`, whose title and role cover both sections. No substantive claim changed.

`SRC-A3` and `SRC-ATLAS` carry private lineage through stable `urn:source-key:` identifiers. The v0.1 baseline copy also carries explicit `source_key` while retaining its original wire fields. The expanded prototype renders private-lineage records as semantic source labels, while genuinely public evidence remains linked. The authorized resolver retains the exact gated coordinates.

The included validation report records the 2026-09-30 model-parity and four-width browser pass. The manifest preserves the earlier 2026-07-27 receipt as prior evidence and refreshes the current byte-and-hash inventory.

The external research supplies evidence categories and architecture distinctions, not product-specific proof. Intended use, regulatory applicability, runtime topology, and operational gate status remain conditional or `UNKNOWN` where the record does not resolve them.
