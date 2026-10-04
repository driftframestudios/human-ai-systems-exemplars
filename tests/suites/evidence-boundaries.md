# Bundle evidence and receiving boundaries

Issue #374 carries this boundary into the existing owned routes. The catalog
selects source files and command metadata; it neither dispatches those commands
nor supplies their runtime case population. Existing runners keep assertions,
case definitions, dependency closure, artifacts and acceptance.

## Dispositions retain their source

| Disposition | Required meaning | Receiving boundary |
| --- | --- | --- |
| Passed | Every required selected observation completed and satisfied its owning acceptance contract. | A zero exit from a discovery/research command is not automatically acceptance. |
| Failed | An executed required assertion or owning acceptance contract failed. | Preserve the failed observation and its original diagnostics; keep harness/preparation failures distinct. |
| Skipped | An explicitly excluded observation has a recorded reason and authority. | An unrequested case is outside selection, not an executed skip. Required skipped work cannot establish full acceptance. |
| Blocked | A named prerequisite, receiving decision or authorization prevents the intended observation. | A held catalog route remains metadata, not an executed failure or pass. |
| Incomplete | An attempt lacks required completed cases, artifacts or final validation, including cancellation. | Prior completed generations remain available with their own scope. |
| Reused | The existing owner accepted an earlier observation under matching definition, runtime, dependencies and required artifacts. | Retain its original pass/review standing and scope; count zero new execution for that case. |

These dispositions describe different dimensions when combined. A mixed
invocation retains each member's execution or reuse and its owner's outcome.
The table owner continues to store pass, review and incomplete; this document
does not introduce another persisted result schema or rename those standings.
In particular, review in discovery mode is a completed research observation,
not a claim that a required acceptance condition passed.

A plan-only result reports undispatched commands and zero executed cases.
Source inspection, unit execution, browser observations, checkpoint reuse and
live observations remain separately named evidence layers. Catalog member
files, case attempts, browser launches, document visits and elapsed time have
different units.

## Existing owners

- [Campaign identity and publication](../../tools/evidence-campaign.mjs) own exact expected membership, captured inputs, immutable screenshots and complete generations.
- [Material input declarations](../../tools/evidence-inputs.mjs) retain their named executable/data dependencies.
- [Checkpoint storage](../../tools/observation-checkpoint.mjs) owns atomic version-2 records and the exclusive acquired-lock lifetime.
- [Table campaign](../../tools/table-reading-contract.mjs) supplies the runtime signature, final artifact/telemetry boundary, local resource cleanup and invocation accounting.
- [Focused acceptance](../../tools/table-focused-acceptance.mjs) keeps its three trusted journeys and fresh-only acceptance. Research resume does not substitute for it.
- [Pipeline contract](../tables/PIPELINE.md) retains generation identity, source scope and hard-interruption recovery.

Table signatures include harness source hashes, package lock, Node/platform/
architecture and the existing browser-executable identity. Changed table-runner
or checkpoint source therefore reopens affected saved cases without changing
the checkpoint schema. Captured dependencies and artifacts still undergo the
existing fresh-byte validation. An unrelated source change does not expand
scope through this document; incomplete dependency knowledge calls for the
owning family's conservative selection.

## Owned lifetime and publication

An exclusive lock open establishes ownership. A failed open never removes
another writer's lock. Once acquired, metadata preparation, observation and
reporting remain within that lifetime. Every cleanup is attempted even when an
earlier cleanup fails; original and cleanup failures retain separate diagnoses.
A filesystem refusal to close or unlink is reported, not represented as a
successful release.

Each case finishes required captures, closes its context, and validates source
and artifact identity before the final telemetry/cancellation check permits a
checkpoint write. A failed candidate does not replace the previous checkpoint.
Browser and server cleanup precede campaign completion publication. Existing
complete generation pointers and content-addressed images survive incomplete
successors. A report or lock-release failure after atomic completion remains a
separate operational failure; it does not rewrite that completed generation.

SIGINT and SIGTERM request cooperative cancellation. The CLI forwards an
AbortSignal and removes its listeners when the invocation settles. Owned
awaited work settles or reaches its existing timeout before cleanup; there is
no detached race against ongoing artifact writers. Cancellation is checked at
safe work/publication boundaries, not promised to roll back an atomic write
already in progress. Hard kill, power loss and externally interrupted cleanup
retain the inspected abandoned-lock procedure in the pipeline contract.
Keep an active writer's lock with its owner; use the documented inspection
procedure before reclaiming an abandoned lock.

Attempted cases and new cases count cases entered in this invocation, including
failed preparation, and exclude reused observations. Reused cases retain their
original observation fields. Unrun acceptance cases remain explicit; prior
attempted flags cannot become this invocation's new work. Launches, source
hashing, observed documents, completed records and durations retain their
existing independent measurements.

## Hosted and live gates remain unchanged

| Workflow | Existing receiving gate |
| --- | --- |
| prototype-unit-tests.yml | Confirmed workflow dispatch, or a non-draft matching PR with PROTOTYPE_UNIT_TESTS_AUTOMATIC=true; selected suite/browser switches remain owned here. |
| lims-eln-enterprise-reference.yml | Workflow dispatch, ENABLE_GITHUB_ACTIONS=true, confirmation and the selected offline/database/full proof. |
| lims-eln-functional-nucleus.yml | Workflow dispatch, ENABLE_GITHUB_ACTIONS=true, confirmation and the selected bounded proof. |
| res-public-boundary-intake.yml | Matching main PR, ACTIONS_BUDGET_MAIN=true and non-draft standing. |
| schema-receiver-routes.yml | ACTIONS_BUDGET_MAIN=true plus dispatch or a non-draft matching main PR; the schema step remains advisory. |
| schema-delivery.yml | Receiver-specific release/prod budgets admit contracts. Deployment additionally depends on the successful contract, push receiver and DEPLOYMENT_ACTIVE_RECEIVERS, with existing environment/credential gates. |
| schema-pages.yml | Explicit dispatch binds reviewed source/projection coordinates and release identity; verification and build remain connected, and upload/deploy require activate_deployment. |
| production-carrier-contracts.yml | Existing dispatch or path-filtered matching main PR. Use this workflow's own trigger policy when considering an activation change. |

Local command availability grants no hosted runner, live network, deployment,
upload or publication authority. Predictive observations stay with #320, #330
and #331; no forecast changes deterministic required checks or authorizes
adaptive skipping.

## Focused evidence and limits

The existing source/unit command is:

~~~sh
node --test tests/tables/checkpoint.test.mjs tests/tables/pipeline.test.mjs tests/tables/focused-acceptance.test.mjs tests/tables/verdict.test.mjs
~~~

Fixtures use owned temporary files, literal values, failing cleanup callbacks,
late telemetry and AbortController. They cover foreign-lock preservation,
partial acquisition, cleanup ordering and original failure identity, prior
checkpoint/completion retention, final telemetry and new/reused accounting.
Existing fixtures retain dependency/artifact perturbations and exact acceptance
metadata. Source assertions connect those seams to the campaign and CLI.

These fixtures establish source/unit lifecycle contracts. Real browser behavior,
OS signal delivery, power-loss recovery, hosted activation and measured runtime
or concurrency effects require their own fitting observations. A real browser
case follows named selection, execution authority and independent review; its
receiving PR records the observed result and scope.
