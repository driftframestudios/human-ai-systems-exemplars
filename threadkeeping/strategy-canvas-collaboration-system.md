# Strategy Canvas collaboration system

## Re-entry summary

The Strategy Canvas family now follows a two-expression contract:

- the canonical artifact is a quiet, extensible worksheet that documents instruction implications and progressive enhancement behavior;
- the Context Canvas artifact is a present-tense collaboration workbench centered on human-first readings, reveal, spread, reversible proposals, notes, evidence, review, and handoff.

Both expressions use `strategy-canvas/2.0`. Context-specific state lives under the strictly typed `extensions.contextCanvas` namespace. The outer schema version governs the current extension shape. Narrative projection mapping lives under `extensions.narrativeProjection`.

## Settled semantic distinctions

- Offering/current score, good-enough threshold, desired score, and consequence weight carry different meanings.
- Consequence weight directs attention and leaves profile coordinates unchanged.
- Human ballots, system-derived aggregates, and AI-attributed proposals are separate entity channels.
- Aggregates derive only from eligible submitted human ballots.
- Independent human elicitation completes before an optional AI shadow round.
- The AIShadowRound interaction assembles a reviewed and consent-scoped portable packet locally. In v0.2, it serializes as one `aiCollaboration` record with attributed `proposals`; submitted human ballots remain the aggregate input set.
- A post-reveal point move changes a scenario proposal while the group reading remains visible and recoverable.
- ERRC becomes a lens after the baseline shape is visible.
- The Narrative Composer's NOW/NEXT/LATER dialect maps to current/good-enough/desired through a named adapter and migration receipt.

## Surface distinctions

### Canonical

The reference-derived hierarchy, qualitative scale language, large markers, semantic matrix, plain CSS tokens, and no-script reading create an approachable baseline. Instructions explain what each action changes and which state stays available.

### Context Canvas

The workbench speaks to the active decision and participant flow. Its copy avoids repository lineage and production narration. A phase rail, dimension field, private turn-taking, reveal layer, scenario twin, inspector, AI packet scope, and reviewed report support the collaboration.

### Narrative Capsule Composer

The compact preview remains a projection surface. It now gives every score a dimension-specific accessible name, uses larger state markers, exposes the v2 mapping, exports a v2 seed with receipt, and can import a v2 artifact through the explicit adapter.

## Research payloads

The durable design and research contract lives in `planning/context-canvas/strategy-canvas/`:

- system decision frame;
- method, scales, and adaptation;
- independent elicitation and aggregation;
- direct manipulation and room ergonomics;
- domain dimensions and anchors;
- AI collaboration and portable handoffs;
- architecture, security, and verification.
- implementation coverage ledger and completion gates.

Each payload records falsifiers, coverage, and completion gates.

## Embed boundary

Receiving iframes begin with `allow-scripts`. A real in-frame report download earns `allow-downloads`. A real copy action earns `allow="clipboard-write"` through Permissions Policy. A visible in-frame separate-tab action earns `allow-popups allow-popups-to-escape-sandbox`; fullscreen presentation earns `allow="fullscreen"`. The current Grammar Family and FMI carriers grant scripts, downloads, popup exits, and clipboard writing. They retain their separate origin, omit same-origin, top-navigation, and fullscreen, and keep ordinary navigation on their surrounding visitor pages. The package projection gives only iframe-contained exits separate-tab behavior.

## Verification gate

- JSON, schema, adapter, and JavaScript parse.
- Canonical and Context fixtures validate against schema v2.
- The Narrative adapter round-trips score identity with an explicit review receipt.
- Aggregate inputs reject AI proposals and system aggregates.
- AI packet scope includes only selected reviewed fields.
- Local prototypes complete with network requests blocked.
- Label, focus, input-equivalence, sealed-turn, reveal, scenario, report, and import contracts pass.
- 390, 1440, 1920, and 2560 treatments preserve a usable surface; reciprocal viewport profiles exercise the layout pressure modeled for 200% and 400% zoom.
- Canonical and Context action bands, guides, factor labels, and handles share one half-column geometry, with the outer hit halos clear of both plot edges.
- The canonical import boundary rejects malformed JSON, payloads beyond 512 KiB, nesting beyond 32 levels, and graphs beyond 20,000 values while retaining the current reading.
- The generated browser validator enforces the exact published schema before domain invariants; boundary-focused Narrative imports normalize duplicate or markup-like IDs and bound numeric/string values.
- Authorized and unauthorized AI packets carry explicit scope receipts and recursively hold participant identity, per-person ballots, local events, and raw aggregate arrays outside the portable packet.
- The canonical skip link is fully offscreen when unfocused, enters at the viewport top on keyboard focus, and returns offscreen after blur. A mid-page copy in very long Chromium `fullPage` captures is fixed-layer stitching from the capture path rather than runtime visibility.
- Grammar Family and FMI embeds retain the smallest capability set that supports the implemented actions.
- Root and Context Narrative Composer, Semantic Sampling, and Technology Fit archives rebuild deterministically; their embedded manifests and portable routes resolve against the packaged members.
- The Context prototype-manifest validator passes all five mirrored collections.

### Current v0.2.5 source receipt

`npm run test:strategy-canvas` passes 47 of 47 browser contracts at `.visual-runs/2026-09-30T01-12-44-056Z-strategy-canvas-contract`. The current route includes a rendered forced-colors observation: an unselected SVG dimension label resolves to the system `Canvas` and `CanvasText` pair while the selected and focused label retains `Highlight`. The builder reproduces a 165,776-byte canonical distribution with SHA-256 `9e376ec39c2f0cf5dd1359b7332fade27257008a48db5ebfc63cf606af28fa56`. `npm run test:core-architectures` passes 76 of 76 checks, the four maintained consumer archives remain current, `npm run test:narrative-architectures` passes 28 of 28 checks, and `npm run test:iframe-routes` passes 32 of 32 checks.

[Issue #137](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/137) carries the moving cross-family package coordinate. This record establishes the source-owned Strategy Canvas identities and build; the existing deployment owners retain live delivery.

### Historical acceptance receipt · v0.2.0 foundation

The 2026-08-22 acceptance run passed 36 of 36 browser contracts at `.visual-runs/2026-08-22T05-05-16-708Z-strategy-canvas-contract`. Final selector visuals remain preserved at `.visual-runs/2026-08-22T05-10-38-512Z-strategy-canvas-canonical` and `.visual-runs/2026-08-22T05-10-41-452Z-strategy-canvas-context`. That 82-path acceptance inventory covered both expressions, four viewport bands, reciprocal zoom reflow, column mapping, channel boundaries, packet redaction and consent scope, reviewed-report parity, bounded import failure, historical review preservation across a new starter field, no-script and forced-mount-failure readings, print and media preferences, three compatibility routes, and both Narrative consumers. Its canonical distribution was 129,962 bytes with SHA-256 `f3492e97812bb0e4baaeef17adc7ce2015da9b5de53b40105b713f2662b5296d`.

## Collaboration edge

Current: the canonical v0.2.5 source, generated distribution, source manifest, Context v0.2.3 workbench, schema/core, Narrative source projection, canonical portable companion, research spine, deterministic consumer archives, and local iframe package agree at their named coordinates. The evidence registry names each material representation and derives current canonical, Context, and iframe coordinates from their owning manifests. The v0.1.1 routes remain accessible compatibility entries.

Next: review and merge the source-identity reconciliation, then let Issue #137 receive the accepted cross-family package coordinate and Issue #190 receive the exact live Strategy Canvas route observation. Physical touch-hardware and assistive-technology receipts remain nominated field-validation work alongside that delivery review.

```yaml
machine_node:
  id: strategy-canvas-collaboration-system
  repository: urn:source-key:prototype-exemplars
  branch: source-key:strategy-canvas-collaboration-system
  semantic_contract: strategy-canvas/2.0
  context_extension_namespace: extensions.contextCanvas
  state: source_identity_reconciliation_ready_for_review
  expressions:
    canonical: plain_extensible_instructional_worksheet
    context_canvas: present_tense_collaboration_workbench
    narrative_consumer: explicit_now_next_later_adapter
  channels:
    human: HumanBallot
    derived: SystemAggregate
    ai: AIProposal
  aggregation_inputs:
    - HumanBallot
  ai_shadow_round:
    availability: after_human_reveal
    network_policy: local_only
    aggregate_membership: excluded
    packet_scope: reviewed_and_explicitly_selected
  next_route: review_merge_package_receive_live_verify
  verification:
    browser_contract: 47_of_47_pass
    canonical_distribution:
      bytes: 165776
      sha256: 9e376ec39c2f0cf5dd1359b7332fade27257008a48db5ebfc63cf606af28fa56
    core_architectures: 76_of_76_pass
    consumer_archives: 4_of_4_deterministic_and_receipted
    context_manifests: 5_of_5_pass
    narrative_architectures: 28_of_28_pass
    iframe_routes: 32_of_32_pass
    cross_family_package_authority: issue_137
  open_condition:
    - collect touch_hardware and actual_browser_assistive_technology_zoom receipts as field_validation
```
