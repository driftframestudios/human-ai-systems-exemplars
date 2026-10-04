# Test-suite discovery and plan-only selection

This catalog makes existing test owners and commands findable before execution.
It retains Node, Playwright, Python and project-specific acceptance routes.
The planner reads JSON metadata; every displayed command remains undispatched.

## First useful move

```sh
npm run test:suites:list
node tools/test-suite-plan.mjs --suite node.visualization-fidelity-atlas --json
node tools/test-suite-plan.mjs --suite browser.visualization-fidelity-atlas.atlas-gallery.browser --json
node tools/test-suite-plan.mjs --suite python.tables.table-context --json
node tools/test-suite-plan.mjs --bundle source-unit --bundle carrier --json
```

Use `--suite` for a small receiver. A `--bundle` lists its broader composition.
Both accept repetition with distinct IDs. Overlapping bundle membership appears
once in canonical catalog order, with all selection reasons. Repeated selectors,
unknown IDs and empty membership receive named errors rather than a broader run.

A displayed command is a candidate invocation with its working directory,
runtime, prerequisites, execution effects, artifacts and timeout owner.
`declared` describes a specified route. `held` preserves a named missing
input or gate, even when the command itself is known. Both are plan-only states.

## Seven distinct compositions

| Bundle | Receiving question |
| --- | --- |
| `source-unit` | Which nonbrowser source/unit/integration modules and focused Python table checks fit? |
| `family-integration` | Which existing complete families cross projection or project boundaries? |
| `focused-browser` | Which existing browser entries own interaction, focus, scroll or export observations? |
| `visual-media` | Which entries include requested visual/media observations? |
| `carrier` | Which existing source/package checks support a receiving carrier? |
| `live` | Which explicitly admitted live receiver should observe delivery? |
| `research` | Which separately authorized experiment addresses a current question? |

The bundles overlap intentionally. Their counts represent suite membership,
rather than disjoint totals. Whole-file selection retains all cases inside the
file: for example, the gallery browser module includes print and forced-color
observations alongside its other journeys. This planner supplies neither
case-name filtering nor an automatic sequence across all seven bundles.

## Source ownership

- [catalog.json](catalog.json) owns suite IDs, exact entry paths, runtime profiles, bundle membership, related aliases, held conditions and exclusions.
- [baseline-e1f00de.json](baseline-e1f00de.json) preserves the independently enumerated 81 root Node-test modules and original package commands for this migration comparison.
- [test-suite-plan.mjs](../../tools/test-suite-plan.mjs) owns metadata admission, deterministic selection and presentation.
- [planner.test.mjs](planner.test.mjs) supplies independent fixtures for selection, gates, path/array admission, alias graphs, source membership and import inactivity.
- Existing suite files and their nearest owners retain assertions, scenarios, dependencies, fixture preparation, artifact rules and recovery.
- [Table pipeline](../tables/PIPELINE.md) retains source-bound case planning, material dependency closure and checkpoints.
- [Python source preservation](../tables/python-source-preservation.md) retains byte-sensitive table projection and its isolated runtime.

The catalog lists the accepted baseline and the new planner test separately.
Source-file counts describe organization; runtime test-case counts and results
come from actual runner evidence. Held local research and generated copies
retain their named exclusions. Five nested Python projects plus a separate
governance owner keep their runtime and workflow gates.

## Python table components

The [table component entry](../tables/README.md#python-component-entry) keeps
four native unittest owners separately selectable. A catalog selection names
its exact component command; the convenience route explicitly selects all four:

```sh
npm run test:tables:python
npm run test:tables:python:entry
```

The first command runs the four existing components. The second runs only the
new entry's independent fixtures. Discovery imports selected modules, while
this catalog's plan-only command continues to read metadata alone. Native
unittest skips remain visible; exit zero describes the runner's success
semantics rather than proof that every selected assertion executed.
The optional reference comparison and independently governed Python projects
retain their separate commands and permissions.

## Compatibility and preparation

Existing package scripts remain unchanged. A suite's `aliases` are related
commands, rather than exact-selection synonyms. The catalog records direct
Node selectors, browser entries, ordered composite steps and explicit
`npm run` edges. The planner traces those declared edges and presents original
shell text as metadata; it interprets neither shell syntax nor JavaScript
import/spawn reachability.

For example, `test:attribution` also selects a Context Canvas module.
`test:canvas-iframe-routes` builds iframe packages before its browser entry.
`test:prototype-control-labels` combines a source check and a browser journey.
These distinctions remain visible in `inventory.rootScriptSelection`.

Worker checks retain Worker CWD and test-relative argv. Nested Python entries
represent the named workflow step, while schema generation, conformance checks,
database rehearsal and project installation retain their other commands.
A valid catalog path establishes lexical identity; it supplies no permission,
filesystem containment claim or guarantee that the receiving environment is
prepared.

## Focused exercise

```sh
npm run test:suites:unit
```

This runs only the planner's Node fixtures and source-membership checks. It
does not dispatch the listed application suites. A sentinel source that throws
on import distinguishes metadata discovery from incidental harness loading.
Literal unit/browser/Python memberships establish selection meaning; matching
counts alone are insufficient.

The Issue #371 exercise uses the draft
[evidence-bearing test-design](../../planning/testing-suite-consolidation/draft-skills/evidence-bearing-test-design/SKILL.md)
and [suite-composition](../../planning/testing-suite-consolidation/draft-skills/test-suite-composition/SKILL.md)
contracts. [The exercise and figure sources](../../planning/testing-suite-consolidation/exercises/issue-371.md)
record the design decisions; the receiving PR/Issue owns executed results.

## Recovery and continuation

An invalid or stale map returns to the existing direct command and its owner.
Update exact memberships and prerequisites in the catalog, then use the focused
fixtures before relying on a new plan. Existing commands and all CI settings
remain intact.

[#373](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/373)
owns deeper Python-component integration;
[#372](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/372)
owns browser-helper convergence; and
[#374](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/374)
owns later evidence/CI alignment. This planner preserves those receiving
boundaries while making their current routes discoverable.
