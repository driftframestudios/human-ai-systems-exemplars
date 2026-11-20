# Visual Fidelity Data-View Lab

This lab helps a reviewer compare a dataset visually and inspect the exact values behind the picture. The chart, table, and machine-readable JSON share the same identity, revision, source history, scope, unit, denominator, order, and written status for every value.

## What the lab demonstrates

- Decision need and admitted record count select a renderer through deterministic thresholds.
- Known, unknown, absent, stale, estimated, and redacted values retain distinct meanings.
- An empty accepted revision carries explicit absent standing, zero records, and zero relationships.
- Candidate fixture admission validates the complete revision before one atomic replacement.
- Fixture identity remains stable; identical current revisions settle idempotently; each new revision names the directly accepted parent.
- A matching request identity and owner generation make a result eligible to settle.
- The prior accepted revision remains readable during loading, failure, and recovery.
- Stable record identity and order survive view changes and compatible revision changes.
- The exact-value table and SVG derive from the same paginated semantic twin, global numeric and date domains, and explicit continuation record.
- Dense output uses a local two-dimensional scroller, while small screens receive a compact table treatment.
- Each mounted lab instance receives its own SVG namespace, and every marker and clipping reference resolves inside that namespace.
- A dedicated selection layer paints the selected-record outline after data marks while keeping connectors behind those marks.
- The HTML routes static reading to a complete single-file representation of the accepted fixture.

## Inspect the implementation

| Concern | Owner |
| --- | --- |
| Fixture admission, renderer thresholds, transitions, pagination | `src/model.js` |
| Meaning, standing labels, and status messages | `src/semantics.js` |
| Safe table and SVG projection | `src/render.js` |
| Requests, cancellation, listener ownership, and release | `src/controller.js` |
| Responsive layout and local overflow | `src/styles/lab.css` |
| Public fixture contract | `schemas/data-view-lab.schema.json` |
| Current, partial, empty, and rejected candidates | `fixtures/` |

Open `index.html` through a local HTTP server so the module can fetch its JSON fixture. `standalone/index.html` provides a single-file reading artifact with the accepted values and their standings.

## Deterministic renderer thresholds

| Decision need | Admitted scale | Renderer |
| --- | ---: | --- |
| One status | 0–500 | Summary |
| Exact values | 0–500 | Table |
| Change over time | 0–80 | Timeline |
| Change over time | 81–500 | Paginated table |
| Relationships | 0–48 | Graph |
| Relationships | 49–500 | Paginated table |
| Spatial | 0–120 | Spatial SVG |
| Spatial | 121–500 | Paginated table |
| Comparison | 0–12 | Chart |
| Comparison | 13–80 | SVG |
| Comparison | 81–500 | Paginated table |

The renderer names carry specific data requirements. Timeline placement comes from each numeric record's observation date. Graph connectors come from admitted relationship records. Spatial placement comes from bounded `x` and `y` coordinates. Comparison marks use one numeric domain computed from the complete accepted revision, so pagination retains a stable scale. Numeric marks extend from a shared zero baseline; standing markers preserve the nonnumeric meaning of unknown, absent, and redacted values.

JSON Schema closes the public shape, enumerations, bounds, and standing-dependent fields. Runtime admission adds collection-wide invariants: unique record order, relationship endpoint membership, distinct endpoints, and real calendar dates. Both checks run before a candidate revision can replace accepted data.

## State and authority boundary

Request identity and owner generation jointly control asynchronous settlement. Candidate rejection changes the request dimension while the accepted data standing, revision, selection, and view remain available. Owner replacement admits the successor fixture and receiving markup on a detached root, then aborts transport work, releases the prior listeners, and installs one listener set for the replacement. A rejected successor leaves the incumbent responsive. A repeated owner identity preserves the active generation and listener set. Release makes the public controller methods inert. The startup fixture request belongs to a page-lifetime abort owner. A persisted page transition retains the current owner for browser restoration; a terminal page release closes the active request and listeners.

The authorization selector is an inspectable local signal. A receiving backend remains the authority for durable access and publication decisions.

## Evidence boundary

The bundled synthetic fixtures and focused checks establish the local state transitions, renderer rules, exact-value parity, recovery, and browser behavior they exercise. A receiving system supplies its own authorization, service, security, accessibility, performance, and scientific validation. The standalone file declares a document CSP and names the response-level frame policy and iframe sandbox as hosting-owner decisions.

## Run the focused checks

```sh
node --test tests/visual-fidelity-contracts/data-view*.test.mjs
```

The tests exercise schema/model parity, renderer boundaries, stable global domains, ordering, pagination, detached ownership, successor admission, owner-generation eligibility, BFCache and terminal release, semantic-twin agreement, multi-instance SVG namespaces, disclosure persistence, candidate rejection, script-independent parity, and the declared browser contract.
