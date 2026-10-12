# Investment Analysis 0.2.0

Use this contract to validate portable accepted state for the Initiative Costing
Calculator and Cross-Functional Investment Model Studio.

- [Exact schema](state.schema.json)
- [Worked example](example.json)
- [Schema catalog and source digests](../../schema-catalog.json)

The five domains are internal investment, customer implementation, commercial
cohort, service and operational value, and capital allocation. Applicable records
carry inputs, assumptions, calculations, evidence, and decisions. Blank values
leave a measure unavailable; explicit zero remains zero.

The schema establishes data shape. Formula behavior, accepted-state admission,
and human review have their own implementation and evidence. Captured staffing
references describe a snapshot; the live staffing calculator retains its own state.

Semantic source: `collaboration/investment-analysis/core.js`. The generated
`collaboration/investment-analysis/state.schema.json` is its validation-input
projection. The catalog records the accepted source revision and SHA-256.

The stable identifier is
`https://schemas.vik.guru/investment-analysis/0.2.0/state.schema.json`.
The relative download above retrieves this host's equivalent copy. Validators
can register the downloaded schema by that identifier and validate locally.
Later contract changes use an explicitly reviewed successor version.
