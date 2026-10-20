# Data visualization foundations

Turn a request such as “show performance” into a defensible visual decision:
which records count, what comparison matters, which form supports that
comparison, and how a reader can recover the exact values.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative contract, rules, operating
  sequence, and completion boundary.
- Return to the [repository skill catalog](../README.md) to choose a destination
  skill for conversation, web, or PDF delivery.

## What this skill returns

| Arriving with | Use the skill to establish | Observable return |
| --- | --- | --- |
| A reader question and source records | Population, measure, denominator, transformation, uncertainty, and intended comparison | One selected form with its fit reason, exact-value companion, source route, and evidence boundary |
| An authored example awaiting real data | Example standing and the decisions that real records must settle | A labeled specification that keeps example values distinct from observations |

The data owner retains meaning and the destination owner retains production.
This foundation connects those owners through one visual contract.

## Concrete example

**Situation:** Three product groups have different record counts and a binary
failure label. A reader wants to compare both total burden and frequency.

**Use:** Admit the record unit and inclusion rule, calculate counts and rates
with each group’s denominator, then choose a paired view that keeps the two
questions distinct.

**Observable return:** The reader can identify the group with the most failures,
identify the group with the highest failure rate, and recover every numerator
and denominator from the companion table.

## Working path

1. Name the reader’s question and operation: compare, rank, inspect spread,
   follow change, reconcile, or trace a relationship.
2. Admit source standing, records, units, absence states, transformations, and
   permissions.
3. Compare the smallest useful forms and select one with a written fit reason.
4. Specify scale, labels, color roles, uncertainty, and exact-value recovery.
5. Hand the contract to the destination owner and observe the changed reading.

## Reference guides

- [`form-and-data-contract.md`](references/form-and-data-contract.md) — visual
  brief, source admission, form selection, rates, reconciliation, and heatmaps.
- [`sparse-time-scales-and-form-boundaries.md`](references/sparse-time-scales-and-form-boundaries.md)
  — irregular observations, logarithmic scales, and choices among plausible forms.
- [`aggregation-distribution-and-uncertainty.md`](references/aggregation-distribution-and-uncertainty.md)
  — changing populations, censoring, bins, tails, intervals, and repeated comparisons.
- [`evidence-and-source-map.md`](references/evidence-and-source-map.md) — research
  lineage and the distinct warrants behind the method.
- [`atlas-exercises.md`](references/atlas-exercises.md) — bounded first-use
  exercises for conversation, web, heatmap, and PDF destinations.
