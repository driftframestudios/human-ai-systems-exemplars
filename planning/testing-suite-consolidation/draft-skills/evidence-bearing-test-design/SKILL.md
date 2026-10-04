---
name: evidence-bearing-test-design
description: Designs a focused executable observation that distinguishes intended behavior from a consequential plausible fault. Applies when an assertion's oracle, fixture, observation layer, or evidence boundary needs definition.
---

# Evidence-bearing test design

## Draft standing

Draft candidate with a bounded [Issue #371 application](../../exercises/issue-371.md).
Existing domain contracts remain active owners. A reviewed natural use supplies
the next promotion or revision decision; these examples describe intended
behavior rather than executed coverage.

## Contract

- **What:** A test design joining behavior, plausible fault, independent expectation, observable outcome, and consequence.
- **When:** A new check is needed, a check passes for the wrong reason, or implementation change exposes a weak oracle.
- **Boundaries:** Source owners define intended meaning; authorization governs execution. This skill designs the observation. Suite composition owns selection and orchestration, and domain skills retain state, accessibility, security, and publication contracts.
- **Result:** A smallest fitting test or source observation with a discriminating fixture, clear failure meaning, and stated coverage limit.

## Fit and attention

- **Useful when:** Pure logic needs an exact unit oracle, a parser must preserve bytes, an adapter crosses a runtime boundary, or a browser claim needs actual interaction.
- **Poor fit when:** The requested behavior is unresolved; return the ambiguity to its source owner before encoding an expectation.
- **Smallest useful dose:** One behavior, one plausible fault, one independent expected outcome.
- **Foregrounds:** Fault detection and useful diagnosis, rather than test-count growth.
- **May under-attend:** A focused case leaves other states and environments unspecified.
- **Interactions:** Stateful-artifact, semantic-table, visual-verification, cost-and-ownership, and runtime-preparation owners supply their distinct contracts.
- **Rest or release when:** The receiving behavior has a fitting observation, or an identified missing decision prevents a truthful oracle.

## Inputs and defaults

Use the behavior owner, change boundary, existing focused suite, and smallest
representative input. Begin with the existing runner and helpers. An exact
hand-calculated fixture is often a better first oracle than a large generated
dataset. Preserve controlled nondeterminism, seed, clock, and environment
assumptions when they influence the result.

Return a test specification or authorized implementation with its command,
expected signal, scope, and recovery route. A source reading remains sufficient
when runtime behavior is outside the question.

## Rules

### Rule: The expected result has an independent basis

Derive expected semantics from a literal fixture, an independent calculation,
a named invariant, or an independently governed contract. Reusing production
code to compute both actual and expected values proves only the remaining
difference. State that narrower parity claim and pair it with independent
meaning when correctness is the receiving question.

### Rule: Helpers own mechanics; cases own meaning

Reuse servers, artifact readers, clock controls, telemetry, and cleanup through
their established owners. Keep source-specific values, accepted state, and
consequential failure expectations visible in the case. An abstraction earns
its place by removing repeated mechanics while preserving diagnostic detail.

### Rule: Observation depth follows the fault

Use pure-function checks for transformations, parser fixtures for admitted
syntax and source preservation, adapter tests for owned transitions, and real
browser observations for layout, focus, interaction, downloads, and media
behavior. A DOM stub establishes its modeled contract; it leaves layout and
browser event semantics to an appropriate browser observation.

### Rule: Success is substantive

Name the expected case population and require meaningful records or values
before comparing two projections. Two empty outputs can agree while missing
the receiving job. A deliberately empty dataset has its own visible-state
contract and remains distinct from failed extraction.

### Rule: Boundary fixtures distinguish adjacent states

Choose cases whose meanings differ: absent/zero, admitted/rejected, inherited/
owned, partial/complete, fresh/stale, pending/accepted. Parameterization is useful
when each row names a distinct contract boundary. Keep the matrix finite and
reasoned; broad combinatorial expansion needs a consequence-bearing question.

### Rule: Errors retain both diagnosis and recovery

Assert stable error class/code or causal context when that is a public debugging
contract. Keep visitor wording separate from private exception details. Test
accepted-state preservation and owned-resource cleanup when failure can cross
those boundaries. Name exactly which failure phase was exercised.

### Rule: Execution returns its actual standing

Distinguish passing, failing, skipped with reason, blocked, incomplete, and
reused evidence. A changed fixture repairs an oracle only when the source
contract supports the change. Preserve a genuine regression until the
implementation or its accepted requirement changes.

## Operating sequence

1. **Frame:** Name the behavior, receiving consequence, and current source owner.
2. **Discriminate:** Describe a plausible faulty implementation and the observation that would expose it.
3. **Locate:** Choose the smallest fitting existing suite and reusable mechanics.
4. **Specify:** Supply independent values, deliberate boundary cases, and isolated setup/cleanup.
5. **Observe when authorized:** Run only the selected command; distinguish harness failure from product failure.
6. **Return:** State the observed result, exercised boundary, remaining uncertainty, and next material decision.

## Decisive scenarios

### Scenario: Matching empty tables

- **Given:** Authored and projected tables are expected to carry eight named comparisons.
- **When:** Both extraction paths return empty arrays.
- **Then:** Independent expected membership and native-header assertions expose the missing content before parity can establish agreement.

### Scenario: A shared calculation supplies both sides

- **Given:** A rate implementation and its expected fixture call the same denominator function.
- **When:** The denominator function is wrong.
- **Then:** An independently calculated count/exposure example distinguishes the fault; helper reuse remains limited to setup mechanics.

### Scenario: Export acquisition fails

- **Given:** A controller has an accepted view and downloadable artifact.
- **When:** Acquiring a candidate resource fails.
- **Then:** The test observes retained accepted values and release of acquired candidates; partial DOM-publication rollback remains a separately named observation.

## Conditional context

Load the existing stateful owner's
[owned-state and resource-fault reference](../../../../.agents/skills/stateful-artifact-behavior-contracts/references/owned-state-and-resource-faults.md)
when a candidate acquires resources or publishes state.
Use the existing cost-and-ownership references for parser allocation,
copy budgets, and ownership-preserving helper reuse.

## Completion and re-entry

The receiver can identify what a passing case establishes, what plausible fault
it distinguishes, and where its evidence stops. Reopen on a missed consequential
defect, changed source contract, false positive, or newly material environment.
Release the test when the behavior retires through its source owner's decision.
