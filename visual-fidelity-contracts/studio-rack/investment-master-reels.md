# Investment Master Shelf & Financial Reels

Let visitors load a financial comparison, turn a reel or dial, and see what
changes. A cassette identifies the comparison; a compact loaded rack connects
its assumptions, cash or capacity reading and alternative choices.

**Standing:** active dev reference, version `0.1.1`, ID
`vfc:investment-master-reels`; 8 November 2026, receiving
[#809](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/809).
This contract extends the [Chapter Workbench Study](chapter-workbench-study.md).
The human chooses any later production transfer. Merging remains held.

## Load a comparison from the shelf

Preload Plan investment, Customer rollout, Commercial cohort, Service operations
and Capital choices. Each cassette has its own stable identity and settings.
The shelf reads **Investment decks**. **+ New investment deck** creates another
populated instance of the chosen type; **Remove deck** removes the loaded copy.
A copy can be explored independently, removed and recovered through shared Undo.

Use a vertical deck channel beside the loaded rack on laptop widths. At ordinary
phone widths, place the decks in a horizontal local scroller above the content.
The stable outer button owns focus and selection; its inner cassette owns the
same `160ms ease-out` perspective hover as the
[Coordination shelf](cassette-plan-shelf.md). Preserve that distinction so the
target stays easy to press while its illustrated face moves.

The Investment body is chunky VHS-C: a broad title strip, short amount/context,
and a window with a larger visible left reel and a smaller right reel. Its
repeating-linear-gradient grip belongs **inside** `.investment-master__face`
as its final pseudo-element; it turns with the body. This supersedes the earlier
outer-button texture. The face has `.6rem` padding, a `50px` reel window and a
layered lower-right extrusion reaching `12px 13px`. Preserve the shell's stable
hit target and focus outline while the whole illustrated cassette responds.

Use a `290px` shelf column on wide layouts and `230px` at `1000px` and below.
At `650px` and below, each deck has a `250px` basis in the local horizontal
scroller. Outer-button padding reserves room for the extrusion. The resting
face uses `perspective(500px) rotateX(7deg) rotateY(-17deg) rotateZ(-4deg)`;
hover uses `rotateX(3deg) rotateY(-9deg) rotateZ(-2deg) translateY(-2px)` with
the same perspective and `160ms ease-out`. System reduced motion keeps the
face still. Coordination retains its separately preserved demo-tape artwork.
A selected Investment deck has a clear mint outline; hover, selection and
keyboard focus remain independently legible.

The domain reel moves among Internal, Customer, Commercial, Operations and
Planning. It loads the corresponding comparison type and preserves that deck's
settings. When a type has been removed, its empty reading offers Add directly.
Loading a deck also updates the domain indication.

## Chocolate companions and dark instruments

Preserve Extra investment's `#403d32` chocolate lane from `cedafc3`. Use additional
chocolate companions around money controls, reel groups and related readings to
offset the green-black rack. The reusable controls use `#3b2b25` with a warm
`#92735f` edge, paper labels and mint readouts. Peach and paper control groups
remain clearly separated from their enclosure. Color supports the written
grouping and selected state.

Keep the original Plan investment board's equal columns, `.7rem` gap/padding,
`#10261e` field and `2px solid #668b73` edge. Its funded-time lane remains
`#2d4237`; the chocolate extra-investment lane has a `1px solid #668b73` edge and
`.7rem` padding. The `data-funding="extra"` attribute owns the chocolate skin,
so a filtered Extra investment view keeps its color. A selected funding lens
shows one lane across the available width. At `650px` and below the funding board becomes one column.
Session pads preserve the full-width grid, `.4rem` inner gap, `.5rem 0` margin,
`.45rem .7rem` padding, `2.5rem` minimum height, `1px solid #668b73` edge,
`3px` corners and `0 3px 0 #0d1916` shadow. Rest uses `#f8f1d9` paper and
`#213252` text; hover uses `#fff3e8` peach and a mint edge. Selection uses
`#b7e4cf` with `#102e25` text, a `2px solid #f8f1d9` outline offset by `1px`,
and the inset `0 3px 5px #17514780` shadow. The amount/effort line remains `.8rem`.
The original full reference is `cedafc3` of the Investment stylesheet and study
shell. The linked session amount and concise sprint bars stay available within
this first deck.

## Money module

The [duration reference](loaded-tape-duration-panel.md) supplies the scale and
lighting. Money has one amount, so its module uses one exact field and one
shared readout above a pair of **64px** rotary controls. Peach marks primary
adjustment; paper marks secondary adjustment. The exact field and circular
**$1** minus/plus controls remain alongside the pair, wrapping below when needed.

Choose the scale by the financial quantity:

- Budget, cohort revenue, acquisition spending and capital amounts use
  **$1,000 steps** and **$100 steps**.
- Per-team price, setup and delivery costs, and per-person operating costs retain
  **$100 steps** and **$5 steps**.

Choose the readout placement once for the field. Aggregate amounts and unit
prices expected in the thousands use a separate line below the heading.
Smaller unit costs may use the heading's top-right position. A change through
$999/$1,000 keeps the same placement. Reserve width from the field's permitted
range so digits grow within a stable instrument; values never trigger a layout
mode change. Direct entry remains available across the field's full range.

Preserve the 8px face inset, 2px pale rim, 135-degree face gradient and fixed
2px/3px shadow. Only the transparent pointer carrier rotates. Its existing
4px by 12px outward mark retains its direction. Each rotary movement adjusts
the same monetary amount relatively; the angle represents adjustment rather
than a percentage of a million-dollar range.

Pointer capture, a frozen gesture center and stable nodes keep brief drags and
outside releases coherent. Keyboard, exact entry and circular steps retain
their own operation. One gesture forms one Undo edit. Escape restores that
gesture's starting value. Native range fallback remains usable in forced colors.

## Reels make changes visible

A reel consists of a stable label, rotating decorative wheel, current choice,
Previous/Next controls and openly available choice pads. The rotor turns while
the controls and text stay readable. Selection is also expressed with
`aria-pressed`; reduced motion presents the same choice immediately.

Lifecycle presets change a bounded group of assumptions together. Alternative
and metric reels select the corresponding cash-flow or headline reading. The
loaded controls and visual results must agree after each change. Keep native
sliders for quantities with a useful bounded range and monetary dials for money.
Direct adjustments of preset-owned assumptions mark the Lifecycle Custom.
A named preset restores its assumptions as one Undo edit. Live context beneath
the reel reflects the current financial context. All initial values are populated; exploration requires no narrative entry.

| Comparison | Useful financial distinction |
| --- | --- |
| Plan investment | Shared-session cost and funding groups; budget, reserve, opportunity allocation and shortfall |
| Customer rollout | Implementation/training, net price and contribution after costs |
| Commercial cohort | GRR and NRR from the opening cohort; acquisition cost and contribution-based payback; new/reactivated revenue shown separately |
| Service operations | Adoption, weekly released time, cost change and capacity gap retain their own units |
| Capital choices | Upfront and end-quarter flows; NPV, IRR per quarter, recovery period and sensitivity |

Plan investment pairs **Investment approach** with **Investment lens** inside a
chocolate enclosure. Deliver now sets aside 10% of budget for reserve and 5%
for options; Protect delivery uses 30%/5%; Explore options uses 10%/30%.
These authored percentages describe budget allocations. Actual planned work
continues to use the shared session price. Four pads show Planned work, Reserve,
Options and Unassigned budget or Budget shortfall, with readable amounts and
small proportional strips. Reserve uses lavender, options peach and a shortfall
rose; written labels keep each state clear.

The lens selects Whole plan, Funded time or Extra investment. It filters the
actual work pads and sprint amounts together, while the allocation still accounts
for the whole plan. Context under each reel ties its selection to the other
reading. Adjusting budget, reserve, options or deck funding marks the approach
Custom; a named approach restores its two allocations together. The reserve
expresses money set aside, with any effect on delivery risk left unspecified.

Keep the selected metric prominent and its explanation short. An unavailable
IRR or unreached payback receives a meaningful written state. Negative returns
retain their sign and visible position. Comparable bars share a stated basis;
percentage retention, money and hours remain distinct quantities.

## Ownership and verification

The [Investment adapter](../../planning/context-canvas/studio-study-investment.mjs)
owns instance selection and compact projections. Its
[stylesheet](../../planning/context-canvas/studio-study-investment.css) owns the
shelf and loaded composition. The
[financial adapter](../../planning/context-canvas/studio-investment-financials.mjs)
maps populated assumptions to the existing
[calculation core](../../collaboration/investment-analysis/core.js).
The reusable [controls](../../planning/context-canvas/studio-investment-controls.mjs)
and [control stylesheet](../../planning/context-canvas/studio-investment-controls.css)
own dial/reel behavior and presentation. The study shell owns history.

Financial assumptions and comparison copies remain inside their named deck.
The amp's shared-session total continues through its existing pricing owner.
The calculation core supplies the existing formulas; production integration
will separately establish durable schema and acceptance boundaries.

Review populated phone/laptop operation, duplicate-deck independence, connected
choices, allocation/shortfall and unchanged shared cost, money scales and brief
pointer release, static readout placement, fixed lighting, selected/focus
contrast, removal/Undo and reduced motion. Use a few independent financial
examples to establish the adapter's meaning. The receiving Issue carries actual
results; local screenshots and traces remain cycle-scoped.
