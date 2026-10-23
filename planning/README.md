# Planning

This directory holds options, open questions, research, and implementation
plans that have yet to become source changes. Use it to compare consequential
choices, prepare design sprints, and give unfinished work a clear next receiver.
Runnable source, GitHub work, and release records continue to own current
behavior and delivery state.

Planning and `threadkeeping/` carry complementary parts of the work:

| Record or system | What it carries | Authority retained elsewhere |
| --- | --- | --- |
| `planning/` | Options, dependencies, design-sprint terrain, open questions, research, evidence-based capability assessment, and Now / Next / Later continuations | Runnable source owns runtime truth; delivery records and named acceptors own deployment authority and readiness. |
| `threadkeeping/` | Decisions, rationale, assumptions, source boundaries, review history, and re-entry position | Conversation owners retain transcripts; GitHub carries work state; visitor source carries published content. |
| GitHub Issues | Bounded work with a named outcome, acceptance evidence, ownership, discussion, and a useful path to a branch or pull request | Owning documents carry design terrain and architectural rationale; one linked roadmap carries longer sequencing. |
| GitHub Projects | Optional views across issues and pull requests when filtering, sequencing, or shared triage becomes useful | `planning/` carries the planning corpus; each collaboration adopts a Project when shared triage adds value. |
| Visitor and prototype source | The experience another collaborator or visitor can actually inspect and use | `threadkeeping/`, Issues, and decisions preserve collaboration history and rationale. |
| Architecture decisions | Stable, consequential choices once their receiving context is known | Planning preserves provisional ideas until a decision earns durable standing. |
| Pull requests | The exact proposed source change, review conversation, verification evidence, and merge result | Issues, decisions, and threadkeeping retain long-horizon plans and durable rationale. |
| CI and release receipts | Reproducible evidence about a specific revision | Source owners and named stewards retain architectural rationale and human meaning. |

Planning points to source material through stable links. When
a concept settles, the receiving package or section README becomes the concise
route to it. When rationale or re-entry context matters, `threadkeeping/`
preserves the decision and return point.

## Current planning areas

- [Repository test architecture and evidence coherence](testing-suite-consolidation/README.md): owned Node, Python and browser suites; phased evidence bundles; helper convergence; active portable testing skills; and the cross-repository stewardship route.

- [Cross-repository LIMS/ELN functional nucleus](functional-nucleus-assessment-horizon.md)
- [Context Canvas — principal engineering and publication](context-canvas/README.md) — includes the approved contrast architecture, visual-consistency milestone, and skill-cultivation continuations.
- [Media publication](media-publication/README.md) — source-owned responsive raster delivery, accepted-byte video posters, concise visual sequences, accessible native receivers, R2-backed progressive video through the same-origin Cloudflare CDN route, a retained Stream migration path, metadata boundaries, bounded video descriptors, and draft publication skills and runbooks.
- [Core and Narrative unit-test collaboration](unit-testing/README.md) — source-owned expectations, direct Node/Ajv seams, current contract findings, Practitioner Registry and external research, focused browser behavior, milestones, and purposeful holds.
- [Repository skill architecture and research spike](repository-skill-architecture.md)
- [Repository collaboration cycle — docket and tranche architecture](repository-collaboration-cycle-options.md) — the selected cold-session launcher, full-cycle runbook, conditional domain overlays, capacity-aware bounded-support branch, environment preparation, and first exercise route.
- [Repositories with Friends — owner-operable foundations and delivery forms](repositories-with-friends-owner-operable-foundations.md) — the direct Context Canvas transfer sequence, portable readiness skill and handoff runbook, bounded drift reconciliation, event-triggered context routing, and four future delivery forms.
- [Schema contract research and implementation](schema-contract-research-and-implementation-plan.md) — the v1 schema nucleus, dual retrieval model, evidence-grounded pitfalls, and three receiving collaboration waves.
- [Locator-free public-history rehearsal](locator-free-public-history-rehearsal.md) — the cutoff-bound ref, pull-ref, Pages, schema-link, GitHub-prose, metadata, recovery, and route-confidence packet. Repository-wide source and collaboration-link settlement supplies its prerequisite. The clean-successor hybrid is the selected route; shared pre-cutover preparation continues here while technical-collaboration replay develops independently.

## Working posture

Planning uses a small continual-writing rhythm:

1. **Frame** — name the actual request, relevant authorities, constraints, and what should remain open.
2. **Explore** — produce options, maps, probes, and relationships as exploratory material; named owners establish gate status.
3. **Re-read** — bring existing code, research, reviews, and real use back into the plan.
4. **Decide** — test necessity, smallest useful form, dependencies, and questions whose answers would change the work.
5. **Hand forward** — name the next useful action and link the receiving artifact.

An individual planning file may be long. Its directory README stays compact and routes future collaborators to the material that currently matters.

## Collaboration rules

- Preserve the repository's current top-level structure. A narrower change earns its place when the receiving implementation materially benefits.
- Keep HTML, CSS, and SVG as the Context Canvas runtime substrate; place build-time verification and distribution tools in the build path.
- Treat `main` as the broadest cross-platform reading branch because some collaborators can read only that branch. Use branches when they improve review, isolation, or recovery; keep branch choice focused on the work's receiving need.
- Give each active item one operational owner. A planning row may point to an Issue; the Issue owns its immediate state; a pull request owns the proposed diff; Git and deployment own what landed. Mirror links and consequences while preserving one status owner.
- Keep planning and threadkeeping outside public deployment by default.
- Prefer links and typed relationships to duplicated content.
- Record what is settled, what remains open, and what another collaborator can do next.
- Keep open questions visible. They name unsettled decisions and give the next receiver concrete collaboration handles.
- Normalize contracts and mechanics while preserving the Context Canvas's plural visual expression.
- Reuse the established harness, manifests, and small root development toolset when a reproduced visitor-facing need calls for them. New checks and tools earn a place by making a specific visitor condition observable; their fitting owners carry compliance structures, readiness scores, and authority layers.
- When a reproduced need awaits observation, describe the desired observable state first and let the smallest useful check form with the repair. A named human collaborator decides whether that observation stays local or earns a place in the shared harness.

## Source inspirations

- `threadkeeping/` — local decision and continuity ledgers.
- `field-guide/src/practitioner-probes-entry/` — reader-entry and source-ownership boundaries.
- `field-guide/src/collaboration-postures/` — collaboration-memory extraction posture.
- Driftframe Constellation — current package authority for reference-first schema, interpretive, narrative, research-atlas, and publication-boundary work; its package-shape continuation carries the external organization and the [root source-ownership map](../README.md#source-projection-and-delivery-retain-separate-ownership) carries the cross-repository handoff. The authorized resolver retains its exact source coordinate under `urn:source-key:driftframe-constellation`.
- Public guidance: [Bounded Packages & Return Receipts](https://kindlight.systems/field-watch/field-watch-signal-room/bounded-packages-return-receipts-recursive-orchestration-for-long-horizon-humanai-work), [Proportionate Response Under Uneven Goal Fidelity](https://kindlight.systems/field-watch/field-watch-signal-room/proportionate-response-under-uneven-goal-fidelity-restore-the-intended-effect), and [Practitioner Probes](https://kindlight.systems/practitioner-probes).
