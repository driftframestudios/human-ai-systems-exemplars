# Component and Data-View Practitioner Probes

Use these probes to turn visual review into an inspection of ownership, state, authority, recovery, and meaning. Start with the person and decision the interface serves, then follow the state through the component tree, asynchronous work, rendered view, semantic twin, and release path.

The companion labs provide small systems that can answer each question with code, fixtures, and tests:

- [Component Lab](../../labs/component-lab/) — panels, drawers, validation, commerce intent, receipts, and focus.
- [Data-View Lab](../../labs/data-view-lab/) — shape, standing, lineage, renderer choice, SVG, tables, and scale.

## Quick routing

| When the team is deciding… | Begin with… | Observable result |
| --- | --- | --- |
| What the component owns | Ownership and replacement | One named owner, one release path, retained accepted state |
| Whether a candidate may become visible | Admission and atomicity | Complete candidate validation before one commit |
| How asynchronous work remains eligible | Identity and time | Request or intent identity at launch and settlement |
| Which visualization fits | Decision shape and scale | A deterministic renderer rule with bounded thresholds |
| How a value should be interpreted | Data standing and lineage | Units, scope, denominator, revision, and standing travel together |
| Whether two representations agree | Semantic twins | Table, SVG, prose, and export derive from one accepted record set |
| How a person recovers | Failure and recovery | Prior useful state, specific message, and a bounded next action |
| How interaction works across input modes | Browser semantics | Native focus, labels, live status, local overflow, and keyboard reachability |

## 1. Working frame

1. Who is making the next decision?
2. What state must remain visible while another state changes?
3. Which authority can accept the result?
4. Which source owns identity, revision, lineage, units, and denominator?
5. What changes the frame: a new revision, a new authority result, a new decision need, or a new scale threshold?

Record the answers before choosing a component or chart form. This gives visual fidelity a concrete operating target.

## 2. State ownership and replacement

1. Which owner creates each listener, timer, request, object URL, observer, dialog, or focus return point?
2. Which lifecycle event releases each resource?
3. Does controller replacement preserve the accepted model and active draft?
4. Does release remain safe when invoked more than once?
5. Can a prior controller settle work after a replacement, or must the result present matching ownership identity?

### Exercise

Replace the component-lab controller while a valid draft exists. Confirm that the draft and accepted fixture remain, the first controller releases its request and timer, and the replacement owns subsequent work.

## 3. Candidate admission and atomic acceptance

1. Which fields form the closed candidate contract?
2. Does validation inspect identity, lineage, state vocabulary, record uniqueness, and numeric meaning before commit?
3. Does a rejected candidate leave the exact prior accepted state object in place?
4. Does one commit update the human-readable view and machine-readable twin together?
5. Does every export detach from caller-owned and application-owned objects?

### Exercise

Load each valid fixture, then load the intentionally invalid fixture. Compare object identity, revision, selection, draft, and visible status before and after the rejected candidate.

## 4. Asynchronous eligibility

1. Which identifier is captured when the request or intent begins?
2. Which active state makes the result eligible to settle?
3. How does a superseding request retire the earlier result?
4. Which useful state remains visible during pending and failed work?
5. Does cancellation release transport work while identity checks protect against work that still settles?

### Exercise

Start request A, start request B, then settle A. Confirm that the accepted model keeps its prior revision. Settle B and confirm one atomic revision change.

## 5. Panels, drawers, validation, and commerce

1. Does the primary panel reveal the current task before secondary controls?
2. Does a drawer retain its relationship to the invoking control?
3. Does a modal use native dialog behavior, establish initial focus, and return focus when closed?
4. Do stable issue identifiers connect each validation message to its control?
5. Are local validation, authorization, payment standing, order acceptance, and receipt standing independently visible?
6. Does an optimistic intent carry provisional language until the authority result arrives?
7. Does a rejected authority result preserve the draft and provide a specific recovery action?

## 6. Data shape, standing, and lineage

1. What is the record identity and stable order?
2. What do the value, unit, scope, and denominator mean together?
3. Which standing applies: known, unknown, absent, stale, estimated, or redacted?
4. Which revision and source lineage support the value?
5. Does an observed zero remain distinct from an unavailable value?
6. Does partial data state which portions are current and which portions await further source material?

## 7. Renderer selection and scale

1. Is the decision need a single status, exact lookup, comparison, change over time, relationship, or spatial question?
2. At which record count does the current renderer stop supporting inspection?
3. Which threshold selects a compact chart, a scrollable SVG, or a paginated table?
4. Does the table remain the exact-value authority across graphical forms?
5. Do ordering and pagination remain deterministic for the same accepted fixture?
6. Does dense output use a local two-dimensional scroller so the page keeps its own reading flow?

## 8. SVG and graphical semantics

1. Does each SVG instance own a unique identifier namespace?
2. Do every `url(#…)`, marker, mask, clip path, and label reference resolve inside that instance?
3. Does painter order place connectors behind nodes and selection outlines above marks?
4. Does the `viewBox` describe the actual coordinate system?
5. Does transform order match the intended geometry?
6. Does every visual mark have a corresponding exact-value row or compact textual description?
7. Does selected detail remain bounded instead of creating a per-mark tab sequence for dense plots?

## 9. Failure and recovery

1. Which failure class occurred: transport, admission, authorization, validation, authority reconciliation, or rendering?
2. What useful accepted state can remain visible?
3. Which message names the affected operation and current state?
4. Which action can the person take next?
5. Does recovery preserve identity, selection, focus, and draft where those values still apply?
6. Does the test prove the behavior, state transition, and corresponding message through observable results?

## 10. Browser and assistive-technology semantics

1. Do controls have explicit names, relationships, and state?
2. Does the live region announce one concise state transition?
3. Can a keyboard user open, use, and close the dialog while focus returns to the invoker?
4. Does the reading representation carry the core meaning when JavaScript is unavailable?
5. Does narrow layout retain labels, value standing, and usable local overflow?
6. Do motion and transition details respect reduced-motion preferences?

## Evidence ladder

Use the smallest proof that can settle the current question, then add browser evidence when layout, focus, or platform behavior makes it necessary.

| Level | Evidence | Appropriate use |
| --- | --- | --- |
| 1 | Source inspection | Names, declared state vocabulary, ownership comments |
| 2 | Fixture and schema checks | Shape, closed fields, valid and rejected examples |
| 3 | Unit transitions | Atomic acceptance, stale-result handling, detached exports |
| 4 | DOM contract checks | Labels, live regions, native dialog, semantic twin presence |
| 5 | Browser behavior | Focus return, narrow overflow, computed style, JavaScript-disabled reading |
| 6 | Cross-browser comparison | Engine-specific layout, dialog, SVG, and accessibility behavior |

## Assessment record

Use the machine-readable [probe catalog](./probe-catalog.v1.json) to route an assessment. Its [closed schema](./probe-catalog.schema.json) requires source and test routes for every probe. For each selected probe, record:

- the working frame;
- the accepted-state owner;
- the observed result;
- the artifact or test that supports the result;
- the next bounded change;
- the condition that would change the conclusion.

An assessment is strongest when another practitioner can reproduce the state transition and reach the same result from the supplied fixture.

## Claim boundary

Synthetic fixtures and focused tests establish the behavior they exercise. Receiving environments supply production performance, reliability, security, accessibility-conformance, and domain-validity evidence. Record those environment-specific results alongside the probe instead of extending a local result beyond its tested frame.
