# Conversation data visualization

Use this skill to make one live data question easier to inspect through a bounded figure, exact-value companion, calibrated interpretation, and clear next question.

## Start here

- Read the authoritative [skill contract](SKILL.md) and its linked [data-visualization foundation](../data-visualization-foundations/SKILL.md).
- Begin with the question, permitted data, missingness, denominator, and plausible groupings.
- Prefer one readable local or in-conversation figure. Use a compact table when it answers the question more directly.
- State what the admitted records show before offering an explanation or hypothesis.

## Concrete example

**Situation:** A small population has the highest incident rate while a larger population has the highest incident count. A team asks where incidents are concentrated.

**Use:** Plot rate and count as separate, aligned views; retain each denominator and exact value; label omitted records and the counting period. Describe the two questions rather than choosing one view as the winner.

**Observable return:** The figure shows that relative frequency and total operational volume identify different populations. A nearby table preserves values and denominators, and the interpretation leaves prioritization to the receiving decision owner.

## Supporting material

- [Python figures in a conversation](references/python-session-rendering.md) supplies isolated-session setup, preparation, Figure/Axes ownership, semantic color, output, cleanup, and recovery.
- The foundation’s [form and data contract](../data-visualization-foundations/references/form-and-data-contract.md) helps with ambiguous encodings.
- Its [aggregation, distribution, and uncertainty guide](../data-visualization-foundations/references/aggregation-distribution-and-uncertainty.md) helps when weighting, censoring, density, or interval claims can change the reading.

## Boundaries

A conversational figure supports exploration rather than publication by default. External upload, hosting, public release, and durable application integration retain their destination owners. Numeric marks come from admitted values and deterministic geometry.

[Return to the repository skill collection](../README.md).
