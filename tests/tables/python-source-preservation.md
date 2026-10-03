# Python source-preserving table projection

The Python transformer derives supplemental labels from authored captions and
native headers. Its compatibility entry point, project(source, classes=()),
returns a string and a fresh list of disposition dictionaries. A projected
table retains its authored caption, scopes, values, inline markup, and native
attribute spelling. Semantic whitespace normalization supplies label text.

## Plain supplemental labels

Derived `data-label` values use a finite, repository-specific text policy:
U+2192 RIGHTWARDS ARROW becomes the word `to`, a separator U+00B7 MIDDLE DOT
becomes `:`, and U+2014 EM DASH becomes `-`. A separator has whitespace or an
expanded arrow on each side. This accounts for the arrow's generated spacing
in the same traversal, so repeated normalization retains the first result.
Compact compound-unit notation retains its literal middle dot. Whitespace collapses to one space and
outer whitespace is trimmed. The arrow word receives separating spaces;
the middle-dot replacement attaches its colon to the preceding text and
separates following text. For example, `Inputs to outputs`,
`Table 02: costs - evidence`, and `3 quarters: connected complexity` are the
corresponding plain labels. HTMLParser decodes raw and entity-spelled source
text before this policy runs; the original caption, headers, names, values,
and entity spelling remain authored source. Disposition topics retain their
native semantic text.

Other Unicode words, names, combining marks, and technical text remain intact.
The policy is a targeted replacement, rather than an ASCII conversion or
general Unicode filter. Attribute output still escapes ampersands, angle
brackets, and both quote forms. Direct `with_label` callers supply semantic
text; entity decoding belongs to source parsing.

This is a local readability convention, rather than an HTML requirement that
custom metadata contain ASCII. Keep visitor-visible content in semantic HTML:
[MDN's data-attribute guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes)
describes supplemental storage and its accessibility limitations. Native
captions and `th`/`scope` relationships retain the table's accessible structure;
[WAI's two-header guidance](https://www.w3.org/WAI/tutorials/tables/two-headers/)
describes explicit row and column header associations.

## Focused command

Run the focused suite from the repository root:

    PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m unittest discover -s tests/tables -p test_table_context.py -v

Imports use the root tools namespace through Python module invocation. The suite
uses the standard library; this task adds neither dependency metadata nor a
lockfile. uv supplies the managed interpreter and leaves host packages intact.

## Source stages and admission

The stages are parse_source, validate_tables, derive_labels, plan_edits, and
apply_plan. Frozen dataclasses and tuples hold stage records; parser builders
remain invocation-local. prepare_plan composes the pure stages. Parsing uses
HTMLParser after a bounded lexical scan, retaining original start-tag spans.
Parser migration remains a separate adoption decision.

A selected table has explicitly balanced source tags and one caption owner.
The projection contract accepts one complete native column-header row. Every
other row passes cell-count validation, including header-only and empty rows.
Label derivation retains the existing policy of projecting records containing
at least one td. Spans, missing semantic context, and broader
header arrangements receive owner-review dispositions. A selected nested table
or malformed selected structure rejects the asset with a typed condition.
Complete unselected table subtrees remain opaque, including their nested
tables. Class selection belongs to the outer table and precedes native-attribute
uniqueness checks. Native duplicates on an unselected outer table retain their
opaque owner boundary. If any authored class value names a requested family,
the table is selected; ambiguous native duplicates then require source-owner
repair. Repeated or boolean data-label attributes belong to the projection and
collapse to one escaped label.

Lexical completeness covers the asset's tags, comments, and raw-text elements.
Structural validation covers selected tables and balanced outer table ownership.
This is an explicit source grammar, with browser recovery and general document
validity reserved for their own observations. Selected raw-text or template
content receives a separate-owner condition. Ordinary external script, style,
textarea, title, and comment bodies retain their source. Raw-text elements use
explicit paired tags; a self-closing raw-text token rejects the asset before
HTMLParser can interpret any table-looking body text.

Default admission caps are 2,000,000 source characters, 8,000,000 UTF-8 bytes,
16,384 characters per markup tag, 100,000 lexical markup tokens, nesting depth
128 within selected markup or unselected table nesting, and 8,192 characters
per semantic label. Output assets and projected start tags fit the same caps
so an accepted result can be projected again. Limits are explicit immutable
configuration for programmatic callers. Asset reads stop at the byte cap plus
one before parsing.

The attribute scanner checks delimiters by position, with bounded copying of
attribute names and values. Label fragments retain shared caption references
until aggregate admission succeeds. Reservations measure escaping, UTF-8 byte
widths, owned-attribute removals, replacement totals, and complete output size
before constructing label strings or replacement tags. A direct label edit also
checks expanded tag size before escaping its value.

Plain-label normalization uses a forward-only character iterator, one-character
lookahead across fragments and constant whitespace state. Each traversal reads
each input character once, with at most
four output characters per input character including added word spacing.
Admission counts the actual normalized characters, including the extra letters
in `to`, before materialization; the same iterator subsequently emits the
admitted text. This is a sizing traversal followed by a construction traversal,
each linear in its input and bounded output, with shared caption fragments
retained until aggregate admission. Both the existing input-label cap and the
normalized-label cap apply. Escaped tag sizes, cumulative replacement sizes,
and full-asset character and UTF-8 byte totals use that normalized stream.

Source and replacement traversals have monotone cursors. Source length, token
count, edits, and emitted characters are separate cost dimensions. HTMLParser
retains its library cost term. Planning sorts E edits in O(E log E); hashing,
span comparison, escaping, and assembly include source and output size. Resource
caps bound allocations and admitted work; the tests establish those caps and
rejection behavior rather than measured runtime or a parser complexity proof.

## Preservation and publication

Offsets count Python Unicode characters in the original string. UTF-8 decoding
retains a leading BOM as a character. Binary file I/O retains CR, LF, CRLF, and
mixed newline forms. A SHA-256 digest binds each edit plan to that exact source.
Every expected span, its bounds, and ordered nonoverlap pass before output
assembly. The only replacement spans are owned start tags; the byte-preservation
tests compare every interval outside those spans independently.

The CLI validates and derives the complete asset before writing. Directory
descriptors anchor traversal inside the trusted repository root. Each component
is opened with symlink rejection. Admission accepts regular HTML files with one
hard link. A temporary file in the same directory receives the complete UTF-8
result, original permission mode, and a file sync. A final bounded source read
checks digest, inode, mode, size, link count, and timestamps immediately before
atomic replacement. Source drift returns the asset for a fresh plan.

Publication is atomic per asset on the supported POSIX filesystem interface.
Caught interruptions before replacement clean the temporary file and retain
the source. Abrupt process termination can leave a temporary file; a completed
rename remains the publication event. Permission mode is preserved; ownership,
ACLs, extended attributes, and directory-sync power-loss durability have separate
contracts. Repository directory ownership remains trusted during the operation.
A concurrent writer in the final check-to-rename interval remains a concurrency
boundary; this implementation supplies drift detection, not filesystem
compare-and-swap or multi-asset transactions.

Each CLI argument receives a JSON outcome with a safe repository-relative path
when admitted. Recoverable source, encoding, path, and selected filesystem
conditions allow later assets to proceed. Errors and pending projections under
--check produce an aggregate nonzero exit. Owner-review tables retain their
explicit counts. Ordinary implementation exceptions, unknown OS errors, and
interruptions propagate to the caller. Public outcomes carry normalized reason
codes; private exception and filesystem details stay with the local operator.

## Focused evidence and continuation

The test groups separate transformation meaning, idempotence, outside-edit
preservation, admission, and filesystem publication. Named regressions cover
attribute-like text inside quotes, duplicate and boolean attributes, trailing
whitespace, Unicode/BOM/newline offsets, record shape, unselected nesting, source
drift, interruption, and blank/zero/status values. Focused review regressions
also cover scanner copying, self-closing raw-text tokens, removed record cells,
aggregate caption/replacement admission, and duplicates on unselected tables.
Allocation sentinels establish that rejected expansions precede materialization;
an operation-count fixture bounds scanner substring copying. These observations
retain their own scope alongside the source-preservation checks.

Plain-label fixtures combine raw, named, decimal, and hexadecimal spellings
of all three symbols. They cover exact authored-source retention, repeated
projection, fragment boundaries, accented names and technical Unicode, and
required attribute escaping. Allocation sentinels reject normalized label,
escaped tag, and aggregate character/byte overflows before expanded construction;
exact-boundary cases remain projectable. A character-visit fixture establishes
one forward normalization traversal and the finite expansion bound separately
from the existing scanner-copying observation.

Normalization composition has its own fixed-point observation, separate from
reprojecting retained authored source. Six text atoms across lengths zero through
five yield 9,331 cases for repeated normalization and bounded expansion. Named
arrow/separator combinations also cross every fragment split while retaining
compact compound units. This finite grammar supplies counterexample coverage;
the contract's broader behavior remains subject to source-owner review.

A finite grammar combines
four text atoms, three whitespace forms, four attribute forms, and two prefixes
into 96 cases for each generated property. This bounded enumeration provides
repeatable coverage with the standard library. Broader property generation can
receive an isolated test dependency when a larger grammar earns it.

These checks establish the exercised Python transformation and filesystem
behaviors. The parent task owns known-corpus closure, browser observations,
JavaScript/checkpoint changes, and the existing table README. PR326 and Issue328
receive the implementation and focused results. Re-entry starts with the
focused command above and the remaining boundary that the parent selects.

## Native row identity and explicit word boundaries

Row identity follows every native `th scope="row"` in source order, including
headers located after ordinary data cells. A first-cell fallback applies only
when the row has no scoped row header. An explicit blank header remains blank;
zero remains a value. Multiple scoped row headers contribute a compound identity.

An authored `br` contributes a word boundary to derived caption, header and row
text. Ordinary inline markup preserves word continuity: `anti<em>body</em>`
derives `antibody`. These rules affect supplemental labels while authored tags,
values and newline bytes remain with the source-preserving patch contract.
Parameterized regressions cover offset/uppercase row scopes, blank and zero,
compound identities, four line-break spellings, and repeated projection.
