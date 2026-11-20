# Develop and verify the Native Investment Studio

Start with the [local preview and first edit](../README.md#run-the-studio-locally).
Use the map below to follow that edit into the code or to find the owner of
another chapter. Paths point to the existing flat module tree.

## Trace a session edit

1. The [About page](../../../context-canvas-project-surface/context-canvas/index.html)
   provides the Studio markup and loads [controller.mjs](../controller.mjs).
   The [Context Canvas README](../../../context-canvas-project-surface/context-canvas/README.md)
   explains the page's styles and module delivery.
2. [The cadence view](../cadence-view.mjs) renders the board. The
   [score controller](../score-controller.mjs) selects the session, and the
   [work controller](../work-controller.mjs) connects its settings to the
   [shared editing coordinator](../editing.mjs).
3. Apply submits the proposal to the [accepted state owner](../state.mjs).
   [Commands](../commands.mjs) define finite updates, and
   [contract.mjs](../contract.mjs) owns plan preparation and admission. The
   accepted plan supplies the board, investment readings and Undo history.

Read the [implementation reference](../implementation-reference.md) for exact
state shapes, source ownership and recovery rules. The
[experience journal](../experience-journal.md) records the rationale for those
choices. [The Studio milestone](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/23)
tracks current work.

## Find the code for your change

| Change | Open these owners |
| --- | --- |
| Sprint or quarter layout, session identity, repeated work | [Cadence view](../cadence-view.mjs), [score controller](../score-controller.mjs), [occurrence index](../cadence-occurrences.mjs), [session defaults and overrides](../work-sessions.mjs) |
| Team membership, capacity and human responsibility | [Assembly controller](../assembly-controller.mjs), [team controller](../team-controller.mjs), [capacity readings](../people-capacity.mjs), [responsibility controller](../responsibility-controller.mjs) |
| Ability, change and quality proposals | [Ability controller](../capability-controller.mjs), [change controller](../change-controller.mjs), [quality and recovery controller](../assurance-controller.mjs) |
| Financial decks, baseline, plan files and reports | [Investment controller](../investment-controller.mjs), [investment projection](../investment-projection.mjs), [plan exchange](../exchange.mjs), [reports](../reports.mjs) |
| Example arrangements and presentation patterns | [Showcase presets](../presets.mjs), [AI starter plans](../ai-starter-plans.mjs), [Studio Rack contracts](../../../visual-fidelity-contracts/studio-rack/README.md) |

## Verify the behavior you changed

Use the repository's [pinned Node version](../../../.node-version) and run
commands from the repository root. Use `npm ci` to install the locked
development dependencies. Install Chromium once with `npm run playwright:install`
for the browser checks.

| I changed… | Run | What it checks |
| --- | --- | --- |
| README links and images | `npm run check:readme-routes` | Repository README paths and supported heading anchors |
| Plan state, edits or recovery | `npm run test:native-investment-studio:source` | Plan admission, command effects, identity, drafts and recovery |
| Periods, plans or sessions | `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:score-browser` | Board navigation, attached editors, scoped plans and accepted edits |
| People, teams or roles | `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:team-browser` | Person editing, capacity and People layout |
| Assembly or contribution responsibilities | `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:assembly-browser` or `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:responsibility-browser` | Team membership and ordering, role choices, contribution links and editor recovery |
| Ability proposals | `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:capability-browser` | Supporting choices, retained proposals and accepted recovery |
| Investment and plan exchange | `NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:investment-browser` | Independent decks, accepted readings, file round trips and Undo |

The [package scripts](../../../package.json) list the other chapter commands.
The [test guide](../../../tests/README.md#native-investment-studio-foundation)
shows how to select smaller source checks. Local browser tests exercise the
source checkout. The [module-delivery contract](../implementation-reference.md#module-delivery)
identifies the separate checks for changes to the published module graph.

[Return to the Studio README](../README.md)
