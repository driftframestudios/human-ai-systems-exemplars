# Support Matrix & Stateful Pads

Make the work behind a plan visible through comparable rows, useful empty cells
and pads that open the corresponding detail. A visitor can distinguish assigned
people, linked sessions, planned support and recorded observations before deciding
what to inspect. The Abilities tables and Quality session tracks are current
examples within the [Studio](../../context-canvas-project-surface/context-canvas/index.html#native-studio-work).

**Standing:** review candidate `0.1.0`; ID `vfc:support-matrix-stateful-pads`;
reviewed 7 November 2026. Palette and shared controls inherit
[Studio Rack Composition](README.md).

## Fit and smallest useful dose

Use a matrix when the same questions apply to several abilities, practices or
sessions. Use a pad rail when the main task is selecting one record or toggling
independent options. One named row, meaningful column headings and one adjacent
inspector form a useful starting point. A kanban lane groups work by a named
period, team, phase or attention area; its position retains that meaning when
pads move.

## Distinguish the states

| Meaning | Control and visual reading |
| --- | --- |
| Selected for inspection | Pressed choice or expanded receiver, with a visible selected target |
| Included in a proposal | Native checkbox or toggle button with `aria-pressed`, accompanied by written or accessible inclusion state |
| Included in the accepted plan | Accepted projection supplied by the plan owner |
| Supporting work linked | Named session or meaningful pad whose accessible name identifies it |
| Support still to choose | Useful empty-state wording and an actionable route |
| Requirement outside a card's definition | Explicit Not specified reading rather than an invented gap |
| Recorded observation | Its reviewer, context and revision, distinct from an authored example |

The pad's operation determines its semantics. Selection and inclusion may each
use a toggle button with `aria-pressed`; the label and surrounding context
identify which operation it performs. Existing independent-membership controls
also use native checkboxes. A disclosure uses `aria-expanded`, and a pad that
navigates carries a destination cue. Color and depth support the state already
expressed by the semantic control and its written state. Decorative meter
segments never create an additional readiness claim.

The current Abilities chapter retains both full support tables. Their
responsibility, preparation, review and observation columns support comparison;
one editing rack follows the selected table. Change and Quality can use denser
track pads because their neighboring work lanes supply the selected component's
context. These are permitted variants of the same operation, not interchangeable
labels for different evidence states.

## Reading, motion and recovery

Native tables retain captions and scoped row/column headers. Every meaningful
cell remains readable with its row and column. Two-dimensional inspection uses
a named local scroll region at phone widths. Long labels wrap; headers retain
contrast against their actual background. Ordinary text, border and shape keep
selected and available states legible in alternate color presentations.

Reels and faders may rearrange keyed pads to illustrate an authored configuration.
The movement follows stable identity and honors the shared motion preference.
The written result appears independently of the effect. Inspection retains the
owning draft, and shared sessions retain one cost account even when several pads
refer to them. Apply, Cancel and Undo keep their existing acceptance boundaries.

## Source and evidence

| Owner or observation | Responsibility |
| --- | --- |
| [Capability controller](../../collaboration/native-investment-studio/capability-controller.mjs) and [capabilities](../../collaboration/native-investment-studio/capabilities.mjs) | Table meaning, selected card and adjacent retained editor |
| [Change controller](../../collaboration/native-investment-studio/change-controller.mjs) and [Assurance controller](../../collaboration/native-investment-studio/assurance-controller.mjs) | Component support, quality inclusion and their existing draft owners |
| [Arrangement surfaces](../../collaboration/native-investment-studio/arrangement-surfaces.mjs) | Native people/session relationship table |
| [Abilities CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Scoped table, rail, pad and adjacent-rack variants |
| [Capability browser checks](../../tests/native-investment-studio/capability.browser.mjs) | Support states, retained selected drafts, shared work and readable table controls |
| [Change](../../tests/native-investment-studio/change.browser.mjs) and [Assurance browser checks](../../tests/native-investment-studio/assurance.browser.mjs) | Component selection, linked work, pressure-driven pad movement and recovery |

The [recorded instrument research](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
adapts the pad/device distinction in the [Push manual](https://www.ableton.com/en/push/manual/).
That precedent supports separating selection from parameter editing. Native
table meaning and the Studio's source model establish the actual relationships.
Focused browser observations establish the exercised controls; the visitor's
interpretation remains a human walkthrough question.

## Re-entry and future scope

Revisit when a cell changes meaning, a pad changes operation, a source record
gains a new state, or an inspector moves. Further migration into rack panels waits
for the receiving scope decision. Preserve the preferred Quality track treatment
as a reference while adapting each control to its actual operation.
