# Prompt Capsule: Strategy Canvas

- Contract: `prompt-capsule/0.1.0`
- Capsule: `strategy-canvas-collaboration-field`
- Source: `strategy-canvas-canonical@0.2.4`
- State: `strategy-canvas/2.0` · revision `1`
- Fingerprint: `fnv1a32-utf8:13bcf93f`
- View: `plain`

## Purpose and target

Collaborate with this Strategy Canvas as an inspectable working revision.

- Decision object: Shared collaboration support
- Horizon: Next responsible phase
- Lifecycle: `working`

## Relevant context and inputs

- Method posture: `internal-collaboration`
- Score meaning: Relative level of support available on each locally defined dimension.
- Consequence-weight meaning: Consequence weight directs attention in discussion and leaves plotted scores unchanged.
- Scale: minimum `0`; maximum `10`; step `1`. Labels — low: Emerging support; middle: Partial or variable support; high: Consistent, inspectable support.

## Working state

### Goal fidelity (`goal-fidelity`)

- Meaning: The work continues to carry the stated purpose as it moves through people, tools, and revisions.
- Low anchor: Purpose is implicit or reconstructed locally.
- Middle anchor: Purpose appears at selected handoffs.
- High anchor: Purpose, boundaries, and revision conditions travel with the work.
- Readings: current `4`; good enough `7`; desired `9`.
- Consequence weight: `5/5`.
- Action lens: `raise`.
- Evidence basis: Review recent handoffs and compare their stated purpose with the originating decision.

### Evidence provenance (`evidence-provenance`)

- Meaning: Claims and decisions carry a visible route back to their supporting material and current standing.
- Low anchor: Evidence is available through individual recollection.
- Middle anchor: Key sources are linked for review-sensitive claims.
- High anchor: Source, transformation, confidence, and review standing are inspectable together.
- Readings: current `3`; good enough `7`; desired `10`.
- Consequence weight: `5/5`.
- Action lens: `create`.
- Evidence basis: Sample decisions and trace each material claim to its source and interpretation.

### Decision legibility (`decision-legibility`)

- Meaning: Participants can see what is being decided, what remains open, and who carries the next review.
- Low anchor: Decision state lives mainly in conversation.
- Middle anchor: Major decisions and owners are captured.
- High anchor: Decisions, alternatives, reasons, open conditions, and next review are visible.
- Readings: current `5`; good enough `7`; desired `9`.
- Consequence weight: `4/5`.
- Action lens: `raise`.
- Evidence basis: Ask several participants to describe the current decision and compare the resulting accounts.

### Participant reach (`participant-reach`)

- Meaning: The collaboration gives the people affected by the work meaningful routes to contribute and review.
- Low anchor: A small central group supplies most of the framing.
- Middle anchor: Named roles contribute at planned moments.
- High anchor: Affected perspectives can enter, dissent, abstain, and verify at useful moments.
- Readings: current `4`; good enough `6`; desired `9`.
- Consequence weight: `4/5`.
- Action lens: `raise`.
- Evidence basis: Map who can shape framing, scoring, review, amendment, and acceptance.

### Recovery clarity (`recovery-clarity`)

- Meaning: A strained outcome has an understandable route toward repair, reconsideration, and renewed review.
- Low anchor: Recovery depends on improvised escalation.
- Middle anchor: Common strains have named owners and routes.
- High anchor: Participants can locate the smallest adequate repair path and its receiving surface.
- Readings: current `3`; good enough `6`; desired `8`.
- Consequence weight: `5/5`.
- Action lens: `create`.
- Evidence basis: Walk a recent strained outcome backward to the earliest practical revision point.

### Cross-surface continuity (`cross-surface-continuity`)

- Meaning: Meaning remains coherent as the work moves between workshops, documents, code, and AI collaborators.
- Low anchor: Each surface requires substantial context reconstruction.
- Middle anchor: Selected artifacts carry reusable context.
- High anchor: Stable identities, decisions, evidence, and open conditions remain portable.
- Readings: current `4`; good enough `7`; desired `9`.
- Consequence weight: `4/5`.
- Action lens: `create`.
- Evidence basis: Compare the same decision across its human-facing, machine-readable, and implementation surfaces.

## Boundaries and human-held decisions

- Current describes the present working reading. Good enough describes the threshold for the named horizon. Desired describes the stronger future condition.
- Consequence weight directs discussion attention and leaves the score geometry unchanged.
- Human ballots, system-derived aggregates, and AI-attributed proposals retain distinct standing. AI suggestions enter as visibly attributed proposals outside human aggregates.
- People retain decisions about handoff scope, interpretation, acceptance, and publication.
- AI handoff scope: The receiving collaborator should ask which reviewed fields are in scope before assembling an external packet.

## Requested return

Return a Markdown review note grouped by stable dimension ID. For each dimension, include the proposed interpretation, evidence basis, open condition, and receiving review surface.

## Related loops

These public collaboration loops fit only when the receiving work meets the stated condition:

- `repository-reentry` — [Re-enter, make one bounded change, and return it clearly](https://schemas.radiantnull.com/collaboration/#repository-reentry)
  - Fit condition: Use when this versioned canvas carries a named question or requested change into resumed repository work and the return needs an exact stopping and re-entry point.
- `public-release` — [Publish a repeatable, byte-comparable artifact through a named destination](https://schemas.radiantnull.com/collaboration/#public-release)
  - Fit condition: Use after people accept this canvas revision as source for a public artifact whose declared files and bytes need a named delivery receiver.

## Evidence and recovery

- Carry each dimension’s evidence basis with its interpretation. Treat an open basis as a question for the next review.
- If the decision object, horizon, reviewed scope, or authority remains unclear, return the smallest clarifying question while keeping this working revision available.
