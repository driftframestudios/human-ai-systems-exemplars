# Native Investment Studio

Explore how people, shared work, review and investment fit together in the
[About showcase](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination).
The visitor-facing **Project Resourcing & Spend Studio** combines a populated
plan with cassette shelves, period boards, session tracks, reels and tactile
quantity controls. Semantic HTML, CSS and vanilla JavaScript carry the experience.

## Current state

`main` retains the approved showcase. `dev` receives the compact rack integration,
with creation and recovery established in #831/#833 and local navigation in
[#832](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/832).
A human cue selects promotion to main. The preserved
[chapter workbench](../../planning/context-canvas/studio-rack-tape-study.html)
remains in `planning/` as the art and interaction reference; its independent
illustrative state is separate from the Showcase's canonical plan.

Coordination's Plans shelf attaches to its sprint/quarter board and sequencer.
Its desktop scroll area accommodates up to 80rem of cassettes; mobile keeps a
compact horizontal strip.
A cassette loads a plan with detail closed. Existing clips open local editing;
a plus in that plan's track adds another session while retaining earlier placements.
Period-lane creation and the New plan row create separate records and keep All
plans visible. New records use unique names such as **New session 1** and stay
closed until selected. Week/month creation areas fill each track cell; pointer
hover and keyboard focus reveal the plus, while touch keeps it visible. A shared
`rack-creation-controls.mjs` factory owns these native targets across period,
participation and contribution racks; each controller retains its creation meaning. The
selected period and Plan overview return remain visible.
Team planning follows with its arrangement reel and delivery board. Each lane
can add a team or handoff in place through two full-width ghost actions at its
bottom. Both labels remain visible for pointer, keyboard and touch visitors. Team name, membership and order update directly
with a Saved indicator. Shared sessions has its own **People / Handoffs** switch:
checkbox pads assign participants or link work, and a row key opens compact host
and ordering controls. Handoff editing stays inside the selected working area: a
short name and routing choices sit beside supporting-session pads. Add handoff
creates a visible Delivery card and Shared sessions column with a useful default
response. Creating its missing team retains the handoff entries and selects the
new team. Existing response text remains in the model and exports.

People combines its roster, local person/team editors, role facets and
contribution/session matrix. Add creates a useful record immediately; its name,
rate and funded time can be edited in place. Abilities retains both support tables
and opens one compact selected module. Add people, teams or sessions directly to
that module's support selection, then Apply to accept the relationship. The preserved
workbench duration geometry now serves the Showcase: 64px fixed-light dials,
peach Hours, paper Minutes, a shared readout and circular steps. Session pads own
repetition inside a neighboring dark module, with Add at the top right and Remove
at the bottom right. Duration fills its slot; Funding and Status use named,
large radio pads with short hints beside Participants at wider widths.
Local headers identify the owning rack and current item, with an owner return
and Close. Prepared forms offer Apply beside Close and at the bottom, sharing
validation and the accepted-state owner. Direct edits show Saved.

Investment has three VHS-C navigation decks: **Plan investment**, **Compare a
change** and **Keep a plan**. They reveal the existing pricing, baseline and
saved-plan owners. Deeper independently editable financial decks remain with
[#818](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/818).

## Try the experience

1. Load a cassette, then open a sprint or quarter. **All plans** removes the plan
   filter; **Plan overview** returns from the selected period.
2. Select a session clip to adjust its duration, people or placement. Apply accepts
   the proposal; Cancel restores accepted values. Close retains unfinished work.
3. Use a track's plus to add a session to that plan. A period-lane creation target
   or the New plan row adds separate work; shelf New plan also loads that cassette.
   These additions accept directly with editing closed; the stable amp **Undo**
   recovers them. The small **Edit** beside a period caption opens its local field;
   Save label updates that caption while keeping the Sprint/Quarter heading.
   A refused save keeps your text for retry. The live example includes a paused
   follow-up.
4. Turn the Team arrangement reel, then choose a team. Change membership through
   its pads and return through **Delivery overview**. In Shared sessions, choose
   **People** to assign participants or **Handoffs** to link the work. The last
   participant stays selected until another person is included.
5. Add or select a person/team in People, or choose an Abilities support cell.
   Local controls retain your place. Close keeps unfinished entries; amp Undo
   recovers an accepted addition.
6. Turn a Change or Quality reel, or compare a baseline in Investment. Each
   reading uses the same accepted people and work.

The authored people use work-based names such as Researcher and Quality reviewer.
Known people may participate across teams. Removing a session clears its supporting
links and dependent timing relationships; amp Undo restores the whole change.
Rates and example arrangements help a visitor explore relationships; people doing real work retain authority over
commitments and findings.

## Recognize the controls

| Operation | Visual cue and behavior |
| --- | --- |
| Load a plan or investment grouping | Preserved cassette/deck face with a selected outline |
| Inspect existing work | Named pad or track key; selected/open state follows the live receiver |
| Add another session to a plan | Plus target in its track cell; keeps earlier placements and the current scope |
| Create separate work in a period | Lane creation or New plan row; the board keeps all records visible |
| Add a different scope | Explicit New plan or Add sprint/quarter |
| Add a person, team or supporting session | Unique named record in the current rack, closed until selected; later field/link changes use their existing Apply boundary |
| Change membership or order | Checkbox pads and compact movement controls |
| Accept a proposal | Raised Apply beside Close delegates to the canonical bottom action, sharing validation and focus behavior |
| Cancel or close | Quiet ghost action; Cancel discards, Close retains unfinished work |
| Remove a named object | Muted rose control; session removal clears its links in one recoverable edit |
| Undo accepted changes | Stable native amp control; cassette shelves retain their selection role |

The [control research](rack-control-research.md) explains this hierarchy and its
transfer limits. The [Studio Rack contracts](../../visual-fidelity-contracts/studio-rack/README.md)
preserve the artwork and interaction grammar. Ordinary mobile layouts use local
scrolling for two-dimensional tables and shelves. System reduced-motion and the
visitor's motion choice retain operability without the animated treatment.

The horizon creates a handoff between available work records, with its details
closed. Select that relationship to change its endpoints, team connection,
decisions or delays. Existing handoffs keep their bottom-right Remove action.

## Run a local preview

Serve the repository root with a static HTTP server, then open the About route.
For example:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

If working with an already running repository preview, open the About route above.
The separate [full calculator](../initiative-costing-calculator/index.html)
remains a useful comparison prototype. The [Context Canvas README](../../context-canvas-project-surface/context-canvas/README.md)
owns page delivery and preview details.

## Verify the changed behavior

Use the repository-declared Node runtime. The source bundle checks model and
controller contracts, including accepted state, drafts, identity and recovery:

```sh
npm run test:native-investment-studio:source
npm run check:node-routes
npm run check:readme-routes
```

Choose the affected browser journey, for example:

```sh
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:score-browser
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:team-browser
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:capability-browser
```

Browser fixtures need local HTTP binding and the installed Playwright engines.
Their shared [lifecycle owner](../../tests/native-investment-studio/browser-fixture-lifecycle.mjs)
joins pending setup before releasing browsers and the server, including when a
name filter selects zero cases. Each suite awaits `own(...)` for resource
acquisition; case-specific contexts and telemetry stay with the case. The source
bundle includes controlled failure and bounded child-runner cleanup checks.
Use ordinary phone and desktop views for a changed composition; select WebKit or
Firefox when input or layout behavior warrants it. The receiving PR records the
actual checks and their scope. Performance refinement stays with
[#679](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/679).

## Find the source owner

| Concern | Start here |
| --- | --- |
| Accepted plan and history | [state.mjs](state.mjs), [commands.mjs](commands.mjs) |
| Draft coordination and recovery | [editing.mjs](editing.mjs), [implementation reference](implementation-reference.md) |
| Local owner/current headers and live form receivers | [controller.mjs](controller.mjs), [rack-controls.mjs](rack-controls.mjs) |
| Period board, cassette scope and sequencer | [cadence-view.mjs](cadence-view.mjs), [score-controller.mjs](score-controller.mjs) |
| Team arrangement and direct team editing | [connection-template-controller.mjs](connection-template-controller.mjs), [delivery-board.mjs](delivery-board.mjs) |
| Shared participation and support links | [shared-session-rack.mjs](shared-session-rack.mjs) |
| Session fields and repetition pads | [work-controller.mjs](work-controller.mjs), [session-occurrence-controls.mjs](session-occurrence-controls.mjs) |
| Duration module and dial interaction | [time-controls.mjs](time-controls.mjs), [duration contract](../../visual-fidelity-contracts/studio-rack/loaded-tape-duration-panel.md) |
| Cassette and Investment deck presentation | [tape-picker.mjs](tape-picker.mjs), [tape styles](../../context-canvas-project-surface/context-canvas/styles/routes/studio-tapes.css) |
| People, contributions and abilities | [team-controller.mjs](team-controller.mjs), [responsibility-controller.mjs](responsibility-controller.mjs), [capability-controller.mjs](capability-controller.mjs) |
| Shared direct record creation and names | [rack-record-creation.mjs](rack-record-creation.mjs), [creation-label.mjs](creation-label.mjs), [assembly-controller.mjs](assembly-controller.mjs) |
| Current rationale and supersessions | [experience journal](experience-journal.md) |

The visual contracts map further chapter-specific source and CSS owners. Follow
[milestone 23](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/23)
for current work. Participant time shares (#798), independent response records
(#816), deeper Investment decks (#818), production Reset (#808) and the human-cued
public release (#686) retain their separate receiving decisions.
