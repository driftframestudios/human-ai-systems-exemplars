# Cobalt Temporal Field

## Purpose and fit

Cobalt Temporal Field is the source-native timeline extension of [Cobalt Operating Field](./cobalt-operating-field.md). It gives a Debrief an early temporal orientation: what happened when, which intervals matter, what returned or changed meaning, and where the source leaves timing or causality open.

Use it near the beginning of a Debrief, after the orientation or scan fields and before the longer architecture tracks. The component should let a visitor understand the meaningful time horizon before reading the detailed account. It serves narrative and evaluative orientation; project-progress dashboards use another surface.

The top rail of [Three-Way Return Motion](../context-canvas-project-surface/img/plot/three_way_return_motion.svg) is the canonical reference. Its strongest move is a shared calendar axis with source-native local intervals: two days, more than one year, and four years remain visibly different rather than being normalized into one generic sequence. The case-specific panels beneath that rail are useful Docket 10 content, not required parts of this component.

`Source-Native Timeline Rail — Visual Fidelity Contract` is the cross-workspace discovery title for this field. This repository file is its implementation-ready authority: the title can travel in a handoff while the contract, tokens, and reference visual remain available from this local path.

“Cobalt Temporal Field” is intentionally an extension rather than a separate treatment name. **Cobalt** preserves the established visual family, **Temporal** names the decision dimension, and **Field** allows one event line, several parallel lanes, a return, or a distinct later reference without forcing every Debrief into a Gantt chart.

## Inheritance

Inherit the palette, typography, geometry, hard-shadow grammar, integrated-arrow grammar, visitor-useful copy principles, and accessibility baseline from Cobalt Operating Field and its [shared tokens](./cobalt-operating-field.tokens.css).

The temporal extension adds only:

- a calendar, ordinal, or hybrid orientation axis;
- source-native marks for anchors, intervals, returns, and open periods;
- local magnification when a meaningful short interval would disappear on the larger scale; and
- a compact statement of the changed meaning, work, or investment that makes the timing consequential.

No additional token file is required. SVGs may mirror the shared token values in an internal style block so that each artifact remains portable.

## Source-first assembly

Build the temporal model before drawing the axis:

1. Read the canonical Notion material and collect every visitor-useful time phrase in its original wording.
2. Record the source pointer, precision, and claim posture for each phrase.
3. Separate delivered history, participant recollection, reconstructed sequence, contemporary reference, and unresolved interval.
4. Choose the least precise axis that faithfully contains the material.
5. Add a temporal relationship only when the source supports that relationship.
6. Name what changed because of the interval: interpretation, decision, work, ability, residual condition, or investment.

Preserve phrases such as “Q2 2023,” “within two days,” “more than one year after acquisition,” and “2021–2022.” A normalized date may help calculate position, but it does not authorize a more precise visible label. Keep “before,” “after,” “approximately,” “by,” and “still open” when those qualifiers carry meaning.

When the sources establish order without calendar dates, use an ordinal axis with source-native phase or event names. Label it as an undated sequence. When short and long intervals coexist, retain a shared orientation axis and provide a written local magnification instead of pretending that both scales are visually proportional.

## Semantic anatomy

A compact Cobalt Temporal Field reads in this order:

1. **Scope header** — source-supported horizon, declarative title, and one-sentence consequence.
2. **Orientation axis** — the calendar, phase order, or explicit hybrid scale.
3. **Source-native lanes** — actor, workstream, object, system, or account names from the material.
4. **Temporal marks** — exact anchors, bounded spans, qualified ranges, open intervals, or paired return points.
5. **Relationship label** — the supported motion between marks: reframed as, recurred, recognized as, overlapped, handed off, or compared with.
6. **Consequence** — the changed decision, work, ability, residual condition, or investment that makes the interval useful to the visitor.
7. **Interpretive caption** — the single temporal claim the reader should carry into the Debrief.

The first six parts may live inside the SVG. The interpretive caption belongs in the surrounding semantic HTML. Detailed architecture, population cartography, event delivery, and implementation mechanics belong in later visuals or prose.

## Mark and precision grammar

| Source condition | Geometry | Visible language |
| --- | --- | --- |
| Exact date or quarter | Ink or deep-cobalt anchor with a tick | Preserve the exact source label, such as `Q2 2023`. |
| Bounded period | Solid horizontal span with two ends | State the range and its source precision, such as `2021–2022`. |
| Relative duration | Paired anchors with an acid duration capsule | Use the source phrase, such as `WITHIN TWO DAYS`. |
| Approximate or qualified range | Blush rounded span with an explicit qualifier | Say `approximately`, `by`, `before`, `after`, or `>1 year`; geometry remains secondary. |
| Open or unresolved period | Open-ended span or bracket plus a written state | State `OPEN AS OF …` or the source-native unresolved condition. |
| Return or recurrence | Two anchors joined by a labeled directional relation | Name the motion and preserve whether the relationship is established, attributed, inferred, or open. |
| Distinct later reference | Separate band or lane with visible space between eras | Label it `CONTEMPORARY REFERENCE` or the source-native equivalent; use comparison rather than a continuity arrow. |
| Ordered but undated material | Equal-width ordinal positions | Label the axis `UNDATED SOURCE SEQUENCE`; use event names instead of invented dates. |

Color joins geometry and language; it never carries the temporal state alone. Cobalt and ink establish the spine. Acid marks a consequential return or local interval. Blush can hold an approximate, unresolved, or contested period. Sea and powder can distinguish current relational state or a receiving period. Use these roles generatively rather than assigning a permanent color to every lane.

## AI-legible data and label contract

Use this authoring-only shape while extracting and checking the source material.

```yaml
temporal_field:
  id: "source-native-id"
  title: "Declarative visitor-useful claim"
  consequence: "Why this temporal relationship changes interpretation or action"
  axis:
    mode: "calendar | ordinal | hybrid"
    display_range: "source-native range or UNDATED SOURCE SEQUENCE"
    precision: "day | month | quarter | year | range | relative | mixed"
    as_of: null
  lanes:
    - id: "stable-lane-id"
      label: "source-native actor, object, account, or workstream"
      marks:
        - id: "stable-mark-id"
          kind: "anchor | interval | relative_interval | open_interval | reference"
          display_time: "exact phrase shown to the visitor"
          normalized_start: null
          normalized_end: null
          precision: "source-supported precision"
          event: "what happened"
          changed_meaning: "what became newly visible or consequential"
          claim_posture: "source_stated | participant_attributed | reconstructed | contemporary_reference | open"
          source_pointer:
            title: "canonical Notion page title"
            url: "canonical page URL"
            source_phrase: "original time phrase"
  relations:
    - from: "stable-mark-id"
      to: "stable-mark-id"
      kind: "reframed_as | recurred | recognized_as | overlapped | handed_off | compared_with"
      label: "short source-native relationship label"
      causal_posture: "source_stated | participant_attributed | inferred | open"
  caption: "The one temporal distinction the visitor should retain"
```

`normalized_start` and `normalized_end` exist only when the source supports them and layout calculation needs them. `source_pointer` and `source_phrase` preserve authoring provenance; the public SVG should carry the visitor-useful statement while the Debrief’s Source Basis carries citations and qualifications. Claim posture is categorical rather than a numeric confidence score.

## Composition and art direction

- Use the Cobalt Operating Field header: cobalt block, quiet grid, monospace horizon label, declarative title, and short consequence sentence.
- Place the orientation axis immediately beneath the header. Lanes receive generous vertical spacing and a shared left label edge.
- Keep tick marks quiet. The events and temporal relationships, not the calendar furniture, hold visual priority.
- Use hard shadows only for a primary explanatory card or grouped region. Axis marks, labels, ticks, and ranges use clean outlines without shadows.
- Use integrated arrow shapes for a supported directional return or handoff. A simple line is enough for duration. Proximity alone never implies causality.
- Keep source-native vocabulary in labels. “Track A,” “Phase 2,” and generic milestone names appear only when the source uses them.
- Prefer one concise line per mark. Move mechanisms, qualifications, and consequences that need more room into the caption, adjacent prose, or a later visual.

A standalone early-page field usually fits a `1600`-pixel-wide viewBox and a height of roughly `480–680` pixels for one to three lanes. Let the canvas grow when readable labels require it. If the content needs a full 1120-pixel system map, separate temporal orientation from the later architecture visual.

## Reading measure

Sustained explanation follows the [shared reading measure](./README.md#shared-reading-measure): approximately 50–66 characters per line, usually remaining within 75. Orientation copy, mark explanations, captions, source notes, and evidence boundaries retain that measure.

The temporal field uses width for intervals, concurrence, return, recurrence, and handoff. Labels stay concise on the rail; longer mechanisms and consequences move into adjacent measured prose. The SVG or temporal table carries local two-dimensional inspection while the page continues in the reading direction.

## Anti-omnigraph boundary

The Cobalt Temporal Field answers one question: **how does source-supported time change the reading?**

Keep the surface bounded:

- one meaningful horizon;
- one to three primary lanes, or four only when their simultaneity is the claim;
- roughly three to eight consequential marks;
- one explicit relation vocabulary; and
- one caption-level consequence.

Use another surface for service topology, full population cartography, event-delivery mechanics, detailed project planning, or every implementation step. Split the visual when these concerns begin competing with temporal orientation.

Reserve a common axis for material that is genuinely commensurate. Use separate rails or an inset when precision, elapsed scale, or source status differs. An arrow asserts direction and often causality; use it only for a supported relationship. A milestone is a temporal fact, not proof of success. Scores, readiness gauges, process history, Docket language, Machine Nodes, and research-workflow labels remain outside the visitor-facing timeline.

## Accessibility, responsive display, and full-size opening

For the SVG:

- provide one `<title>` and one decision-useful `<desc>` referenced by `aria-labelledby`;
- give the header, axis, and each lane a `<g role="group" aria-labelledby="…">` with a local `<title>`;
- keep meaningful time labels and relationship states in accessible document order;
- mark grids, shadows, guide lines, and decorative arrow shapes `aria-hidden="true"`;
- pair color with written labels and distinct geometry;
- use at least 13px for essential timeline labels on a 1600-pixel canvas, with larger lane and event titles; and
- retain a `viewBox`, unique IDs, valid XML, and comfortable text containment.

Embed the visual with the existing Debrief pattern:

```html
<figure class="story-visual cobalt-operating-field__visual table-span-all">
  <a class="story-visual__open" href="../img/plot/example_temporal_field.svg"
    aria-label="Open the example temporal field at full size">
    <img src="../img/plot/example_temporal_field.svg" width="1600" height="600"
      loading="eager" alt="Concise description of the time horizon, marks, relationship, and consequential distinction.">
  </a>
  <figcaption class="table-note">The source-native temporal claim carried into the Debrief.</figcaption>
</figure>
```

The shared `.story-visual`, `.story-visual__open`, and `.cobalt-operating-field__visual` rules already provide wide editorial display, narrow-screen containment, hard-shadow framing, and a direct full-size opening path. A near-top orientation visual may load eagerly; later or secondary temporal visuals should load lazily. At narrow widths, preserve the proportional SVG and full-size link, then restate essential relationships in the `alt` text and caption rather than shrinking labels below legibility.

## Example adaptation — FMI LIMS/ELN

The FMI LIMS/ELN Debrief distinguishes a `2021–2022` engagement from a `2025–2026` contemporary implementation reference. A faithful Cobalt Temporal Field would:

1. use a year-precision axis spanning the two source-supported periods;
2. render `2021–2022 · ENGAGEMENT` as one bounded band;
3. render `2025–2026 · CONTEMPORARY REFERENCE` as a separate band or lane;
4. connect them with `COMPARED WITH`, not a delivery-continuity arrow; and
5. add internal anchors only when the Notion material supplies their order or date at a compatible precision.

Shared-object diagnosis, changed vendor decision, scenario-to-test practice, and partial outcomes may become labels when their timing is sourced. Otherwise they remain in the Debrief’s ordered architecture tracks. The caption should preserve the governing distinction: the later reference helps evaluate the earlier engagement without becoming delivered client history.

## Release checks

Before a temporal field ships:

- every visible date, range, duration, and ordering claim traces to canonical source material;
- displayed precision never exceeds source precision;
- approximate, attributed, reconstructed, contemporary, and open states remain visible where they change interpretation;
- geometry does not imply unsupported duration, overlap, continuity, or causality;
- event labels use source-native nouns and verbs;
- the visual answers one temporal question and leaves other systems to later surfaces;
- title, description, groups, IDs, XML, text containment, contrast, and source paths validate;
- the figure opens directly at full size and remains contained at narrow, editorial, and wide viewports; and
- the caption states changed meaning, work, or investment rather than presenting chronology as a proof ritual.
