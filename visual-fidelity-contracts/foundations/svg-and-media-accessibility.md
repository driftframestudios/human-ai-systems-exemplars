# SVG and media accessibility

A visual becomes reusable when its visible form and semantic companion describe
the same object, relationships, states, and decision. The visual can then serve
people who inspect pixels, people who inspect code, and people who use an
assistive or machine-reading route.

## SVG contract

An informative standalone SVG includes:

- a decision-useful `<title>` and `<desc>`;
- `role="img"` and an accessible name when the embedding context requires it;
- a stable `viewBox` and responsive sizing;
- semantic groups and stable IDs for meaningful regions;
- written node, edge, state, and unit labels;
- integrated arrowheads whose markers align with the path;
- source order that follows the intended reading; and
- a nearby table or ordered explanation for consequential relationships.

Decorative SVGs use the embedding route's decorative treatment. Interactive
SVG elements receive native or explicit roles, accessible names, keyboard
behavior, visible focus, and an equivalent control outside the drawing when that
route is more dependable.

An SVG's readable XML can help a technical reader inspect structure. The
accessible name, description, visible labels, and semantic companion remain the
primary interpretation contract.

## Raster images

Each informative image receives:

- a concise alternative that describes its useful job in context;
- a figure number when surrounding prose refers to it;
- a caption that says what the image is and why it appears here;
- source and currentness standing;
- intrinsic width and height to reserve layout space;
- responsive derivatives or sizing hints that fit the delivery route; and
- a full-size route when detail changes the decision.

Long visual description can sit in a collapsed disclosure whose content remains
available to screen readers according to the selected semantic pattern. A
caption adds the figure's role, relationship, and reason for appearing.

## Video and motion

A video receives captions for spoken content, a concise visual transcript for
meaningful silent action, a useful poster, duration, controls, and a stable media
delivery route. Motion demonstrates a state transition; written state preserves
the same meaning. Reduced-motion behavior preserves the initial and final
conditions.

## Canvas and generated graphics

Canvas output receives a DOM or table companion derived from the same state.
Generated visual artifacts preserve stable IDs, labels, source standing, and
state equivalence between the drawing and its semantic representation.

## Review probe

1. **Question:** Which relationship or action becomes unavailable when pixels,
   color, motion, or scripting is removed?
2. **Mechanism:** Compare visual output, accessibility tree, source order,
   semantic companion, print, reduced motion, and scripting-disabled use.
3. **Observable evidence:** Names, relationships, states, units, and actions
   agree across the visual and semantic routes.
4. **Instruction yield:** Repair the source model or the projection that owns
   the mismatch, then rerun both routes from the same state.

## Re-entry

A data shape, visual label, image crop, SVG structure, poster, transcript,
motion, source standing, or assistive-technology observation reopens review.
