# Aggregation, distribution, and uncertainty

Use the condition that can change the current reading. This reference extends
the [foundation](../SKILL.md) with statistical and semantic boundaries; it is a
decision aid rather than a required analysis checklist. The
[evidence map](evidence-and-source-map.md#aggregation-distribution-and-uncertainty)
separates source guidance from the repository's applied synthesis. A substantive
modeling decision remains with an appropriately grounded analysis and its owner.

## Aggregation and changing populations

Establish the unit, exposure, membership, and weighting before comparing totals
or averages. Inspect meaningful strata when population mix could explain the
aggregate. This constructed counterexample makes that boundary concrete:

| Process | Lower-difficulty successes / attempts | Higher-difficulty successes / attempts | Combined successes / attempts |
| --- | --- | --- | --- |
| A | 81 / 90 = 90% | 1 / 10 = 10% | 82 / 100 = 82% |
| B | 19 / 20 = 95% | 16 / 80 = 20% | 35 / 100 = 35% |

B has the higher observed proportion within both strata; A has the higher
combined proportion because the exposure mix differs. This is an aggregation
reversal, often called Simpson's paradox. A stratified view answers the
within-stratum question; the combined view still describes the observed total.
Neither establishes a causal advantage. Choose the comparison from the receiving
question rather than selecting the most favorable aggregation.

For a justified reference mix, a standardized rate has the form
`sum(reference_weight[g] * observed_rate[g])`, with nonnegative weights summing
to one and compatible, supported strata. Keep the reference population and
weights visible. Missing strata require an explicit scope or model decision.
Observed and standardized rates answer different questions, as illustrated in
[ONS guidance](https://blog.ons.gov.uk/2023/01/19/age-standardising-data-what-does-this-mean-and-why-does-it-matter/).

Survey weights, exposure weights, and equal-group averages also target different
quantities. Preserve raw counts alongside a weighted result when they describe
its support. Repeated records within one unit, site, or time sequence may be
dependent; the record count and number of independent units remain distinct.
An aggregate association describes its aggregation level. Individual-level or
causal conclusions require corresponding evidence.

## Censoring, truncation, and selected observations

| Observation mechanism | Retained meaning | Fitting representation |
| --- | --- | --- |
| Exact observation | Known value under the measurement method | Point or exact-value table entry. |
| Censored observation | Known record with only a bound or interval | Labeled bound, direction, or interval; retain its status in the companion. |
| Truncated collection | Units outside an inclusion boundary are absent from the observed set | State the admitted population and selection boundary; broader estimates require a model. |
| Suppressed observation | A value is withheld under a disclosure rule | Named suppression state with consistent totals, detail, and export behavior. |
| Unobserved or delayed record | The value remains unresolved | A distinct absence state rather than an observed numeric value. |

A unit still operating at the end of a reliability observation contributes a
right-censored duration, rather than a failure at that duration. A known reading
below an instrument threshold contributes a bound; a collection that omits
undetected units introduces a selection boundary. See
[NIST censoring](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm)
and [truncation](https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/mle.htm).
Model-based estimation can use such evidence under explicit assumptions.
Substitution by a midpoint, zero, or threshold fraction changes that model.
Survivor-only or complete-case displays retain their selected-population label.

## Distribution shape, bins, and tails

Choose the quantity on the vertical axis explicitly. For an unweighted,
nonempty collection of `N` observations and a bin with positive width `w`:

```text
count = number of observations in the bin
proportion = count / N
density = count / (N * w)
```

On linear axes, density times bin width recovers the bin's probability mass.
This preserves area meaning with unequal widths; density height itself is not
a probability and may exceed one. Retain exact bin edges, endpoint rules,
counts, and the eligible denominator. These definitions are supported by
[NIST](https://www.itl.nist.gov/div898/handbook/eda/section3/eda33e.htm) and
[Matplotlib's normalization examples](https://matplotlib.org/stable/gallery/statistics/histogram_normalization.html).

When binning a transformed variable, name the variable and density basis.
For `z = log(x)` with positive `x`, density per unit of `z` and density per unit
of `x` differ. Changing only the displayed x-axis does not preserve screen-area
probability. Keep count and bin edges recoverable; use a documented change of
variable when transforming a fitted density.

Inspect plausible bin widths or bandwidths only when those choices could change
the claimed pattern. Heavy tails, multimodality, and discrete or bounded support
can make a smooth density a poor fit. Use raw points, an empirical cumulative
distribution, quantiles, or a table when they carry the question more directly.
A smoother that extends beyond the possible domain needs a justified estimator
or a different display; simply cropping the tail changes its visible mass.
[Distribution guidance](https://clauswilke.com/dataviz/histograms-density-plots.html)
illustrates these choices. Resolve unusual values against their source before
correction or exclusion, following the distinction in
[NIST outlier guidance](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm).

## Uncertainty, ranks, and repeated comparisons

Name what an interval describes: observation spread, estimate uncertainty,
prediction, measurement limits, or an authored scenario range. A confidence
interval carries its procedure's repeated-sampling coverage; a credible interval
carries probability conditional on its model and prior; a prediction interval
addresses a future outcome. State the target, method, level when applicable,
and relevant dependence assumptions. The same visual marks can carry different
meanings, as shown in [uncertainty guidance](https://clauswilke.com/dataviz/visualizing-uncertainty.html).

For a comparison, estimate the contrast of interest rather than substituting
overlap of separate intervals for its analysis. For example,
`Var(A - B) = Var(A) + Var(B) - 2 * Cov(A, B)` makes the role of pairing explicit.
Ranked estimates can remain useful descriptively while near ties and uncertainty
stay visible. A decision threshold needs its source and practical consequence;
statistical detectability and operational importance are separate questions.

A collection of nominal pointwise intervals supplies pointwise coverage.
Family-wide claims or inferential selection after many comparisons require a
matching analysis, as illustrated by
[NIST simultaneous comparisons](https://www.itl.nist.gov/div898/handbook/prc/section4/prc463.htm).
Interactive exploration can remain descriptive; record a consequential selected
comparison before treating it as a confirmatory result. An exact count in an
admitted file can stand as a descriptive count while population uncertainty
remains a separate inquiry.

## Meaning preserved by transforms and visual organization

| Boundary | Decision-changing condition | Useful response |
| --- | --- | --- |
| Composition | A share can rise because other parts fall | Retain the total and distinguish absolute quantity from share; use a defined partition. |
| Normalized profiles | Row-wise scaling or a changing baseline alters cross-row magnitude | Name the reference, preserve raw units/values, and use common scaling when comparing magnitude. |
| Ordinal categories | Order is supported while equal numerical spacing is unspecified | Use ordered categories; quantitative distance or averaging needs additional justification. |
| Cyclic quantities | The end and beginning are adjacent, such as directions or time of day | Preserve wraparound in the chosen encoding; choose a stated origin for a linear view. |
| Networks and geographic regions | Layout distance, region size, or boundaries can look quantitative | Name what position, area, and edges encode; keep spatial or aggregate claims at their supported level. |
| Dense or reduced displays | Sampling or aggregation can hide peaks, gaps, or small groups | Select a reduction tied to the reading, label it, and retain the admitted values and support. |

These are semantic prompts, not mandates for elaborate charts. Supply one primary
view and the smallest companion that preserves the consequential distinction.
Use the destination skill to carry that meaning into conversation, interactive
state, or a final document. The changed boundary determines the observation;
unchanged evidence remains usable within its established scope.
