# ASCII Zine Field

ASCII Zine Field gives a working surface the character of a small independent
publication: bold mastheads, ink rules, warm paper, compact annotations, and
typewriter texture. The visual rhythm helps a visitor find the next useful
action, understand a change, and return to work. Native HTML carries every
heading, field, control, and state.

Open the [live specimen source](./ascii-zine-field.specimen.html) to try a small
editing and recovery sequence. The [reference CSS](./ascii-zine-field.tokens.css)
supplies portable tokens and namespaced examples. The native investment studio
on the [About page](../context-canvas-project-surface/context-canvas/index.html)
uses a small dose alongside its existing Tiffany and cobalt composition.

**Standing:** review candidate, version `0.1.0`, composition ID
`vfc:ascii-zine-field`. This repository contract has a [reading guide](./ascii-zine-field/index.html)
and local specimen. Their production routes are selected for the next reviewed
release; the receiving release records actual publication.

## Choose a useful dose

Use this family when people are exploring an idea, assembling a team, tuning a
scenario, or reviewing an editable artifact. Its editorial texture fits an
investment studio, a workshop sheet, and an explanatory field note. Dense
scientific measurement and consequential operational alerts keep their domain
labels and stronger neighboring contract where that serves the work.

Begin with one masthead, restrained section rules, and one annotation treatment.
Give prose and controls clear paper around them. A plain operating panel can sit
beside a richly composed introduction. The specimen demonstrates the vocabulary;
a receiving page chooses the parts that help its visitors.

## The family vocabulary

| Variant | Useful job | Semantic owner | Smallest useful treatment |
| --- | --- | --- | --- |
| Masthead | Establish purpose and invite participation | A page header and ordinary heading | Heavy top rule, large type, one ASCII accent |
| Amp label | Frame a studio or experiment with a compact identity | Heading and short description | Ink field, warm lettering, Tiffany grille texture |
| Section rule | Separate a meaningful phase | Heading inside a section | Dashed baseline and a short border rhythm |
| Field-note card | Hold a named editable object or observation | Article, section, or fieldset | Paper field, ink outline, stable lower-right shadow |
| Patch annotation | Explain a relation, prerequisite, or proposed change | Aside with a heading and route onward | Tiffany paper, stitched border, clear next action |
| Recovery slip | Identify affected work and offer a fitting return | State message and real action | Rose paper, written outcome, strong top edge |
| Typographic stamp | Provide a short category or specimen standing | Ordinary text | Compact uppercase monospace between two fine rules |
| Weave | Add a quiet material rhythm | Decorative text hidden from assistive technology | Two to six short rows of `:`, `.`, `/`, or `#` |
| Density sample | Explain an actual ordered quantity when needed | Labeled data and its semantic equivalent | A documented mapping from values to a bounded pattern |

A stamp says what an artifact is. Terms such as “saved,” “approved,” or “ready”
describe real application state and are supplied by its owner. Decorative art
never invents progress, authority, capacity, confidence, or measured activity.
An ornamental grille remains ornamental; a data encoding includes its values,
units, scale, source, and a readable equivalent.

### Place the texture with its object

An amp grille belongs inside the ink panel that it textures. Its stable weave
gives that panel material character while the heading supplies its identity.
Keep the grille clear of labels, selector carets, and focus outlines. Changes to
a real studio setting can change an associated texture when the setting and its
value remain readable in ordinary text.

A scrollnote uses a short perforation, stitched edge, or margin mark beside a
note or recovery slip. The note's actual text and action keep the reading order.
This treatment suits a small annotation that visitors may revisit; a whole page
of repeated decorative frames adds work to finding the important note.

A leaflet uses a small folded-paper silhouette, edge pattern, or stationary
offset beside an explanatory card. The specimen's masthead introduces this
shape in ASCII. A leaflet carrying instructions remains semantic HTML, and its
fold is decoration. Text stays on a clear reading field even when a receiving
surface adds a transparent paper texture around it.

## Character sets and authored patterns

The portable core uses ASCII spaces and visible characters from U+0020 through
U+007E. Its working palette is `- | / : . # _`, with ordinary letters when a
real label benefits from monospace. Text remains ordinary HTML outside the art.
Use `data-ascii-art` on a decorative sample so the focused source check can
distinguish its strict character contract from the surrounding document.

```text
   __________________    / / / / / / / /
  / / / / / / / / / /   / / / / / / / /
 /_________________/    / / / / / / / /

##..##..##..##..##       : . : . : . : .
..##..##..##..##..       . : . : . : . :
##..##..##..##..##       : . : . : . : .
```

Plus signs carry a familiar addition cue. Reserve `+` beside headings or actions
for an actual add operation with a written label. Nearby ornament uses stitches,
dots, slashes, or a plain rule. A bounded structural diagram may still use `+`
for its intersections when its surrounding composition clearly reads as a
diagram. The distinction depends on location and visitor expectation rather
than a blanket character prohibition.

Unicode box drawing (`┌─┐`), block elements (`░▒▓`), and other glyph systems are
optional, separately named extensions. Their font metrics and character support
need a receiving-browser observation. An extension keeps its own
`data-zine-glyphs="unicode"` label and a useful ordinary-text companion when it
conveys meaning. A strict ASCII export substitutes an authored ASCII variant.

Patterns are short, original compositions. Their length follows the local
available space. Decoration may crop, shorten, or disappear as that space
contracts. A meaningful two-dimensional diagram retains its geometry in a
named, keyboard-reachable local inspection region and supplies the same
relationships in a list or semantic table.

## Controls have distinct jobs

| Job | HTML and visual reading | State and wording |
| --- | --- | --- |
| Take an action | Native button with a complete border, comfortable padding, modest corners, and stable shadow | Verb plus object: “Save example,” “Create team,” “Remove contribution” |
| Choose a field value | Labeled native select, radio group, checkbox, or range input | Selected value remains visible; the field sits inside its group |
| Reveal detail | Native `details` and `summary`, with the browser disclosure marker | Summary names the topic and previews values or the next useful entry |
| Navigate to a prerequisite | Ordinary descriptive link beside the dependent field | “Create a team in People”; return preserves the visitor's draft |
| Remove an object or membership | Rose button with explicit action wording and a distinct border | Name the object and the resulting scope; reversible changes expose a return |

Buttons in the same action group share a practical width and height. Other
groups can choose a width that fits their task. Longer labels wrap and targets
remain at least 44 CSS pixels tall. Field selectors and disclosure rows retain
their own geometry. ASCII brackets never impersonate an interactive control.

Single-choice selectors retain a native `select` and its associated label.
The reference `.azf-select` wrapper places a decorative caret 20 CSS pixels
inside the field's logical end, within the family's 8–24px range. It reserves
space for both the selected text and the caret. The caret accepts no pointer
input, while the browser owns the option menu, keyboard selection, and focus.
Forced colors restores the browser-drawn select and caret. This follows the
native-control approach described in [MDN's select styling guidance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Advanced_form_styling).

For people, name the actual relationship being changed: “Leave this team” or
“Take off this team” can fit membership; “Remove contribution” fits an artifact.
The application chooses wording from its actual operation and the visitor's
point of view. People retain their identity, settings, and place in the roster
when a selection changes. Selected state uses the native control, a written
label where useful, and border or field treatment together.

Collapsed panels offer a reason to open them: “Roles for Alex — Research lead”
or “Roles for Alex — Add a role.” Creating a missing prerequisite is available
beside the dependent control. A direct link or an in-place form preserves the
current draft and makes the return explicit.

## Palette, type, geometry, and light

The CSS is a **reference mapping**. Receiving routes map these roles into their
own scoped variables and keep their current CSS ownership and load order.

| Role | Value | Use |
| --- | --- | --- |
| Paper / panel | `#fff8ec` / `#fffdf7` | Reading and editable fields |
| Ink | `#172f42` | Body text, rules, frames, amp field |
| Muted text | `#4d5d61` | Secondary explanation on paper |
| Cobalt | `#1d47bd` | Primary actions, links, and focus on light fields |
| Tiffany / deep Tiffany | `#d0f1e9` / `#126059` | Supportive annotations and quiet texture |
| Rose / deep rose | `#f2d2d8` / `#803747` | Removal, changed work, and recovery |
| Field boundary | `#71817e` | Selectors and ordinary separators |

The focused check recomputes 4.5:1 text contrast for ink on paper, panel, Tiffany,
and rose; muted text on paper; cobalt on panel; panel on cobalt; deep Tiffany on
Tiffany; and deep rose on rose. It checks a 3:1 field-boundary ratio against the
panel. Actual focus, opacity, and browser rendering remain receiving-surface
observations.

System sans-serif carries sustained prose at 1rem or larger. Monospace marks
short labels and decoration; it is an accent rather than a reading tax. Body
copy uses a roughly 66-character measure. Bold display headings can be large
and closely spaced while their complete words remain available at narrow widths.

Fixed light comes from the upper left. Small hard shadows fall down and right;
inset pressed treatment stays inside the button. Hover, focus, and selection
change paint without translating objects. Cards and controls keep their order
and geometry as state changes. Inactive content remains readable, with ordinary
contrast for text that visitors can still use.

## Optional tactile variation follows real state

A transparent texture can make a grille, scrollnote, or leaflet feel handled:
small irregular marks, a slight change in weave, or a paper edge that settles
after a visitor changes a setting. Use a bounded decorative layer with
`pointer-events: none` and `aria-hidden="true"`. The paper behind essential text
stays opaque enough for the declared text contrast; focus and control edges
remain clear. A transparent asset retains its alpha channel and its intended
size when the receiving surface places it.

“Scramble” means an optional variation in this material treatment. Connect it to
one actual state change, such as a changed draft setting or a restored note.
The state owner supplies the value, and the written result appears immediately.
The texture can then settle once into a repeatable composition. An ornamental
shuffle represents no quantities, ranks, progress, or scientific measurement;
any such encoding has its own stated values and mapping.

The default is a still treatment. A receiving implementation that adds motion
offers a still equivalent, honors `prefers-reduced-motion`, keeps labels and
focus stationary, and lets a visitor disable the optional effect. A short
localized effect ends on its own; continuous scrambling, flashing, and
text-obscuring transitions fall outside this family. [W3C's guidance on
animation from interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
supports giving visitors control over non-essential motion. The specimen
demonstrates the still composition; each animated receiving use needs its own
behavior and motion observation.

## Native receiving pattern

The route can map only the needed reference tokens and own its selector names:

```css
.studio {
  --studio-paper: var(--azf-paper);
  --studio-ink: var(--azf-ink);
  --studio-repair: var(--azf-rose);
  --studio-repair-ink: var(--azf-rose-ink);
}
.studio-rule-art {
  overflow: hidden;
  white-space: pre;
  font: .8125rem/1.15 var(--azf-font-mono);
}
```

```html
<section aria-labelledby="people-title">
  <header>
    <span class="studio-rule-art" data-ascii-art aria-hidden="true">. . / . . / . .</span>
    <h2 id="people-title">People</h2>
  </header>
  <details>
    <summary>Roles for Alex <span>Research lead</span></summary>
    <p>Alex helps the team evaluate research choices.</p>
  </details>
</section>
```

The receiving implementation can copy a bounded mapping into its existing CSS
owner instead of loading the whole specimen stylesheet. Its README identifies
that mapping and the contract. Decoration has `aria-hidden="true"`, carries no
focusable descendants, and repeats no essential message. Real controls remain
outside hidden decorative containers. CSS-generated content is limited to
ornament; labels and state belong in HTML.

## Reflow, alternate media, and recovery

At 320 CSS pixels, headings, cards, selectors, actions, and summaries reflow in
source order. Decorative textures shorten or disappear before they impose
page-level scrolling. Actual two-dimensional content uses the local inspection
pattern described above. Print returns to white paper and black text, retains
written states, and exposes details that complete the record. Print events
preserve and restore the visitor's disclosure choice. The tested Chromium and
Firefox versions also expose the reading through print CSS; the tested WebKit
uses the print-event route. With scripting
disabled in a browser that hides closed detail text during printing, the visitor
opens the disclosure before printing; the specimen explains that route.

Forced colors uses system colors, visible outlines, native markers, and written
state. Decorative textures disappear. Primary actions retain a strong border;
removal actions retain words and a dashed border. Meaning survives the loss of
the palette and shadows. The default family is stationary; any future motion
has a clear task and a reduced-motion equivalent.

Recovery starts with the affected object, retained work, and one usable next
action. Status announcements happen once per user operation in a polite region.
The specimen saves a local example value, takes a sample annotation out of the
example while retaining its readable text, and lets the visitor restore it.
Its stable container keeps the return button and message
near the affected work. Refresh starts the teaching example again; a receiving
application owns persistence, authorization, and durable recovery.

## Observe and revisit

The existing foundation suite checks catalog routes, public boundaries, and
attribution. Its focused family checks establish ASCII decoration semantics,
reference contrast pairs, and ordinary native control types. The existing
art-direction browser suite exercises editing and recovery in Chromium, Firefox,
and WebKit, narrow enlarged text, the composition breakpoint, and Chromium forced
colors, actual print events, and scriptless reading. Run the two focused files
with the repository's admitted Node environment:

```sh
node --test tests/visual-fidelity-contracts/foundation-contracts.test.mjs tests/visual-fidelity-contracts/contract-art-directions.browser.mjs
```

The receiving studio's browser checks establish its actual behavior. Inspect the specimen at
narrow and desktop widths, tab through controls, open details, exercise removal
and return, and inspect forced colors and print before promoting this candidate.
These observations establish the named surface and states; broader usability
claims require observing people doing the real task.

Revisit the family when a palette, glyph repertoire, control meaning, draft
retention path, browser baseline, or receiving composition changes. Adjust the
smallest owner that carries the new meaning. A fitting review keeps expressive
art direction and usable work visible together.
