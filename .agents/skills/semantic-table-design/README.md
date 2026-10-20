# Semantic table design

Build tables that remain meaningful when someone reads, compares, scrolls,
prints, or extracts their records. This skill joins native header relationships,
complete field context, literal values, and the actual reading container into
one source-owned table contract.

## Start here

- [Read the authoritative skill contract](SKILL.md)
- [Return to the repository skills catalog](../README.md)

## Use it when

Use this skill when a new or revised table changes header relationships, row
completeness, comparison geometry, supplemental labels, or detached-record
meaning for a named reader or receiving tool.

## What it returns

- the reader operation and source owner;
- explicit row, column, and group-header relationships;
- complete context for values that leave the page;
- a bounded scroll and comparison treatment; and
- source, extraction, geometry, or interaction evidence fitted to the change.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | A responsive comparison table adds `data-label` values so a receiving tool can interpret one row away from its page, but the unit and period appear only in the caption. |
| Use | Trace the row to its semantic owner, preserve native `th` relationships, and give the detached record its topic, identity, unit, period, and qualification. |
| Observable return | Visual readers retain two-dimensional comparison, the extracted row remains locally meaningful, and a focused check proves the added context without rewriting literal values. |

## Working route

1. Name the operation: lookup, comparison, entry, reconciliation, or detached use.
2. Locate authored markup or the canonical renderer, styles, projections, and source inventory.
3. Map representative cells to every applicable header and qualification.
4. Reuse the smallest fitting table, scroll, and supplemental-context pattern.
5. Observe the exact semantic, extraction, state, geometry, or interaction claim that changed.
6. Return the table disposition, evidence boundary, and next owner for any unresolved meaning.

## Supporting material

- [Table design contract v0.1](references/table-design-contract.v0.1.md) provides the implementation and observation matrix.
- [Supplemental table labels](references/supplemental-table-labels.md) covers detached-record context, escaping, generator parity, and bounded expansion.

Native HTML remains the baseline relationship carrier. Supplemental metadata
serves its named consumer and leaves visible meaning usable on its own.
