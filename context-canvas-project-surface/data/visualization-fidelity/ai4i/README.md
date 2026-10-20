# AI4I: product mix, overlapping flags, and label reconciliation

This source supplies a second manufacturing comparison for the Visual Fidelity
Atlas. Its 10,000 published, generated operating records support product-type
comparisons and a precise distinction between a failure label, a failure-mode
membership, and a record carrying any mode flag. SECOM retains its separate
population, measure, and time basis.

## Source and preservation

*AI4I 2020 Predictive Maintenance Dataset* (2020), UCI Machine Learning
Repository, [doi:10.24432/C5HS5C](https://doi.org/10.24432/C5HS5C).
The dataset accompanies Stephan Matzka's *Explainable Artificial Intelligence
for Predictive Maintenance Applications* (2020),
[doi:10.1109/AI4I49448.2020.00023](https://doi.org/10.1109/AI4I49448.2020.00023).

The [UCI source page](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset)
provides the records under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
`ai4i2020.csv` preserves the CSV from the
[publisher's archive](https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip),
including its UTF-8 byte-order mark and CRLF line endings. The repository's
license governs the surrounding implementation; dataset attribution and CC BY
4.0 travel with any later derivative figure or table.

Source SHA-256: `dc6630cd9b1f0f853922fad78a1b6436570d3f1ec863f1dd5c4340ac56bc8a8e`.

## Counts come from records

| Source Type | Records | Machine-failure label | Any mode flag | Label/flag disagreements |
| --- | ---: | ---: | ---: | ---: |
| L | 6,000 | 235 | 243 | 16 |
| M | 2,997 | 83 | 81 | 6 |
| H | 1,003 | 21 | 24 | 5 |
| All types | 10,000 | 339 | 348 | 27 |

Type denotes the source's product quality variant. It supplies a cohort
dimension, rather than a site, business unit, or organization. The source
page's prose percentages differ from the released row counts; the table above
uses the records themselves. UDI provides record identity. It leaves elapsed
time, calendar windows, and independent physical-machine identity unspecified.

The five failure-mode fields are TWF (tool wear), HDF (heat dissipation), PWF
(power), OSF (overstrain), and RNF (random). The source retains each field as a
binary label. A row may carry several mode labels.

| Published Machine failure label | At least one mode flag | Records |
| --- | --- | ---: |
| 0 | No | 9,643 |
| 0 | Yes | 18 |
| 1 | No | 9 |
| 1 | Yes | 330 |

Mode memberships sum to 373 across 348 distinct flagged records; 24 records
carry several modes. The published target and the union of flags disagree on
27 records. The derivation preserves both definitions and reports the
disagreement. Repairing or relabeling the upstream records would constitute a
different dataset and require its own question and source decision.

## Derivation and absence semantics

`tools/atlas-maintenance-data.mjs` owns parsing and aggregation. Its parser
accepts this bounded, unquoted CSV layout; other CSV dialects receive their
own source adapter. The build pins the complete input digest. Pure functions
also admit small fixtures for testing meaning independently of the full file.

- Each admitted UDI contributes once to All types and once to its source Type.
- Each rate is `100 * count / records`. JSON retains calculation precision;
  a later renderer owns its declared display rounding.
- An admitted population with records and zero positive labels has a zero
  rate. An empty population has `availability: unavailable` and a null rate.
- Each mode remains a distinct field. Mode totals express memberships;
  distinct-record totals express their union. These support different views.
- Disagreements are retained as source observations. The records establish
  their count; the reason for a particular disagreement remains with the
  dataset's source and generation method.
- Temperatures retain kelvin, rotational speed retains rpm, torque retains
  newton metres, and tool wear retains minutes. No time series is inferred
  from a record identifier.

```sh
node tools/atlas-maintenance-data.mjs --write
node tools/atlas-maintenance-data.mjs --check
node --test tests/visualization-fidelity-atlas/atlas-maintenance-data.test.mjs
```

## Receiving views and release boundary

Issue #358 owns the next gallery views. Product-type rate/count comparisons,
a label-reconciliation matrix, and a speed-by-torque heatmap can reuse this
source contract. A heatmap first declares its bin edges, denominator, common
scale, empty-bin state, and exact-value companion. The labels support a
descriptive reading of this published reference, rather than operational
claims about a particular organization or causal risk estimates.

The existing Atlas page owns styling: its figure links, flat comparison
surface, semantic tables, native controls, and disclosure patterns remain the
first choices. This admission slice adds data and focused checks only. The
existing full Atlas instrument retains import, recovery, reset, and capsule
ownership. Issue #360 records dataset/view admission and the distinct research
coverage extract gate. Hosted publication waits for a new tag and complete
public carrier.
