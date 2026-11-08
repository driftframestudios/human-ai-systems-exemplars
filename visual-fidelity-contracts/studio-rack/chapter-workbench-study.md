# Chapter Workbench Study

Let a visitor explore the same people and sessions through each Studio chapter
without learning a new interface at every stop. Compact lanes, sequencer tracks,
support tables and selected-record modules give each question a useful visual
form inside one shared rack.

**Standing:** active `dev` composition study, version `0.1.0`, ID
`vfc:chapter-workbench-study`; updated 8 November 2026. The all-chapter work was
received in [#805](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/805).
The current [#806 iteration](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/806)
preserves approved art and develops Investment comparison decks.
The [interactive study](../../planning/context-canvas/studio-rack-tape-study.html)
has its own illustrative page-local state. This contract guides that study;
the [working Studio](../../collaboration/native-investment-studio/README.md)
retains its accepted model, editors and recovery contracts. Merging is held
while the human reviews the development experience.

## One recognizable workbench

Keep chapter choices in the compact amp rail. The active chapter has a pressed
state, a short heading and one direct description. Its first useful visual
appears immediately below. The same paper, mint, peach, rose and dark green
palette connects the chapters; local skins distinguish people, support,
emphasis and investment without introducing another navigation system.

Selection loads a concise neighboring module. A selected pad names the object;
the module provides the controls for that object. Inclusion uses native
checkboxes, mutually exclusive choices use radios or pressed choice buttons,
and navigation carries a destination cue. A caret identifies local inspection;
an arrow identifies a route to another chapter. Focus remains visible separately
from persistent selection.

The [Loaded Tape Duration Panel](loaded-tape-duration-panel.md) is a
human-approved reference. Preserve its scale, palette, Hours and Minutes controls,
readout, circular steppers, and neighboring Working sessions geometry. Version
`0.1.1` keeps the face lighting and shadow fixed while the pointer turns,
superseding the earlier complete-face rotation. New chapters reach that same
session module through a marked route; they do not create another duration editor.

The [Cassette Plan Shelf](cassette-plan-shelf.md) separately preserves the exact
blocky cassette faces and `160ms ease-out` hover response from `cedafc3`. At
`650px` and below, the shelf stays a horizontal local scroller with `168px`
plan buttons. Its heading is now **Plans**, with **New plan** and **+ Session**
describing creation and repetition. The names change while source identities,
duration ownership and approved art remain intact.

The loaded detail panel retains **`unfurl .2s ease-out`**, from opacity `.3`
and `translateY(-6px)` to opacity `1` and `translateY(0)`. System reduced motion
keeps the panel readable without animation. This arrival belongs to the loaded
panel; refreshing a value should preserve the active control.

## Give each chapter its own useful reading

| Chapter | First visual | Selected module and visible consequence |
| --- | --- | --- |
| Coordination | Sprint lanes, Plans cassette shelf and session tracks | Load a plan item; adjust its shared duration, place its sessions, choose people and route a response. The selected sprint and Plan overview return remain visible. |
| People | Team lanes with person pads, followed by a session participation matrix | Load a person or team. Rate, funded time and membership controls update the shared illustration; a participation pad changes that person's inclusion in the named session. |
| Abilities | **What people can do** and **How the team works** support tables | A cell loads responsibility, preparation, review or observation for that ability or practice. Supporting-work pads refer to the same sessions used elsewhere. |
| Change | Framework/viewpoint reels, an emphasis bank and work-stage lanes | Framework choice supplies different named components; faders visibly redistribute the illustration. A selected component exposes its stage and supporting-session pads. |
| Quality & recovery | Before/after-release reels, a compact CRT-style reading and check pads | The selected check exposes inclusion and supporting work. Sigma attention and Change urgency alter the authored attention reading; the initial 4σ setting presents a calm starting example. |
| Investment | VHS-C-style deck choices, with Plan investment loaded initially | Plan investment retains funded-time and extra-investment session lanes, concise totals and sprint bars. Added comparison tapes expose their own assumptions and visual results. |

The two Abilities tables keep their native row/column relationships and legible
headers. Session participation is a native table with checkbox pads, rather than
a custom keyboard grid. At ordinary phone widths, a named local scroller retains
those relationships while the surrounding page fits the viewport. Smaller boards
and loaded modules reflow into the available width.

The CRT expresses an authored design variation. Its label carries the meaning
when animation is reduced or unavailable. It represents neither measured process
capability nor a forecast. Linking another check to an existing session reuses
that session's effort; repeated references do not create additional paid work.

## Shared state and recovery

The shell owns one page-local model and its Undo snapshots. Chapter adapters
read that model and submit edits through the shared mutation boundary. Person,
team and session IDs retain their identity across chapters. Chapter selection,
loaded-record selection and local inspection remain view state; changing the
view leaves the modeled work intact.

Session controls open the Coordination module with a visible return to the
originating chapter. A return restores a useful source control. Direct edits
show their effect immediately and share the same Undo action. Native fields and
rotary gestures retain their active control while updating surrounding readings.
Reset is recoverable through Undo. Reload starts the authored example again.

Preserve these distinctions:

- Team membership and session participation are independent. A person can take
  part across team boundaries.
- A Plans item owns its shared duration and people. Its visible sessions are
  repeated sprint/week placements (`occurrences` in the study source); numbered
  pads own repetition. This vocabulary leaves the production session contract
  unchanged.
- Change, Quality and Abilities link to existing session identities. Their
  selection and support controls have different jobs.
- The study's funding groups organize the same priced sessions. They do not
  reproduce production's funded-time allocation model.
- The study's saved comparison is one illustrative amount. Production retains
  its fuller baseline, report, import and recovery semantics.

## Investment decks preserve their own question

Plan investment remains the initial master tape and contains the existing
shared-session cost board, loaded cost detail and sprint distribution. Preserve
**Extra investment's `#403d32` chocolate field**, edge, title and written funding
meaning. Its contrast with the funded-time lane remains useful inside the larger
deck composition.

The complete lane reference is revision `cedafc3` of
[the Investment stylesheet](../../planning/context-canvas/studio-study-investment.css),
with typography and native-button defaults inherited from
[the study shell](../../planning/context-canvas/studio-rack-tape-study.html).
Preserve this housing and control rhythm when nesting it beneath a master tape:

| Part | Preserved treatment |
| --- | --- |
| Host board | Two equal columns; `.7rem` gap and padding; `#10261e` field; `2px solid #668b73` border; `5px` corners. At `650px` and below, use one column. The enclosing Investment grid has `.8rem` gaps. |
| Extra investment lane | `min-width:0`; `#403d32` field; `1px solid #668b73` border; `.7rem` padding. The neighboring funded-time lane retains `#2d4237`. |
| Title and explanation | Inherited `16px/1.4 system-ui,sans-serif`; `1rem` title in `#f8f1d9`; `.8rem` hint in `#c2decc`, with `.4rem 0 .7rem` margins. |
| Session pads | Full-width grid, `.4rem` inner gap and `.5rem 0` margin; `.45rem .7rem` padding; minimum height `2.5rem`; `1px solid #668b73`; `3px` corners; `0 3px 0 #0d1916` shadow. Paper `#f8f1d9` contrasts with `#213252` text; the amount/effort line is `.8rem`. |
| Pad state | Hover uses peach `#fff3e8` and a mint border. Selection uses `#b7e4cf` with `#102e25` text, a `2px solid #f8f1d9` outline offset `1px`, mint border and inset `0 3px 5px #17514780` shadow. |

**Add comparison tape** offers one of each bounded enterprise illustration:

| Tape | Controls and reading |
| --- | --- |
| Customer rollout | Teams, setup cost and training hours; a quarter-start pad locates the rollout. The reading separates setup and training cost. |
| Commercial cohort | Retained opening revenue, expansion in that cohort and new customer revenue. The reading separates opening-cohort retention from total quarterly revenue. |
| Service operations | People, adoption and minutes released per use. The result stays in hours per week. |
| Capital choices | Keep current, Pilot or Rollout; quarterly net benefit, quarterly discount and a two-, four- or eight-quarter horizon. The reading compares present value after upfront cost. |

Each tape owns its settings and labels its units. Presets, native sliders and
concise outputs make those questions directly explorable. The VHS-C artwork
distinguishes these master decks from Coordination's preserved plan cassettes.

Adding, adjusting or removing a comparison uses the shared study Undo owner.
The shell's planned-session total and Plan investment continue to derive from
shared people, duration and sessions. A comparison's modeled revenue, service
capacity or capital result stays within that tape; it does not silently change
the shared work cost. Production adoption would receive its own data and
financial-meaning contract after the illustration is reviewed.

Unassigned session definitions and independent response cards remain explicit
production contract decisions. This study makes those experiences tangible
before a later focused implementation chooses their durable representation.
Participant percentages retain their separate route in #798.

## Source and extension ownership

| Owner | Job |
| --- | --- |
| [Study shell](../../planning/context-canvas/studio-rack-tape-study.html) | Chapter rail, shared model/history, Coordination board and tape module, return routing, study-wide art and exact duration enclosure |
| [People/Abilities module](../../planning/context-canvas/studio-study-people-abilities.mjs) and [CSS](../../planning/context-canvas/studio-study-people-abilities.css) | Team lanes, person/team controls, participation table, both support tables and loaded ability/practice controls |
| [Change/Quality module](../../planning/context-canvas/studio-study-change-quality.mjs) and [CSS](../../planning/context-canvas/studio-study-change-quality.css) | Reels, framework components, emphasis channels, quality attention illustration, check and supporting-work pads |
| [Investment module](../../planning/context-canvas/studio-study-investment.mjs) and [CSS](../../planning/context-canvas/studio-study-investment.css) | Study-only session pricing, preserved funding lanes, saved comparison, sprint distribution and additional VHS-C comparison decks |
| [Production time controls](../../collaboration/native-investment-studio/time-controls.mjs) | Reused exact-field, circular-step and rotary duration behavior; production source remains unchanged by this study |

Study CSS stays scoped to its own document and chapter roots. Shared component
names follow their operation when multiple receivers actually use them. A later
production bridge maps the selected operation to its existing canonical owner;
copying an illustrative state container into production would leave that
ownership unresolved.

## Review the experience at the level it changes

Use a populated ordinary-phone/laptop journey to assess chapter selection,
shared-record edits, a supporting-session round trip and Undo. Inspect legibility,
local table scrolling, loaded-module placement, selected-state contrast and
reduced-motion behavior. Compare the duration panel and cassette shelf
with their separate approved references, including the duration lighting revision,
whenever inherited shell styles or placement change. Investment review also
checks that a comparison edit stays within its named model and Undo restores it.
A native range should keep its active element and gesture while the surrounding
reading updates.

Source inspection establishes the receiving modules and their mutation routes.
Browser observations establish only the exercised interactions and viewports;
human review determines whether this composition makes the showcase clearer and
more engaging. The receiving Issue or PR records those results. Production
integration, general performance refinement and public release retain their
separate decisions.
