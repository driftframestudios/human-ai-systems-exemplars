# Native Investment Studio

Explore how people, shared work, review and investment fit together in the
[About showcase](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination).
The visitor-facing **Project Resourcing & Spend Studio** combines a populated
plan with cassette shelves, period boards, session tracks, reels and tactile
quantity controls. Semantic HTML, CSS and vanilla JavaScript carry the experience.

## Current state

`main` retains the approved showcase. `dev` receives the compact rack integration:
People team lanes and a direct session arranger (#864), Abilities support racks with local shared-name editing (#856),
compact Change and Quality receivers (#857/#858), and independent financial
comparison decks (#818). Shared creation, local navigation and accepted recovery
retain their existing owners.
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

People keeps teams, people and contributions together in compact racks. Teams
occupy one horizontal row of editorial lanes; a full-width team key identifies
each parent group and toggles its compact settings. Movement and Remove sit
together at the lane bottom. The people/session arranger places each person's
rate, funded and available time, teams and quality indicators beside their
participation pads. A checkbox changes session participation directly, with
amp Undo available. Record-local controls arrange and remove people.
A selected person opens compact name, rate and funded-time settings with an
**All people** return; Apply accepts those typed values. Coordination borrows
this same compact form.
Role mix remains visible with the current person's name, eight pads showing their
current values, and one native selector for the selected facet. Changing a role
value accepts it directly.

A contribution opens Work beside Receiver and decision, with those sections
stacked at phone widths. Category, human receiver, decision owner and supporting
session choices accept directly, as do People team membership and member order.
Receiver and decision owner remain independent choices. Empty slots add a useful
person, team or contribution immediately with editing closed; selecting the
record opens its local controls. The amp's Undo recovers each accepted change.
The live showcase enables two additional contributions through
`createShowcasePlan({ peopleExamples: true })`: Source retrieval and Draft
artifacts, alongside Cross-source synthesis. The default preset retains its
smaller fixture.

Abilities retains **What people can do** and **How the team works**, comparing
responsibility, preparation, review and observation. Selecting a cell opens one
dark rack with a readable item heading, local return, Apply and Close. Its People
view places team and participants beside decision owner and status. Supporting
work uses compact paired groups; observation material uses chocolate companions.
Native pads retain their written selected state and fit ordinary mobile widths.
Adding a person or team from that rack immediately reveals and selects the new
record, while retaining the current ability or practice proposal. This works
before typing as well as after editing; Apply accepts its assignment and amp
Undo retains the separate creation step.
Add people, teams or sessions in that module, then Apply to accept the support
relationship. Close retains unfinished work. In the People view, **Rename**
opens a small field beside a person or team. Save updates that shared name while
retaining the support proposal; Cancel leaves the name intact. Amp Undo recovers
an accepted rename.

Change and Quality retain their distinct reels, faders, tracks and pad artwork.
Their selected details use compact attached racks with an owner return, current
item, Apply and Close. Related local views retain their fields when switching.
Supporting-session controls share the preserved duration module and place the
remaining choices beside it where space permits. Change's Raise, Reduce,
Eliminate and Create rail identifies the action with an open receiver through
its paper-resting/signal-selected face. Quality keeps its reference display and
check pads as the visual entry point; selected settings and recovery controls
use the compact working area.

The preserved
workbench duration geometry now serves the Showcase: 64px fixed-light dials,
peach Hours, paper Minutes, a shared readout and circular steps. Session pads own
repetition inside a neighboring dark module, with Add at the top right and Remove
at the bottom right. Duration fills its slot; Funding and Status use named,
large radio pads with short hints beside Participants at wider widths.
Local headers identify the owning rack and current item, with an owner return
and Close. Prepared forms offer Apply beside Close and at the bottom, sharing
validation and the accepted-state owner. Direct edits show Saved.
Shared stepper geometry keeps monetary, duration and ordinary numeric buttons
circular within their route-specific skins. Quality's local labels and actions
pair readable ink with their dark or editorial field.

Investment loads five independent VHS-C decks: **Plan investment**, **Customer
rollout**, **Commercial cohort**, **Service operations** and **Capital choices**.
Choose a deck, turn its connected reels, or adjust money and assumptions to see
the comparison change. New decks keep independent settings, and the amp's Undo
recovers accepted edits and removals. The chunky shelf, internal grip texture,
fixed-light money dials and chocolate companion panels carry the preserved
workbench artwork into the live Studio.

Investment's reels use the same Showcase zoetrope control as Team planning,
Change and Quality: stationary option buttons, a rotating center, central Next
and a readable selected output. Their financial presets retain their connected
effects. The planning workbench's reel illustration remains a reference; the
live chapter uses the shared Showcase presentation and motion preferences.

Plan investment reads accepted people, work and funding. Its explicit funding
controls update that shared plan. Other comparison assumptions retain their own
meaning and leave the accepted work price intact. **Compare a change** and
**Keep a plan** remain compact routes to baseline, recovery, files and reports.

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
5. In People, arrange team lanes or person cards, then choose a person. Apply
   accepts their name, rate and funded time; Role mix choices save directly.
   Choose a contribution to connect its work, receiver and decision owner.
   Empty slots add records with editing closed, and amp Undo restores accepted
   changes. An Abilities support cell opens its own local proposal controls;
   **Rename** there changes a shared person or team name without leaving the task.
6. Turn a Change or Quality reel. Open an action pad to inspect the work it
   selects; the pressed face follows the open receiver.
7. In Investment, load a financial deck and try its reels and money dials. Add
   another deck to explore an independent variation, or save a baseline through
   **Compare a change**. **Keep a plan** carries accepted work and deck settings
   together in a saved file.

The authored people use work-based names such as Researcher and Quality reviewer.
Known people may participate across teams. Removing a session clears its supporting
links and dependent timing relationships; amp Undo restores the whole change.
Rates and example arrangements help a visitor explore relationships; people doing real work retain authority over
commitments and findings.

## Recognize the controls

| Operation | Visual cue and behavior |
| --- | --- |
| Load a plan or investment grouping | Preserved cassette/deck face with a selected outline |
| Adjust a financial comparison | Connected reels and quantity controls update the loaded deck; one continuous dial gesture produces one Undo step |
| Inspect existing work | Named pad or track key; selected/open state follows the live receiver |
| Add another session to a plan | Plus target in its track cell; keeps earlier placements and the current scope |
| Create separate work in a period | Lane creation or New plan row; the board keeps all records visible |
| Add a different scope | Explicit New plan or Add sprint/quarter |
| Add a person, team or contribution in People | Empty-slot plus accepts a useful record, closed until selected; pointer hover or keyboard focus reveals it, and touch keeps it visible |
| Add a supporting person, team or session in Abilities | Creation accepts the record; Apply accepts its assignment to the current proposal |
| Rename a referenced person or team in Abilities | Rename opens one local field; Save accepts the shared name and retains the support proposal |
| Arrange People team lanes or person rows | Movement controls sit on the record and accept its new order with shared motion and Undo |
| Change People team membership, member order, role values or contribution choices | Native selectors, checkbox pads and movement controls accept directly and retain local focus |
| Edit a person's name, rate or funded time | Compact canonical form retains the typed draft until Apply; Coordination uses the same form |
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
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:assembly-browser
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:responsibility-browser
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:capability-browser
NATIVE_STUDIO_BROWSER=chromium npm run test:native-investment-studio:investment-browser
```

The [assembly journey](../../tests/native-investment-studio/assembly.browser.mjs)
observes direct membership and ordering, Undo, removal dependencies, retained
drafts and the borrowed person form. The
[responsibility journey](../../tests/native-investment-studio/responsibility.browser.mjs)
observes the visible role rail, contribution choices, retained note data and the
People composition at phone and desktop widths. The Abilities journey observes
readable choices, hidden-section behavior, retained proposals and accepted
recovery. Investment checks independent deck identities, connected selections,
saved round trips and grouped dial recovery. These routes establish local source
behavior; the receiving release owns hosted verification.

Browser journeys enter an editor through its visible owning rack. Scope chapter
tabs to the amp's Studio chapters rail; local rack tabs have their own scope.
Creation accepts a seed before selection opens its editor, while prerequisite
detours keep their existing draft route. Observe accepted state and recovery
through those visitor paths when a composition changes.

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
| Plan cassette presentation | [tape-picker.mjs](tape-picker.mjs), [tape styles](../../context-canvas-project-surface/context-canvas/styles/routes/studio-tapes.css) |
| Financial decks, connected reels and controls | [investment-workbench.mjs](investment-workbench.mjs), [investment-controls.mjs](investment-controls.mjs), [Investment styles](../../context-canvas-project-surface/context-canvas/styles/routes/studio-investment.css) |
| Deck definitions, saved assumptions and derived comparisons | [investment-catalog.mjs](investment-catalog.mjs), [investment-state.mjs](investment-state.mjs), [investment-projection.mjs](investment-projection.mjs), [investment-financials.mjs](investment-financials.mjs) |
| Baseline, file exchange and Investment integration | [investment-controller.mjs](investment-controller.mjs) |
| People lanes, session arranger and direct membership/order | [assembly-controller.mjs](assembly-controller.mjs), [team-controller.mjs](team-controller.mjs) |
| Visible role mix and contribution choices | [responsibility-controller.mjs](responsibility-controller.mjs) |
| People composition and borrowed compact person form | [studio-people.css](../../context-canvas-project-surface/context-canvas/styles/routes/studio-people.css), loaded after Arrangement styles |
| Abilities support and proposal controls | [capability-controller.mjs](capability-controller.mjs), [Abilities styles](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css) |
| Shared creation target, accepted additions and names | [rack-creation-controls.mjs](rack-creation-controls.mjs), [rack-record-creation.mjs](rack-record-creation.mjs), [creation-label.mjs](creation-label.mjs) |
| Populated showcase and opt-in People examples | [presets.mjs](presets.mjs), with live selection in [controller.mjs](controller.mjs) |
| Current rationale and supersessions | [experience journal](experience-journal.md) |

The visual contracts map further chapter-specific source and CSS owners. Follow
[milestone 23](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/23)
for current work. Participant time shares (#798), independent response records
(#816), production Reset (#808) and the human-cued
public release (#686) retain their separate receiving decisions.
