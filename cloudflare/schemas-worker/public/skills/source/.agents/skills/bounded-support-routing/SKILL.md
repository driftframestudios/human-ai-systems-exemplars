---
name: bounded-support-routing
description: Composes a finite support packet with an explicit action mode, observable return, and stopping event. Applies when a focused solution, implementation, or recovery route needs clear expectations, bounded attention, and a natural handback.
---

# Bounded support routing

## Contract

- **What:** A compact support packet that carries one opportunity through a named focal surface to an observable result and return.
- **When:** A collaborator needs a sharply bounded observation, repair, or recovery contribution while ownership of the wider undertaking stays with its named steward.
- **Boundaries:** Current intent, repository ground, source evidence, and granted tool authority govern the work. Route and skill labels aid navigation; they carry no execution, mutation, publication, merge, or deployment authority. The no-skill/direct-reasoning route remains available when it can produce the same result with less structure.
- **Result:** The receiver can identify the opportunity, focal surface, requested result, action mode, granted actions, held boundaries, expected observation, recovery and return route, and stop condition in one pass.

## Fit and attention

- **Useful when:** A finite contribution must arrive cleanly inside a larger collaboration, particularly when observation and repair could otherwise blend together.
- **Poor fit when:** Standing guidance or direct reasoning already supplies the next move, or the undertaking needs open-ended ownership rather than a bounded handback.
- **Smallest useful dose:** One current route, one action mode, the packet fields that change behavior, and one observable stop condition.
- **Foregrounds:** **Expectation** makes the promised result and return legible. **Focalization** names the surface receiving attention. **Opportunity** names the useful condition the support can create.
- **May under-attend:** The packet sharpens one receiving moment; wider system effects remain with the surrounding task unless the packet names them.
- **Interactions:** `repository-reentry` can establish current ground; desired-state writing can shape a humane handoff; `issue-chain-stewardship` can carry the transition to a next receiver; `collaboration-accounting` can receive decision-changing observations about this skill.
- **Rest or release when:** The stop condition is observed, the receiving owner accepts the return, or direct reasoning becomes the smaller adequate route.

## Working packet

Use ordinary prose when it keeps the relationships clear. The labels below are a readable prompt palette rather than a required schema.

```markdown
**Opportunity:** What useful condition can this support create now?
**Focal surface:** Which artifact, behavior, decision, or question receives attention?
**Requested result:** What should be materially different or newly legible at return?
**Route:** Solution | Implementation | Recovery
**Action mode:** observation_only | repair_authorized | implementation_authorized | recovery_authorized
**Granted actions:** Which specific reads, tools, edits, commands, or handoff actions are available?
**Held boundaries:** Which adjacent states stay intact, and where should an out-of-scope finding go?
**Expected observation:** What evidence or receiving state should the collaborator return?
**Recovery and return:** How does the work regain a legible state and hand attention back?
**Stop condition:** Which observable event completes this packet?
```

## Rules

### Rule: One route owns the current return

- **Solution** shapes or compares a desired outcome until one bounded recommendation, decision surface, or open question is ready to return.
- **Implementation** creates the requested material change and a proportionate observation of its behavior.
- **Recovery** restores a legible working state, preserves remaining strain, and returns the undertaking to its named owner.

A packet selects the route that owns the current result. Evidence or a fresh cue can form a successor packet for another route; the transition remains visible rather than implicit. When evidence disproves a premise that the requested result depends on, a `repair_authorized` or `implementation_authorized` packet returns to Solution before further mutation. A fresh packet carries the revised result and grant.

### Rule: Action mode precedes tool use

| Action mode | Available contribution | Boundary and replacement route |
| --- | --- | --- |
| `observation_only` | Read, inspect, compare, and return the expected observation. | Repository and external state remain as found. A repair opportunity returns as a bounded recommendation or proposed `repair_authorized` packet. |
| `repair_authorized` | Correct the named defect through the granted repair actions, observe the result proportionately, and return the changed surface. | Adjacent state stays intact. A materially wider change returns to the owner for a fresh scope decision. |
| `implementation_authorized` | Create the named material result through the granted implementation and delivery actions. | The packet's focal surface and receiving result bound the implementation. A broader product or system decision returns for renewed solution routing. |
| `recovery_authorized` | Exercise the named recovery action, observe the regained state, and return remaining strain. | The known-good coordinate and recovery target lead. Follow-on repair or implementation receives its own packet. |

Granted actions name concrete operations. A route label, issue label, skill name, model name, or workflow state provides orientation while the grant retains its stated size.

### Rule: A formed stop condition suspends the remaining grant

The packet evaluates its stop conditions before each granted action that would change repository or external state. Once a stop condition is observed, every unconsumed granted action pauses, including actions listed later in the same sequence; the evidence handback required by the stop condition remains active. When a grant and stop condition appear to conflict, the stop condition governs the current packet and the named owner can form a successor packet.

### Rule: Held boundaries preserve a useful continuation

Each consequential boundary names the state to preserve and the path available for the adjacent need. Privacy, safety, destructive action, publication, and external coordination boundaries remain explicit because they carry material meaning.

### Rule: The expected observation closes the evidence loop

The packet states what the chosen check can establish. An unobserved claim remains open and returns with the smallest fitting next observation rather than borrowing confidence from route completion.

### Rule: Public handbacks are safe and proportionate

A durable public or public-possible handback carries only the result that changes the receiver's next decision: a public reference when needed, the repository-defined check or sanitized command shape, normalized outcome or bounded failure class, what the observation establishes, its coverage boundary, and the next move when one exists. A one-sentence return is complete when it answers the receiving question.

Raw output, logs, traces, HAR files, screenshots, DOM or storage state, source bundles, inline environment or header values, cookies or authentication material, signed or query-bearing URLs, private routes or network coordinates, browser profiles, and user-specific paths remain local or with an existing access-controlled owner. The public return names the bounded condition and controlled follow-up owner without reproducing the sensitive material.

One receiving surface is enough. An existing public-safe pull-request body, workflow summary, task response, or Issue comment can satisfy the handback; link it instead of producing a parallel receipt. Remaining strain forms a successor packet only when it creates a materially new decision, authority need, or receiving job.

Use optional `Public return` or `Sensitive evidence receiver` packet labels only when they change behavior. They remain part of the prompt palette rather than required fields.

### Rule: Recovery and named return are part of the result

The receiver keeps a known-good point, records any remaining strain, and hands attention back when the stop condition arrives. The packet's named handback surface receives a concise pass, friction, or blocker result even when a branch, diff, or pull request preserves useful work. Support closes at that handback, and standing ownership stays with its named steward.

## Operating sequence

1. **Frame the opportunity:** Name the useful condition this finite contribution can create.
2. **Focalize the surface:** Identify the exact artifact, behavior, decision, or question and the adjacent state that stays intact.
3. **Set expectation:** State the requested result, current route, and expected observation.
4. **Bind action:** Select the narrowest action mode that carries the requested contribution, then enumerate the actions actually granted.
5. **Prepare return:** Name the known-good point, recovery route, handback owner, handback surface, and stop condition.
6. **Carry the route:** Evaluate the stop condition before each state-changing action, work only through the selected mode, and pause the remaining grant when the stop event forms.
7. **Complete the handback:** Return the smallest public-safe, decision-changing result to one named surface as a pass, friction, or blocker. Link an existing sufficient result, and identify a fresh packet only when a materially new decision or authority need remains.

## Representative scenario

### Scenario: Observation reveals a repair opportunity

- Given an `observation_only` packet asks for a focused repository finding
- And the inspection reveals a small repair that would improve the requested outcome
- When the expected observation is complete
- Then the collaborator returns the finding and smallest repair route
- And the repository remains at its known-good point
- And implementation begins through a fresh `repair_authorized` packet when the owner grants that action

### Scenario: Authorized repair reaches its stop condition before mutation

- Given a `repair_authorized` packet grants inspection, editing, and delivery actions
- And a pre-action observation is also named as a stop condition
- When the observation forms before editing begins
- Then the remaining grant pauses
- And the named handback surface receives the evidence and a renewed Solution route
- And mutation begins only through a fresh packet whose requested result fits the observed ground

## Conditional context

The skill loads [references/github-issue-label-routing.md](references/github-issue-label-routing.md) when a GitHub Issue is the support packet or named handback surface. That reference supplies a small, composable label projection for packet type, receiving surface, and return state while the named Issue surface and posted receipt retain the operative contract and evidence.

The skill loads [references/openai-codex-spark.md](references/openai-codex-spark.md) when OpenAI Codex Spark is selected or considered as the receiving collaborator. That reference carries current platform details and refreshes against official OpenAI documentation when model identity, availability, surfaces, or recommended use changes.

## Completion

Bounded support completes when one sufficient public-safe pass, friction, or blocker handback is available from the named surface; the requested result has formed or a materially new need has moved into a fresh packet; held boundaries remain legible; and recovery leaves a usable state. A changed platform, crossed action boundary, or materially different receiving use can reopen the contract through collaboration accounting; otherwise the skill rests and direct reasoning remains available.
