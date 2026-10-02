# Table design contract v0.1

## Contract

A table preserves its reader's operation across ordinary, narrow, embedded, keyboard, extracted and applicable alternate-media use. This contract defines decisions and observations; local owners select dimensions and styles from actual content.

| Concern | Desired behavior | Useful observation |
| --- | --- | --- |
| Topic and identity | Caption/close orientation and meaningful row/column headers | DOM and browser accessibility structure |
| Identity column | Ordinary labels remain readable; enough width for distinctive names | Word-range geometry plus visual inspection |
| Numeric values | Signs, digits, precision, units and periods remain interpretable | Long, negative, zero and qualified fixtures |
| Prose | Text wraps at useful word boundaries with manageable reading measure | Narrow cell and enlarged-text reading |
| Identifiers | Exact identity survives deliberate local wrapping | Source/extracted equality and visual reach |
| Two-dimensional comparison | A local scroll owner contains useful table width | Last-column reach, focus and keyboard scrolling |
| Parent composition | Surrounding headings and controls reflow independently | Outer frame, content box and child viewport |
| Partial extraction | Topic, record identity, label, value and qualifiers travel together | A named detached-row serializer |
| Progressive behavior | State and representation remain consistent | Open disclosures, filters and retained-state fixtures |
| Delivery | Canonical owner and declared projections agree | Existing generator, manifest and packaging contract |

## Implementation choices

- Prefer native `table`, `caption`, `thead`, `tbody`, `th`, `td` and appropriate `scope`; use explicit header association for genuinely complex relationships.
- Start with content-appropriate column measures and ordinary wrapping. A universal fixed table floor does not allocate useful widths among columns.
- Keep numerical alignment and precision consistent with the underlying measure. Tabular numerals and end alignment can support comparison; text remains start-aligned in the document's writing direction.
- A `min-width: 0` grid/flex ancestor and local `overflow-x: auto` solve containment, not column allocation. Observe both properties separately.
- Name the scroll region and make keyboard reach explicit where native focus behavior needs assistance. Add a concise scroll cue when overlay scrollbars make the affordance quiet.
- Cards may serve record-by-record reading when the relationships remain available. Keep a table route for tasks requiring cross-row/column comparison.
- Breakpoints respond to measured content pressure. Test both sides of a changed seam and the real embedded width. Container queries earn their place when an internal container, rather than the child document viewport, owns the pressure.
- Sticky headers/columns require an observed scanning benefit, correct stacking and focus visibility. Pagination or virtualization requires a demonstrated scale/interaction need; bounded examples often work well with native scrolling.
- Supplemental labels are generated with visible descriptors and retain the same units, qualifiers and absence meanings. Native semantics remain the baseline when attributes are ignored.

## Evidence and limits

Word-fragment geometry is a triage signal: long identifiers, language-specific line breaking, nested content and deliberate typography need interpretation. Check all columns, including the rightmost, and retain a positive readable-scroll fixture. Header `scope` counts alone are not a conformance test. Hidden states and tables whose runtime requires additional inputs stay visible in coverage accounting.

The evidence matrix includes source, rendered geometry, keyboard behavior, accessibility structure, deterministic extraction, no-script meaning, print/forced colors where applicable, and source/projection parity. Choose observations according to the affected behavior rather than accumulating an identical full suite after each small edit.

## Public research basis

- [W3C WAI Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/): native relationships and table orientation.
- [W3C Reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): meaningful two-dimensional tables can scroll locally; surrounding content and individual cells retain their own reflow obligations.
- [W3C Design System tables](https://design-system.w3.org/styles/tables.html): a named, focusable scroll wrapper around an intact table.
- [Stephen Few, Designing Effective Tables and Graphs](https://www.perceptualedge.com/images/Effective_Chart_Design.pdf): precise lookup favors tables; patterns can favor graphs, and useful information should lead the visual hierarchy.
- [Cole Nussbaumer Knaflic, Build a table](https://www.storytellingwithdata.com/blog/2020/9/1/swdchallenge-build-a-table): mixed measures and reader-specific rows can justify tables; ordering, alignment and emphasis should fit the reading task.

The W3C material provides standards-related guidance and implementation examples. Few and Knaflic provide practitioner guidance. Specific column measures, breakpoints and geometry heuristics remain local engineering decisions requiring observation.
