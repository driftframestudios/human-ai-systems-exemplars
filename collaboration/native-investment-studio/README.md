# Native Investment Studio

Plan who will work together, what they will do, who reviews the result, and
what the work costs. The native Studio lives in the
[About experience](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination).
Its amp-style controls, people and team editors, and connection diagram share
one accepted plan. Visitors can try a change, Apply or Cancel it, and return
through Undo, saved edits, or a baseline comparison.

## Current state

**Paused for a collaboration-mode change on 5 November 2026.** The current
feature is a work-in-progress checkpoint. Resume from the
[pause entry](experience-journal.md#2026-11-05--pause-and-next-iteration-direction)
before extending it; two verification findings and the latest visual refinements
remain open. Source and release integration await their receiving reviews.

Purpose, people, teams, working sessions, roles, human review, connections,
arrangement previews, and plan exchange have native owners. The complete
showcase is still developing. The current
[usability repair, #685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685)
brings clearer controls, stable choices, prerequisite creation, useful collapsed
previews, and ASCII zine styling to those working chapters. Its receiving PR owns
verification and integration status; publication retains its separate review.

The [experience journal](experience-journal.md) preserves design intent and
implementation continuity. The [task audit](usability-research.md#task-focused-audit-and-receiving-work)
separates implemented capabilities, the current repair, and remaining work.
The [full original Studio](../initiative-costing-calculator/index.html) retains
its broader planning capabilities while the native experience grows.

## Try a useful sequence

1. Open Purpose and describe the change you want to make.
2. In People, add people, set rates and funded time, and create a team.
3. In Coordination, plan a session or a team connection. A nearby creation
   action can help supply a missing prerequisite and return to the task.
4. Inspect the proposed investment, Apply the change, then use Investment to
   compare a baseline, Undo, or download the accepted plan.

A field edit stays in its editor until Apply. Collapsing a section and switching
chapters can retain unfinished work. A saved edit may need review after another
change updates the accepted plan. The amp amount describes accepted investment;
a form preview describes that form's proposal.

## Run a local preview

Use the Node version declared in [`.node-version`](../../.node-version), and
install the locked dependencies with `npm ci` from the repository root. Start
the existing local server there:

```sh
node --input-type=module <<'JS'
import { startStaticServer } from './tools/core-architecture-browser-helper.mjs';
const server = await startStaticServer();
console.log(`${server.origin}/context-canvas-project-surface/context-canvas/index.html#native-studio-coordination`);
JS
```

Open the printed address and stop the server with Ctrl-C when finished. The
page owns its ordinary vertical scrolling; connection diagrams can scroll
locally. Separately hosted media and embedded experiences retain their own
availability and owners.

## Check the behavior being changed

Run source checks and the browser route for the affected task. For example:

```sh
npm run test:native-investment-studio:source
npm run test:native-investment-studio:session-browser
npm run test:native-investment-studio:assembly-browser
```

Browser routes require the repository's locked Playwright browsers. The
[focused regression reference](implementation-reference.md#focused-regression-route)
and [owned suite catalog](../../tests/suites/README.md) give the other routes
and prerequisites. Source checks establish model and ownership behavior;
focused browser observations establish the exercised control, focus, and layout
states. Screenshots remain in ignored `.visual-runs/` for local comparison.

## Resume the work

Read the latest [journal entry](experience-journal.md), then reconcile it with
source, the worktree, and [#685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685).
Use the journal alongside Issues: it preserves why an interaction feels and
behaves as it does; Issues own current outcomes and acceptance.

The current repair sits within
[#647's amp composition](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647)
and [#637's showcase route](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/637).
Quality, recovery, learning, and professional play continue through
[#652](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/652);
coordination score, capacity, and decision gates through
[#653](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/653).
[#679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679)
receives later relationship-rendering refinements after showcase completion.

## Source owners and deeper reading

| To change or understand | Begin here |
| --- | --- |
| Visitor composition and styling | [About HTML](../../context-canvas-project-surface/context-canvas/index.html), [route CSS](../../context-canvas-project-surface/context-canvas/styles/routes/about.css), and [ASCII Zine Field](../../visual-fidelity-contracts/ascii-zine-field.md) |
| Accepted state, pricing, history, and exchange | [Implementation reference](implementation-reference.md#portable-state) |
| Editor drafts, saved work, and return routes | [`editing.mjs`](editing.mjs), [`controller.mjs`](controller.mjs), and [shared editing contract](implementation-reference.md#shared-editing-and-saved-drafts) |
| A particular chapter or control | [Source map](implementation-reference.md#source-map) and [task audit](usability-research.md#task-focused-audit-and-receiving-work) |
| Design decisions and receiving evidence | [Experience journal](experience-journal.md) and [bounded research](usability-research.md) |

Return to the [Context Canvas README](../../context-canvas-project-surface/context-canvas/README.md)
for the surrounding visitor pages, or the [collaboration directory](../) for
adjacent exemplars.
