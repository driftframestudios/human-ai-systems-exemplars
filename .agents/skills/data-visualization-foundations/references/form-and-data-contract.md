# Form and data contract

Load this reference when the question-to-form decision, counting model,
uncertainty, or transferable specification needs more detail. The
[foundation](../SKILL.md) owns the portable meaning contract; the destination
owner chooses the final carrier. This reference is a decision aid, not a new
schema or required questionnaire.

## A compact visual brief

Keep only fields that change the receiving decision. A short prose brief can
carry the same information as this optional working shape:

```yaml
reader_question: Which populations differ in event frequency and volume?
cognitive_move: compare
data_basis:
  source: named public source or approved local input
  standing: observed, generated, authored example, or estimated
  observation_unit: one eligible record
  population_and_window: source-defined inclusion and time basis
  measure_and_unit: events and events per 100 eligible records
  denominator: eligible records in the selected population
  transformations: grouped sums followed by rate calculation
  absence: empty population yields an unavailable rate
representation:
  form: aligned count and rate views with an exact-value companion
  scale_and_order: named common scales and stable group order
  color_role: one consistent selected-population accent
  uncertainty: descriptive file counts; broader inference needs a model
reading: the supported contrast, with its consequential qualification
observation: the smallest source and rendered claims that changed
```

This is an example of a brief's shape, not an instruction to instantiate every
field or a machine contract that an existing prototype must import.

## Move, primitive and fitting form

| Reader operation | Data conditions | Useful starting forms | Consequential boundary |
| --- | --- | --- | --- |
| Compare magnitudes or rank | Categories, compatible quantity and unit | Aligned bars, dots, ordered table | Bars encode distance from zero; ranking precision depends on uncertainty and ties. |
| Follow change | Comparable measurements at meaningful times | Line, step plot, common-scale small multiples | Time spacing and gaps remain meaningful; a line asserts a connection between observations. |
| Compare two states | Stable identity with two compatible values | Dumbbell, slope chart, paired table | Distinguish paired entities from changing population membership. |
| Inspect composition | Exclusive parts, defined common whole | Ordered part table, stacked bar, 100% stacked bar | Overlapping memberships require a different display or an admitted partition. |
| Inspect spread | Individual observations or a defined distribution | Strip/dot plot, histogram, box plot, density | Declare bins, bandwidth, sample size, and summary definitions as applicable. |
| Inspect uncertainty | Estimate plus supported uncertainty description | Interval plot, band, distribution, explicit range | Confidence, credible, prediction, and descriptive ranges answer different questions. |
| Inspect association | Paired observations, compatible axes | Scatterplot, faceted scatter, binned density | Jitter, overplotting treatment, exclusions, and fitted models stay visible. |
| Compare many dimensions | Defined row/column units and measures | Heatmap, dot matrix, common-scale small multiples | Mixed units need separate scales or an explicit normalization with original values available. |
| Compare with a reference | Observed quantity plus a source-owned target/range | Bullet graph, dot with reference, compact ledger | A target is a supplied reference, not a decorative threshold invented by the renderer. |
| Follow ownership or sequence | Entities, edges, direction and ordering | Flow, sequence, swimlane, relationship matrix | Edge type and spatial grouping carry semantics; decorative proximity alone supplies no relation. |
| Inspect geography | Meaningful locations or spatial units | Map with exact values, paired ranked comparison | Area, projection, population exposure, and geographic inference remain explicit. |
| Recover exact values | Values, identity, units and qualifiers | Native semantic table or text | A chart can accompany lookup; a table can complete the task by itself. |

These forms are starting options. The Atlas's Recommended, Conditional, and
Reserved classes express contextual fit with written reasons. A donut, radial
profile, or area-based diagram may serve a specialized low-precision task; an
aligned companion keeps precise comparisons available when they matter.

## Counting, rates and reconciliation

Define an eligible set `S`, an event rule `e`, and a denominator before drawing.
For a binary event label, `events = sum(e(record))` over `S`. For repeated events,
the numerator may exceed the number of eligible records; the displayed unit
then names events per exposure rather than a percentage of affected records.

For disjoint, definition-compatible groups:

```text
pooled_rate = 100 * sum(group_event_counts) / sum(group_exposures)
```

This differs from the mean of the group rates. Reconcile overlapping groups by
record identity before a unique-population total, or deliberately report
membership counts. A numerator and denominator inherit the same inclusion,
period, and eligibility contract. Their common appearance in a table alone
does not make them compatible.

Display precision belongs at the final formatting boundary. Keep source
precision for derivation; use consistent rounding in figures and companions.
A calendar window, rolling window, cohort window, observation timestamp, and
publication date are different time concepts. Partial windows remain named.

## Absence and uncertainty

| State | Useful representation | Receiving action |
| --- | --- | --- |
| Observed zero with positive exposure | Zero mark/value, with denominator | Compare under the same definition. |
| Empty selected population | Named empty state; unavailable rate | Revise the selection or retain the empty finding. |
| Missing or delayed measurement | Explicit gap/status, separate from zero | Identify the source or later vintage that could supply it. |
| Suppressed value | Suppression status without a recoverable hidden value | Apply the approved disclosure rule to figure, companion, and export. |
| Invalid value | Bounded admission/recovery message | Preserve accepted state and return the candidate to its owner. |
| Inapplicable or incomparable | Named definition boundary | Choose a compatible measure or separate panel. |
| Estimated value | Estimate with its stated method and uncertainty | Interpret within model and sample assumptions. |

Uncertainty can arise in measurement, sampling, modeling, imputation, definitions,
and source coverage. Select the form that represents the actual uncertainty.
Adding an interval formula to a complete file count invents an inferential
model unless the sampling/process assumptions have been established. A visible
range is also not a test of significance; comparisons need the appropriate
design, dependency structure, and multiplicity treatment when inference enters.

## Heatmap contract

Before rendering, fix row/column meaning, selected population, metric, unit,
bin edges including endpoint rules, scale domain, normalization, and absence.
Use a sequential scale for magnitude and a diverging scale only with a meaningful
center. Comparable panels retain a common color domain. Show a legend with units
and thresholds; disclose quantile or per-row normalization when selected.

Each binned record maps to a defined cell or a named exclusion. Underflow,
overflow, exact-edge values, empty cells, and missing input need distinct
expectations. An empty cell with zero records differs from a populated cell with
zero positive events. A rate view retains the cell denominator and makes sparse
support inspectable. Pattern discovery belongs in the heatmap; exact lookup
belongs in persistent detail or a table, with readable labels and space to scroll.

## Source and data discipline for scientific work

Establish inclusion, units, joins, duplicate identity, and missing-data policy
before the visual encoding. Record model transformations when they affect the
claim. A repeated plotting recipe is useful; a renderer-specific default is
still a choice that needs contextual fit. Preserve useful counterexamples:
unequal exposure, empty and observed-zero groups, overlapping flags, tied values,
and changed definitions. Choose only those that cross the changed contract.

## Production ladder and exit

F0 carries portable structure; F1 adds deliberate vector geometry; F2 adapts the
receiving surface's presentation; F3 supplies a richer render when the task
benefits. These are production choices, and several tasks properly stop at F0.
Stop deepening the specification when the selected owner can produce the
requested reading and each consequential uncertainty has an explicit route.
