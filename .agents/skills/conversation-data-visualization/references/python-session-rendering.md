# Python figures in a conversation

Load this reference when a conversational question benefits from a Python-rendered
chart, multi-panel comparison, or explanatory diagram. The conversation skill
owns the receiving message. The foundation owns the data meaning; PDF and web
skills receive later destination-specific work.

## A useful session contract

Start from the decision-changing question and permitted output location.
For numeric figures, name the applicable counting unit, grouping, denominator,
time basis, and missing-value treatment. For conceptual diagrams, name the
components, relationships, boundaries, and the standing of each relationship:
supplied, hypothesized, or evidence-backed. Choose a figure size for the actual chat preview and
offer the larger asset when dense detail matters. A request for a graphic
authorizes that artifact within the current task, while package installation,
external uploads, and hosted services follow the environment's permissions.

A capable Python environment is a normal rendering option. Use the installed
runtime and libraries first. In this repository, the Python execution skill
owns isolated `uv` use; another team's existing environment may use a different
manager. Declare additional dependencies only when their capability changes the
result. An unavailable package can be met by an installed renderer or a precise
plot specification with the exact-value companion.

## Choose a tool for the operation

| Operation | Fitting starting point | Receiving boundary |
| --- | --- | --- |
| Numeric chart or multi-panel editorial figure | Matplotlib's explicit Figure/Axes interface | Keep preparation separate from drawing; retain units and source values. |
| Aggregation or reshaping | Existing pandas or standard-library data tools | Declare grouping, joins, duplicates, weights, and missingness before plotting. |
| Statistical distribution display | Existing scientific plotting tools | Inspect estimators, bins, normalization, interval definition, and sample sizes. |
| Relationship or process diagram | Matplotlib patches/arrows; existing graph-layout tool when layout is the hard part | Topology encodes declared relationships; layout needs supporting evidence before distance, sequence, or causality receives meaning. |
| Dense matrix or raster field | A matrix renderer with explicit normalization, mask and colorbar | Separate absent cells from observed zero; retain row/column meanings and exact values. |
| Requested interactive exploration | An existing locally supported interactive renderer | Offer a static reading and portable values; hosting follows explicit authorization. |

An installed graph package and a graph-layout executable are distinct
dependencies. A small relationship diagram can be laid out explicitly rather
than requiring a new service. A graph-layout seed stabilizes arrangement; it
does not establish a causal ordering or meaningful geometric distance.

## Prepare before painting

For conceptual diagrams, use a structured relationship list and text reading
instead of a numeric table. Declare which relationships are supplied or inferred.
For numeric figures, follow the applicable preparation steps below.

1. Admit the source and freeze the analysis slice needed by the question.
2. Derive a compact table of the actual plotted values. Keep observed counts,
   exposure, rates, estimates, and uncertainty columns distinct.
3. Select the comparison operation: lookup, rank, distribution, time,
   composition, relationship, or spatial arrangement.
4. State the transformation: aggregation, filtering, logarithm, normalization,
   smoothing, binning, or projection. Record exclusions and source precision.
5. Draw from that prepared table. Keep formatting functions separate from
   numeric computation so rounded labels do not become calculation inputs.
6. Return the figure with its short interpretation, basis, and exact-value
   route. A reproducible script is useful when the next conversation may
   change the data or visual contract.

For sparse timelines, plot observations at their actual dates; line connections
carry a stated continuity assumption. Mask gaps when continuity is unspecified.
Logarithmic axes require valid values and an explanation of multiplicative
distance. Zero and negative values retain a visible alternate treatment.
Keep absent observations separate from zero, censored values, and suppression.
Use the foundation references when these choices determine the conclusion.

## Expressiveness through composition

Use a clear hierarchy: a question or supported finding, a dominant comparison,
one or two supporting views when they change the reading, and a quiet evidence
footer. Matplotlib's `subplot_mosaic`, GridSpec, or nested subfigures can express
an overview beside detail. Shared axes belong to comparable units and scales;
different units receive explicitly distinct axes or panels.

A dense, sophisticated figure can remain calm. Prefer direct labels near their
marks, purposeful whitespace, a limited semantic palette, and aligned panels.
Use a common scale when a reader is meant to compare panels. A zoomed panel
names its changed range. Give each panel a concise question rather than
repeating the same chart in several decorative forms.

Color may identify a category, magnitude, uncertainty, or an intentional focus.
Keep that mapping stable within the figure. Sequential colors suit ordered
magnitude; diverging colors need a meaningful center. Pair color with labels,
position, pattern, or shape when interpretation depends on the distinction.
Background ornamentation and shadows remain outside data-bearing geometry.

For explanatory diagrams, label each arrow's relationship. State whether a
boundary groups components, represents an organizational owner, or marks a
system interface. Quantitative arrows require a measure and scale; equal-width
conceptual arrows make only the named relationship claim. Separate an authored
conceptual example from an empirical chart in the caption.

## A rendering seam, rather than a universal template

This small example assumes the caller has already admitted nonnegative integer
counts of observed records and equal-length labels. It illustrates reusable rendering structure,
not a dataset-admission implementation or a required design.

```python
import matplotlib.pyplot as plt

def draw_counts(labels, counts, *, title, source_note):
    with plt.rc_context({
        "font.size": 11,
        "axes.spines.top": False,
        "axes.spines.right": False,
    }):
        fig, ax = plt.subplots(figsize=(8, 4.5), layout="constrained")
        positions = range(len(labels))
        bars = ax.barh(positions, counts, color="#176d73")
        ax.set_yticks(list(positions), labels)
        ax.invert_yaxis()
        ax.set_xlabel("Observed records")
        ax.set_title(title, loc="left", pad=14)
        ax.margins(x=0.18)
        ax.set_xlim(left=0)
        ax.bar_label(bars, padding=4, labels=[f"{count:,}" for count in counts])
        fig.supxlabel(source_note, fontsize=9)
        return fig
```

Choose palette, typeface, density, and layout for the subject and receiving
surface. The function returns a figure so the caller owns delivery and cleanup.
The author supplies a source note with the population and date/window where
material. A request about rates receives a different unit and a visible
denominator, rather than a relabeled count chart.

A caller can save a PNG for reliable inline preview and an SVG or PDF for a
larger inspection route, then close the figure. Select an available headless
backend when the environment requires it. Font embedding and selectable SVG
text have portability tradeoffs: preserve editable text when font availability
supports it, and provide a text/table companion regardless of outline policy.
Rendered pixels carry a reading, while the companion carries exact values and
accessible description.

## Proportionate observation

When rendering inspection is authorized, inspect the actual saved image at
conversation size. Check the decisions most likely to affect meaning: clipped
labels, panel order, scale limits, colorbar range, missing-value encoding,
annotation collisions, and a small independently specified value sample.
A successful save establishes file creation; visual review establishes the
observed reading at the inspected size. Neither result establishes all possible
receiving contexts.

Prefer the relevant data correction or one local spacing repair over repeated
whole-figure regeneration. If inspection is unavailable, describe that boundary
and retain the inspectable script/data. Use a larger image, split view, or table
when detail exceeds the preview's reading capacity.

## Prompts that make the desired result explicit

**A multi-panel comparison**

> Use the admitted records to compare event counts, exposure-adjusted rates,
> and their uncertainty in aligned panels. Use Python in the current approved
> environment. Keep denominators visible, color meanings consistent, and labels
> readable in a chat preview. Return a local image, exact plotted values, the
> source and transformation note, and a short account of what could change the
> interpretation.

**An expressive explanatory diagram**

> Create a Python-rendered diagram of the named components and handoffs.
> Distinguish system boundaries from workflow stages, label the relationships,
> and identify conceptual rather than measured geometry. Give the main route
> visual priority, retain the recovery route, and return an inline image plus
> a text reading and editable source.

**An uncertain display choice**

> Compare the two forms only if they support different decisions. Explain the
> effect of aggregation, sparse observations, or transformed scales. Prefer the
> simplest useful reading, preserve unknowns, and identify the source field
> that would settle the choice.

These are adaptable task contracts. They request artifacts and visible
reasoning about design choices; they make no claim about private model
reasoning or a team's authority to publish data.

## Sources and transfer boundary

The [Matplotlib quick start](https://matplotlib.org/stable/users/explain/quick_start.html)
supports explicit Figure/Axes ownership. Its
[layout guidance](https://matplotlib.org/stable/users/explain/axes/constrainedlayout_guide.html)
and [mosaic examples](https://matplotlib.org/stable/gallery/subplots_axes_and_figures/mosaic.html)
support composed panels. The
[colormap guide](https://matplotlib.org/stable/users/explain/colors/colormaps.html)
and [savefig reference](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.savefig.html)
inform encoding and delivery decisions. The
[patch collection example](https://matplotlib.org/stable/gallery/shapes_and_collections/patch_collection.html)
shows authored geometric composition.

These sources establish library capabilities. The repository foundation's
evidence map owns perceptual guidance and its limits. The examples here are
instructional drafts; material conversational use supplies their next exercise.
