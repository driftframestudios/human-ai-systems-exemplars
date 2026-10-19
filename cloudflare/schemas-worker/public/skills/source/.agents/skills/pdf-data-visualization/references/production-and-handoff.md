# PDF figure production and handoff

Load when physical placement, backend/font behavior, dense export, or final
assembly changes the figure. The [PDF skill](../SKILL.md) supplies the receiving
contract. The existing document pipeline remains the assembly owner.

## Size is a data-reading decision

Set the intended figure width in physical units. PDF points use 72 points per
inch; a figure designed at 180 mm and placed at 90 mm scales its text and strokes
to half their authoring size. An 11-point label would then read at 5.5 points.
Design for the final placement, or change the permitted panel/page arrangement.
Exact point sizes depend on the audience, typeface, medium, and publication rules;
a universal smallest font is weaker than an observed final-size reading.

Reserve space for long category names, units, source context, and the actual
number format. Tight bounding boxes can alter final dimensions, so confirm the
placed output rather than assuming the canvas alone sets the final footprint.

## Existing Python pipeline first

When Python is the selected route, use the repository-declared runtime and
existing environment. A fitting Matplotlib route separates data preparation
from a function that returns a figure with explicit size, labels, scales, and
layout. Use a scoped style context to retain predictable defaults outside that
figure. Keep source precision through derivation and format at the label layer.

Consult the installed version's font and export documentation before using
backend-specific options. Matplotlib's `svg.fonttype` set to `none` can preserve
SVG text, with the corresponding font-availability tradeoff. PDF font settings,
font embedding permissions, glyph coverage, and the consuming document pipeline
need their own choices. Preserving text differs from converting glyphs into
paths, and both differ from tagged semantic reading order.

Use the established renderer when JavaScript or another pipeline already owns
the figure correctly. A Python rewrite earns its cost through reproducibility,
statistical tooling, document integration, or another material result.

## Mixed vector and raster output

Prefer vector marks for modest diagrams and plots. When dense layers create a
measured file-size or rendering problem, rasterize only those layers if supported.
Keep labels and axes vector where possible. Determine raster pixel dimensions
from final physical size and output resolution, then inspect the placed result.
Large DPI values affect raster components; they do not enlarge text or repair
clipping in a vector composition.

Preserve the underlying exact records or summarized table when the reader needs
recovery. A smaller PDF with an intact interpretation can be more useful than a
very large vector file containing every indistinguishable point.

## Figure-to-document handoff

| Item | Figure owner supplies | Document owner observes |
| --- | --- | --- |
| Geometry | Intended width/height, panel layout, permitted scaling | Actual placement, crop, label size and margins. |
| Meaning | Population, units, denominator, window, uncertainty and supported reading | Caption proximity and consistency with the document claim. |
| Fonts | Used fonts, embedding/fallback conditions, glyph needs | Final glyphs, searchable text and font portability. |
| Dense layers | Raster/vector choice and resolution at intended size | Legibility, file size and rendering behavior. |
| Access | Text equivalent and exact-value companion | Figure alternatives, document tags, reading order and native table relationships. |
| Reproduction | Admitted source and transformation/render owner | Agreement between final figure and approved values. |
| Release | Artifact readiness and remaining conditions | Publication authority and final carrier. |

The owners can be the same collaborator; distinct responsibilities still help
locate a defect. An untagged PDF receives that explicit limitation and a useful
companion route while its document accessibility work remains separately owned.

## Acceptance at the fitting layer

Observe changed figures at final size, including the densest panel and longest
meaningful labels. Check page boundaries, caption separation, symbols, minus
signs, units, legends, grayscale distinctions when relevant, and the exact values
that carry the conclusion. Text extraction can expose glyph/value problems;
visual inspection exposes clipping and legibility. Neither alone establishes
all PDF semantics. Keep repeated tables' headers and coherent rows available
across page breaks through the existing document tools.

Scientific claims retain their source/model review even after export passes.
Rendering and print checks can rest until a real PDF is being produced; a skills
draft or a web-only gallery does not create a need for a speculative PDF campaign.
