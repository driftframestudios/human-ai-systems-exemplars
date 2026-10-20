# Table design contract v0.1

## Use and authority

Load this reference for decisions about structure, reading geometry, state or
receiving boundaries. It makes the root contract concrete without prescribing a
uniform table layout or a mandatory full test campaign.

HTML defines the table model. WAI tutorials explain accessibility techniques.
The matrices below are design and observation choices for a bounded receiving
task; their use supplies neither conformance certification nor evidence of
arbitrary downstream ingestion. Supplemental wording has its own
[conditional reference](supplemental-table-labels.md).

## Reader-job matrix

| Reader operation | Relationship to preserve | Decision-changing pressure |
| --- | --- | --- |
| Look up a precise value | Stable record identity, field heading, value and unit | An abbreviated identity or detached unit makes the value ambiguous. |
| Compare alternatives | Consistent dimensions, scale, period, order and qualifications | Card conversion or fragmented digits makes cross-row comparison harder. |
| Enter or revise data | Control identity, current value, validation state and record ownership | Reflow or sorting separates a control from the record it edits. |
| Reconcile two views | Shared source identity, version, field mapping and retained state | A generated or exported view disagrees with its semantic owner. |
| Inspect evidence | Claim, status, source and consequence remain adjacent | Color or a short status replaces the condition needed to interpret it. |
| Receive a partial record | The context required to interpret a row travels with it | Page-local orientation disappears during extraction or exchange. |

The selected operation can justify grouping, ordering, emphasis or a companion
chart. A new layout earns its complexity through that operation. Decorative
consistency alone leaves the reader benefit unspecified.

## Native header topology

For an ordinary matrix, `th scope="col"` identifies column headers and
`th scope="row"` identifies row headers. Row headers may occur beyond the first
column. This is a relationship decision, not a rule that every first cell is a
header. [WAI: Tables with two headers](https://www.w3.org/WAI/tutorials/tables/two-headers/)
illustrates both arrangements.

Group-level scope requires the corresponding row or column group structure.
`colspan` and `rowspan` participate in the grid; counting DOM cells alone is
insufficient for a spanning layout. [WAI: Irregular headers](https://www.w3.org/WAI/tutorials/tables/irregular/)
explains grouped associations. The [HTML table model](https://html.spec.whatwg.org/multipage/tables.html#the-th-element)
is the platform authority.

For a complex association expressed with `headers`, each referenced ID identifies
an appropriate `th` in the same table; IDs remain unique in the document. Include
the headers needed to disambiguate the field, including group context where
applicable. [HTML: cell attributes](https://html.spec.whatwg.org/multipage/tables.html#attributes-common-to-td-and-th-elements)
defines the attribute contract; [WAI: Multi-level headers](https://www.w3.org/WAI/tutorials/tables/multi-level/)
also presents simplification into smaller tables.

| Authored shape | Decision before projection | Fitting observation or recovery |
| --- | --- | --- |
| One complete column-header row, ordinary record rows | Establish the record identity and one intended field relationship per column. | Check every record's declared width and field correspondence. |
| Identity in an offset column or several fields | Use the declared semantic key; expose any extractor assumption about first-cell identity. | A record fixture distinguishes identity from the preceding numeric or ordinal cell. |
| Grouped headings or repeated leaf headings | Retain the group plus leaf meaning in the association and extracted field path. | Trace representative cells across each group boundary. |
| Irregular or multi-level associations | Supply explicit supported relationships or simplify while preserving the reader task. | An unsupported flat projector returns owner review; the native table need not be invalid. |
| Missing record cell or a newly header-only row | Distinguish a present blank from an absent field before deriving a complete record. | Hold the affected asset for shape repair; other admitted assets retain their own outcomes. |
| Summary, section heading or empty-state row | Declare its non-record role and the expected population for that state. | Validate that role separately from the ordinary record-width contract. |
| Duplicate or ambiguous header meanings | Name the intended group, unit, period or identity distinction. | Resolve the source meaning before producing plausible-looking supplemental labels. |

An existing `caption` or fitting visible orientation introduces the table.
Long-form explanatory context stays with the table and travels when the receiver
needs it. Required accessible naming follows its actual semantic requirement.
Custom metadata cannot repair an absent native relationship.

## Column meaning and reading measure

| Field role | Preserve | Fitting layout choice |
| --- | --- | --- |
| Human identity | Exact name, diacritics and enough context to distinguish records | Allow useful language-aware wrapping and an adequate identity column. |
| Number | Sign, digits, precision, unit, denominator and period | Use consistent alignment and enough measure for meaningful numeric groups. |
| Status or absence | The distinction between zero, blank, unavailable, invalid and inapplicable | Keep status text and qualifications available alongside any visual cue. |
| Explanation | Ordinary reading order and the condition that changes the decision | Permit prose to wrap at useful boundaries instead of compressing every column equally. |
| Identifier or code | Exact token identity and literal meaning | Give long identifiers a deliberate wrapping/scroll policy, distinct from prose-fragment triage. |
| Control or action | Its record, purpose, state and focus visibility | Preserve operability and a clear relationship to the value being inspected or changed. |

Tabular numerals, end alignment, restrained grouping and whitespace are available
design choices. A universal minimum table width can establish overflow while
leaving individual columns unusable. Inspect the actual reading measure.

## Local scrolling and embedded composition

When comparison needs two dimensions, a local scroll owner preserves the table
while adjacent prose and controls reflow. Its purpose and keyboard reach are
explicit. A fitting focus mechanism follows observed operability; every table
does not acquire an extra tab stop by default.
[WAI's Reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
describes the two-dimensional-content exception and surrounding reflow duties.
[W3C Design System tables](https://design-system.w3.org/styles/tables.html) provide
an implementation example, rather than a universal HTML requirement.

Layout diagnosis keeps outer viewport, parent content width, frame/client width
and child viewport separate. A `min-width: 0` ancestor and local overflow can
resolve containment; column allocation remains its own decision. A breakpoint
responds to the measured pressure. A container query fits an internal container
constraint; it is optional when child viewport rules already own the problem.

A changed seam receives observations just below, at and above it when that seam
is consequential. The actual embedded width accompanies fitting standalone
controls. Final-column reach, focus visibility, sticky layers and scroll
ownership matter when those features change. Virtualization or pagination needs
a demonstrated scale or interaction reason and its own record-coverage contract.

## Ownership and output matrix

| Surface | Meaning or mutation owner | Agreement to preserve |
| --- | --- | --- |
| Authored native HTML | The selected source table and its source-preserving editor | Original unowned bytes, native text and the accepted semantic label mapping. |
| Generated table | The semantic descriptor and canonical renderer | Visible wording and supplemental wording derive from the same reviewed meaning. |
| Runtime user record | The record owner, with the existing output-context escaper | Literal names, labels, units and values survive rendering and exchange. |
| Packaged projection or mirror | Its declared packaging/generation route | The owned source change reaches the maintained copy through that route. |
| Print, report or detached export | The named export receiver | Units, context, state and qualifications needed in that output remain available. |
| Embedded child | Parent, child and packaging owners at their respective boundaries | Available width, interaction policy and the full-view route remain coherent. |

An historical snapshot keeps its comparison role. The current change operates
on the accepted living owner. A metadata rewording can preserve all visible text
while changing the declared supplemental mapping; parity then checks that mapping
and exact literal values rather than requiring identical display strings.

## Observation selected by changed boundary

| Changed boundary | Smallest useful observation | Broader observation when warranted |
| --- | --- | --- |
| An authored supplemental label only | Native-attribute scope, the expected decoded label, unchanged visible/native content, unowned-byte preservation and applicable projection parity | Rendered checks when CSS-generated content, selectors, naming or interaction actually consumes that attribute. |
| A new table or page entering an existing family | Required source-inventory membership, the owning projector or renderer's table/header/row/cell contract, and independently expected meaningful records | Fitting rendered checks for the new surface; existing family checks receive the new carrier through their declared registration boundary. |
| A label normalizer or generator | Literal and entity forms, protected names/units, escaping, repeated application, output limits and affected generated records | Runtime or browser cases when the renderer changes behavior or exposes a new state. |
| Native header topology or required fields | Record-shape and association fixtures, including group or empty-state boundaries | Relevant DOM/accessibility-structure and interaction observations; assistive-technology behavior has its own receiver. |
| Width, wrapping, scrolling or parent composition | The affected column family at its measured constraint | Changed seams, keyboard reach, enlarged text, print or forced colors when the changed rules affect them. |
| Filtering, disclosure, selection or editing | Exact record identity, actual state transition and retained/exported state | Fitting material journeys or recovery cases for the changed state boundary. |
| Parsing, source edits or repeated allocation | Unsupported grammar, quoted/raw-text boundaries, byte preservation, budget admission and source-drift fixtures | Known-corpus observation or measured growth when needed by the claim; parser migration retains a separate decision. |

Existing required gates remain with the receiving task. An attribute-only change
is not automatically a geometry change; a changed source digest is still a changed
identity for any checkpoint that includes it. Proportional case selection and
honest evidence invalidation are compatible. Reused evidence states its supported
scope instead of being silently relabeled as a fresh observation.

A static record check establishes its selected static population. Generated,
hidden, input-dependent and scriptless populations remain separately visible.
Geometry heuristics identify candidates for interpretation, including language,
identifiers and deliberate typography; counts of headers or pass records alone
leave broader accessibility conformance unspecified.

## Decisive scenarios

### Scenario: A missing value cell becomes an apparently harmless header row

- **Given:** A simple two-field table requires identity and amount for each record.
- **When:** The amount cell disappears and only its row header remains.
- **Then:** Shape admission identifies the absent field before label generation; the owner repairs the source rather than treating the row as an observed blank or silently omitting it.

### Scenario: The parent width differs from the child width

- **Given:** A 390px parent leaves a 279px child viewport after composition.
- **When:** Table controls and the final column are assessed.
- **Then:** The 279px child behavior receives the affected comparison, alongside fitting standalone controls; an unchanged 390px standalone result leaves that embedded constraint open.

## Sources and evidence classes

The linked WHATWG sections supply normative HTML semantics. WAI tutorials and
WCAG Understanding pages supply explanatory accessibility guidance; the W3C
design-system example supplies one practiced implementation. The local matrices
select engineering observations and design choices, including widths, breakpoints,
normalization and resource caps.

For a table-versus-chart or scanning decision, the retained practitioner sources
are [Stephen Few, Designing Effective Tables and Graphs](https://www.perceptualedge.com/images/Effective_Chart_Design.pdf)
and [Cole Nussbaumer Knaflic, Build a table](https://www.storytellingwithdata.com/blog/2020/9/1/swdchallenge-build-a-table).
They inform design judgment rather than adding HTML requirements.

## Handback

The return names the changed semantic or layout boundary, its source/projection
owner, the observation and covered states, plus one next receiver when needed.
An unsupported extraction route can remain open while the native table retains
its valid authored meaning. A new state, consumer, header ambiguity or parent
constraint reopens that specific decision.
