# Declarative skill authoring pattern

```markdown
---
name: capability-name
description: <Third-person capability statement>. Applies when <specific trigger territory>.
---

# Capability name

## Contract

- **What:** <coherent job>
- **When:** <activation conditions>
- **Boundaries:** <scope, authority, and transfer limits>
- **Result:** <observable receiving state>

## Fit and attention — include only prompts that change application

- **Useful when:** <conditions that make this method a strong fit>
- **Poor fit when:** <adjacent case that routes elsewhere>
- **Smallest useful dose:** <least structure that creates the result>
- **Foregrounds:** <attention or evidence this method makes easier to see>
- **May under-attend:** <bounded perspective or constitutive silence>
- **Material result:** <receiving artifact, decision, behavior, or recovery path>
- **Interactions:** <peer skill, conditional context, projection, or lens binding>
- **Rest or release when:** <settlement, fold, dormancy, or retirement condition>

## Inputs, defaults and output

<Include this section when input or output ambiguity changes execution. Name the minimum useful inputs, safe defaults, missing-input response, and receiving artifact. Place branch-specific detail in a conditional reference.>

## Rules

### Rule: <invariant>

<Non-obvious declarative guidance.>

## Operating sequence

1. **Phase:** <action-bearing procedure when order matters>.

## Scenarios — only when interpretation changes

<The smallest useful set often contains one scenario and sometimes none.>

### Scenario: <ordinary path>

- Given <initial context>
- When <event or action>
- Then <observable result>

### Scenario: <consequential boundary, when needed>

- Given <boundary context>
- When <event or action>
- Then <observable result and recovery route>

## Conditional context

The skill loads [references/<topic>.md](references/<topic>.md) when <specific branch condition>.

## Recovery and re-entry

<Name the useful fallback, retained evidence or state, and event that reopens the task when these materially change recovery. Keep this section conditional on the skill's job.>

## Completion

<Recognizable completion state, outside signal that can reopen work, and release condition.>
```

The fit-and-attention prompts are a palette. Select only the prompts that change behavior or prevent likely misrouting. They remain readable body prose rather than required metadata.

## Composition relations

| Relation | Use | Boundary |
| --- | --- | --- |
| **Peer composition** | Two or more skills own distinct results in one undertaking | Each contract keeps its trigger, completion, and authority |
| **Augmentation** | One supporting relation changes how the primary skill attends, frames, or expresses its own result | The primary contract retains completion and the augmentation states its effect and exit |
| **Task-bound projection** | One skill receives named task, tool, authority, and lifetime bindings | Routable depth remains one and the projection carries an exit event |
| **Conditional context** | A skill needs source-specific or uncommon detail | The reference loads only for its named branch |
| **Interpretive lens binding** | A bounded augmentation may improve how the primary skill reads the material | The lens remains non-routable, gains no execution authority, and exits with the task |

Composition is selected at the receiving task. One skill remains the primary owner of each result; supporting skills and lenses augment attention without rewriting that ownership.

## Execution boundary

Scenarios remain illustrative unless a directly linked step definition, script, or test makes one executable. A short local note names that connection when it exists.

## Reference threshold

A scenario moves from `SKILL.md` into a reference when at least one condition holds:

- one domain branch has little relevance to ordinary activation;
- the branch requires source-specific identifiers, mechanisms, or migration detail;
- several scenarios illustrate the same rule;
- the core skill approaches the point where conditional detail competes with its operating sequence.

The core file links each reference directly and states the exact load condition.
