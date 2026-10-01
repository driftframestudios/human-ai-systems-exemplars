# Investment analysis contracts

Source owner for the shared analysis in the Initiative Costing Calculator and Cross-Functional Investment Model Studio. Both original instruments retain their interface, framework, and selected-method roles. This package adds a dependency-free calculation and exchange layer.

## Files and authority

- `core.js`: pure formulas, input validation, state migration, canonical serialization, and the validation-input schema generator.
- `studio.js`: local progressive-enhancement controls, semantic tables, recovery, and a plain-text comparison capsule.
- `studio.css`: scoped shared component, loaded after each host's existing skin.
- `state.schema.json`: generated, self-contained JSON Schema 2020-12 projection of `core.schema()`, version 0.1.0. Its canonical identifier describes identity; hosted retrieval follows an explicit publication step.
- `example.json`: synthetic material instance. Its numbers describe a hand-checkable fixture, not company economics or clinical findings.

The source-reading baseline is the accepted main tree at `a2b6f4355b87115e078f9f94760fedcfa3734ad0`. The calculator offered six change frameworks, a distinct eight-part attention lens, six editable presets, inline calculations, and a generated leave-behind. Discovery & Alignment supplied the three-quarter default. The Model Studio supplied eight method descriptions, fixed illustrative context, selected-method state, and a Prompt Capsule. About supplied a prose equivalent. This change adds the shared analysis and an actual About table while preserving the original roles.

## Two axes

Domains are internal investment, customer implementation, commercial cohort, clinical/operational value, and capital allocation. Record types are input, assumption, calculation, evidence, and decision. `calculate(state).records` derives the applicable combinations. Each metric carries status, unit, currency where applicable, period, formula version, and evidence standing. A domain's missing record leaves its claim open.

## Numeric and economic meaning

Blank/null means unavailable; explicit zero stays zero. Invalid, inapplicable, ambiguous, and unreached results carry reasons. Independent outputs remain available when another input is incomplete. Calculations retain precision; presentation formats independently.

GRR and NRR describe the opening revenue cohort. New customers and reactivations outside that cohort enter the closing totals separately. CAC uses new customers; acquisition spend divided by new recurring revenue has a time dimension. Acquisition payback uses the matching contribution margin. All recurring amounts use the entered period.

Cash flows are complete incremental, equally spaced, end-period amounts with an explicit t=0 value. NPV leads comparison. IRR supports a conventional initial outlay followed by nonnegative cash flows; other patterns keep an explanatory state. Payback is undiscounted with linear interpolation within a period. Expected NPV requires an explicitly confirmed, mutually exclusive and collectively exhaustive outcome tree whose probabilities sum to one. The implementation preserves supplied probabilities. Percentiles and empirical distributions remain distinct models.

Staffing uses source-owned 80-hour sprints and 520-hour quarters, the existing unknown/complexity reserve heuristics, and sigma as an illustrative attention multiplier. Additional-share controls identify the portions of activity, recovery, and quality work outside allocated staffing. These cost components enter the base once; spread is a range, not another charge. Shared-analysis cash flows do not automatically add staffing references, implementation costs, or budget-impact outputs.

Clinical budget impact is eligible population times adoption times the difference in per-person resource cost. The nine cost-consequence dimensions retain their own units and evidence. Cost per incremental outcome requires a named measure, reviewer, source, perspective, valid date, and an explicitly reviewed transformation. The planning interface records these declarations; qualified people establish their substantive validity.

## Exchange and recovery

`serialize()` sorts keys deterministically and excludes generated timestamps. The FNV-1a fingerprint is a comparison aid, not a cryptographic authenticity claim. Import validates the whole candidate before replacing accepted state; rejected candidates leave working state available. JSON files are bounded to 1 MB and reserved object keys are rejected. Namespaced extensions survive round-trips.

The existing Model Studio 1.0.0 selection migrates with its method and exact selection snapshot retained. A legacy calculator leave-behind retains its display snapshot as lineage, and numeric analytical fields remain unavailable until exact inputs are supplied. Rounded display amounts are context rather than recovered calculation precision. Future schema versions receive an explicit adapter or a supported-version message.

## Semantic provenance

Method records use `urn:source-key:investment-method:<method-name>`; the eight method IDs supply the stable suffix. Public labels describe the method. Renaming or moving a source leaves its semantic key intact. Any future key replacement retains an explicit public alias at the receiving source. Private workspace coordinates remain with the authorized resolver; detached use needs only the public method description, contract, and semantic key. The semantic key identifies the source concept and carries no independent authority claim.

## Local evidence and delivery

```sh
node --test tests/investment-analysis/core.test.mjs
node --test tests/investment-analysis/browser.test.mjs
npm run build:iframe-routes
npm run check:iframe-routes
```

The two route entries in `iframe-route-families/canvas/public-iframe-route-manifest-v1.json` package the same JS/CSS owners into their own dependency closures. Local screenshots stay in ignored `.visual-runs/`. The source guide and About page retain semantic HTML and existing CSS. The human-controlled upload receives a successor package; live child and real-parent observations retain their separate release owners.
