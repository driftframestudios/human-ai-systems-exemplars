# Task-bound skill projections

## Purpose

This reference supplies the bounded derivative pattern for a portable skill contract. It applies when a named task benefits from explicit local routing while the durable contract remains stable.

## Working vocabulary

| Term | Technical meaning | Repository form |
| --- | --- | --- |
| **Portable skill contract** | An operative, independently routable skill that owns the transferable contract, rules, and completion state | A standing `SKILL.md` under `.agents/skills/` |
| **Task-bound skill projection** | A selected portion of one portable contract bound to a named task, tool surface, authority scope, and lifetime | A separately routed `SKILL.md` with a binding profile and exit event |
| **Non-routable context capsule** | Selected task context carried to one landing without automatic discovery | A Markdown reference loaded explicitly by the owning contract or projection |
| **Skill billet** | Durable cognitive or collaboration stock awaiting a live platform receiving job | A named planning, issue, or threadkeeping candidate rather than an operative skill |
| **Interpretive lens binding** | A bounded attention or vantage relation attached to a receiving task | A non-routable task relation whose source, effect, likely silence, and exit remain explicit |
| **Binding profile** | Independent task, source, selection, platform, authority, lifetime, and disposition dimensions | A compact section inside the projection |
| **Routable projection depth** | The number of routable projection edges from a portable contract | A recursion-control marker rather than a maturity score |

`Projection` describes selected source state bound into a target artifact while both source and target identities remain legible. `Applied skill` leaves that selection, target, and lifetime implicit. `Generic skill` can imply formal parameterization that the source contract may not possess. `Headless` describes presentation architecture in many technical domains; `non-routable` states the relevant skill behavior directly. `Disposable` describes a possible disposition rather than artifact quality.

## Recursion bound

The standing allowance is:

```yaml
max_routable_projection_depth: 1
```

- Depth zero is the portable skill contract.
- Depth one is a task-bound skill projection.
- Further local selection becomes a non-routable context capsule, interpretive lens binding, collaboration account, or upstream revision proposal.
- A genuinely distinct transferable job returns through collaboration accounting and, when selected, forms a new portable contract at depth zero.

This scalar controls routable lineage only. Task scope, evidence, authority, lifetime, usefulness, maturity, and disposition remain separate dimensions in the binding profile.

## Projection admission

A task-bound projection fits when all of the following conditions hold:

1. one operative source contract owns the durable behavior;
2. one named receiving task benefits from repeated automatic routing during a bounded collaboration wave;
3. the projection selects or binds source behavior rather than inventing a second general contract;
4. the local artifact is inexpensive to revise or remove;
5. an observable exit event and default disposition exist at formation.

A collaboration pass can form the projection immediately within existing task authority when these conditions are legible. The receiving task determines the concrete bindings; explicit human direction remains authoritative when supplied.

A context capsule fits when explicit loading is sufficient, the local context belongs to one or two uses, or another catalog entry would cost more attention than it saves.

## Binding profile

The profile remains inside the projection body so conventional skill frontmatter stays small:

```yaml
binding_profile:
  artifact_role: task_bound_skill_projection
  source_contract: "portable-skill-name"
  receiving_task: "named material task"
  selected_contract: "rules or workflow portions receiving local binding"
  supporting_relations: "optional peer contracts, context capsules, or lens bindings"
  platform_and_tools: "repository and relevant execution surface"
  authority_scope: "permitted material effects"
  routable_projection_depth: 1
  reification_state: active
  lifetime: "event-bounded collaboration interval"
  exit_event: "observable review, merge, closure, or task-settlement event"
  default_disposition: "retire | fold_to_source_reference | review_for_portable_contract"
  upstream_return: "decision-changing observation eligible for source revision"
```

The profile is a readable envelope rather than a required manifest. Its dimensions are expectations for bounded formation rather than a fixed schema, and equivalent declarative prose remains valid when the relationships stay legible.

## Exit sequence

1. **Observe the exit event:** Repository re-entry or task settlement identifies the projection whose receiving work has ended.
2. **Return useful residue:** A decision-changing rule, trigger correction, scenario, or boundary becomes a proposal to the portable source contract.
3. **Select disposition:** The projection retires, folds into a source reference, or returns through `create_now` when a distinct durable job has emerged.
4. **Remove active routing:** A retired projection leaves the active skill catalog while Git history and proportionate threadkeeping preserve lineage.
5. **Resume material work:** The exit pass closes after one disposition and one return condition.

Promotion is a new route decision rather than an automatic consequence of survival, recurrence, or successful local use.

## Specification by example

### Scenario: A bounded task benefits from its own routing entry

Given a portable skill contract owns the durable behavior<br>
And a named task will receive several materially meaningful collaboration turns<br>
And local source, scope, tool, and lifetime bindings would save repeated reconstruction<br>
When the temporary artifact receives an exit event and default disposition<br>
Then a task-bound skill projection forms at routable depth one<br>
And the source contract retains durable authority

### Scenario: One projection suggests another projection

Given an active task-bound projection already sits at routable depth one<br>
And the task reveals another local distinction<br>
When that distinction remains part of the same receiving job<br>
Then a non-routable context capsule carries the additional detail<br>
And the projection tree remains one routable edge deep

### Scenario: A local projection reveals a distinct durable job

Given natural use reveals a transferable job with distinct trigger territory<br>
And that job extends beyond the current receiving task<br>
When collaboration accounting selects `create_now` from independent evidence<br>
Then a new portable skill contract forms at depth zero<br>
And the temporary projection retains its planned exit

### Scenario: The task settles without durable learning

Given the projection served its receiving task<br>
And no observation would change the portable contract or another future decision<br>
When the exit event occurs<br>
Then the projection retires through normal review<br>
And successful local use remains sufficient evidence

## Research grounding

The repository-local source capsule carries four operator-blind relations for this projection research. Together they supplied the distinctions used here: architecture and affordance, source and projection, profile and instance, selected state and portable capsule, receipt and agreement, and return proposal and source decision. Exact workspace lineage remains with its authorized resolver.

Additional workspace material informed the release posture without becoming direct repository citation or runtime dependency. The repository-local depth allowance remains a working design choice to be revised through natural use.
