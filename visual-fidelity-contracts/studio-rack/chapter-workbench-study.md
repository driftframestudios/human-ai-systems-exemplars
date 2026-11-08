# Chapter Workbench Study

Let a visitor explore the same people and sessions through each Studio chapter
without learning a new interface at every stop. Compact lanes, sequencer tracks,
support tables and selected-record modules give each question a useful visual
form inside one shared rack.

**Standing:** active `dev` composition study, version `0.1.0`, ID
`vfc:chapter-workbench-study`; recorded 7 November 2026. The receiving work is
[#805](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/805).
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

The [Loaded Tape Duration Panel](loaded-tape-duration-panel.md) is an exact,
human-approved reference. Preserve its complete appearance and scale, its Hours
and Minutes controls, readout, circular steppers, and neighboring Working sessions
geometry. New chapters reach that same session module through a marked route;
they do not create another duration editor or restyle this reference.

## Give each chapter its own useful reading

| Chapter | First visual | Selected module and visible consequence |
| --- | --- | --- |
| Coordination | Sprint lanes, cassette shelf and session tracks | Load a session; adjust its duration, place occurrences, choose people and route a response. The selected sprint and Plan overview return remain visible. |
| People | Team lanes with person pads, followed by a session participation matrix | Load a person or team. Rate, funded time and membership controls update the shared illustration; a participation pad changes that person's inclusion in the named session. |
| Abilities | **What people can do** and **How the team works** support tables | A cell loads responsibility, preparation, review or observation for that ability or practice. Supporting-work pads refer to the same sessions used elsewhere. |
| Change | Framework/viewpoint reels, an emphasis bank and work-stage lanes | Framework choice supplies different named components; faders visibly redistribute the illustration. A selected component exposes its stage and supporting-session pads. |
| Quality & recovery | Before/after-release reels, a compact CRT-style reading and check pads | The selected check exposes inclusion and supporting work. Sigma attention and Change urgency alter the authored attention reading; the initial 4σ setting presents a calm starting example. |
| Investment | Funded-time and extra-investment session lanes, concise totals and sprint bars | Select a session to see the people/time behind its amount, change its funding group, or open its controls. Save comparison captures a simple amount for the next change. |

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
- A session owns its shared duration and people. An occurrence places that
  session in a sprint/week; numbered pads own repetition.
- Change, Quality and Abilities link to existing session identities. Their
  selection and support controls have different jobs.
- The study's funding groups organize the same priced sessions. They do not
  reproduce production's funded-time allocation model.
- The study's saved comparison is one illustrative amount. Production retains
  its fuller baseline, report, import and recovery semantics.

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
| [Investment module](../../planning/context-canvas/studio-study-investment.mjs) and [CSS](../../planning/context-canvas/studio-study-investment.css) | Study-only session pricing, funding lanes, saved comparison and sprint distribution |
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
reduced-motion behavior. Compare the exact duration panel with its approved
reference whenever inherited shell styles or placement change.

Source inspection establishes the receiving modules and their mutation routes.
Browser observations establish only the exercised interactions and viewports;
human review determines whether this composition makes the showcase clearer and
more engaging. The receiving Issue or PR records those results. Production
integration, general performance refinement and public release retain their
separate decisions.
