# Repository test architecture and evidence coherence

## Contract and current receiver

A collaborator can find the owned suite for a change, select a proportionate
bundle, interpret its result, and resume expensive observations with trustworthy
evidence. Existing runners and domain expectations remain the behavior owners.

[Milestone 25](https://github.com/driftframestudios/human-ai-systems-exemplars/milestone/25) and
[coordination Issue #368](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/368) own the execution route.
This document holds the architectural options, source assessment, and skill
candidates. Issues own current acceptance and receiving decisions.

The architecture audit read tracked source at `ab71e23`, incorporated through
PR #367 into `main@e1f00de`. It covered maintained tests, root and nested runtime
configuration, browser helpers, campaign/checkpoint owners, and eight workflows.
Counts below describe files and direct imports or command selections, rather
than executed cases. Untracked research changes, local ad-hoc commands, and
history-wide tool use remain outside that census.

This planning wave changes documentation and skill guidance. Test migration,
package installation, browser campaigns, hosted activation, and publication
remain subsequent receiving decisions.

## Existing source terrain

The [implemented plan-only catalog](../../tests/suites/README.md) maps exact entry files, related commands and prerequisites. The [Issue #371 exercise](exercises/issue-371.md) applies the draft testing skills and conversational Python rendering; the receiving PR/Issue owns execution results.

| Component | Source observation | Receiving boundary |
| --- | --- | --- |
| Root tests | 103 tracked files: 92 JavaScript modules, six Python files, four Markdown files, one JSON file | Several browser executables and helper files sit beside suites. |
| Node suites | 81 root modules import `node:test`; 14 import VM | Imports overlap. A VM contract leaves actual rendering to browser evidence. |
| Playwright | 28 direct consumers: 11 root test files, 16 tools, one Worker test executable | 16 consumers directly reuse the Core browser helper. |
| Campaign/tooling | 53 tracked tool files; 19 named contract, helper, campaign or checkpoint owners | Tools outside `tests/` participate in acceptance. |
| Python tables | Four `unittest` modules, a semantic parser and opt-in comparison, plus the projector in `tools/` | Byte preservation and semantic extraction have distinct owners. |
| Schema Worker | Nine test-directory files: four Node suites, three helpers, one browser executable and one live receiver executable | Its own package commands and delivery contract remain visible. |
| Nested Python applications | 37 test modules across five `pyproject` owners | All observed modules use `unittest`; no observed pytest imports. Database and application gates remain separate. |
| CI | Eight workflows with distinct activation and budget boundaries | A local bundle is separate from permission to activate hosted execution. |
| Puppeteer | Zero references in 633 tracked executable-language files, including HTML, and zero in eight workflows | This is the current scanned source result, rather than a claim about historical or untracked use. |

Root family census: attribution 2; Context Canvas 17; Core 14; documentation 1;
iframe routes 4; investment analysis 6; Narrative 2; production deployment 5;
public references 1; schema pages 3; security 2; tables 35; Atlas 10; root README 1.
Nested Python test modules: enterprise reference 7; enterprise implementation
16; enterprise specification 5; simulation 3; comparison 3; governance 3.

### Command discoverability

Root package scripts directly select 48 of the 81 root modules importing
`node:test`. The other 33 belong to documentation (1), investment analysis (6),
tables (16), and Atlas (10). This is a direct-selection gap: a missing root alias
leaves indirect execution or a documented direct command to its current owner.

Five standalone browser entries also lack direct root-script selection:
`tests/core-architectures/jobs-text.browser.mjs`,
`tests/core-architectures/recovery-import.browser.mjs`,
`tests/tables/conditioning.browser.mjs`,
`tests/tables/core-followthrough/browser.mjs`, and
`tests/tables/hiring-schema-print.browser.mjs`.
The four table Python suites and `tools/table-reading-contract.mjs` likewise
need an explicit root discovery route in the proposed map.

There is no repository-wide root test aggregate.
`test:prototype-units` selects 14 Core/Narrative modules. Preserve that
specific meaning. Some root selections overlap: Context Canvas already selects
visitor-attribution and iframe-carrier tests available through other commands.

Filename-based classification would misroute work: three investment browser
suites use `*.test.mjs`, while three Atlas `*.browser.mjs` files use
`node:test`. Declare runtime and observation layer independently of suffix.

### Shared browser mechanics

Nine local HTTP-server implementations were identified:

- `tools/core-architecture-browser-helper.mjs`
- `tools/visual-check.mjs`
- `tools/context-canvas-visual-reference.mjs`
- `tools/narrative-architecture-contract.mjs`
- `tools/open-lesson-field-contract.mjs`
- `tools/strategy-canvas-contract.mjs`
- `tests/investment-analysis/browser.test.mjs`
- `tests/investment-analysis/capsule.browser.test.mjs`
- `tests/investment-analysis/presentation.browser.test.mjs`

MIME policies differ. Begin with an existing helper, then compare root handling,
fixture routes, interception, content types, telemetry and cleanup before
consolidating a caller. Shared transport should preserve source-specific
expectations and intentional route policy.

The Worker's `test/catalog-browser.mjs` imports Playwright while its package
declares Wrangler. Settle whether this intentionally uses the root development
toolchain or needs independently installable browser prerequisites. The source
relationship is a discovery question, rather than evidence of a failed run.

### Preserve the strongest existing boundaries

`tools/evidence-campaign.mjs`, `tools/evidence-inputs.mjs`,
`tools/observation-checkpoint.mjs`, and
[the table pipeline](../../tests/tables/PIPELINE.md) already carry source-bound
case identity, artifact integrity, checkpoint recovery and explicit completion.
`tools/table-focused-acceptance.mjs` and
`tools/table-reading-contract.mjs` distinguish fresh acceptance from research
observations. Build on those owners.

The Python projector, `tools/project_table_context.py`, preserves authored
source while projecting labels. The semantic parser,
`tests/tables/prototype-labels/parse-tables.py`, observes table meaning.
`tests/tables/parser_reference_comparison.py` supplies an opt-in comparison.
A parser migration must preserve those different contracts rather than
choosing one representation for all three.

The [Core/Narrative baseline](../unit-testing/README.md) remains a dated,
accepted family-specific account. Independently governed database tests keep
their explicit dispatch, environment and confirmation conditions.

## Four plans and their useful contributions

| Plan | Useful result | Adoption condition or cost |
| --- | --- | --- |
| A. Documentation and command aliases | Fast, reversible cold-entry improvement | Retains repeated mechanics; useful first slice rather than complete consolidation. |
| B. Federated owned suites with explicit bundles | Coherent selection across Node, Python and browser owners | Requires one maintained map and membership parity. Recommended backbone. |
| C. Bounded Playwright Test project pilot | Native fixtures, projects and reporting where they reduce actual friction | Demonstrate preserved checkpoints, artifacts, isolation and diagnostic meaning before migration. |
| D. Universal runner/build-system migration | Potential dependency-driven scheduling for future package growth | Current repository benefit remains unmeasured; reserve for a concrete receiving need. |

The synthesis uses A for orientation, B for architecture, and C as an optional
one-family experiment. D remains a future alternative. Decision criteria are
discoverability, fault isolation, maintenance burden, trustworthy recovery,
actual execution cost, and compatibility with publication and budget gates.
Numerical probabilities would need a defined outcome and observations; these
architectural options carry qualitative tradeoffs.

## Proposed organization and execution route

Organize by behavior owner first and observation layer second. Keep existing
file locations until a receiving move reduces friction. A thin declarative
capability map can name suite ID, owner, current command/argument vector,
runtime, source dependencies, observation layer, side effects, prerequisites,
selection, artifact requirements and result meaning. Each field needs a
consumer; begin with the smallest adequate map.

Plan-only selection should disclose the exact cases or owned command population
before a browser starts. A dispatcher can call existing commands rather than
becoming another assertion framework. Include direct focused invocation and a
compatibility route through each migration.

| Bundle | Intended evidence | Expansion event |
| --- | --- | --- |
| Source and unit | Pure logic, admission, schemas and source contracts | A shared semantic boundary changes. |
| Family integration | Generated copies, parser/source agreement and adapter transitions | More than one owned projection is affected. |
| Focused browser | Real interaction, focus, scrolling, downloads and embedded behavior | The behavior requires a browser observation. |
| Visual and media | Fitting widths, print, forced colors and responsive seams | A consequential appearance/media boundary changes. |
| Carrier and release | Existing source, schema, build and transfer contracts | A named release receiver requests the carrier. |
| Live receiver | Actual network delivery and operator outcomes | Explicit live observation authority is present. |
| Research | Comparative or predictive observations | A separately reviewed protocol admits the observation. |

These are composable bundles, rather than a compulsory staircase for every edit.

1. [#371: Inventory and plan-only bundles](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/371) establishes membership, prerequisites and source ownership before changes to execution.
2. [#373: Python tables](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/373) makes its focused commands and distinct parser contracts discoverable.
3. [#372: Browser helper convergence](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/372) migrates one fitting caller after transport/lifecycle parity is explicit.
4. [#374: Evidence and CI boundaries](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/374) carries case identity, cancellation, late telemetry, artifact integrity and existing activation gates into the bundles.
5. [#369: Skill cultivation](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/369) exercises the draft contracts during those actual moves and revises or rests them based on usefulness.
6. [#370: Conversational Python figures](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/370) has an independent natural-use exercise and source-package review.

Each execution PR demonstrates intended membership, a meaningful passing path,
a consequential fault or interruption path when applicable, and a reversible
receiving route. Runtime/flake-rate/concurrency benefits require actual
observations. This source audit supplies their hypotheses and boundaries.

## Skill collection disposition

At the time of this audit, all 30 active skills carried the repository's What /
When / Boundaries / Result contract. The audit covered that 30-skill cohort.
This establishes native
organization, not uniform efficacy or exhaustive review of every supporting
reference. Preserve meaningful differences in length and layering.

| Disposition | Owners | Material change |
| --- | --- | --- |
| Refine | Conversation visualization | Detailed Python rendering, composed figures, conceptual diagrams, portable artifacts and exact-value companions. |
| Refine | Declarative skill authoring and its template | Explicit applicable inputs/defaults, decision-changing depth, recovery and fresh-context fit. |
| Repair | Stateful artifact behavior | Admitted candidates commit; incompatible candidates preserve accepted state. Conditional fault-phase reference. |
| Refine | Cost and ownership | Separate admission, canonical projection and nested detachment; bound surplus-copy cost. |
| Reconcile | CSS ownership | Use the visual-verification owner for proportionate evidence; CSS reduction follows the actual task. |
| Retain | Other 25 skills in the audited cohort | Their core contracts showed no source-grounded need for a uniform rewrite. Natural-use evidence can reopen a specific layer. |
| Draft | [Evidence-bearing test design](draft-skills/evidence-bearing-test-design/SKILL.md) | Independent oracle, plausible fault, observation layer and explicit evidence limit. |
| Draft | [Test-suite composition](draft-skills/test-suite-composition/SKILL.md) | Owned membership, selection, prerequisites, runner coordination and trustworthy reruns. |

The existing declarative skill is the skill-writing owner. The two testing drafts
have reviewed local applications and remain outside active skill routing for
a future fresh-receiver transfer exercise. Their current disposition is focused
refinement; #58 remains the collection's receiving Issue. Resource-fault guidance belongs with the existing
stateful skill instead of adding another overlapping portable skill.

The reviewed publication selection now lists all 34 active skills, including
the four visualization skills and their declared dependency closure. Accepted
site and Worker release records own current publication status. Newly linked public-ready
references receive explicit dependency entries; publication execution retains
its existing closure checks.

### Exercise the smallest meaningful branch

- Evidence-bearing design: use one exact unit fixture and one plausible fault in the first migrated family; distinguish independent semantics from projection parity.
- Suite composition: plan one family, compare exact selected identities, and exercise a focused failure or interruption through its existing runner.
- Stateful reference: select one consequential admission, acquisition, publication or teardown boundary; the observed phase defines the claim.
- Conversation visualization: answer a real numeric or conceptual question using Python when it fits, return the actual image plus values or relationship list, and evaluate readability at its receiving size.
- Authoring guidance: let a fresh-context collaborator distinguish a fit, near miss and poor fit, then find the applicable reference and recovery without extra author context.

A completed source audit is an exercise of repository re-entry, ownership
analysis and existing skill-authoring guidance. The newly drafted testing skills
have bounded planner, Python-entry, and browser-lifecycle applications. Their
receiving PRs carry execution evidence; the refined drafts keep transfer claims
open for a future fresh receiver. Keep observations to the smallest result that
changes the artifact or its next disposition.

## Research and evidence boundaries

Protective verification research remains with
[#320](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/320), paired replay with
[#330](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/330), and prospective shadow predictions with
[#331](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/331).
Case selection first follows known dependencies and required acceptance.
Predictions bind a named event/window, eligible population, model/classifier
version and outcome rule. Censored attempts remain distinct from completed
negative outcomes. Adaptive skipping needs its separately reviewed adoption
decision. Counts of cases, launches, retries and reused checkpoints retain
different meanings.

Primary documentation informs capabilities rather than an automatic migration:

- [Playwright best practices](https://playwright.dev/docs/best-practices): behavior-oriented observations, isolation and resilient locators.
- [Playwright projects](https://playwright.dev/docs/test-projects): a possible browser configuration mechanism.
- [Node test runner, Node 22](https://nodejs.org/download/release/latest-jod/docs/api/test.html): the existing runtime's native runner and selection contract.
- [Python unittest](https://docs.python.org/3.12/library/unittest.html): discovery, fixtures, subtests and explicit skips.
- [Failure-isolating test layers](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html): useful feedback loops; the repository's mix follows actual risks rather than a prescribed percentage.
- [Puppeteer screenshots](https://pptr.dev/guides/screenshots): screenshot capability; the source census found no current Puppeteer implementation to migrate.
- [Situated skill guidance](https://kindlight.systems/human-ai-collaboration-field-guide/designing-ai-skills-as-situated-collaboration-affordances-guidance-for-notion-workspaces-and-beyond): coherent jobs, conditional depth, completion, recovery and transfer evaluation.
- [Evidence-bearing test design](https://kindlight.systems/practitioner-probes/evidence-bearing-test-design-behavior-boundary-observable-proof): behavior, boundary and observable proof.

The companion Deep Research Payload informed skill layering through the public
Practitioner Registry. The Python rendering reference cites its library
capabilities directly; the visualization foundation retains perceptual evidence
and interpretation guidance.

## Repeat-use and expansion

Start with the [owned-suite map](../../tests/suites/README.md), then select the
smallest route that answers the changed behavior. The Python table entry keeps
four component identities; the browser pilot keeps domain assertions local;
the evidence-boundary guide preserves owner standing and original scope.
These are available compositions rather than a required full sequence.

The two testing drafts now distinguish metadata discovery, importing discovery,
native skip semantics, independent oracles, and final-validation telemetry.
Their bounded local applications support these refinements. A fresh receiving
team or materially different family can establish the next transfer signal.
Use #58 for that disposition rather than creating a parallel result ledger.

Keep application, browser, research, live, and publication choices separate.
A new browser-family migration earns its own membership/fault exercise.
A runner replacement, adaptive skip policy, hosted activation, or public skill
carrier retains a separately reviewed adoption decision. If a route broadens
a local run or hides an oracle, use the retained owned command and revise that
selection boundary.
