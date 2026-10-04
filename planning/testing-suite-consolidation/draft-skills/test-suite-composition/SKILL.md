---
name: test-suite-composition
description: Composes owned checks into explicit, proportionate execution bundles with clear prerequisites and result meaning. Applies when test discovery, shared setup, selective reruns, or cross-runner coordination becomes difficult.
---

# Test suite composition

## Draft standing

Draft candidate exercised through the bounded [Issue #371 application](../../exercises/issue-371.md), with wider family migrations retaining their own review. Existing
commands remain authoritative until a receiving migration demonstrates
membership parity and preserves its behavior and evidence boundaries.

## Contract

- **What:** A source-owned map and executable bundle of existing checks for a named receiving decision.
- **When:** A repository has overlapping commands, several runners, hidden prerequisites, or uncertainty about which checks a change reopens.
- **Boundaries:** Domain owners retain expectations. Runner choice follows demonstrated capabilities. Required acceptance, authorization, publication, and budget gates remain explicit. Research predictions have only the authority granted by their experiment.
- **Result:** A discoverable bundle whose cases, inputs, environment, side effects, outcomes, and re-entry conditions are inspectable before execution.

## Fit and attention

- **Useful when:** A cold collaborator cannot choose the fitting command, helper duplication changes behavior, or a campaign repeats unaffected cases.
- **Poor fit when:** One focused test already answers the question; direct invocation remains complete.
- **Smallest useful dose:** One owned family, an exact case list, and its existing command.
- **Foregrounds:** Discoverability, independent expectations, safe reuse, and failure isolation.
- **May under-attend:** A source map establishes intended coverage; actual runtime, flake rates, and wall-clock cost need observations.
- **Interactions:** Evidence-bearing test design owns an individual oracle; runtime, domain, publication, and research skills retain their separate results.
- **Rest or release when:** The chosen receiver can select, run, interpret, and resume the bundle without discovering hidden obligations.

## Inputs and defaults

Begin with source owners, current commands, supported runtimes, activation
settings, and the receiving change. Use an existing manifest or table before
introducing a new registry. Repeated selection work may justify a declarative
registry and a thin plan/dispatch adapter; the adapter calls reviewed commands
rather than rewriting assertions.

A bundle record can carry stable ID, owner, command/argument vector, test layer,
source dependencies, environment, side effects, prerequisites, case selector,
artifact requirements, timeout, recovery, and result scope. Each field needs a
consumer. Unknown execution cost remains unknown until measured.

## Rules

### Rule: Organize by behavior ownership and observation layer

Keep family meaning visible while distinguishing unit, source/schema, artifact,
browser interaction, visual/media, and live-receiver evidence. These are
composable dimensions rather than a mandatory staircase for every change.
Independent Python applications keep their own runtimes and acceptance routes.

### Rule: A plan explains the selected population

Enumerate cases before expensive work when a campaign already supports that
operation. Explain the named dependencies that reopened a case. Unknown
dependencies receive owner review and a conservative affected-family scope.
Broader checks follow a material cross-family change or a release decision.

### Rule: Reuse preserves independence

Share environment setup, local serving, telemetry, byte capture, artifact
publication, and teardown where contracts match. Keep expected values and
source-owned assertions independent of the implementation being checked.
Migrate one caller at a time when lifecycle or network policies differ.

### Rule: Equivalent selection is a migration condition

Before replacing a command, compare case identities, scenarios, modes, fixtures,
source closure, failure standing, and artifacts. Equal counts alone leave
membership unspecified. Preserve a compatibility route until the receiving
owner accepts the new command and its rollback.

### Rule: Recovery validates evidence identity

Reuse a checkpoint only when its trusted case definition, required artifacts,
source/dependency identities, runtime, and observation contract still match.
A failure preserves prior completed evidence with its original scope.
Publication follows final validation and telemetry, rather than anticipating
them. Cleanup remains available after partial initialization and cancellation.

### Rule: Results distinguish execution from acceptance

Return separate statuses for executed pass, failure, skip, blocked, incomplete,
and reused evidence. A zero-match selector needs an explicit disposition.
Record actual browser launches separately from case reuse and source-only work.
A screenshot supports the named visual observation; comparison expectations
and accessible interaction retain their own oracles.

### Rule: Adoption remains proportionate

A runner migration earns adoption through measured maintenance, diagnostic,
isolation, or execution benefits. Configuration consistency alone supplies a
weak reason to replace sound tests. Preserve existing manual/live and budget
gates; hosted activation is an independently reviewed change.

### Rule: Predictive experiments supplement deterministic selection

Bind predictions to a declared event, time window, eligible population,
reviewed model/classifier version, and outcome rule. Keep censored and complete
negative outcomes distinct. A forecast does not silently change required
security, accessibility, integrity, or publication checks.

## Operating sequence

1. **Inventory:** Classify maintained source, generated copies, retained examples, local experiments, and external receivers.
2. **Map:** Connect each check to its behavior owner, runner, prerequisites, and evidence claim.
3. **Select:** Define the smallest useful bundle and the event that expands it.
4. **Consolidate:** Reuse mechanics where ownership matches; retain independent domain expectations.
5. **Exercise when authorized:** Compare one migrated family's membership and outcomes, including a failing or interrupted case.
6. **Receive:** Preserve compatibility or rollback, return bounded evidence, and update the single source-owned map.

## Decisive scenarios

### Scenario: A Python source-preserving parser joins a browser family

- **Given:** Python validates exact authored bytes while Chromium observes rendered table behavior.
- **When:** The family receives a common bundle.
- **Then:** The bundle keeps both runners and distinct failure meanings; parser success remains separate from scroll and focus evidence.

### Scenario: A runner offers project selection

- **Given:** An existing browser campaign already binds case identity and artifacts to source bytes.
- **When:** A project-based runner is proposed.
- **Then:** A bounded pilot must preserve those contracts or leave the existing campaign as the source owner.

### Scenario: An unaffected case has a valid checkpoint

- **Given:** Case, dependencies, runtime, and required artifacts still match.
- **When:** The campaign resumes.
- **Then:** The result identifies reuse and its original evidence scope; new browser-launch counts describe only new work.

## Recovery and completion

If a bundle obscures failure meaning or requires a full campaign for a local
change, return to the owned focused commands and refine the selection map.
Completion means a cold collaborator can plan and interpret the requested
bundle, including blocked and partial outcomes. Re-enter when a family, shared
dependency, runtime, or publication boundary changes.

## Conditional sources

[Playwright projects](https://playwright.dev/docs/test-projects) describe one
configuration mechanism; [Node's test runner](https://nodejs.org/download/release/latest-jod/docs/api/test.html)
and [Python unittest](https://docs.python.org/3.12/library/unittest.html)
retain their native selection mechanisms. These capabilities inform local
composition; none establishes an optimal repository-wide runner by itself.
