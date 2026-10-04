# Issue #371: selection and conversational-figure exercise

## Receiving jobs

A cold collaborator needs to distinguish a focused unit/source selection, a
real-browser selection, and a Python table-parser selection before launching
work. The human also requested a visual before/after account of test number and
organization. Both jobs use the same source identity rather than inventing
execution results.

## Skills exercised and decision changes

- **Test-suite composition:** explicit suite IDs and seven overlapping bundles preserve existing command owners. Discovery reads metadata. Related aliases keep their different populations and ordered preparation. Known commands can retain holds.
- **Evidence-bearing test design:** literal fixture IDs and argv provide an independent oracle. The sentinel import, matching-empty, sparse-array, held-command, option-shaped path, alias-cycle, dotted-alias and profile-aliasing cases distinguish consequential plausible faults.
- **Conversation data visualization:** Python renders two local figures for this conversation, with fixed-denominator values and a separate organization diagram. The images are ordinary inspectable artifacts rather than a hosted website.
- **Data-visualization foundations:** the counting unit is a source module, not a runtime test case. Different discovery mechanisms are labeled directly. Family identities remain stable, zero direct aliases retain their literal meaning, and overlapping bundles are excluded from additive totals.
- **Cost and ownership:** metadata projection excludes surplus state, suite arrays detach from shared profiles, and declared-edge tracing avoids shell evaluation.
- **Supportive change writing:** results describe discoverability and receiving choices; coverage, effectiveness, and runtime improvement await their own observations.

The two testing skills remain drafts with an initial bounded application.
A useful exercise establishes the particular decisions it changed; wider
transfer and active/public routing retain separate reviews.

## Quantitative figure contract

Source: the tracked census at `main@e1f00de`, independently retained in
`tests/suites/baseline-e1f00de.json`, plus the candidate Issue #371 catalog.

Population: the same 81 root modules importing `node:test`: 75 primary
nonbrowser modules and six browser modules. Existing root scripts directly
select 48 of these. The candidate catalog lists all 81. The new planner module
is a separate addition and stays outside the fixed baseline denominator.

The first figure compares **direct root-script selection before** with
**catalog-listed baseline modules after**. These are different discovery
mechanisms, explicitly labeled. The comparison describes discoverability,
rather than newly written tests, executed cases, behavioral coverage or a
measured time saving. A family with zero direct root-script selection can still
have a documented direct invocation.

The second figure is a conceptual organization diagram. Source-owner groups
and existing files stay in place; a metadata-only planner supplies seven
selectable compositions. Edges mean discovery relationships, rather than
automatic execution. Suite memberships overlap, so their counts are displayed
individually rather than summed as unique tests.

## Reproducible conversational rendering

[The exact values](issue-371-counts.json) include family counts, mechanism labels,
baseline identity and the separately counted planner addition.
[The Python renderer](render_test_discovery.py) produces a PNG preview and an
SVG companion for each figure using Matplotlib's explicit Figure/Axes interface.

```sh
python planning/testing-suite-consolidation/exercises/render_test_discovery.py \
  --data planning/testing-suite-consolidation/exercises/issue-371-counts.json \
  --output .visual-runs/testing-suite-consolidation
```

Use the available approved Python environment with Matplotlib. The repository's
uv execution skill remains the route for project-declared test environments;
the conversational renderer can use an already provisioned artifact runtime.
Generated images stay in the ignored, cycle-scoped directory. The receiving
conversation displays them alongside their scope and exact-value route.

## Observation and continuation

Run the focused planner fixtures and plan-only unit/browser/Python selections.
Inspect the rendered figures at conversation size for label legibility,
source/denominator clarity and meaningful hierarchy. The receiving PR or Issue
records outcomes and any remaining boundary; this file retains the repeatable
exercise rather than a second mutable result ledger.

A later change to suite membership receives a newly named snapshot rather than
rewriting the fixed baseline. Browser-helper migration and Python runtime
integration stay with their separate Issues.
