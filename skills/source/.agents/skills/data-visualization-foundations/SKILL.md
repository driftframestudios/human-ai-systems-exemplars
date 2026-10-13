---
name: data-visualization-foundations
description: Establishes source-grounded data meaning, reader operations, visual encodings, and evidence companions before rendering. Applies when creating or materially revising a visualization across conversation, web, scientific, or document destinations.
---

# Data visualization foundations

## Contract

- **What:** A visual contract connecting a reader's question to admitted records, transformations, encodings, interpretation, and recoverable evidence.
- **When:** A visualization's population, measure, comparison, uncertainty, or form needs a decision before production. A settled figure's isolated copy correction can use direct reasoning.
- **Boundaries:** The method is operator-, renderer-, and destination-independent. Source owners establish meaning; domain reviewers retain consequential interpretation; the current task grants execution and publication authority. A visual contract describes a defensible representation rather than validating the underlying world.
- **Result:** One usable form-selection decision with its data basis, scale, companion, supported reading, unresolved condition, and fitting observation.

## Fit and attention

- **Useful when:** Several plausible charts imply different comparisons, an attractive figure conceals a denominator, or a portable artifact needs to retain meaning away from its page.
- **Poor fit when:** Exact lookup alone is better served by a table, a decorative illustration has no data claim, or the task is a domain-model validation requiring a specialist method.
- **Smallest useful dose:** One question, one population/measure contract, one fitting form, one written reading, and a recoverable value/source route.
- **Foregrounds:** Data semantics, perceptual comparison, warranted emphasis, absence, and transfer.
- **May under-attend:** Domain validity, assistive-technology behavior, physical print quality, and interaction performance have their own observations.
- **Interactions:** A destination skill owns the delivered artifact. This foundation augments that owner; semantic-table-design owns complex table relationships and source-authority-mapping resolves disputed lineage. Each supporting route returns one decision to the same artifact.
- **Rest or release when:** The selected representation answers the question with fitting evidence, or a bounded source question supplies a clear return route.

## Inputs, defaults and output

Minimum inputs are a reader question and a source or explicitly authored example.
Audience, stakes, intended use, and uncertainty shape the reading; the method can
start while a destination remains undecided. Unknown units, populations, time
bases, permissions, and source standing remain explicit questions. A source-free
request can receive a labeled example or a proposed specification when that
serves the requested exploration.

The default is the simplest representation that enables the operation: compare,
rank, inspect spread, follow change, reconcile, or trace a relationship. A topic
such as "performance" becomes a question before it becomes a chart. Output can
be a short paragraph and table; a new schema, scorecard, or ledger earns a separate
receiving need.

For a corpus-backed or public-extract view, admit the source before rendering:
establish permission, counting unit, retrieval coverage, and the recording rule
that gives absence its meaning. The portable
[source-admission contract](references/form-and-data-contract.md#public-extract-and-search-coverage-admission)
applies independently of a particular project or destination.

## Rules

### Rule: Records keep their meaning before marks acquire shape

Name source identity and vintage, observation unit, inclusion/exclusion rule,
population, quantity, unit, denominator, time basis, and transformation. Keep raw
records separate from derived records and display formatting. A digest proves
identity against trusted bytes; semantic and statistical warrants come from the
owning definitions and fitting review. Published generated records, an authored
example, measured observations, and estimates retain distinct standing.

### Rule: The reader operation selects the comparison

Aligned position or length is a useful starting point for close quantitative
comparison. An ordered table may be the best answer for exact lookup. Topology,
geography, sequence, and containment have their own spatial meanings. A boundary
around a group expresses membership; area or distance acquires numeric meaning
only through an explicit encoding. The form guide supplies alternatives and
tradeoffs rather than a universal ranking.

### Rule: Aggregation preserves the counting unit

For compatible disjoint populations, a rate is `100 * sum(events) / sum(exposure)`.
An unweighted mean of group rates answers a different question. Unique records,
repeated events, and memberships in overlapping groups remain distinct measures.
Part-to-whole displays require mutually exclusive parts and a defined whole.
Show denominators when unequal exposure changes interpretation. Source-supported
disagreements remain visible for reconciliation rather than silently becoming a
cleaner dataset.

### Rule: Absence and uncertainty stay interpretable

Observed zero, empty population, missing measurement, invalid input, suppressed
value, inapplicable measure, and incomparable definition retain their meanings.
An empty denominator yields an unavailable rate. Intervals name their type,
method, assumptions, and population; descriptive spread differs from inferential
uncertainty. Inference about a broader process needs an appropriate sampling and
process model. A complete count of a released file alone supplies neither that
model nor an uncertainty estimate.

### Rule: Scales and transformations carry the comparison honestly

Magnitude bars use a meaningful zero baseline; a dot or interval plot can support
a labeled restricted range. Comparable panels share units and scale unless an
explicit changed basis serves the task. Log scales, normalization, bin edges,
smoothing, aggregation, sampling, and exclusions are visible decisions. Preserve
time order and actual spacing where chronology matters. An identifier supplies
identity; temporal interpretation requires a time field.

Sparse observations retain visible support and gaps; a connecting line carries
an explicit continuity assumption. Ratio-based readings can earn a log scale
with an admitted domain and interpretable ticks. When several displays fit, name
the fact that would favor one, then choose the smallest adequate view. Load the
[boundary guide](references/sparse-time-scales-and-form-boundaries.md) when these
decisions affect the reading.

Aggregation, distribution, and inference carry their own admission conditions.
Preserve subgroup composition, observational support, censoring, and uncertainty
meaning when they change the comparison. Select the relevant condition from the
[interpretation guide](references/aggregation-distribution-and-uncertainty.md);
a simple descriptive display can remain simple.

### Rule: Emphasis explains an evidenced reading

Exploration can lead with a question; explanation can lead with a supported
finding. Color marks category, magnitude, state, or selected emphasis with a
consistent role. Direct labels, spacing, type hierarchy, and restrained rules
carry structure. Neutral context remains reachable around an emphasized pattern.
Flat quantitative marks are the working default here; a destination's aesthetic
system supplies presentation without inventing extra data dimensions. Aesthetic
clarity and remembered emphasis are distinct from accuracy, trust, and causality.

### Rule: Visual and exact-value routes agree

The figure, concise reading, table or structured companion, and export share the
same admitted state. Carry source, population, unit, denominator, relevant window,
rounding, and uncertainty near the values they qualify. Match the companion to the
task and density; a full transcription is useful when exact recovery needs it.
Semantic labels and metadata describe the subject. Instructions to a receiving
AI remain in the person's explicit request, and interpretation capabilities stay
specific to the receiving system and input mode.

### Rule: Production and evidence mature separately

The Atlas's F0-F3 progression describes production commitment, from portable
structure to high-fidelity rendering. It is neither a correctness score nor an
evidence ladder. The prototype's numeric fit scores remain local heuristics;
portable recommendations carry qualitative fit, conditions, and caveats. An
editorial figure and a scientific figure can share the same evidence discipline.

### Rule: Verification answers the changed question

Separate source arithmetic, transformation, visual geometry, interaction,
accessibility, and interpretation claims. Use an independently specified small
fixture for consequential calculations and a fitting rendered observation for
changed layout. A successful render leaves adjacent statistical or interaction
claims open. Reuse existing evidence within its source/state scope; rerun the
affected observation when that boundary changes.

## Operating sequence

1. **Frame:** Name the question, audience, stakes, and desired reader operation.
2. **Admit:** Establish source standing, record unit, fields, absence, permissions, and transformations; route material ambiguities to their owner.
3. **Compare forms:** Consider the smallest useful alternatives and select a form with a written fit reason and one consequential caveat.
4. **Specify meaning:** Set scale, ordering, labels, color roles, uncertainty, and exact-value companion before styling.
5. **Hand to production:** Choose the actual destination owner and pass the same contract, preserving the user's chosen tool and delivery route.
6. **Observe and release:** Establish the changed claims through proportionate evidence, name remaining uncertainty, and stop when the intended reading is available.

## Decisive scenarios

### Scenario: Product groups have different exposures

- **Given:** Three groups have different record counts and a binary label.
- **When:** A reader asks which group has the largest burden and highest frequency.
- **Then:** Counts and rates receive distinct labels and denominators, and the representation makes both comparisons recoverable.

### Scenario: Overlapping flags resemble parts of a whole

- **Given:** One record can carry several failure-mode flags.
- **When:** A proposed stacked chart implies one mutually exclusive category per record.
- **Then:** Independent flag counts or a membership/reconciliation view carries the relationship; a composition chart waits for a source-owned exclusive partition.

### Scenario: The requested chart adds little value

- **Given:** A reader needs three exact values with no pattern-reading task.
- **When:** A chart would add interpretation work.
- **Then:** A compact table or sentence completes the request, and the visualization route rests.

## Strain and recovery

Unsettled denominators, repeated styling passes, excessive views, or a growing
reference list that leaves the decision unchanged signal a return to one reader
question. Preserve admitted records and useful findings. A disputed source,
unavailable context, or inaccessible carrier can yield a precise held question
and a text/table route instead of invented evidence.

## Conditional context

- Load [form and data contract](references/form-and-data-contract.md) for source admission, search coverage, counting units, chart-family selection, rates, uncertainty, dense matrices, or a transfer brief.
- Load [sparse time, scales, and form boundaries](references/sparse-time-scales-and-form-boundaries.md) for irregular observations, missing intervals, logarithmic transforms, or a consequential choice between plausible displays.
- Load [aggregation, distribution, and uncertainty](references/aggregation-distribution-and-uncertainty.md) when population mix, weighting, censoring, binning, normalization, repeated observations, or inferential claims change the reading.
- Load [evidence and source map](references/evidence-and-source-map.md) when making research-backed claims, adapting a practitioner rule, or extending the method.
- Load [Atlas exercises](references/atlas-exercises.md) for a coordinated Atlas
  view, gallery work, or a separately reviewed research extract. This task
  binding releases when those receiving decisions settle.

## Completion and re-entry

The reader can identify the represented population, perform the intended
comparison, recover exact meaning, and locate the supporting source. Draft skill
standing describes authored guidance; natural use and independent review supply
observations, while transfer and public release retain separate decisions. A new
population, task, transformation, renderer, or demonstrated misreading reopens
the smallest affected boundary.
