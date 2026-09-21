# Repository skill architecture and research spike

```yaml
planning_surface:
  id: "prototype-exemplars.repository-skills.v0.1"
  as_of: "2026-08-31"
  status: "nineteen portable contracts; two settled projections; first typed exchange family active"
  standing_ground: "AGENTS.md"
  skill_root: ".agents/skills"
  later_tranche_issue: work:repository-skill-tranche
  governing_move: "make consequential local judgment available on demand"
```

## Settled working model

Repository-local collaboration guidance now has seven progressively disclosed layers:

| Layer | Role | Current form |
| --- | --- | --- |
| Collaboration affordance | Reusable judgment or capability that may outlive the current platform transport | practiced work, source material, collaboration accounts, and receiving outcomes |
| Standing ground | Small instructions that improve nearly every repository turn | root `AGENTS.md` |
| Portable skill contract | Current independently routable projection of one coherent job | `.agents/skills/<name>/SKILL.md` |
| Task-bound projection | Selected behavior from one portable skill contract bound to a named task and exit event | a temporary routed `SKILL.md` beside the standing contracts |
| Source authority | Durable domain knowledge, visual contracts, tone goals, plans, and threadkeeping | existing repository documents |
| Deterministic helper | Repeated mechanics whose consistency saves real turns | added inside a skill after repeated use earns it |
| Distribution package | A reusable capability shared beyond this repository | plugin or separately versioned package after local practice establishes demand |

This arrangement changes collaborator posture through directory structure while keeping the working set small. The root file orients every turn. A skill loads when its description matches the job. Deeper repository sources remain available when the workflow calls for them.

### Provisional-affordance lens

The provisional-affordance lens is a way of reading a possible capability rather than an artifact kind or lifecycle status. The collaboration affordance is the durable candidate unit. A `SKILL.md` is its current routing and coordination surface for a temporary context holder. The repository contract can remain stable through several uses while still yielding to another transport format when the harness or receiving work changes.

First receipt follows one compact boundary:

> A skill offers a working method. Current user intent, repository ground, available evidence, and granted tool authority govern its application.

Several distinctions keep the catalog useful without turning it into a source of authority:

| Keep separate | Working interpretation |
| --- | --- |
| Activation and evidence | Activation routes attention; receiving behavior, human judgment, and independent sources can supply evidence |
| Recurrence and promotion | Reuse count is routing telemetry; a distinct receiving contribution supports formation or revision |
| Coinage and stewardship | Human or AI collaborators may name candidates; current task and repository authority govern operative changes |
| Self-conformance and acceptance | A skill satisfying its own examples remains an internal observation; acceptance sits with the receiving result |
| Lifecycle and evidence maturity | Routable, resting, or retired describes attention posture; evidentiary standing remains a separate dimension |
| Mechanism and guidance | A mechanism crosses an explicit research-to-design bridge before becoming a local instruction |

Direct reasoning remains a first-class route. Dormancy is also a complete result: the artifact leaves ordinary routing, retains provenance, and carries a wake condition. Another cycle begins through fresh signal such as human correction, receiving-artifact behavior, changed conditions, or independent evidence.

## Research synthesis

### Stable conventions

These findings recur across current official documentation, the Agent Skills specification, and practiced expert material:

1. **The description is routing code.** It should state both the coherent job and the conditions that should activate it. Distinct trigger territory is more useful than several synonymous descriptions.
2. **One job means one outcome.** A skill may contain a multi-step workflow when every step contributes to the same result. Micro-skill atomization increases routing and attention cost.
3. **Progressive disclosure protects attention.** Name and description form the catalog; `SKILL.md` carries the working procedure; directly linked references or scripts carry conditional depth.
4. **Local knowledge earns the context.** Skills should carry conventions, reasons, surprising edges, and recovery moves that source discovery alone is unlikely to reveal.
5. **Inputs, defaults, outputs, and completion should be explicit.** A demanding, observable completion state improves usefulness more than a long general-purpose prompt.
6. **Instructions lead; scripts follow repetition.** A deterministic helper is worthwhile when mechanics recur, require exact consistency, or otherwise consume turns. Executable instructions deserve the same review as source code.
7. **Forward testing precedes a permanent harness.** Two or three realistic fresh-context tasks plus one near-miss prompt can reveal over-triggering, under-triggering, missing context, and brittle procedure.
8. **Repository placement should be conventional.** Root `.agents/skills/` gives the skills a shared, inspectable, versioned home that current Codex tooling can discover.
9. **Declarative metadata improves routing stability.** Third-person descriptions state capability and activation conditions without adding a conversational persona frame.
10. **Examples clarify behavior after the workflow is clear.** Given/When/Then scenarios can expose an ordinary path or consequential boundary; an action-bearing operating sequence remains available when order matters.

### Flexible body prompts

What / When / Boundaries / Result remains the compact core. The following body prompts form a palette for cases where fit, attention, or release needs more expression:

- **Useful when** — strong-fit conditions;
- **Poor fit when** — an adjacent route or near miss;
- **Smallest useful dose** — the least structure that creates the result;
- **Foregrounds** — the evidence, attention, or relationships made easier to see;
- **May under-attend** — a bounded perspective or constitutive silence;
- **Material result** — the receiving artifact, decision, behavior, or recovery path;
- **Interactions** — peer skills, projections, conditional context, or augmenting lenses;
- **Rest or release when** — settlement, folding, dormancy, or retirement conditions.

These prompts are optional body language. They remain outside required frontmatter and can disappear when the compact contract already makes the relevant decision clear.

### Composition and augmentation

Composition retains one primary owner for each receiving result:

- **peer composition** joins skills with distinct triggers and completions;
- a **task-bound projection** binds selected behavior from one portable contract to a named task;
- **conditional context** loads source-specific detail without creating another routing entry;
- **augmentation** adds a bounded posture or attention effect while the primary skill retains its result;
- an **interpretive lens binding** is one non-routable augmentation whose source, foreground, likely silence, and exit remain visible.

`SkillFacet`, `SkillCompositionProfile`, and `SkillFacetBinding` are promising schema-era names for reusable augmentation objects. They remain candidate entities until one material receiving use establishes fields and conflict behavior. Facets would stay flat, gain no independent routing, preserve the central result, and leave authority unchanged. A facet that develops its own trigger, result, and completion becomes a portable-contract candidate instead.

Verbalized sampling is the first worked interpretive-lens example. The primary skill keeps its receiving result while the lens names the probability object, bounds the candidate set, marks generated design priors, and separates probability from confidence, fit, priority, and desirability. The binding exits with the decision. Material uses that establish an independent trigger, result, and completion can reopen it as a portable-contract candidate.

### Specification-by-example extension

Contemporary Agent Skills hosts recognize metadata, the activated `SKILL.md` body, conditional resources, and optional scripts. They assign no executable meaning to Gherkin keywords. This repository therefore treats specification-by-example as an informed authoring extension:

```text
description
  → Contract: What · When · Boundaries · Result
    → Rules and action-bearing operating sequence
      → optional Given / When / Then scenarios when interpretation changes
        → conditionally loaded scenario references
          → deterministic helper after repeated need
```

The contract supplies the compact behavior surface. Rules preserve invariants. The operating sequence carries procedure. The smallest scenario set that changes interpretation makes ambiguous behavior inspectable; many skills need none. A scenario becomes executable only when an implemented test, script, or step definition is explicitly connected to it.

Cucumber's stable distinctions fit this use: `Given` names initial context, `When` names the event or action, and `Then` names an observable outcome. `Rule` groups examples that illustrate one invariant. Three to five scenario steps usually preserve expressive value. Backgrounds, outlines, tags, and large example tables remain available when repeated cases demonstrate compression value.

The progressive-disclosure threshold is behavioral:

- a clear contract and workflow can stand without a scenario;
- one inline scenario clarifies a recurrent activation boundary or misunderstanding;
- a directly linked scenario reference carries two or more uncommon, source-specific, or adjacent-workflow branches;
- a script follows repeated deterministic mechanics rather than the presence of executable-looking prose.

This hybrid differs from common skill practice by adding a specification layer between workflow and reference material. Official guidance more often presents concise stepwise procedures, concrete examples, gotchas, and conditional references. The local form retains those operational strengths while making expected behavior and transfer boundaries easier to discuss with human collaborators.

### Expert-practice interpretation

Matt Pocock's public skill corpus and writing reinforce a practical model: keep the working set small, composable, adaptable, and human-controlled; use descriptions as context pointers; distinguish model-invoked and human-invoked context; and cache unwritten conventions rather than commands a collaborator can discover cheaply. This is practitioner evidence with a clear transfer boundary: his catalog demonstrates one experienced agent-engineering practice, while repository use will decide which parts fit this collaboration.

The strongest implication for this repository is vocabulary. Names such as `repository-reentry`, `surface-reading`, `css-ownership`, and `practitioner-probe` give human and AI collaborators a concise way to request a mode of judgment without importing a broad process system.

### Declarative register and persona boundary

Skill descriptions and bodies use declarative, third-person, artifact- and role-centered language. Anthropic's current authoring guidance explicitly recommends third-person descriptions because metadata is injected into a larger instruction context. Workspace research adds a useful working hypothesis: deictic personal address can introduce unintended persona cues and move attention away from the actual subject. That extension remains a locally observed authoring choice rather than settled cross-model law.

The supportive-change register supplies the wider prose posture: desired state first, direct verbs and concrete nouns, warm adult-to-adult language, calibrated evidence, visible authority, and a bounded revisable close. Semantic Attractor Design supplies the instruction posture: the desired pattern remains more semantically prominent than the avoided condition. These are transferable writing affordances rather than a simulated author persona.

### Personalization boundary and transfer discipline

The **Enterprise Human-AI Practitioner Registry** is an accepted public receiver and a source corpus for practiced possibilities. Its semantic identity remains available here while its signed-out coordinate receives a separate acceptance receipt. Repository skills transfer recurring affordances while each collaboration supplies its own people, ground, and intent. Four transfer moves support that boundary:

1. Capability or collaboration-affordance names take precedence over person-centered names.
2. Source-specific observations retain provenance, evidence class, and transfer boundary.
3. Scenarios use roles, artifacts, systems, conditions, and observable outcomes.
4. Each initial attempt is a successful experiment that supplies evidence for revision.

Direct usefulness to current repository collaboration governs the active tranche. Additional Registry-derived possibilities remain issue terrain until a live collaboration cycle provides a receiving job.

### Collaboration accounting and accretive skill stewardship

A two-pass Notion exploration and database-metadata sweep supplied the first earned addition to the active catalog: `collaboration-accounting`. The skill routes decision-changing observations into `create_now`, `iterate_now`, `queue_with_trigger`, `observe`, `settle_or_fold`, or `merge_or_retire`, then returns attention to the material work that supplied the evidence.

The first pass followed the direct collaboration anchors: the Practitioner Registry, Affordance Stewardship, Practitioner Judgment Probes, Recovery Routing, Coordination Horizons, Indeterminacy, Verbalized Sampling, Threadkeeping, and evidence-bearing continuation. The second pass approached from different structures: skill billets and deferred reification, fragment pairing, folding, opportunity formation, pollination return flow, trusted first attempts, and recursive reflection. The varied pass changed the working model in several useful ways:

1. **Creation, local usefulness, wider promotion, and stabilization are separate decisions.** A reversible first skill can be useful immediately while remaining provisional.
2. **Recurrence informs promotion and consolidation.** A distinct keystone affordance with explicit experimentation trust and a live receiving use can support immediate creation.
3. **A skill billet is a valid resting form.** Durable cognitive or collaboration contracts can wait for a real receiving job before a platform artifact is forged.
4. **Observation is a route.** A meaningful signal can remain field evidence with a re-entry trigger while its instruction yield develops.
5. **Existing contracts receive local learning first.** A scenario, boundary, or instruction can extend an active skill when its receiving job already fits.
6. **Another pass carries a new signal.** Observed behavior, changed intent, independent evidence, a dependency event, an authority answer, or a counterexample can reopen stewardship; unchanged decision state supports settlement.

Three additional contribution tests can justify preserving a working pattern long enough to find its correct form: meaningful opportunity capture, a material reduction in rediscovery or experimentation cost, and clearer negotiation of scope, authority, evidence, completion, or rest. These tests describe receiving value rather than a promotion score. One strong repeated contribution can earn a durable account or billet while the absence of a distinct routing job can still keep a new skill at rest.

The metadata sweep sampled six connected corpora and 850 rows across `::fragments` and `~loamthread` alone. The schemas consistently separate lifecycle from currentness, outcome from maturity, source band from visibility, and instruction implication from execution authority. Most exploratory rows do not propagate into a touched artifact. Sparse Generated Research rows and incomplete optional metadata make these corpora useful vocabulary and field evidence rather than an empirical effectiveness dataset.

Probability remains optional. When a range changes a decision, it names the event first: the probability that the selected route improves the next materially similar collaboration while preserving proportionate attention cost. Broad values remain uncalibrated planning priors. Statistical fit begins after a stable outcome, population, horizon, comparable observations, and named method exist.

The skill keeps this detail one level deep in `references/candidacy-and-routing.md`. Its activated path selects one route, one smallest action, and one return trigger. This creates a keystone stewardship affordance while preserving turn economy and gentle release from recursion.

### Contract-first skill projections

The next natural observation was a recursion question with a live receiving task: a standing skill can retain durable authority while a bounded derivative flexes around one collaboration wave. A targeted Notion pass supplied a more technically explicit vocabulary than `generic skill` and `applied skill`:

- a **portable skill contract** is the operative source that owns transferable What, When, Boundaries, rules, and completion;
- a **task-bound skill projection** selects part of that contract and binds it to one receiving task, tool surface, authority scope, and lifetime;
- a **non-routable context capsule** carries selected local detail when explicit loading is enough;
- a **skill billet** remains the pre-skill form for durable stock awaiting a receiving job.

`Projection` is a typed source-to-target relation: the source retains identity and authority, the target receives a distinct identity, and selection, bindings, local changes, and gaps stay visible. `Applied` describes use without making those relationships legible. `Generic` can imply formal parameterization that the source skill does not claim.

Each projection carries a compact **binding profile**. Receiving task, source contract, selected contract behavior, platform and tools, authority, lifetime, exit event, default disposition, and upstream return remain independent dimensions. The profile sits inside the skill body as readable context rather than becoming a manifest or registry.

Recursion receives one narrow scalar:

```yaml
max_routable_projection_depth: 1
```

Depth zero is the portable contract; depth one is a task-bound projection. Additional task-local detail becomes a non-routable context capsule or collaboration account. A genuinely distinct transferable job returns through `collaboration-accounting` and can form a new portable contract at depth zero. This keeps adaptation expressive while every routed derivative remains directly attached to a durable owner.

The first experiment was `context-canvas-ai-systems-css-projection`. It bound `context-canvas-css-ownership` to the thirteen-route AI Systems-family extraction, returned the file-boundary and computed-cascade observations upstream, and retired at the first repository re-entry after its pull request merged. Git history and threadkeeping preserve the experiment without keeping a settled route active.

### Source authority mapping, Issue Chain, locator boundary, and planning inventory

Three material corpora activated the resting `source-authority-mapping` candidate. Schema publication distinguished canonical identity, authored source, publication authority, delivery, and retrieval. The Context Canvas link wave traced internal workspace sources into Registry-facing receivers while preserving lineage and adaptation needs. The [root source-ownership map](../README.md#source-projection-and-delivery-retain-separate-ownership) then separated standalone release owners, integrated snapshots, reviewed projections, and delivery hosts. Together they establish a distinct source-to-receiver job with immediate material use.

`source-authority-mapping` therefore enters through `create_now`. It traces one claim, artifact, or contract through semantic ownership, exact source, typed projections, delivery, receiving use, and promotion. The Collaboration Skills 0.1.0 family makes that contract loadable by another platform while its `SKILL.md` remains semantic authority.

Planning activity as inventory also recurs. Its prospective value is now named through opportunity capture, reduced rediscovery or experimentation cost, and expectation negotiation. Current successes remain substantially owned by `repository-reentry`, the inventory-first rule in `context-canvas-surface-reading`, and domain ledgers. `planning-inventory` therefore rests as a skill billet until a non-Canvas planning cycle accepts the inventory itself as a decision-bearing deliverable and demonstrates a distinct contribution.

Issue chains recur across umbrella coordination, ordered work, contained tranches, schema-wave bundles, and the current Registry link disposition → repository-wide current-tree receipt → human-held public-history selection. This is a distinct receiving job: make a small issue family legible as a revisable route while each issue retains its own outcome, authority, and acceptance boundary. Human encouragement to form the affordance, several materially different issue families, and an active receiving use support `create_now` for `issue-chain-stewardship`.

The initial contract names the current front, plain-language relations, held decisions, transition evidence, next receiver, and release event. It exits when the receiver accepts the handoff. The skill remains separate from `repository-reentry`, which resolves each node's current truth, and from `planning-inventory`, whose broader forge condition remains open. A future missed branch, stale transition, or materially different receiving use can narrow, fold, or retire the contract through collaboration accounting.

Public-history preparation established another distinct receiving job: preserve a durable public collaboration record while exact gated lineage remains recoverable through an authorized resolver. `locator-boundary-stewardship` owns that record placement, stable-key pairing, semantic residue, and bounded receipt. Source authority mapping still selects standing and receiver topology; Issue Chain still owns transition acceptance. Repeated family settlements now add one named method, **paired-receiver settlement**, for the case where the public record and resolver accept complementary information at different times. The method remains inside the current owner until natural use beyond locator and publication-boundary work demonstrates an independent receiving job.

### Operator-blind lifecycle vocabulary

The **Verbalized Sampling** pattern informed a name comparison. The probability object is **P(vocabulary-hold): probability that a vocabulary family remains semantically adequate, operator-blind, human/AI legible, and materially collision-resistant across repository routing, visitor explanation, and cross-platform loading through the next 18 months**. Values are generated design priors rather than measurements or confidence scores.

| Vocabulary family | Planning probability | Reading |
| --- | ---: | --- |
| Plain operational terms | 0.34 | Immediately legible, with common-word and workflow collisions |
| Literary terms | 0.06 | Memorable, with weak named-entity recognition and publishing or musical collisions |
| Ecological terms | 0.12 | Expressive and temporally rich, with metaphor and implied-progression risk |
| Hybrid: plain namespaced identifiers with warmer display language | 0.48 | Best balance of cold-read legibility, searchability, and provisional posture |

The working lifecycle moves therefore use plain identifiers with ecological language available as interpretation:

```text
observe → hold → form → use → settle
   ↑                            │
   └──────── reopen ────────────┘
```

- `observe` can be read as noticing or catching a signal;
- `hold` can be read as allowing the material to steep;
- `form` creates the smallest preparation with a receiving use;
- `use` exercises it in material work;
- `settle` can retain, fold, rest, compost, or retire it;
- `reopen` rehydrates the work through fresh signal.

`catch` stays outside canonical identifiers because exception handling gives it a strong technical meaning. `project` remains a relationship noun in this repository, so `form` names the lifecycle move. `steep` and `rehydrate` remain human-facing language rather than machine dependencies.

Schema-oriented state should remain dimensional rather than forming a maturity ladder:

```yaml
routingStatus: candidate | routable | resting | retired
contractVersionStatus: draft | published | superseded | withdrawn
evidenceMaturity: <independent claim-local state>
wakeTrigger: <fresh signal that can reopen the item>
```

Provenance, stewardship authority, evidence maturity, version status, routing status, and lineage remain separate. `Routable` never implies validated, approved, canonical, mature, or authoritative.

### Augmentation-name sampling

The probability object is **P(composition-hold): probability that the composition vocabulary remains understandable, flatly composable, portable, and resistant to recursive reification through the next 18 months**. The closed candidate set is:

| Vocabulary family | Planning probability | Main tradeoff |
| --- | ---: | --- |
| Core + modules | 0.27 | Discoverable, while `module` implies package or runtime behavior |
| Score + motifs | 0.05 | Expressive, with strong music and performance collisions |
| Root + grafts | 0.10 | Ecologically coherent, while grafting implies source mutation |
| Contract + facets + profile + projection | 0.58 | Namespaced, flat, and compatible with the established projection grammar |

The hybrid family is the strongest working candidate: `SkillContract`, `SkillFacet`, `SkillCompositionProfile`, `SkillTaskProjection`, and `SkillFacetBinding`. It remains a planning vocabulary until material use establishes a receiving schema. Receipts describe what arrived rather than agreement; return records can nominate revisions while publication or source change remains a separate decision.

### Skills as intervention grammar

An additional collaboration note frames the variation in skill form through materially complex, interconnected problem terrain. The useful working hypothesis is that repository skills need not all resemble task automations:

- deterministic, well-bounded mechanics can become short procedures or later scripts;
- systemic judgment benefits from attention structures, examples, probes, option surfaces, transfer limits, and return conditions;
- problem understanding and candidate intervention can evolve together through prototypes and reviewed examples;
- completion can mean a better bounded state with a visible route back, rather than a claim of final resolution.

This distinction is directly useful to the current CSS wave. Finding consumers and rewriting selectors contain deterministic mechanics. Choosing module boundaries, preserving route fingerprints, making source legible to future collaborators, and deciding when the architecture has become useful enough remain systems judgments. The CSS-ownership skill therefore combines a consumer procedure with composition rules, representative scenarios, local comparison, and a revisable completion state.

The same frame explains skill variation without invoking personalization: each skill takes the shape of the collaboration problem it helps a team hold. A task recipe, probe, scenario bridge, research spike, or re-entry map can all be valid skills when the capability and receiving result remain clear.

### Failure shape and recovery route

Registry research on recovery routing and failure geometries names recurring strain as recognizable system shapes rather than personal or moral defects. It also separates gap utility into generative, neutral, coordinative, harmful, or unknown conditions; hard boundaries remain visible, the smallest adequate move routes to the owning surface, and unresolved dimensions remain open.

This subtly completes the systemic-intervention frame. Wicked or evolving terrain does not make every gap a defect, and iteration does not make every intervention broad. A skill can name strain cues and a return path without becoming a health-scoring or recovery-management system. For the active tranche:

- Practitioner Probes assess gap utility and instruction yield before routing.
- CSS ownership routes a material mismatch to the source that owns the affected state while preserving intentional variation.
- Research spikes allow useful uncertainty to remain open.
- Supportive writing describes collaboration states without assigning personal fault.
- Declarative skill authoring gives consequential boundary scenarios a recovery route or explicit held-open outcome.

This is an instruction-writing affordance rather than a new active skill. A later recurring need can earn a dedicated recovery-aware collaboration skill through the [later-tranche candidate ledger](#later-tranches-and-their-earn-conditions).

### Practitioner Registry research precipitation

The **Enterprise Human-AI Practitioner Registry** remains the cited workspace boundary for this repository research. Its named receivers supply progressively deeper material:

- the **Human-AI Collaboration Field Guide** frames machine-facing structures as wayfinding whose application remains situated;
- the **Narrative Architecture Orientation Index** separates affordance, activation, instance, coordination surface, projection, and execution authority;
- **Practitioner Probes** compresses technical judgment into question, mechanism, evidence, instruction yield, and receiving route;
- **Affordance Stewardship and Research Ledger** separates origin, stewardship, contextual use, research relation, and lifecycle;
- **Verbalized Sampling** keeps probability, confidence, fit, priority, candidate-set semantics, and decision authority distinct.

#### Collaboration-accounting source capsule

Eight operator-blind relations preserve the Registry research contribution used by the collaboration-accounting skill. The Registry coordinator serves both reference files through one relation. Narrative Architecture Orientation keeps two relations because candidacy and task-bound projection draw materially different distinctions from the same semantic source. Exact workspace lineage remains in the authorized resolver; this local capsule is the portable receiving surface.

| Key | Semantic source | Typed contribution | Local receiving surface |
| --- | --- | --- | --- |
| `ca-ref-001` | Enterprise Human-AI Practitioner Registry | Corpus boundary, receiving context, and publication posture; reused by both references | This research-precipitation section |
| `ca-ref-002` | Narrative Architecture Orientation Index · candidacy role | Affordance, activation, instance, coordination surface, projection, and execution authority | [Collaboration accounting and accretive skill stewardship](#collaboration-accounting-and-accretive-skill-stewardship) |
| `ca-ref-003` | Practitioner Probes | Question, mechanism, evidence, instruction yield, and receiving route | [Skills as intervention grammar](#skills-as-intervention-grammar) |
| `ca-ref-004` | Affordance Stewardship and Research Ledger | Origin, stewardship, contextual use, research relation, lifecycle, and promotion | [Operator-blind lifecycle vocabulary](#operator-blind-lifecycle-vocabulary) |
| `ca-ref-005` | Verbalized Sampling | Probability referent, candidate-set boundary, planning priors, fit, priority, and decision authority | [Augmentation-name sampling](#augmentation-name-sampling) |
| `ca-ref-006` | Narrative Architecture Orientation Index · task-projection role | Source and projection, profile and instance, selected state and capsule, receipt and agreement, and return proposal and source decision | [Contract-first skill projections](#contract-first-skill-projections) |
| `ca-ref-007` | Core Architecture Projections | Typed source-to-target selection, binding profile, distinct artifact identity, and publication boundary | [Contract-first skill projections](#contract-first-skill-projections) |
| `ca-ref-008` | Narrative Capsules | Portable selected state, capsule boundary, receipt, unresolved material, and responsible return | [Composition and augmentation](#composition-and-augmentation) and the [repository-native composition addendum](../context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/narrative-capsules-composition-addendum-v0.1.md) |

Other workspace pages informed the synthesis and vocabulary without becoming direct repository citations. The repository artifact carries the resulting guidance, and Notion availability remains outside runtime requirements.

The lean repository probe keeps five fields: question, why it matters, mechanism, observable evidence, and instruction yield. Source confidence and transfer boundaries appear when they change the result. Registry levels, scoring, probabilities, machine-node taxonomies, and broad probe catalogs remain optional research material; a concrete decision can earn one of them later.

### Evidence map

| Evidence | Class | What it changes here |
| --- | --- | --- |
| [OpenAI — Build skills](https://developers.openai.com/codex/skills) | Official current guidance | Root placement, progressive disclosure, one-job scope, explicit descriptions, and small forward tests |
| [OpenAI — AGENTS.md](https://learn.chatgpt.com/codex/agent-configuration/agents-md) | Official current guidance | Concise standing ground at repository root, with deeper local guidance nearer its owner |
| [Agent Skills specification](https://agentskills.io/specification) and [best practices](https://agentskills.io/skill-creation/best-practices) | Open format specification and creation guidance | Portable `SKILL.md` structure, routing metadata, instruction-first posture, and direct references |
| [Anthropic skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Official adjacent-platform guidance | Progressive disclosure, focused workflows, and context-economy convergence across contemporary agents |
| [Cucumber Gherkin reference](https://cucumber.io/docs/gherkin/reference/) | Official behavior-specification reference | Rule grouping, initial context, event, observable outcome, and expressive scenario size |
| [Matt Pocock's skills](https://github.com/mattpocock/skills) and [Writing for Agents](https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-for-agents/SKILL.md) | Named practitioner corpus | Small adaptable catalog, description as context pointer, clear completion, and unwritten-convention emphasis |
| **Core Architecture Projections** and **Narrative Architecture Orientation Index** | Workspace projection and capsule model | Typed source-to-target selection, binding profiles, distinct artifact identity, and capsule boundaries |
| Notion payloads above | Hybrid-team field observations and internal research synthesis | Lean Practitioner Probe, claim classes, instruction yield, and a decision-oriented research stopping rule |
| This repository's completed cycles | Lived local practice | Re-entry, surface reading, CSS ownership, visual variation, supportive writing, and proportional evidence as the first tranche |

## Initial active tranche

| Skill | Coherent job | Typical trigger | Useful result |
| --- | --- | --- | --- |
| `repository-reentry` | Reconstruct current truth across repository and GitHub surfaces | Resume, handoff, status reconciliation, stale plan | Settled/current/open/next model with one re-entry route |
| `repository-collaboration-cycle` | Carry one authorized task from re-entry through route selection, conditional setup, source-owned execution, evidence, delivery, and exact continuation | A cold or resumed collaborator is expected to complete a full repository cycle | One receiver-ready change, finding, or held route with proportionate evidence and exact re-entry |
| `context-canvas-surface-reading` | Read one page or family as visitor surface and design input | Assessment, planning, material Canvas change | Standing, visitor ability, evidence, owners, fingerprint, family effects |
| `context-canvas-css-ownership` | Make CSS ownership, extraction, and selector migration legible | `expanded.css`, first paint, cascade, rename, contract map | Consumer map, receiving module, affected-family comparison |
| `context-canvas-visual-verification` | Select proportionate source-bound visual and browser evidence | Layout, responsive behavior, interaction state, print, forced colors, visible regression | Fitting reference or focused check, interpreted result, limits, risk, and next receiver |
| `practitioner-probe` | Turn ambiguous terrain into a decision-changing technical question | Plausible-but-shallow code, unclear gap, issue assessment | Mechanism, observation, instruction yield, bounded route |
| `supportive-change-writing` | Produce negation-aware, evidence-calibrated repository prose | README, planning, issue, instructions, explanation | Desired state, authority, evidence limit, revisable next move |
| `contextual-jargon-scan` | Distinguish exact language and useful compact metaphors from replaceable inside shorthand | Public, visitor-facing, cross-team, or durable prose with a bounded reader job | Scoped occurrence map, targeted revisions, intentional retentions, verification, and any material deferral |
| `evidence-grounded-research-spike` | Convert current evidence into a bounded repository decision | Contemporary technical or collaboration question | Synthesis, evidence map, instruction delta, transfer limits |
| `declarative-skill-authoring` | Author a transferable skill through contract, rules, workflow, and sparse scenarios | New skill, routing friction, scenario layering, conditional context | Conventional skill with explicit behavior, transfer boundary, and completion |
| `collaboration-accounting` | Route decision-changing observations through an accretive skill lifecycle | Reusable affordance, active-skill friction, queued candidate, skill recursion | One skill route, smallest action, evidence boundary, and re-entry trigger |
| `schema-contract-authoring` | Shape bounded schema families with explicit identity, authority, dependency, retrieval, and examples | Schema root, revision, semantic context, publication route, linked projection | Versioned contract whose ownership, closure, examples, and extension points remain legible |
| `source-authority-mapping` | Trace a claim, artifact, or contract from semantic owner through projections and delivery to a receiver | Cross-repository promotion, workspace citation, mirror, snapshot, ownership ambiguity | Authoritative source, typed relations, receiving decision, and re-entry coordinate |
| `issue-chain-stewardship` | Make related issues legible as a revisable route while each retains its own contract | One issue prepares, blocks, contains, runs alongside, receives, or returns to another | Current front, evidenced relations, transition receipt, next receiver, and release event |
| `bounded-support-routing` | Compose one finite support contribution with an explicit return and stop | A bounded observation, patch, research, validation, or recovery request needs a handback | Action mode, known-good point, observable return, handback, and stopping event |
| `locator-boundary-stewardship` | Project locator-safe public records while authorized lineage stays recoverable | Public-history preparation, durable collaboration prose, gated source coordinates | Public semantic receiver, paired resolver mapping, bounded receipt, and re-entry route |
| `stateful-artifact-behavior-contracts` | Select the smallest source-grounded behavior contract for a stateful artifact exchange | Import, edit, export, semantic twin, minimum usable state, retained-state recovery | Focused executable journey whose accepted and rejected paths leave state intelligible |
| `secret-boundary-inspection` | Produce a canary-proven, scope-explicit secret-material observation | Repository snapshot, exact proposed index, local-ref history, generated artifact, successor reception | Safe clean receipt tied to engine, configuration, canary, and scope, or a private finding route |
| `repository-attribution-stewardship` | Align copyright-holder, citation, contribution, notice, and bounded machine-projection carriers | Repository attribution, citation metadata, contributor credit, or adaptation guidance changes | Distinct carrier roles, proportionate attribution, and an evidence-calibrated governance return |
| `collaboration-runbook-authoring` | Convert a settled multi-phase route into a re-entrant versioned procedure | Known work spans several source owners, Issues, checks, recovery paths, and handbacks | AI-legible entry, authority, action modes, checks, recovery, stop, and handback |

Twenty portable skill contracts now form the standing catalog. The first
eight began as instruction-only experiments. Twelve later contracts joined after
material work established distinct receiving jobs:
`contextual-jargon-scan`, `schema-contract-authoring`, `source-authority-mapping`,
`issue-chain-stewardship`, `bounded-support-routing`,
`locator-boundary-stewardship`, `stateful-artifact-behavior-contracts`,
`secret-boundary-inspection`, `repository-attribution-stewardship`,
`collaboration-runbook-authoring`, `context-canvas-visual-verification`, and
`repository-collaboration-cycle`. Each remains a revisable transport
surface whose contribution is read through the receiving work.

The [repository collaboration cycle option analysis](repository-collaboration-cycle-options.md)
records the distinct full-cycle receiving job, selected one-runbook
architecture, conditional domain overlays, and capacity-aware bounded-support
branch. `repository-reentry` retains truth reconstruction;
`bounded-support-routing` retains each finite packet; material skills retain
their source behavior.

### Settled task-bound projections

| Projection | Source contract | Receiving task | Exit observation | Disposition |
| --- | --- | --- | --- | --- |
| `context-canvas-ai-systems-css-projection` | `context-canvas-css-ownership` | Thirteen-route AI Systems CSS extraction | File-boundary and computed-cascade observations returned to the portable owner | retired at the first repository re-entry after the receiving pull request merged |
| `prototype-exemplars-schema-v1-projection` | `schema-contract-authoring` | Prototype Exemplars schema roots, adjacent-family use, and dual-host handoff | Radiant Null publication settled, the page migration reached review, and the [schema contract plan](schema-contract-research-and-implementation-plan.md) received the remaining operator-host handoff | retired after semantic-membership and identity/retrieval observations returned upstream |

No task-bound projection is currently active. The two completed projections remain reachable as natural-use evidence through Git history and proportionate collaboration accounts.

## Later tranches and their earn conditions

| Candidate skill | High-value affordance | Re-entry condition |
| --- | --- | --- |
| Interactive instrument state mapping | Extend `stateful-artifact-behavior-contracts` when control-to-state causality, reset or undo, persistence, provenance, and input semantics form a distinct receiving result | A control-heavy Open Lesson, Strategy Canvas, or Initiative Costing change exposes work that the formed exchange contract cannot carry |
| Semantic information-surface authoring | Shape content-led explanatory pages through hierarchy, measure, grouping, heading information scent, link wording, reading rhythm, and source boundaries; an `attention-ergonomics` lens can foreground fatigue and scanning without prescribing an F-shaped layout | Two materially different authoring or refactor tasks demonstrate a distinct intervention beyond surface reading, supportive writing, and CSS ownership, and at least one supplies human reading or task-completion evidence; milestone-22 issue #150 is the next probe |
| Collaboration handoff capsule | Carry explicit referents, settled decisions, evidence, authority, open state, artifact pointers, and next moves across collaborators or platforms | A current-handoff or prompt-capsule artifact receives real cross-platform human or AI use |
| Decision-instrument modeling | Keep units, assumptions, calculations, uncertainty, scenarios, sensitivity, explanation, and leave-behind behavior legible | The Initiative Costing refactor begins and exposes a repeated modeling job |
| Facilitated session state | Separate participant turns, votes, aggregation, overrides, notes, settlement, provenance, and reports | Multi-participant Strategy Canvas implementation begins |
| Embedded-origin boundary | Make host and guest authority, framing, message exchange, sizing, loading, and fallback behavior explicit | The [prototype-delivery collaboration](context-canvas/open-issue-collaboration-waves.md) or an iframe packaging wave produces repeated origin-boundary decisions |
| Reference-affordance extraction | Separate visible form from ergonomic, interaction, accessibility, spatial, and facilitation implications | Another authored visual reference supplies a material implementation use |
| Agent observation channel agreement | Map one browser task across semantic/accessibility, DOM geometry, and rendered screenshot channels, then route a decision-changing divergence | Milestone-22 issue #149 runs a real repository task through an AX/DOM-style observation and a screenshot/VLM-style observation, and the result changes a decision beyond surface reading plus a practitioner probe |
| Surface color-state stewardship | Carry a painted-owner foreground and state contract into a visitor system outside Context Canvas | A second non-Canvas system needs the same role/state/mode matrix and exposes a distinct decision not already carried by its CSS owner or visual-verification route |
| Cloudflare contextual delivery | Connect a Canvas source closure to direct view, Worker envelope, storage, and framing choices | Another authorized proof requires a repeated delivery decision beyond the existing pilot |
| Managed-host release reception | Receive one accepted source/carrier coordinate through a platform-managed clone, bounded private configuration, preflight, first cutover, recovery, and signed-out handback while source and host authority remain distinct | The first live cPanel activation exposes decision-changing enrollment or recovery friction, or a second repository needs the same host-reception route beyond the existing publication runbook and deployment owner |
| LIMS/ELN constellation re-entry | Navigate five source repositories, the integrated nucleus, issue long tail, and pull-request reassessment | Context Canvas workflows settle and constellation reassessment resumes |
| Debrief composition stewardship | Map source-native movements, catalog relationships, route rail, and shared composition CSS | The Debriefs CSS tranche establishes stable module boundaries |
| Planning inventory | Arrange artifacts, decisions, dependencies, receiving surfaces, resting conditions, and opportunities for selection and handoff | A non-Canvas planning cycle accepts the inventory itself as a decision-bearing deliverable and demonstrates opportunity capture, lower rediscovery cost, or clearer expectation negotiation beyond existing owners |
| Dangling-terrain closure | Preserve purposeful omission and its exact return condition across cycles | Repeated re-entry shows omission ledgers are being lost or reopened without new evidence |
| Systemic intervention framing | Separate deterministic mechanics from evolving problem-shaping terrain and define a useful bounded intervention | Two collaboration cycles show task-style completion obscuring system consequences or return conditions |
| Failure-geometry recognition and recovery routing | Name recurring collaboration strain, assess gap utility, and route the smallest adequate move to an owning surface | Two cycles repeat the same strain shape and the active cross-cutting guidance no longer supplies enough orientation |

These candidates are vocabulary and possibility, rather than a commitment to populate the catalog. A future tranche should remain smaller than the set of recurring jobs it replaces. Single selectors, one-off bug mechanisms, exact visual choices, and current vendor facts continue through ordinary reasoning, owning skills, or current official documentation.

The former Visual-reference cycle billet has precipitated into
`context-canvas-visual-verification`. Visual-fingerprint stewardship folds into
that contract's distinction between intended route variation and regression.
The [visual-consistency cultivation plan](context-canvas/visual-consistency-skill-cultivation.md)
records the source evidence, private/public Registry boundary, and next natural
uses.

This candidate ledger preserves later skill terrain as a collaboration
surface. Twenty portable contracts form the standing experiment; the two
retired projections remain available as use evidence through Git history and
threadkeeping.

## Proportionate natural-use observation

Material collaboration provides the evaluation surface. A human correction, receiving-artifact behavior, changed platform condition, independent source, or naturally occurring near miss can reveal trigger quality, missing context, unnecessary steps, and recognizable completion. The pull request that reveals consequential friction carries the smallest useful description or workflow revision.

Fresh-context comparison remains occasional and human-visible. It enters when a real uncertainty would change the receiving result, then exits with that decision. The current catalog needs no permanent prompt suite, scorecard, continuous evaluation job, or self-conformance loop.

## Purposeful deferrals

- **Skill scripts:** each current job is judgment-led. Repeated deterministic mechanics can earn a local helper.
- **`agents/openai.yaml`:** catalog descriptions already supply the immediate routing surface. UI metadata can return with a real distribution or interface need.
- **Skill version manifests and changelogs:** Git history owns repository-local evolution. Version metadata returns when compatibility or external distribution requires it.
- **Further machine-readable skill architecture:** Collaboration Skills 0.1.0 now carries one portable contract, one retired projection, and one collaboration account into a named visitor-facing adoption kit. JSON-LD, composition objects, registries, routing services, and hosted workflows return only when another material receiver needs them.
- **Projection registry:** each projection declares its own binding profile and exit event. A separate inventory returns only if concurrent projections make re-entry materially difficult.
- **Router skill:** nineteen distinct descriptions remain easy for a human and model to scan. Observed misrouting or further material catalog growth can earn a router.
- **Plugin packaging:** local practice should stabilize the useful vocabulary first.
- **Cross-model conformance matrix:** the portable `SKILL.md` form is sufficient for now; another target environment can earn its own reading.
- **CI and hosted evaluations:** the prototype unit-test workflow is manually dispatchable, and its pull-request receiver rests by default. Setting `PROTOTYPE_UNIT_TESTS_AUTOMATIC=true` activates the bounded automatic path within the approved standard-runner Actions budget; local checks remain the ordinary development path.
- **Full Practitioner Probe registry:** the five-field probe already changes decisions. A real corpus comparison can earn deeper classification.

## Re-entry

### Receiver-topology natural-use revision

- **Grammar observation:** one comparison atlas replaces eight private retrieval routes while eight stable children preserve independently retrievable teaching jobs and current-content-false standing.
- **Visual Fidelity observation:** two working sources meet an existing conceptual stabilizer; one sibling operational Atlas carries a distinct selector, production, handoff, exemplar, and review job through stable sections.
- **Decision effect:** the useful public topology follows reader jobs, authority, currentness, and lifecycle rather than working-source count. Existing orientation can remain in place while a distinct operational job earns one sibling receiver.
- **Current owner and route:** `source-authority-mapping` owns the source-to-receiver choice; collaboration accounting selects `iterate_now` after the second materially different family.
- **Smallest action:** add one receiver-topology rule and one complementary-surface scenario to the existing skill. The Collaboration Skills 0.1.0 exchange schema remains sufficient because its structure and published example have not changed.
- **Re-entry trigger:** authority and publication are already settled, yet a recurring task still needs independently routable judgment about addressability, navigation, or release completion. That evidence can distinguish a later semantic information-surface contract from this authority-mapping owner.

### Resolver-state natural-use revision

- **Current-tree observation:** thirty private working identities already have their useful construct, evidence boundary, or canonical onward route on ten Context Canvas surfaces. Leaving those gated locators active would make “resting” look like visitor availability.
- **Decision effect:** deferral belongs to the private lineage resolver. The visitor route can retire while exact identity, prior relation, and a material re-entry condition remain recoverable.
- **Current owner and route:** `source-authority-mapping` owns this publication-boundary distinction. Collaboration accounting selects `iterate_now` because it changes the actual source-to-receiver decision across a complete live corpus.
- **Smallest action:** add one resolver-state rule and one local-explanation scenario to the existing skill. The Collaboration Skills schema remains sufficient because the portable contract structure is unchanged.
- **Re-entry trigger:** a materially different corpus shows that visitor retrieval must retain a gated route to preserve a real reader job. That evidence can revise the rule without forming another authority layer.

### Paired-receiver settlement natural-use revision

- **Observation:** seven source families needed one locator-safe repository record and one exact authorized resolver record. Their information needs and acceptance timing differed while one operator-blind key kept lineage coherent.
- **Decision effect:** each receiver now carries its own acceptance evidence. The aggregate receipt remains partial while either side awaits acceptance, then settles when both records are present.
- **Current owner and route:** `locator-boundary-stewardship` owns the paired projection. Collaboration accounting selects `iterate_now` because the rule changes continuation in the active LIMS/ELN and A3 source-settlement work.
- **Smallest action:** add one information-diet rule, revise the paired-receiver sequence, and retain one asynchronous-acceptance scenario. The Collaboration Skills schema remains sufficient because the portable contract shape stays stable.
- **Re-entry trigger:** a materially different use outside locator and publication-boundary work needs paired acceptance as its own result. That evidence can support `create_now` for an independent `paired-receiver-settlement` contract.

The CSS and schema cycles supplied two projection retirements and returned their decision-changing residue to `context-canvas-css-ownership` and `schema-contract-authoring`. No projection is currently active. `source-authority-mapping` now carries receiver-topology and resolver-state revisions earned by the Grammar, Visual Fidelity, and complete Context Canvas current-tree uses, while Collaboration Skills 0.1.0 and the [visitor page](../context-canvas-project-surface/context-canvas/collaboration-skills.html) continue to provide its typed cross-platform receiver. `issue-chain-stewardship` carries the Registry disposition → accepted current-tree receipt → human-held selection and releases when the receiver acknowledges the handoff while its remote operation remains at rest. `locator-boundary-stewardship` carries paired-receiver settlement while all observed uses remain publication-boundary projections. This candidate ledger retains later terrain, including the planning-inventory billet and its forge condition. Consequential friction supplies the useful observation; later natural uses determine the smallest revision, composition, settlement, dormancy, retirement, or additional portable contract.
