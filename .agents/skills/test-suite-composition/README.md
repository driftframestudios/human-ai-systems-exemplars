# Test suite composition

Choose and maintain the smallest set of checks that can answer the current
engineering question. This skill maps behavior owners, dependencies, runners,
environment preparation, and evidence meanings so a team can run focused
proof quickly and expand coverage for a clear reason.

## Start here

- [Read the authoritative skill contract](SKILL.md).
- [Use the CI provisioning and runner guide](references/ci-provisioning-and-runner-efficiency.md) when setup time, dependency transfer, caching, or runner images dominate a lane.
- [Choose a runtime provisioning card](references/runtime-provisioning-cards.md) when Node, Python, browser, system-package, container, database, or release-history coordinates shape reuse.
- [Return to the repository skills catalog](../README.md).

## Use it when

Use this skill when several test commands overlap, the checks reopened by a
change are unclear, a workflow repeats unaffected work, or a slow CI lane needs
phase-level diagnosis before the team changes coverage.

## What it returns

- a map from changed behavior and dependencies to exact checks;
- a focused composition plus its expansion event;
- explicit runtimes, prerequisites, side effects, and held receivers;
- separate preparation, execution, compilation, publication, and total cost;
- pass, failure, skip, blocked, incomplete, cancellation, and reuse standing; and
- one rollback and re-entry route.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | A media CI job reaches 29 minutes, while its media and browser assertions finish in seconds. |
| Use | Measure phase ownership, retain the complete behavior population, select a hosted browser already present on the runner, and cache the verified media package closure with a direct-install fallback. |
| Observable return | The lane keeps all behavior checks, reports exact cache and phase standings, and finishes the first cold path in about a minute. Browser segmentation remains available if browser execution later consumes the declared ceiling. |

## Working route

1. Inventory behavior owners and exact commands.
2. Map dependencies, runtime, environment, side effects, and evidence claims.
3. Select the smallest adequate composition and its expansion event.
4. Plan the exact population before expensive work.
5. Exercise passing and consequential recovery paths.
6. Measure phase cost and optimize the owning phase.
7. Return membership, result standing, evidence scope, and rollback.

## Boundaries

Domain tests retain their expectations. Evidence-bearing test design owns an
individual oracle. Workflow, security, accessibility, live-service,
publication, and budget owners retain their gates. The composition makes those
owners easier to select and coordinate.
