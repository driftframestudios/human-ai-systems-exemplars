---
name: evidence-bearing-test-design
description: Designs a focused executable observation that distinguishes intended behavior from a consequential plausible fault. Applies when a test oracle, fixture, observation layer, failure meaning, or evidence boundary needs definition or repair.
---

# Evidence-bearing test design

## Contract

- **What:** A method for joining one owned behavior, one plausible fault, one independent expectation, one observable signal, and one receiving consequence in the smallest fitting test.
- **When:** A new check is needed, an existing check can pass for the wrong reason, a production defect reveals a weak oracle, or a test result needs a precise account of what it establishes.
- **Boundaries:** The accepted domain contract, specification, or named decision owner defines intended meaning. Runnable implementation source supplies the actual behavior and exact coordinate under observation. This skill designs and, when authorized, implements the observation. `test-suite-composition` owns selection across checks. Domain, security, accessibility, state, publication, and live-service owners retain their acceptance authority.
- **Result:** A focused source observation or executable test with a discriminating fixture, an independently grounded expectation, useful failure meaning, and an explicit evidence limit.

## Fit and attention

- **Useful when:** Pure logic needs an exact oracle, a parser must preserve source, an adapter crosses an ownership boundary, asynchronous work can finish out of order, or a browser claim needs real interaction and geometry.
- **Poor fit when:** Product meaning remains unsettled, or one existing check already distinguishes the material fault and returns enough diagnosis. Return an unresolved expectation to its source owner; use the existing check when it already completes the job.
- **Smallest useful dose:** One behavior, one consequential faulty alternative, and one independent expected outcome.
- **Foregrounds:** Fault detection, diagnostic value, retained working state, and the distinction between a passing process and an exercised claim.
- **May under-attend:** One focused case leaves adjacent states, environments, engines, and workloads for their own receivers.
- **Interactions:** `stateful-artifact-behavior-contracts` owns state transitions and recovery; `context-canvas-visual-verification` owns visitor-visible browser evidence; `cost-and-ownership-analysis` owns full-path cost and mutation; `test-suite-composition` owns bundles and reruns.
- **Rest or release when:** The named behavior has a smaller existing oracle, the behavior leaves active use, or a truthful expected result awaits additional source authority.

## Inputs, defaults, and output

Begin with:

1. the behavior and consequence that matter;
2. its current source and decision owner;
3. the smallest representative input;
4. one plausible implementation fault;
5. the existing focused runner and reusable mechanics; and
6. the receiver that will interpret the result.

Use the existing runner, fixture conventions, and lifecycle helpers by default.
An exact hand-calculated fixture often supplies a stronger first oracle than a
large generated dataset. Bind clocks, random seeds, locale, engine, runtime,
network, and filesystem assumptions when they can change the answer.

Return a test specification or authorized implementation with its command,
expected signal, failure meaning, scope, and recovery route. A direct source
observation completes the task when runtime behavior lies outside the claim.

## Rules

### Rule: Desired behavior leads the test

State the behavior a correct implementation creates, then place the plausible
fault beside the observation that distinguishes it. Keep a hard safety,
privacy, or compatibility rejection local to its affirmative admission rule.
This ordering gives a future collaborator the target state before the failure
case enters working context.

### Rule: The expected result has an independent basis

Derive expected semantics from a literal fixture, an independent calculation,
a named invariant, or an independently governed contract. Reusing production
code to compute both actual and expected values establishes only the remaining
difference. State that narrower parity claim and add an independent semantic
anchor when correctness is the receiving question.

### Rule: Helpers own mechanics; cases own meaning

Reuse servers, artifact readers, clock controls, telemetry, and cleanup through
their established owners. Keep source-specific values, accepted state, and
consequential expectations visible in the case. An abstraction earns its place
by removing repeated mechanics while preserving diagnostic detail.

### Rule: Observation depth follows the fault

Use pure-function checks for transformations, parser fixtures for admitted
syntax and source preservation, adapter checks for owned transitions, package
or workflow checks for environment contracts, and real-browser observations
for layout, focus, interaction, downloads, media, and engine behavior. A DOM
model establishes its modeled contract; browser layout and event semantics
retain their browser receiver.

### Rule: Success carries a substantive population

Name the expected cases, records, relationships, or values and require their
presence before comparing projections. Two empty outputs can agree while the
receiving job remains unserved. A deliberately empty dataset receives its own
visible-state contract and result meaning. A case selected as required for the
claim must execute; a prerequisite-driven skip returns `incomplete` for that
claim and names the preparation route that can admit it.

### Rule: Boundary fixtures distinguish adjacent states

Choose cases whose meanings differ: absent and zero, admitted and held,
inherited and owned, partial and complete, fresh and stale, pending and
accepted. Parameterization fits when every row names a distinct boundary.
Larger combinatorial matrices begin with a consequence-bearing question and a
declared coverage method.

### Rule: Failure preserves diagnosis and recovery

Assert a stable error class, code, phase, or causal context when it forms part
of the debugging contract. Keep visitor language and internal diagnostics in
their separate owners. Exercise accepted-state preservation and owned-resource
cleanup when the failure crosses those boundaries.

### Rule: Faster preparation preserves behavior proof

When cache, hosted tooling, a prebuilt image, checkpoint, or reused artifact
changes preparation, keep the behavior population and its strict failure
semantics intact. A cache-service hit establishes a key match and restoration
attempt. Dependency verification plus admitted use establishes preparation
reuse. The behavior checks establish product or workflow behavior. Record
these results separately.

### Rule: Execution returns its actual standing

Distinguish executed pass, failure, skip with reason, blocked, incomplete,
cancelled, and reused evidence. A repaired fixture becomes the retained oracle
only when its source contract supports the new expectation. A genuine
regression remains visible until implementation or the accepted requirement
changes.

## Operating sequence

1. **Frame:** Name the owned behavior, receiving consequence, current source, and receiver.
2. **Discriminate:** Describe one plausible faulty implementation and the observable difference it creates.
3. **Locate:** Select the smallest fitting existing suite and the mechanics it already owns.
4. **Specify:** Supply independent values, deliberate boundary cases, substantive population, and isolated setup and cleanup.
5. **Perturb:** When practical, demonstrate that a controlled fault changes the signal while the intended state passes.
6. **Observe:** Run the selected command when authorized and distinguish harness, environment, product, and acceptance outcomes.
7. **Return:** State what the result establishes, the fault it distinguishes, its coverage boundary, recovery route, and next material decision.

## Decisive scenarios

### Scenario: Matching empty projections

- **Given:** Authored and projected tables should carry eight named comparisons.
- **When:** Both extraction paths return empty arrays.
- **Then:** Independent expected membership and native-header assertions expose the missing content before parity can establish agreement.

### Scenario: A shared calculation supplies both sides

- **Given:** A rate implementation and its expected fixture call the same denominator function.
- **When:** The denominator function returns the wrong value.
- **Then:** An independently calculated count-and-exposure example distinguishes the fault; helper reuse remains limited to setup mechanics.

### Scenario: A reusable dependency closure accelerates CI

- **Given:** A workflow can restore a verified dependency closure or install it directly.
- **When:** exact-hit, compatible-restore, rejected-restore, miss, and unavailable routes execute.
- **Then:** focused workflow checks establish identity and fallback; the same behavior suite establishes application behavior in every route; the receipt reports speed as cost evidence and correctness through the owned behavior checks.

### Scenario: A failure arrives during final validation

- **Given:** Artifact validation can yield while browser telemetry continues to arrive.
- **When:** A consequential console or network error arrives during validation.
- **Then:** final telemetry collection occurs before accepted evidence is published, and a focused fixture identifies the exact prior completion retained for recovery.

## Conditional context

Load [the fault, oracle, and evidence worksheet](references/fault-oracle-evidence-worksheet.md)
when several plausible faults, observation layers, or result standings compete
for the same test. Load the stateful owner's
[resource-fault reference](../stateful-artifact-behavior-contracts/references/owned-state-and-resource-faults.md)
when a candidate acquires resources or publishes accepted state.

## Recovery and re-entry

When a test passes through shared implementation logic, empty populations, or
an unexercised environment, retain the narrower signal and return to the
smallest independent oracle. Re-enter after a missed consequential defect,
changed source contract, false positive, newly material environment, or an
observation whose failure meaning remains ambiguous.

## Completion

The receiver can identify the behavior established by a passing case, the
plausible fault it distinguishes, the execution standing, and the evidence
boundary. The test can then remain with its behavior owner, receive a focused
revision through new evidence, or retire with the behavior it protected.
