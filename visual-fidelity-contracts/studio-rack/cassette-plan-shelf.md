# Cassette Plan Shelf

Make each plan recognizable as a small, tangible object that a visitor can
select, load and revisit. The tilted cassette face carries its name, host,
duration and session count; its stable button remains easy to point at and use
with a keyboard. A narrow viewport turns the shelf into a horizontal strip.

**Standing:** human-preserved visual reference, version `0.1.2`, ID
`vfc:cassette-plan-shelf`; recorded 8 November 2026. The exact art and animation
baseline is `cedafc3f17c417cf5c90cacb5b1a696acf9cc3c1` in
`planning/context-canvas/studio-rack-tape-study.html`. This records the approved
cassette treatment before the visible **Session tapes** heading becomes
**Plans**. The artwork, scale, hover movement and narrow shelf remain the
reference while that wording changes in
[#806](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/806).
The planning reference is authorized for main/dev preservation in #810.
Showcase adoption continues on dev; its promotion to main retains human review.

## Showcase receiving composition

Issue #813 adopts this artwork on `dev` through
[`tape-picker.mjs`](../../collaboration/native-investment-studio/tape-picker.mjs)
and [`studio-tapes.css`](../../context-canvas-project-surface/context-canvas/styles/routes/studio-tapes.css).
Issue #820 refines its receiving interaction: the unchanged-size shelf attaches
directly to the full height of the period rack. #837 expands the desktop shelf
scroll area from 40rem to 80rem while keeping cassette dimensions intact. At
650px and below it remains a horizontal strip with no vertical height cap.

One cassette represents one repeatable activity plan. The initial view shows
All plans with detail closed. A persistent outline/ghost All plans control shares
a compact rail with directional Previous/Next pennants and the loaded name.
Paper and teal selected states, clear text and a visible focus outline retain the
existing rack vocabulary. The pennant tip indicates direction while its text
names the action. Previous/Next follow shelf order with explicit ends; Next from
All plans opens the first cassette. Both shelf and rail use the same scope owner.
Unavailable directions retain legible labels and expose their state; focus stays
on the activated control. An empty library starts unselected. Loading a canonical work identity
filters the board, tracks and relationship markers. All plans is the persistent
return to the complete arrangement. #909 supersedes #906's initial-first-tape
default; scope navigation preserves accepted data and Undo. The selected sprint/quarter remains visible: All plans clears the cassette filter;
Plan overview clears the period filter. Existing clips open local editing.
Loaded **Add session** targets append occurrences while retaining that cassette.
In All plans, explicit **New plan** targets create separate records and retain the
overview. Shelf **New plan** creates and loads a uniquely named record with detail
closed. These scope-specific meanings supersede the earlier rule that every lane
addition creates a record through #906.

**Remove plan** belongs to the transport's right edge with a compact confirmation
that names the loaded plan. One canonical change clears its supporting links;
the stable native amp **Undo** restores the complete arrangement. The shelf
retains its selection role. This supersedes #813's local Undo and
edit-on-cassette-selection behavior.

An empty library gives the rack a single-column starter composition: a cobalt
shared reel beside a diagram preview, with **Plan**, **Design**, **Test**, **Build**
and **Deploy** choices. Paper resting and teal selected buttons follow the shared
reel contract. Turning selects a preview; **Load these plans** explicitly accepts its
set as one Undo entry while retaining people, teams, horizon and other chapter
state. **Create a plan** retains canonical creation and the guided prerequisite
route. A missing person/team leaves the current state intact with a concise local
message; its borrowed creation receiver remains usable inside the rack.

Artwork, focus targets, stationary shelf, narrow horizontal orientation and hover
motion retain the exact specimen.

## The preserved object

The [interactive study](../../planning/context-canvas/studio-rack-tape-study.html)
owns `.library`, `.tapes`, `.tape`, `.cassette`, `.reels` and `.tape__duration`.
A native button is the selectable object; its inner cassette supplies the
three-dimensional illustration. The face names the plan in live text. The
decorative reel strip is hidden from assistive technology.

```text
.library                         Plans
  .tapes                         vertical shelf / horizontal narrow strip
    button.tape                  stable selection and focus target
      span.cassette              tilted artwork
        small                    host
        strong                   plan name
        span.reels               decorative tape reels
        small.tape__duration     duration · number of sessions
  button#add-tape                 ＋ New plan
```

The new wording describes the existing illustration: a plan is the reusable
named item held in `model.tapes`; its sessions are the repeated placements held
in `occurrences`. **New plan** creates an item. **+ Session** adds one placement
to the loaded item. The numbered Working sessions pads select those placements.
This is a visitor-language change, with the existing identities and duration
owner preserved. **Plan overview** still returns to the complete arrangement.

## Exact art and shelf geometry

The named source revision is the byte-level recall authority. Preserve these
material relationships when moving or reusing the shelf:

| Part | Baseline |
| --- | --- |
| Type and inherited sizing | `16px/1.4 system-ui,sans-serif`; global border-box sizing; inherited native button font |
| Wide workspace | `210px minmax(0,1fr)` columns with `1rem` gap; `170px minmax(0,1fr)` at `1000px` and below |
| Shelf housing | `.8rem` padding; `#12231f` face; `1px solid #668b73`; `6px` corners; inset `0 0 12px #071c1580` shadow; left `#34443a` and right `#0d1a14` three-pixel rails |
| Shelf spacing | Heading has `.7rem` bottom margin; `.tapes` is a grid with `.65rem` gap and `.8rem` bottom margin |
| Native plan button | Full width; `.65rem` padding; transparent background and `2px` transparent border; relative positioning; isolated stacking; no button shadow |
| Face colors | First: label `#d5e5da`, stripe `#00776b`; second in each three-item cycle: `#fff3e8` / `#b6885c`; third: `#e9f0ff` / `#63587b`; text `#213252` |
| Cassette silhouette | Block face, relative/isolated; `perspective(500px) rotateY(-15deg) rotateZ(-4deg)` about its center |
| Face plate | Pseudo-element inset `-.5rem -.3rem`; `2px solid #1f2421`; `2px` corners; stripe positioned `.35rem .35rem`, width `calc(100% - .7rem)`, height `3px` |
| Block depth | Inset `2px 2px 0 #fffbe5` and `-2px -2px 0 #8d9785`; outer `2px 2px 0 #4e6253`, `4px 4px 0 #4e6253`, `6px 6px 0 #11251c`, `7px 8px 0 #081b14` |
| Shelf lip | Button pseudo-element inset `auto 1px -3px`; `5px` height; `#66766e` face, `1px #a6b4a1` top line; `0 4px 0 #091c14` and `3px 4px 0 #091c14` shadows |
| Name and metadata | Name `.9rem`, block, `.25rem 0` margin; metadata `.78rem`, block; duration `#16345e`, `.72rem ui-monospace,monospace`, exact `1.092rem` line height |
| Reel window | `22px` high; `.5rem 0` margin; `2px 13px` padding; `#263d35` field, `1px solid #0b2118`, `1px` corners; `#7c8c70` two-pixel tape line; inset `0 2px 0 #0d2119` and `0 1px 0 #fffbe5` shadows |
| Pixel reels | Two `16px` faces; stepped polygon corners at 12.5% intervals; alternating `#f8f1d9` / `#809b83` conic quadrants, `4px` central `#263d35` square, inset `2px #f8f1d9` ring |

The art uses deliberate stepped edges and offset shadows. Preserve its blocky
cassette identity when another cassette format joins the study. A new format
can have its own illustration; it does not replace these plan faces.

### Horizontal shelf at ordinary phone widths

At `650px` and below, `.workspace` becomes block flow and `.library` has a
`.8rem` bottom margin. `.tapes` becomes a flex row with horizontal overflow and
`2px 2px 6px` padding. Each `.tape` retains `flex:0 0 168px`; the existing `.65rem`
gap and `.8rem` bottom margin remain. The shelf is the local scrolling boundary.
The plan buttons keep their native keyboard targets and readable face text;
page width remains independent of the number of plans.

## Selection and movement

The button and shelf keep their layout boxes. Hover transforms only the inner
`.cassette` to `perspective(500px) rotateY(-9deg) rotateZ(-2deg) translateY(-1px)`
through **`160ms ease-out`**. The selected button remains transparent; its face
plate gains a **`2px solid #56d8c9`** outline with `1px` offset. Native
`aria-pressed` reports the loaded plan. Visible keyboard focus uses the shared
`3px solid #ffd06f` outline and `4px` offset on the button, separately from that
persistent selection.

The loaded detail panel retains its downward arrival: **`unfurl .2s ease-out`**,
from **opacity `.3` and `translateY(-6px)`** to **opacity `1` and
`translateY(0)`**. Its controls arrive together; the duration module keeps the
separate [Loaded Tape Duration Panel](loaded-tape-duration-panel.md) reference,
including its approved fixed-lighting correction. The animation gives the
panel's opening a small directional cue.

System reduced motion disables transitions and animation while retaining
selection and readable state. Forced colors removes the cassette transform,
face/lip pseudo-elements and decorative reels. ButtonText preserves the button
and metadata; Highlight distinguishes the selected button. The semantic text and
native controls remain the usable representation.

## Verify what changes

For a later art edit, compare a resting, hovered and selected face at one laptop
and one ordinary phone width. Confirm stable button/shelf boxes, readable title
and session count, keyboard selection, return focus and local shelf scrolling.
Bracket the `650px` threshold when changing its layout owner. Check reduced
motion and the selected forced-color representation when changing those rules.

Keep cycle images in ignored `.visual-runs/`. The receiving Issue or PR owns the
observed result and exact source. This contract preserves art and interaction
appearance; the [Chapter Workbench Study](chapter-workbench-study.md) owns the
shared illustrative state, chapter routing and recovery boundary.
