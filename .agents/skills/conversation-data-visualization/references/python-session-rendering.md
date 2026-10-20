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

## Environment choice: isolated by default

For conversational figures, choose the session's provisioned isolated Python
runtime first. If it lacks a needed library, use an approved session-scoped
environment. A repository's Matplotlib or Seaborn declaration is useful context;
its presence alone leaves the session default unchanged. Keep the host's base
installation, repository environment, dependency declarations, and lockfiles
under their existing owners.

Resolve the choice in this order: the current task's explicit preference, an
applicable team or project instruction, then this portable default. Existing
security, package-source, and installation permissions continue to govern every
profile. Runtime selection describes dependency ownership; filesystem, network,
and code-execution permissions remain separate controls.

| Profile | Use when | Selection and evidence |
| --- | --- | --- |
| `session-isolated` (default) | Exploring or explaining data in conversation | Use the session-managed runtime or a dedicated environment with the smallest fitting approved dependencies. Repository versions are optional context. |
| `session-repository-versions` | Reproducing a project's plotting behavior while keeping its environment untouched | Read the declared Python/library versions or reviewed lock export and resolve them in a separate session environment. Name the subset reproduced; matching Matplotlib and Seaborn alone establishes selected-version parity. |
| `repository-isolated` | The human or applicable project guidance explicitly requests the project's environment | Use the existing isolated project runtime through its documented entry. Honor its lock and preparation policy. Route missing dependencies or synchronization changes through that owner before altering the environment. |

Complete locked-environment reproduction additionally depends on transitive
versions, markers, platform, native libraries, fonts, configuration, and data.
When exact parity cannot be established, explain the material difference and
offer the next source or environment choice. A strict reproduction request
keeps its exact-parity claim unresolved until the required environment is
available; an exploratory task can continue with a clearly named alternative.

### A discoverable preference, rather than another configuration system

A team can put this small declaration in its existing session instructions or
repository guidance. It is a human/AI-readable instruction block; this skill
supplies no automatic configuration loader.

```text
Conversation figure environment: session-isolated
Version policy: session-supported; record versions when reproduction matters
Repository environment: follow the selected profile and preparation policy
Artifacts: the session's approved local output location
Package installation: follow the current permission and package-source policy
```

Change the first line to `session-repository-versions` or
`repository-isolated` when that is the desired standing preference. An exact
version list or project environment entry can accompany that choice. Prefer
one such declaration in the team's established instruction surface.

For a human unfamiliar with Python environments, a concise first-use note for
the default profile is enough: "Using an isolated session environment; the repository's plotting
versions are available as an option." For an override, describe the selected profile instead. Continue without a
blocking question when the choice is settled. Ask a focused
question when a version-dependent behavior, local extension, reproduction
requirement, or environment change would materially alter the result. Ordinary
rendering needs neither an environment questionnaire nor repeated reminders.

Useful task-level overrides include:

- "Use the session's isolated plotting environment for this figure."
- "Match the repository's Matplotlib and Seaborn versions in a separate environment."
- "Use the project's documented isolated environment for this reproduction."

### Runtime preparation and recovery

Resolve the interpreter through the session's documented runtime entry before
using a bare `python` command. Inspect or install packages only inside the
selected environment. Reuse a suitable session environment for related figures
when its declared versions still fit; a fresh environment per figure adds
setup without changing the data question.

With approved `uv` access, a task can use the following command shape. The caller
supplies an existing session scratch directory, an absolute renderer path, and
any renderer arguments. Python 3.12 is this example's declared choice, rather
than a requirement imposed on every receiving team.

```sh
cd "$SESSION_SCRATCH"
MPLCONFIGDIR="$SESSION_SCRATCH/matplotlib" \
  uv run --isolated --no-project --python 3.12 --with matplotlib -- \
  python -I -B "$FIGURE_SCRIPT"
```

`--isolated` and `--no-project` jointly keep environment selection separate from
the repository; project discovery and active-environment reuse are different
concerns. Configuration and package-index policy still need their approved
source. Use `--no-config` only when intentionally replacing discovered uv
configuration with an authorized explicit setup. Add Seaborn or pinned
requirements when the requested figure needs them.

Python's `-I` excludes ambient Python paths and user-site packages, including the
script directory from the import search path. It suits a self-contained renderer;
a renderer importing sibling or project modules needs an explicit reviewed
import route. The scratch working directory and dedicated Matplotlib
configuration location separate incidental plotting configuration. Deliberately
requested project styles or fonts can be admitted as named inputs.

Where uv is unavailable, a session-provided environment or dedicated `venv`
with its own interpreter is a complete alternative. Keep installation within
that environment and preserve organizational dependency-source policy.

If a needed package, version, or runtime is unavailable, name that capability
gap and choose an available fitting renderer or a precise figure specification
with its value/relationship companion. A missing dependency earns a bounded
environment repair, rather than a silent switch into the repository environment.

Record the environment profile and actual Python/plotting-library versions
when reproducibility or a reported defect makes them decision-relevant. Preserve
the useful script, source values, and requested outputs; retire disposable
session environments and caches through their owning session. Repository tests
continue to use their source-owned runtime contracts independently of this
conversational preference.

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
> and their uncertainty in aligned panels. Use the session's isolated Python
> environment unless a task or team preference selects another profile. Keep denominators visible, color meanings consistent, and labels
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

[uv's run options](https://docs.astral.sh/uv/reference/cli/#uv-run),
[Python isolated mode](https://docs.python.org/3.12/using/cmdline.html#cmdoption-I),
and [virtual environments](https://docs.python.org/3.12/library/venv.html)
supply the environment mechanisms. The profile preference is this skill's
application of those mechanisms to conversational rendering.


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
