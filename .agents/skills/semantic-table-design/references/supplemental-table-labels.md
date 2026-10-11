# Supplemental table labels

## Purpose and standard boundary

This branch serves a named local extractor, serializer or presentation consumer.
`data-label` is an application-specific custom attribute. HTML permits its use
but defines neither a universal table-label vocabulary nor an ASCII-only value
contract. The repository's plain-word convention is a contextual design choice.
[WHATWG: Custom data attributes](https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
supplies the platform boundary.

Meaning needed by readers remains visible and available through native table
relationships. Custom metadata is not an accessible-name replacement. MDN
describes `dataset`/CSS access and cautions that assistive technology and search
indexing may omit these values. [MDN: Using data attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes)
is explanatory documentation; arbitrary AI or ATS ingestion remains a separate
empirical question.

For header topology and incomplete rows, load the
[table design contract](table-design-contract.v0.1.md). This branch defines
supplemental meaning after its native and source owners are known.

## Minimum context is chosen by the receiver

| Component | Receiving question | Include when applicable |
| --- | --- | --- |
| Topic | What table, scenario or undertaking does the record describe? | Caption meaning, scenario identity or a compact equivalent. |
| Record identity | Which entity or comparison alternative is this? | Human-readable identity and any stable key the receiver actually consumes. |
| Field relationship | Which dimension and group qualify this value? | Field label and relevant parent/group heading; repeated leaf names retain their distinctions. |
| Literal value | What was actually supplied or observed? | Exact text or the declared typed value; visible formatting and machine serialization have explicit contracts. |
| Unit and denominator | What is measured, per what, over which period? | Currency, scale, rate base, time window or other interpretation-bearing unit. |
| Status and qualification | Is the value zero, absent, reserved, uncertain or conditional? | Its source-defined status, scope limit, uncertainty or relevant footnote. |
| Lineage or state | Which source revision, selection or evidence does interpretation require? | Only the version/state/source relationship used by this receiver. |

This is a selection aid, not a required seven-field schema or an instruction to
copy the entire page into every cell. A row-level topic and identity can accompany
field-level labels in the receiving serializer. Where an individual cell is the
actual transfer unit, its required context needs a corresponding carrier.

## Wording decisions precede character replacement

The semantic owner classifies the component before normalizing it:

| Component or signal | Meaning-preserving action | Boundary |
| --- | --- | --- |
| Known directional shorthand in an authored descriptor | Express the reviewed relationship in ordinary words, such as `Inputs to outputs`. | An arrow can mean direction, implication, transformation or a domain operator; the glyph alone does not choose the wording. |
| A decorative separator between authored topic components | Use the approved colon or ordinary hyphen while retaining the components. | A separator inside a name, identifier or technical unit remains literal unless its owner explicitly changes it. |
| An accented name, another writing system or user-entered field label | Preserve the supplied Unicode text and existing output escaping. | General stripping, transliteration and global punctuation replacement belong to a different editing request. |
| A technical symbol, sign, exponent or unit | Preserve its identity or use an explicit domain-approved equivalent. | Meaningful notation is not decoration merely because it is non-ASCII. |
| An ambiguous abbreviation or repeated heading | Resolve it with the source owner or carry the disambiguating context. | A guessed expansion can introduce meaning that the source never supplied. |
| Whitespace or a character-reference spelling | Compare decoded semantic values under the declared normalization. | Authored byte preservation and semantic equality have separate oracles. |

An accepted vocabulary mapping belongs to the semantic descriptor or its
normalizer. It has a bounded vocabulary or explicit input grammar and fixtures
for its protected cases. Adding a new symbol to a replacement list requires its
meaning and owner; repeated sightings alone supply no editing authority.

## Source, generator and runtime boundaries

1. The receiving task identifies the literal native table or canonical generator and the specific label consumer.
2. Native headers or semantic descriptors supply the meaning. An authored display component can receive the reviewed supplemental wording while its visible presentation remains unchanged.
3. Literal row identity and runtime user data join that descriptor under their existing contracts. Normalizing an assembled row label would also reach its user-owned components; component-wise construction preserves the distinction.
4. The owning renderer applies its existing context-appropriate escaper when serializing. DOM strings, authored HTML entities and already serialized markup have distinct boundaries.
5. Projection and replay compare the accepted semantic mapping, exact protected values and preserved unowned source. A later projector that restores decorative display wording disagrees with that accepted supplemental mapping.

A literal ampersand, quote or markup-shaped value stays data through the existing
escaper. Entity decoding for a semantic comparison is not permission to decode
user strings repeatedly or insert raw HTML. Unicode normalization likewise needs
an explicit receiving contract; plain-word wording does not imply changes to the
code points of a person's name.

Native-attribute inventory respects the parser's source context. A string
containing `<table>` or `data-label` inside a script, comment, template or
example is a candidate for classification, not automatically a native table
attribute. Generated markup returns to its actual generator. A source-preserving
transformer admits a supported raw-text grammar before selecting edits; an
unsupported self-closing raw-text token can return a domain outcome without
interpreting its body as ordinary table source.

## Bounded derivation and publication

Bounds cover the input vocabulary, individual labels and tags, record count,
repeated context, escaped output and total character/byte volume. A caption that
fits by itself can expand across many rows. Reservation therefore precedes
repeated concatenation and materialization, and escaping participates in that
estimate. Reusing a shared descriptor can reduce preparation while each serialized
copy still contributes to emitted size.

Source scanners account for bytes or characters copied as well as cursor
movement. Attribute-like quoted text retains literal content. Budget rejection
and unsupported structure keep the complete asset with its source owner; an
admitted asset's publication follows its existing digest/span, containment,
changed-source and atomicity contract. A label wording request supplies no new
parser, filesystem or deployment authority.

## Fitting observations

| Change | Evidence that changes acceptance |
| --- | --- |
| A native literal attribute | Correct attribute selection, expected decoded wording, unchanged visible/native content and exact unowned-source preservation. |
| A semantic vocabulary rule | Literal and entity spellings, the allowed mapping, protected accented names and units, repeated application, and an ambiguous counterexample. |
| A composed row label | Topic/identity separation, complete detached meaning and preservation of user-owned punctuation. |
| A generator or escaper boundary | Representative generated records with quotes, ampersands and markup-shaped user data; correct output-context escaping and maintained projection parity. |
| A count or expansion limit | Admission before repeated construction, escaping expansion and exact fitting boundary cases, measured in the declared units. |
| A live label consumer | Its affected selector, displayed content, serialization or interaction behavior; browser cases enter when that actual consumer needs them. |

A source-only metadata repair can finish with fitting source, extraction and
projection evidence when its receiving contract permits. Runtime-generated,
input-dependent and browser-consumed labels have their own coverage. Existing
checkpoint identities still govern reuse; a new metadata claim does not turn
stale source-bound evidence into a current observation.

## Decisive scenarios

The JSON notation below denotes decoded Unicode strings. The escapes make code
points explicit; they do not prescribe replacement of displayed text.

### Scenario: An accented name accompanies directional shorthand

- **Given:** An authored descriptor is `"Inputs \u2192 outputs"`, the record name is `"Ren\u00e9e Ng"`, and a field unit is `"\u00b5g/L"`.
- **When:** The approved descriptor mapping produces `Inputs to outputs` for its supplemental label.
- **Then:** The name and unit retain their exact strings, the visible descriptor can retain its authored presentation, and the composed label uses the existing escaper.

### Scenario: A script contains table-looking source text

- **Given:** A script holds a string resembling `<td data-label="Inputs ...">` beside a real native table.
- **When:** An inventory or source-preserving label pass selects native attributes.
- **Then:** Script contents retain their source identity; any intended generated-label change routes to the generator, and unsupported parser recovery returns an explicit outcome.

These scenarios specify intended boundaries. A passing local fixture establishes
the exact case exercised; broader vocabulary and receiver behavior retain their
own observations.

## Receiving-task observation

The portable method and its protected-value boundaries are complete in this
package. Receiving-task tests and draft plans retain their own access,
dependencies, publication standing, and exact source revision.

The receiving review's literal inventory reported 18 decorative attributes in
the investment studio: nine directional header labels and nine row separators.
The repair changed only attributes and retained visible text. That bounded
finding motivates component-specific wording; a fresh inventory owns any later
population claim.

The receiving task's native-table fixture guarded seven declared HTML owners.
Generator normalization and its fixtures remained with the generator owner.
Material runtime labels retained user-data standing through their existing
escapers. The native inventory, generator fixtures, and runtime observations
had distinct scopes; their results belonged to the receiving application
return.

A separate source-preservation reference owned its API, grammar, and focused
command. Its source-preserving transformation draft retained draft standing and
separate parser and publication decisions. These task-local owners remain
useful implementation context while the transferable table contract stands on
its own.

An optional prose-tooling pilot remained a separate receiving task. Any Vale
attribute coverage needs a pinned-version check of markup selection, explicit
selectors where appropriate, and focused rule fixtures. The table-label
projector and native fixtures retain deterministic ownership. Advisory prose
findings invite human interpretation; negation meaning and neutral-referent
resolution retain their own semantic review. The pilot adds no installation,
CI dependency, or mandatory lint step to this contract.

## Evidence classes and release

WHATWG supplies the custom-attribute platform contract. MDN supplies explanatory
access and interoperability guidance. The
[WAI two-header tutorial](https://www.w3.org/WAI/tutorials/tables/two-headers/)
supports native relationship design. None of these sources imposes this
repository's plain-word vocabulary or demonstrates arbitrary model ingestion.

This branch completes when the consumer, semantic mapping, protected literal
components, owning renderer and fitting observations are explicit. An ambiguous
new symbol, lost field context, changed generator or incompatible projection
reopens that owner. Wider language normalization, parser migration and publication
remain separately authorized work.

## Unit notation and separator context

A middle dot inside compact compound-unit notation retains its literal meaning.
The current projection converts a middle dot to a colon when each side has
whitespace or an arrow that supplies spacing during normalization. Looking at
both kinds of boundary in the same traversal makes repeated normalization stable. Unicode-escaped examples `N\u00B7m` and `Pa\u00B7s` retain the dot;
a whitespace-delimited topic separator receives ordinary punctuation. The same
rule applies across text-fragment boundaries and after HTML entity decoding.
This prevents a presentation cleanup from changing the field's unit. Ambiguous
technical notation receives source-owner judgment rather than character deletion.

A composed vocabulary rule checks interaction as well as isolated substitutions.
For example, `"A\u2192\u00B7 B"` becomes `A to: B` in one normalization, while
`"N\u00B7m"` remains literal. Reprojecting preserved authored HTML and normalizing
already normalized text establish separate properties; a receiving API names
which properties it promises. Fragment splits, newly introduced whitespace,
protected units and bounded output each receive a fitting fixture. A finite
composition grammar can exercise these interactions without repeated repair
passes or an unbounded convergence loop in production.

## Native identity before positional convenience

**When:** a row starts with a date, rank, checkbox, or other field while its
identifying native header appears in a later column.

**Rule:** derive row identity from `th scope="row"` wherever it occurs. Preserve
multiple scoped headers in source order when they jointly identify a record.
Use positional fallback only where the source supplies no native row header;
retain an explicitly blank header as blank and retain zero as a value. Complex
spans and grouped headers keep an explicit semantic owner and mapping.

**Exercise:** compare two ledger rows sharing a date but carrying different
Decision headers. Each supplemental row label should identify its own decision,
while each date value remains associated with its Date column. An extracted
record repeats table topic, row identity, field name and original value.

## Rendered boundaries and literal continuity

**Rule:** treat an explicit `br` as a word boundary in derived label text. Keep
ordinary inline spans transparent to word continuity. A label derived from
`Name`, a `br` element, and `identifier` reads `Name identifier`;
`anti<em>body</em>` reads `antibody`.
Apply the same rule to captions, column headers and row identities. Preserve
authored markup and values through the source owner's patch or generator.

**Boundaries:** whitespace normalization describes a declared extraction
channel. Native relationships, browser layout, assistive-technology reading and
model ingestion retain their own observations. A metadata-only repair earns
source-preservation, semantic agreement, escaping and idempotence checks;
changed visible geometry earns the fitting affected-family browser observation.

## Screen comparison and print flow

Useful screen table floors belong to screen-media or an equally explicit
layout owner. Printing receives its own wrapping and overflow policy so all
columns remain available. Review screen and print as different receiving
surfaces; a screen scroll pass establishes the screen contract. Keep intentional
horizontal comparison and keyboard access on screen while allowing printable
content to flow within the page.

## Mutable labels and independent acceptance

A derived row label belongs to the same committed record as its visible name,
category, and exported identity. Trace the prototype's actual commit event
(`input`, `change`, or `blur`) and update every dependent table view at that
boundary. Update attributes and display text in place when the active editor
owns focus, selection, or an open disclosure. A useful exercise renames a record,
changes its category, restores the original value, and compares visible text,
row context, exported state, and retained editor identity after each commit.

Give complex tables their own semantic oracle. Enumerating labelled elements
establishes presence; exact topic, row identity, heading, scope, and `headers`
relationships establish meaning. Include parameterized counterexamples that
change one association while preserving element counts. A spanning total row
keeps its complete table topic and the actual columns occupied by its values.

Source-only observers state their admitted grammar. An observer for explicitly
closed, unnested tables returns a domain error for nested or incomplete input;
a successful partial extraction would obscure the unobserved outer cells.
Validate a list-of-strings boundary before parsing, accumulate fragmented text
in chunks, and publish results after the complete admitted batch succeeds.
Keep parser-library cost, initial file reads, output expansion, and observed
browser behavior as separate claims.

A media-policy source check reads active, structurally bounded rules and rejects
counterexamples whose declarations are comments, belong to another medium, or
are superseded later. It establishes the declared source policy. The fitting
browser comparison establishes rendered widths, wrapping, focus, and printable
content at the named viewport or print configuration.

## Separate record labels from technical field values

A supplemental label describes the record or field that a reader is receiving.
Inspect labels derived from mixed prose and code before publishing them: a row
header can contain both a scenario name and a path such as
`resume.experience[0]`, while the scenario name supplies the useful record label.
Keep the exact path in its visible code/value carrier and structured source.
A nonblank native `th` `abbr` can declare the concise header alternative; the
source projector honors it when deriving row identity. Empty alternatives retain
the full authored identity. Multiple row headers keep their separate components.

Retain technical references in supplemental context when a named consumer uses
them to distinguish actual bindings or records. Record that receiving purpose;
source syntax alone supplies neither a parser contract nor evidence of ATS value.
Distinguish JavaScript interpolation syntax in source from the resulting DOM
attribute. Human-readable labels, native relationships, exact field values and
stable machine identities have related but separate jobs.

Check regeneration/idempotence, literal value preservation and a meaningful
human label. A global dotted-string deletion rule would also remove legitimate
names, units and identifiers, so wording changes remain with their semantic owner.
The native alternative-header role is described in the
[MDN table-header reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/th#abbr).

A concise alternative still distinguishes each record. If one scenario gains
several field rows, include the human-readable field purpose in its alternative
rather than repeating the same scenario-only label for every record.
