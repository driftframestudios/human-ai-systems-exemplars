# Sparse time, scales, and form boundaries

Load this reference when sampling, a transform, or a choice between plausible
forms changes the interpretation. The [foundation](../SKILL.md) owns meaning;
the destination skill owns delivery. These are conditional design decisions,
with [evidence standing](evidence-and-source-map.md#sparse-observations-scales-and-display-boundaries)
kept separate from local judgment.

## Sparse and irregular time

First distinguish a small number of observations, uneven observation times,
missing expected observations, and low exposure within a period. Each can call
for a different representation. Preserve actual elapsed spacing when elapsed
time is the question; an equally spaced categorical sequence needs its own
label. Retain the time basis, window boundaries, and partial-period status.

| Source meaning | Fitting starting display | Meaning carried by a connection |
| --- | --- | --- |
| Measurements at a few observed times | Visible points at actual times, with exact values available | A segment suggests a relationship between observations; interpolation needs a stated rationale. |
| Scheduled observations with missing periods | Points or a line with explicit gaps | The missing period remains visible as an observation gap. |
| State held until a dated change | Step display | The state persists between recorded changes under the source contract. |
| Events or totals within windows | Event marks or interval-aware columns with exposure and window labels | Interval totals and point-in-time levels remain distinguishable. |
| Two observed endpoints for the same units | Paired dots or a slope view | Pairing establishes endpoint change; intervening movement remains unspecified. |

[ONS guidance](https://service-manual.ons.gov.uk/data-visualisation/chart-types/line-chart)
supports markers, missing-period gaps, and process-appropriate steps. Choose from
the observation process and reader operation rather than turning a suggested
point-count cutoff into a universal rule.

Keep isolated observations visible. A line renderer may hide a singleton; in
D3, `defined` can split segments only where the input represents the gap.
Filtering missing rows out first can reconnect their neighbors. Admit a numeric
zero as an observation when its source meaning supports it; evaluate absence
explicitly rather than through a truthiness test. See the
[line contract](https://d3js.org/d3-shape/line#_line_defined).

Smoothing, resampling, and imputation produce derived values. Expose their method
and observational support when they affect the claim. Choose a gap threshold
from expected cadence or a domain decision, and name it if applied. A trend or
forecast earns a separate model and uncertainty basis. For example, the ordinary
[lag-index autocorrelation estimator](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35c.htm)
assumes equal spacing; a readable irregular-time chart establishes no such model
admission. Sparse events with a known complete observation window can support
zero-event counts; an unobserved window retains its unknown status.

## Logarithmic scales and transformed readings

Ask whether the reader needs additive differences, multiplicative differences,
or both. A linear display preserves additive distance. For positive values and
base `b > 1`, a log display has:

```text
display position = a * log_b(value) + c
log_b(y2) - log_b(y1) = log_b(y2 / y1)
```

With a fixed display domain, equal distances express equal ratios. The changes
`10 to 20` and `100 to 200` have equal log distance and different absolute
changes. Preserve a meaningful ratio basis; an arbitrary-origin quantity such
as Celsius temperature needs a different interpretation. For a ratio comparison,
the neutral reference is `1`. See the author-written
[axis guidance](https://clauswilke.com/dataviz/coordinate-systems-axes.html).

Admit every observation and interval endpoint to the chosen transform. Ordinary
real logarithms require positive values; zero, negative values, and bounds that
cross zero need an explicit alternative. Preserve those records in the companion
and choose a linear view, a separate zero category, or a justified named
transform. An added constant changes ratios: a pseudocount belongs to the model
and its sensitivity analysis, rather than a cosmetic repair.

Some libraries implement a reflected negative log domain; interpret that as a
distinct signed mapping. A symlog display can include zero, with library-specific
near-zero behavior and parameters. State that definition and its constant or
threshold; preserve the distinction from ordinary ratio distances. The
[D3 log](https://d3js.org/d3-scale/log) and
[symlog](https://d3js.org/d3-scale/symlog) contracts document these capabilities.

Prefer positional marks over magnitude bars for log comparisons because the
ordinary zero-length bar baseline is unavailable. Label a raw-value log axis
with the quantity, unit, and log-scale notice; retain interpretable raw-value
ticks. When plotting already transformed values, label the transform and base
instead. Keep the value companion in a clearly identified basis.

Select and label the domain consistently across comparable views. If filtering
changes the domain, expose that change so rescaling has a visible explanation.
One linear companion can preserve absolute burden when ratio comparison is also
needed. A straight segment on a log plot is a property of displayed values;
prediction still requires a model. An
[exponential-growth experiment](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1125810/full)
found task-dependent reading errors, supporting contextual choice rather than
one universally superior scale.

## When several forms fit

Choose one primary operation, keep the same admitted records across alternatives,
and identify the fact that changes the recommendation. A second view earns its
space by answering a different consequential question. These choices can be
settled in prose before rendering.

| Boundary | Fact that changes the recommendation | Small adequate response |
| --- | --- | --- |
| Counts or rates | Event volume versus observed frequency per exposure | Aligned count and rate views when both matter, with numerator and denominator visible. Workload or propensity claims require their own supporting evidence. |
| Paired change or group comparison | Stable unit identity versus changing membership | Paired marks for matched units; distributions or group summaries for different populations. |
| Summary or distribution | Shape, extremes, or within-unit movement changes the decision | Raw points or paired changes for small supported sets; a named distribution summary for greater density. |
| Heatmap or aligned marks | Pattern scanning versus precise differences | A matrix for patterns and a selected slice or table for precision; retain units and common scale. |
| Shared scale or separate panels | Cross-panel magnitude versus within-series shape | Shared scale for magnitude; clearly labeled scales or normalization for shape, preserving raw values. |
| Rank or estimate | A fixed observed order versus uncertain or tied estimates | Ordered dots and values, with uncertainty when supported; treat near-equal estimates as such. |
| One mixed-unit view or coordinated views | A genuine common quantity versus distinct units | Separate aligned panels by unit; any dual-axis choice carries an explicit mapping and reading task. |

For continuous small-sample data, the
[distribution and pairing examples](https://doi.org/10.1371/journal.pbio.1002128)
show why a mean alone can hide the relevant structure. Choose a density estimate
only with an explained bandwidth and adequate support for the intended reading;
raw points, an empirical cumulative distribution, or a table may serve better.
Keep outliers and changed population composition available when they change the
comparison. A visual separation or rank alone supplies descriptive evidence;
inferential claims use an appropriate statistical analysis.

## Proportionate decision and exit

State the selected form, its admission condition, and the unresolved fact that
would change it. For a consequential ambiguous case, inspect the smallest
counterexample that crosses that boundary: a missing interval, isolated point,
zero value, crossing interval, changed denominator, or changed cohort. These are
candidate checks, selected by the actual edit rather than a mandatory suite.

Arithmetic and source decisions can settle before rendering. Observe layout or
interaction in the actual receiving medium when those behaviors change. Keep
the result with the receiving work; reopen the choice when new source support,
reader evidence, or a changed task alters the decision.
