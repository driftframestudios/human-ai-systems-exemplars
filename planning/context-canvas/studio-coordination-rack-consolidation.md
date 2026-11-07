# Coordination rack consolidation

Give a visitor two coherent views of the same work: **Coordination horizon**
shows when sessions happen; **Team planning** shows who works together. Shared
instrument controls make both views familiar while their labels preserve those
different questions.

**Standing — 7 November 2026:** this is the planning decision for
[#765](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765).
Current behavior remains in the [Studio source](../../collaboration/native-investment-studio/README.md).
Runtime work follows in focused PRs. Adjacent editors and dial enclosures are
future receivers; this plan defines their preparation. The current aesthetic,
compact landing and useful existing operations remain the reference.

## Same work, distinct readings

| Meaning | Coordination horizon | Team planning |
| --- | --- | --- |
| Visitor question | When does this work happen? | Who works together? |
| Board | Sprints/quarters, then weeks/months | Team lanes, people and shared work |
| Track columns | Periods or their subdivisions | People |
| A populated pad | A session occurrence | A person's participation in a session |
| Record identity | Existing work ID, plus occurrence/period where relevant | The same work ID, plus person where relevant |
| Visual emphasis | Primary instrument rack | Subtly darker secondary instrument rack, with editorial surroundings |
| Amount | Current plan's included work | Included work linked to the arrangement, counted once |

Both readings address the same session editor. Duration, repetitions, people
and funding retain their existing owners. A participation pad expresses who is
involved; it does not introduce another occurrence. A selected row, an included
person and an open editor remain separately observable states.

## Common controls and enclosure

Use the current horizon's Session tracks keys as the shared art direction.
The existing handoff key supplies the selected-state precedent. Inactive keys
have a quieter face; selection has a persistent border/pressed treatment;
the caret points down while that record's receiving editor is open. A closed
receiver has a right-facing cue. Keyboard focus remains independently visible.
Disclosure semantics identify the actual controlled editor.
Before relocation, the key still names the existing session-settings destination;
its open cue describes that real receiver. Adjacent-panel wording and control
relationships begin when the adjacent panel is mounted.

Both views need state from the receiving session editor. Today the score
controller routes work selections before assigning its local selection, and
Shared sessions callers omit the renderer's selected ID. The global last-click
cue is useful motion feedback; the existing editor/coordinator must supply
durable selected-record and open-state meaning.

One shared style role in the existing instrument stylesheet can cover the row
keys and Add session controls; receiving styles retain column geometry. A plus
begins creation. The final Add confirms the item being prepared. Horizon entry
supplies its period/subdivision; Team planning supplies its known context. Both
continue through the same creation owner, including cross-team participants.

The darker Team planning rack adopts the horizon's bezel, compact header,
readout alignment and named horizontal scroll region. Keep the header outside
scrolling content, extending #756's scope treatment. Existing Quality lanes and
pads supply composition precedents for compact choices; each receiving control
keeps its own participation, selection or editing meaning.

## Team planning flow

Make Team planning a permanent semantic section with the following order:

1. **Team planning** heading, parallel to Coordination horizon.
2. Zoetrope beside the editorial team structure.
3. The short arrangement hint below the zoetrope/structure deck.
4. Secondary rack header and included-work amount, followed by team/work lanes
   and Shared sessions participation tracks.
5. Contextual details and, in a later issue, the adjacent selected-object editor.

The current outer open disclosure and exposed inner template disclosure have
different owners. Replace their layout assumptions deliberately. Preserve
existing connection and session operations through the resulting compact view.

### Direct arrangement selection

[#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
replaces the separate Apply arrangement step. A deliberate reel selection
updates one current arrangement instance and supports Undo. Re-selecting the
same configuration changes nothing; A → B → A revises that instance rather than
accumulating generated teams and sessions. Unrelated and shared records retain
their identities and references.

This needs a focused transaction change. The current template engine appends
generated records, permits identical replay, and rejects changed rows using an
existing identity. Simply calling its Apply operation on every selection would
preserve those append/collision semantics. The replacement operation should
prepare and accept one complete change through the current history owner.

The rack's amount comes from the existing projection of its distinct linked
sessions. The amp retains the whole-plan amount. After direct acceptance, use
current structure and Included work wording. Preserve the editorial styling of
today's Proposed structure cards; proposed wording continues only while a
proposal actually exists. Existing raw edits remain recoverable through the
coordinator. This exception concerns arrangement choices; ordinary session and
person field editing retains its acceptance boundary.

## Duration and rate modules before editor placement

[#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767)
prepares the dials for adjacent racks. Enclose **Time per person, per session**,
the existing combined Hours/Minutes output, and both dial–field–step groups in
one instrument module. Hours remains the larger dial; Minutes remains smaller.
Keep **Working sessions** nearby as a separate repetition module.

Place the readout in the module face, directly above or beside its controls.
At laptop width the groups can sit side by side; at phone width they reflow
inside the same enclosure. Preserve exact fields, output associations, centered
step pairs, fixed light and the current pointer artwork. Apply the same housing
grammar to the existing $10/$5 rate dials and their one exact amount/$1 controls.

The main session markup in About HTML and the dynamic supporting-session
factory in `time-controls.mjs` must receive the duration composition together.
Their controllers retain value ownership. Reconcile the current wide-screen
overview column with the enclosure rather than adding another competing rule.
The retained-value repair from #761 remains the gesture contract.

## Focused delivery route

| Issue | Owns | Receives / prepares |
| --- | --- | --- |
| [#765](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765) | Semantic contract, shared session controls, then Team planning composition in focused PRs | Current front; prepares the following receivers |
| [#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766) | Direct arrangement update, included-work reading and Undo | Receives #765; settles record identity before adjacent editors |
| [#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767) | Duration/rate enclosures | Receives shared grammar; can proceed alongside #766; precedes both adjacent editor issues |
| [#757](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757) | Adjacent person/team editor in Coordination | Receives consolidated composition, accepted arrangement identity and enclosed controls |
| [#768](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768) | Adjacent session editor from either Coordination rack | Shares #757's contextual panel contract and existing editor owners |

Either adjacent editor can supply the first reviewed panel example after its
preparation is accepted. #758 retains immediate-add semantics separately.
Publication, sticky amp work and general performance retain their own routes.

[#717](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/717)
is a parallel test-quality repair for a standalone zine specimen. Its
viewport/document-position ambiguity remains present, but it has no Studio
runtime dependency and #764's hosted checks passed. If that intermittent
observation blocks this delivery, repair it before continuing the affected
check. Its bounded geometry proof is already specified in the issue.

## Contract and evidence ownership

Extend the existing [six-contract family](../../visual-fidelity-contracts/studio-rack/README.md):
Studio Rack owns shared housing; Period Kanban owns temporal meaning; Support
Matrix owns participation; Contextual Inspection owns selected/open/return
behavior; Zoetrope owns arrangement selection; Precision Dials owns quantity
modules. Mark proposed changes as prospective until their receiving PR lands.

Existing instrument manuals and WAI guidance in the
[research record](../../collaboration/native-investment-studio/usability-research.md)
support physical control precedents, exact-entry alternatives, explicit receiver
state and stable geometry. They establish those precedents and access concerns;
visitor comprehension remains a separate observation.

Keep verification tied to the changed operation: one session selected through
both readings, one arrangement replacement/Undo path with a shared-record case,
and one duration-module comparison at phone/laptop widths. Existing source and
gesture checks retain their boundary. Each focused PR receives independent
review, updates current README/journal guidance, and passes its evidence to the
next issue. A reviewed adjacent panel completes this preparation route.
