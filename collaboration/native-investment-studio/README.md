# Native Investment Studio

Plan who will work together, what they will do, who reviews the result, and
what the work costs. The native Studio lives in the
[About experience](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination).
Its amp-style controls, people and team editors, and connection diagram share
one accepted plan. Visitors can try a change, Apply or Cancel it, and return
through Undo, saved edits, or a baseline comparison.

## Current state

**The native showcase is growing from accepted source.** The relationship
foundation and usability repair are integrated through
[#675](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/675)
and [#687](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/687)
after independent engineering review. The current implementation adds an
authored service-request pilot, a working minutes knob, and a contextual session
editor through #649 and #647.

Purpose, people, teams, working sessions, roles, human review, connections,
arrangement previews, and plan exchange have native owners. The complete
showcase is still developing. The accepted
[usability repair, #685](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/685)
brings clearer controls, stable choices, prerequisite creation, useful collapsed
previews, and ASCII zine styling to those working chapters. Its receiving PR owns
the verification return. The session continues through the complete showcase;
performance refinement follows that experience.

The [next-release handoff, #686](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/686)
tracks the ASCII composition method's public Pages projection and the visual
family's production guide, full source, and working specimen. A full tagged
Pages release is a future step triggered by the human.

The [experience journal](experience-journal.md) preserves design intent and
implementation continuity. The [task audit](usability-research.md#task-focused-audit-and-receiving-work)
separates implemented capabilities, the current repair, and remaining work.
The [full original Studio](../initiative-costing-calculator/index.html) retains
its broader planning capabilities while the native experience grows.

## Try a useful sequence

1. Read the service-request pilot brief and save a baseline.
2. Choose **Adjust review time**, then try 45 minutes with the dial, arrow keys,
   step buttons, or precision field. Inspect the draft before Apply.
3. Try the review request. Inspect the readiness connection, pause it while the
   instructions are clarified, and name the response the team needs.
4. Use Investment to compare the baseline, Undo, or download the accepted plan.

The starter uses fictional people and illustrative rates. It begins at $3,980;
four 45-minute decision reviews instead of 30-minute reviews add $370. Pausing
a connection keeps its supporting work and cost. In People, change the roles,
rates, and funded time to explore another plan. Nearby creation actions can
supply a missing person or team and return to your unfinished task.

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
source, the worktree, [#649](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/649),
and [#647](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/647).
Use the journal alongside Issues: it preserves why an interaction feels and
behaves as it does; Issues own current outcomes and acceptance.

The current showcase work sits within
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
