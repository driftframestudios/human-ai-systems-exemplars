# Studio Rack Composition

Studio Rack Composition makes people, work and investment easy to explore through
a compact, tactile planning instrument. A visitor can scan a populated example,
select a period or pad, adjust a useful quantity, and inspect the resulting work.
The [running About Studio](../../context-canvas-project-surface/context-canvas/index.html#native-studio-coordination)
is the reference implementation.

**Standing:** review candidate, version `0.1.0`, ID
`vfc:studio-rack-composition`; source reviewed 7 November 2026. This family records
the accepted design and its implementation boundaries. Prospective receiving
decisions below retain their own Issues and delivery evidence. Each receiving PR
owns its actual verification result. Publication remains a separately reviewed action.

## Choose a visual mode and an operation

The family contains this composition contract and five operation contracts.
They describe reusable relationships across chapters, rather than a separate
visual system for every chapter.

| Mode | Useful work | Stable visual relationship |
| --- | --- | --- |
| **Editorial Rack** | Read people, work, relationships and concise context | Pale paper, sea-glass or peach fields; clear headings; compact lanes, tables and adjacent editors |
| **Instrument Rack** | Select a configuration, adjust a quantity and see its response | Dark face, bounded bezel, light labels, precise readouts and visibly selected controls |

| Visitor operation | Contract |
| --- | --- |
| Move between an overview, a named period or delivery phase, and its work | [Period Kanban & Session Sequencer](period-kanban-session-sequencer.md) |
| Compare support and select the work behind a cell | [Support Matrix & Stateful Pads](support-matrix-stateful-pads.md) |
| Explore a populated configuration | [Zoetrope Preset Selection](zoetrope-preset-selection.md) |
| Adjust time, money or emphasis | [Precision Dials & Faders](precision-dials-faders.md) |
| Open detail, retain an edit and return | [Contextual Inspection & Recovery](contextual-inspection-recovery.md) |

One pale board and one dark control field are a sufficient dose. Chapter-specific
color, lane arrangements and illustration remain available where they explain
the work. Existing compositions across the entire Studio remain available as
references: a receiver borrows the useful relationship and keeps its own data
meaning. Quality's track-selection matrix is the preferred visual reference for
new adjacent selection racks; Change and Quality retain their intentionally
different fader treatments. The [Tiffany Ledger Field](../tiffany-ledger-field.md) owns the surrounding
About composition; [ASCII Zine Field](../ascii-zine-field.md) supplies restrained
print-shop character. [Cobalt Operating Field](../cobalt-operating-field.md)
supplies related guidance for named work relationships. This family maps those
ideas into the Studio's existing owners.

## Preserve the composition

The compact amp presents identity, accepted investment, chapter selection,
Purpose, Saved edits and animation choices. Coordination begins with a period
overview and MIDI-style tracks. Detail opens when the visitor requests it;
complete chronological readings remain available through reports.

Pale reading areas and dark instruments keep distinct jobs. Headings, quantities,
relation labels and action labels have distinct weight and spacing. Short
monospace labels give an instrument character; sustained explanation keeps its
ordinary reading treatment. Existing palette roles and density remain the
starting point for an iteration.

The housing stays fixed while pointers, selected pads and authored result views
respond. Upper-left light, modest corners and lower-right or inset depth preserve
the tactile character. Selection uses shape, border or written state with color.
Decorative ASCII and CRT texture stay clear of labels, hit targets and focus.

| Control purpose | Shared visual reading |
| --- | --- |
| Begin creating an item | Written Add action with a plus cue |
| Confirm the prepared item | Ordinary Add or Apply commit treatment |
| Choose among visible options | Persistent pressed selection |
| Reveal nearby content | Caret reflecting that content's open state |
| Open another view or inspector | Destination wording and an arrow |
| Cancel a proposal | Shadow-free ghost treatment |
| Remove an item or relationship | Rose treatment and explicit scope |

## Keep state and motion legible

One accepted plan supplies the amp amount, relationships and downloads. An
ordinary editor’s proposal has its own reading until Apply. Team arrangement
choices settle directly with local Undo. Cancel, saved edits, history and baseline
comparison retain their existing owners. Selected-for-inspection,
included-in-plan and observed evidence remain separate meanings.

The amp offers Off, Half-speed and Full-speed; Full-speed is the current default.
System reduced-motion preferences suppress animation. Static labels, values and
selection remain complete in every mode. Chapter arrival, contextual movement,
local inspection and a pad changing lanes receive different treatments. A long
reveal yields to visitor input. These are presentation changes, outside plan
serialization, pricing and history.

## Source and extension ownership

The load order in [About HTML](../../context-canvas-project-surface/context-canvas/index.html)
is `about.css`, then `studio-instrument.css`, followed by the chapter extensions.
The About owner defines `--native-*` from `--about-*`; the shared instrument owner
maps `--studio-*` and owns the shared `studio-quantity-module` enclosure.
`studio-duration` groups the larger output above borderless peach Hours and
secondary paper Minutes; duration and rate controls share coarse/fine dial
geometry. Rate hosts use the same enclosure grammar for their named amount.
Receiving chapter styles extend those mappings. This contract
introduces no parallel token file or generated stylesheet.

As common controls are extracted, their names describe the semantic role they
share: track key, duration module, participation pad or editorial drawer. A
chapter-neutral class or helper belongs with the existing shared instrument or
component owner when several chapters receive it. Source names such as
`native-quality-tracks` remain useful references for the current exemplar; a
shared extraction should receive a generic role name rather than make other
chapters depend on a Quality-specific name. Chapter owners retain meaningful
local geometry, palette variants and intentionally different fader treatments.
Each focused PR reconciles the actual consumers and tests; broad renaming waits
for a real shared receiving use.

| Owner | Responsibility |
| --- | --- |
| [Shared instrument CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-instrument.css) | Rack palette mappings, reels, motion modes, shared track/Add/record keys, quantity modules, adjacent editor skin and the existing Remove skin |
| [Arrangement CSS](../../context-canvas-project-surface/context-canvas/styles/routes/studio-arrangements.css) | People lanes, editorial delivery-phase cards, session tracks and the darker secondary Team planning enclosure |
| [Abilities](../../context-canvas-project-surface/context-canvas/styles/routes/studio-abilities.css), [Change](../../context-canvas-project-surface/context-canvas/styles/routes/studio-change.css), [Assurance](../../context-canvas-project-surface/context-canvas/styles/routes/studio-assurance.css) | Chapter composition and locally scoped variants |
| [Motion](../../collaboration/native-investment-studio/motion.mjs), [controller](../../collaboration/native-investment-studio/controller.mjs), [editing](../../collaboration/native-investment-studio/editing.mjs) | Presentation, chapter routing and retained proposal ownership |
| [Rack controls](../../collaboration/native-investment-studio/rack-controls.mjs) and [work controller](../../collaboration/native-investment-studio/work-controller.mjs) | One canonical session editor opens below its originating rack; keys and pads mirror its identity, visibility and controlled element |
| [Rack controls](../../collaboration/native-investment-studio/rack-controls.mjs), [team controller](../../collaboration/native-investment-studio/team-controller.mjs) and [assembly controller](../../collaboration/native-investment-studio/assembly-controller.mjs) | Adjacent person/team placement borrows canonical controls; current owners retain drafts, validation and acceptance |
| [Connection template controller](../../collaboration/native-investment-studio/connection-template-controller.mjs), [delivery board](../../collaboration/native-investment-studio/delivery-board.mjs), [connection view](../../collaboration/native-investment-studio/connection-view.mjs) and [arrangement surfaces](../../collaboration/native-investment-studio/arrangement-surfaces.mjs) | Team planning’s direct arrangement transaction, editorial topology, phase projection and scope, included-work reading, and participation table with a fixed header/local scroller |

Ordinary phone and laptop widths are the receiving range for this showcase.
Text and controls reflow; genuinely two-dimensional tables and tracks retain a
named local scroll region. Forced colors retains native meaning and selection.
The host's scriptless counterpart and printable reports have their own evidence
routes; this family makes no claim that every interactive rack prints as shown.

## Evidence and revision

The [research record](../../collaboration/native-investment-studio/usability-research.md#digital-instrument-composition--5-november-2026)
connects official instrument manuals, WAI guidance and local design choices.
Manuals supply interaction precedents; they do not establish that this aesthetic
improves enterprise decisions. The [current journal](../../collaboration/native-investment-studio/experience-journal.md#superseded-directions)
resolves older directions: named periods, a compact landing, Full-speed default
and report-owned long detail supersede the earlier arrangements.

The [shell browser route](../../tests/native-investment-studio/shell.browser.mjs)
observes chapter, motion, focus and host behavior. The five operation contracts
route to their narrower checks. [Foundation checks](../../tests/visual-fidelity-contracts/foundation-contracts.test.mjs)
establish catalog validity and source-path closure, rather than visual approval.
Coordination's [in-rack scope navigation](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/756)
keeps its Plan overview return and selected period inside the existing screen.

The first [Coordination consolidation](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/765)
increment gives Session tracks and Shared sessions the same session-key and Add
treatment. Selected-record styling comes from the session editor; the open caret
requires its visible receiver. The selected key remains identifiable after that
receiver closes. Horizon columns express time; Shared sessions columns express
people. Their local table geometry preserves those different relationships.

Team planning is a permanent sibling section with the reel and editorial
topology above a concise hint and subtly darker secondary rack. Its
[delivery-board refinement](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/779)
combines teams, people, sessions and handoffs into six phase lanes.
Editorial card faces and distinct team, session and handoff treatments sit
against the darker housing. Shared sessions retains its participation reading
below. The board's phase name and Delivery overview return stay above its local
scroller; the rack amount and Add session remain outside participant-table
scrolling. Included work prices the accepted arrangement’s distinct linked
sessions once; the amp keeps whole-plan investment.

A delivery phase is an authored grouping of work and responsibility; the horizon
continues to own sprint and quarter placement. A deliberate reel choice updates
one accepted arrangement immediately, and each card addresses its existing editor. Remaining
attached disclosures retain their spring reveal. The existing palette, reels,
pads and tactile depth connect this secondary enclosure to the primary horizon
while preserving their distinct readings.

The [editorial-companion increment](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/772)
treats Editorial Rack as an attached sub-rack skin.
People and available time and Stages & handoffs retain their concise headings,
reading character and expandable spring movement, visually joined to the bottom
of the instrument they explain. Their existing operations remain available from
meaningful people, session and relationship controls inside that rack. The
editorial receiver supplies a readable alternative and onward chapter routes;
shared controller ownership keeps both paths aligned. The initial composition
stays compact until the visitor opens these details.

Coordination's adjacent record editor is a `studio-rack-editor` beneath
its originating horizon or Team planning rack. Its dark heading names the object and Close;
its peach editorial body receives the existing controls and quantity enclosure.
The parent cards keep their geometry while the local reveal occupies page flow.
Canonical people/team controls also serve People, preserving raw entries,
membership meaning and acceptance ownership. Session entries use their existing
work owner, preserving period/occurrence or participation context and the same
duration module. Record and session keys report selection separately from the
receiver's open caret; an active row key closes the panel while pads inspect.
The operation contracts below define close/return, quantity and recovery behavior.

The prospective [removal and recovery pattern](../../collaboration/native-investment-studio/removal-recovery-research.md),
scoped in [#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773),
uses the existing `native-control--remove` role for a low-emphasis rose-outline button,
sized with secondary actions. Its written label names the object and scope;
color reinforces that meaning. Cancel retains its ghost treatment, and creation
retains the plus cue. A Coordination prototype is the first visual receiver;
human review of that example precedes the wider chapter adoption.
The current Remove skin has moved into the shared instrument owner unchanged;
the proposed visual refinement and recovery behavior remain with #773.

The Team arrangement flow in
[#766](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/766)
accepts a selection through one updateable arrangement and local Undo. Shared
and unrelated records retain identity; repeated unchanged choices retain history.
Text customization settles as a complete field edit. Other editors retain their
current proposal and Apply owners. The enclosed controls in
[#767](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/767)
group duration and rate controls within the rack grammar. Their existing editors
retain value and acceptance ownership. Coordination's
[person/team editors](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/757)
and [session editors](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/768)
use the shared adjacent receiver. [Immediate-add behavior](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/758)
keeps its separate creation decision. Attached editorial
companions and refined removal remain prospective; their focused issues retain
acceptance and delivery ownership.
