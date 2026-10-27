# Visual Fidelity Component Lab

This lab shows how a person can prepare and review an order while the last accepted catalog stays visible. Panels, drawers, validation, editable intent, and authority receipts retain distinct meanings during loading, failure, and recovery. Every late result must prove that it still belongs to the active request or intent.

## What the lab demonstrates

- The catalog fixture owns identity, revision, lineage, price, and stock.
- Draft email and quantity fields provide immediate local feedback.
- Authorization, payment, order acceptance, and the receipt remain separate, visible states.
- A provisional intent freezes its item, quantity, price, total, revision, authorization standing, and owner generation. Only the matching authority result can settle that envelope.
- Candidate fixture admission is atomic. Admission retains the prior accepted model and data standing when a candidate is malformed, unrelated, or late.
- Controller replacement admits the successor fixture and receiving markup on a detached root before releasing the current owner. A rejected successor leaves the accepted fixture, selection, draft, and listener owner operational.
- A persisted page transition retains the current owner for browser restoration; a terminal page release closes its requests, timers, dialog, and listeners.
- The native `dialog` element owns modal focus and returns focus to its connected invoker or a stable workbench control.
- The live region and machine-readable twin derive from the same accepted state.
- The HTML includes a useful reading representation when JavaScript is unavailable.

## Inspect the implementation

| Concern | Owner |
| --- | --- |
| Fixture admission and state transitions | `src/model.js` |
| Human-readable and machine-readable meaning | `src/semantics.js` |
| Safe DOM projection | `src/render.js` |
| Requests, listeners, timers, focus, and release | `src/controller.js` |
| Visual and responsive behavior | `src/styles/lab.css` |
| Public input contract | `schemas/component-lab.schema.json` |
| Deterministic examples | `fixtures/valid/` and `fixtures/invalid/` |

Open `index.html` through a local HTTP server so the module can fetch its JSON fixture. `standalone/index.html` is a single-file reading artifact for review, email, or an environment where module loading is unavailable. Focused tests compare its identity, revision, and catalog values with the accepted fixture.

The interactive route declares a same-origin Content Security Policy suitable for its module, stylesheet, and fixture requests. The standalone artifact uses static HTML and CSS and declares a correspondingly smaller policy. When either route is embedded, the receiving server owns `frame-ancestors` and the embedding page grants the smallest useful iframe sandbox capability set.

## Accepted-state sequence

```text
accepted catalog + retained draft
              │
              ├── candidate request ── valid + current identity ──► atomic catalog replacement
              │                    └── late / malformed ──────────► prior accepted state remains
              │
              └── local intent ───────► provisional receipt ─────► matching authority receipt
                                                   └─────────────► rejected with draft retained
```

## Evidence boundary

The synthetic fixture demonstrates the transitions, focus behavior, safe rendering, and recovery paths exercised by this lab. Production performance, service reliability, security posture, accessibility conformance, and commercial authority require evidence from their receiving environments.

## Run the focused checks

```sh
node --test tests/visual-fidelity-contracts/component*.test.mjs
node --test tests/visual-fidelity-contracts/component.browser.mjs
```

The tests exercise fixture and successor admission, identity and lineage continuity, detached ownership, validation identity, request and intent eligibility, accepted-state atomicity, BFCache and terminal release, focus continuity, responsive containment, alternate media, script-independent reading, and standalone parity.
