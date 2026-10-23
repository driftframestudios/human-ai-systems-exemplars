# Typography and reading measure

Typography gives each artifact a usable pace. Prose, labels, measurements, and
metadata receive distinct jobs while the reading sequence stays coherent at
ordinary size, 200% text resize, narrow width, print, and browser fallback.

## Reading measure

Sustained prose targets approximately 50–66 characters per line and usually
stays within 75. This repository composition heuristic gives each receiving
layout room to account for its typeface, language, size, weight, tracking,
container padding, and reader preferences.

Larger leads commonly use about `58ch`. Ordinary standalone headings commonly
use about `32ch`. Captions, instructions, definitions, and evidence boundaries
return to the prose measure even when the related table or diagram uses a wide
field.

## Type roles

| Role | Useful treatment |
| --- | --- |
| Display | Distinctive system or locally available face, compact measure, strong line-height |
| Body | Familiar system sans or serif, at least `1rem`, comfortable leading |
| Control | Inherits the body family and size so native behavior and labels remain aligned |
| Metadata | System mono or compact sans, at least `0.75rem` in these contracts, short and high-contrast |
| Measurement | System mono with tabular numerals when comparison benefits |
| Diagram label | Sized for full-view and zoom legibility, paired with a semantic companion |

Font loading keeps a usable system fallback with similar role and line-height.
Layout remains coherent when the preferred face arrives late or remains
unavailable. Content order and container ownership absorb metric changes.

## Form labels and selection controls

Text, number, and selection controls place a persistent visible label directly
above the field by default. This arrangement keeps the label and value within a
compact vertical scan path, gives narrow and zoomed layouts room for the entered
value, and preserves the field's purpose while a person reviews completed work.
Checkboxes and radio controls retain the familiar label beside the control.

The HTML `label` uses an exact `for` and `id` association. Instructions and
errors connect through `aria-describedby` when they add information beyond the
label. A custom select indicator keeps a `12px` inset inside the 8–16 pixel
visual-control range and mirrors that inset at the inline end in either reading
direction. Pixel-capped indicator chrome leaves enlarged option text more of
the available field width. Forced-colors mode restores the browser-owned select
indicator.

This default follows the [W3C WAI form-label guidance](https://www.w3.org/WAI/tutorials/forms/labels/),
which describes the narrow-width and low-vision benefit of labels above fields,
the [GOV.UK Design System text-input guidance](https://design-system.service.gov.uk/components/text-input/),
which aligns visible labels above their controls, and the
[Nielsen Norman Group guidance on form spacing and scanning](https://www.nngroup.com/articles/form-design-white-space/).
Each receiving layout still checks proximity, grouping, language direction,
zoom, and the actual task before accepting the arrangement.

## Text resize and spacing

At 200% text resize:

- controls grow with their labels;
- blocks grow in the reading direction;
- text wraps inside the region that owns it;
- sticky and fixed regions preserve access to content and focus;
- truncation exposes the complete value through a nearby accessible route; and
- text-driven functions retain the same action and status.

User text-spacing overrides receive the WCAG reference values as an observation:
line height `1.5`, paragraph spacing `2` times font size, letter spacing `0.12`
times font size, and word spacing `0.16` times font size. The artifact preserves
content and operation under those overrides.

## Dense technical labels

Compact metadata earns its size by carrying a short, secondary fact such as a
unit, revision, status code, or source identifier. Primary actions, errors,
instructions, and decision text use body-sized type. A full-size route or zoom
view supports diagrams whose technical granularity requires compact labels.

## Review probe

1. **Question:** Can a reader follow the hierarchy and operate every control
   when text metrics, zoom, and spacing change?
2. **Mechanism:** Load system fallbacks, resize text to 200%, apply spacing
   overrides, and inspect narrow and print layouts.
3. **Observable evidence:** Content remains available, labels stay attached to
   controls, headings preserve sequence, and wide artifacts keep prose locally
   readable.
4. **Instruction yield:** Adjust the owning type role, measure, or container
   while preserving the complete page scale.

## Re-entry

A font, language, size, line-height, text-spacing, container, truncation, or
browser-metric change reopens the fitting typography observation.
