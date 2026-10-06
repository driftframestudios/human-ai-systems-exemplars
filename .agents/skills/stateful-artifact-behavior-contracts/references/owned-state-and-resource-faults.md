# Owned-state and resource-fault observations

Load this reference when accepted state is rendered or exported through
resources with explicit lifetimes. It complements import/roundtrip contracts
with a phase-specific failure model. Pure preparation, candidate effects,
accepted publication, and teardown keep separate owners.

## Define the transaction boundary

Name the accepted snapshot, candidate input, acquired resources, visible
projection, downloadable artifacts, and recovery surface. An admitted candidate
may commit atomically at the owned boundary. An incompatible candidate remains
outside accepted state while the prior reading stays usable.

Admission establishes allowed meaning. Projection chooses the canonical fields
the controller owns. Detachment establishes alias independence for those
fields. A deep clone of arbitrary metadata does not inherit a bounded
collection's cost limit. Preserve optional absence deliberately and validate
declared fields before projecting them.

## Choose faults by phase

| Phase | Plausible fault | Observable result |
| --- | --- | --- |
| Admission | Invalid owned field, incompatible version, malformed reference | Accepted state remains available; the diagnostic names the receiving boundary. |
| Snapshot | Caller mutates a nested field; surplus metadata carries a throwing getter | Canonical nested state remains stable; surplus fields stay outside the copy and exports. |
| Pure preparation | Renderer or serializer rejects an admitted candidate | Prior controls, figure, values, and artifacts still agree. |
| Acquisition | First resource succeeds, second allocation fails | The acquired candidate is released; accepted resources remain usable. |
| Publication | A visible update fails after an earlier update succeeds | The owned recovery contract restores agreement or reveals a named static fallback. |
| Retry | Corrected input follows a rejected transition | A new accepted result replaces the prior one, with superseded resources released. |
| Teardown | Failure notice follows failed initialization; teardown repeats | Listeners, URLs, handles, and owned notices are released idempotently. |
| Departure | Persisted page lifecycle event differs from actual departure | The lifecycle contract preserves or releases the instance according to the actual event. |

Select only consequential phases for the current change. A preparation-failure
case establishes preparation recovery. Partial publication needs its own
fault injection before rollback receives that stronger claim.

## Design independent observations

Use explicit accepted IDs, values, and artifact contents from a small admitted
fixture. Observe state before and after the fault. Assert meaningful content
before comparing projections. Keep the real transition logic under test;
inject failure at a named external seam rather than replacing the whole
controller with a test implementation.

A fake resource allocator can establish exact release ownership. A real
browser case can establish focus, control state, rendered content, downloaded
bytes, and retry together. Use both only when they answer distinct questions.
Copying a production formatter into the oracle retains its errors; use literal
expected values or an independently calculated invariant for semantic meaning.

For source-copy tests, a throwing surplus getter establishes that surplus
metadata is not traversed. Mutating owned nested records after initialization
establishes detachment. Both checks are needed when exclusion and alias
independence are the receiving claims.

## Errors and cleanup

A small native-error factory is useful when stable stage/code/cause context
improves debugging. Keep the original cause, including non-Error rejection
values when the runtime permits them. Fixed visitor notices use safe text
insertion; diagnostics remain separate from public user-facing messages.

Store listener identities and ownership handles. Release each acquired resource
even if another release fails, while preserving the material cleanup failure
for diagnosis. An idempotency guard should preserve all promised repeated-call
behavior, including removal of notices created after a prior failure.

The observation uses the existing suite's clock, server, telemetry, and artifact
helpers. Case-specific accepted values and failure expectations stay with the
case. Teardown assertions complement rather than replace the receiving
behavior's assertions.

## Exercise and transfer

The source-owned [Atlas gallery controller](../../../../context-canvas-project-surface/context-canvas/atlas-gallery.js),
[focused state and resource checks](../../../../tests/visualization-fidelity-atlas/atlas-gallery-page.test.mjs),
and [browser recovery journey](../../../../tests/visualization-fidelity-atlas/atlas-gallery.browser.mjs)
supply the originating implementation example and its public inspection route.
Keep three observation layers distinct when transferring it: source inspection
identifies declared projection and resource owners; focused fixtures can
establish nested detachment, failure injection, and repeated cleanup; real
browser cases can establish retained downloads, visible controls, and retry.
Each new execution records its own observed population and result. Partial
DOM-publication rollback remains a separate fault phase requiring its own
observation.

A new controller receives its own state and resource model; the example
provides a probe vocabulary rather than blanket proof.

The next natural execution should name one selected phase, a plausible defect,
an independent expected result, and the smallest fitting layer. Record only
the result that changes implementation or the skill's next disposition.
