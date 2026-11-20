# Bounded support routing

Use this skill to give one finite contribution a clear result, action boundary, observable stop, and handback. The packet gives the receiver finite scope, a complete result, and an explicit return.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Choose one route: `Solution`, `Implementation`, or `Recovery`.
- Choose one action mode before tool use: `observation_only`, `repair_authorized`, `implementation_authorized`, or `recovery_authorized`.
- Name the opportunity, focal artifact or behavior, requested result, granted actions, held boundaries, expected observation, recovery route, handback, and stop condition.

## Concrete example

**Situation:** A reviewer wants to know why a figure caption crosses its painted background at one viewport. The current grant authorizes inspection and a recommendation. A later `repair_authorized` packet grants permission to edit the source.

**Use:** Form an `observation_only` packet focused on the figure and its CSS owner. Grant source reading and a focused browser check. Define the stop condition as a reproducible geometry finding or measured confirmation that the figure and caption match the declared boundary.

**Observable return:** One handback names the observed width, owning selector, normalized result, what the check establishes, and the smallest repair route. Repository state remains at its known-good coordinate until a `repair_authorized` packet grants the change.

## Supporting material

- [GitHub Issue label projection](references/github-issue-label-routing.md) helps when an Issue is the packet or handback surface.
- [OpenAI Codex Spark](references/openai-codex-spark.md) supplies current platform-specific routing when Spark is the selected receiver.

## Boundaries

A skill name, route label, or Issue label orients the reader. The explicit grant governs reads, mutation, publication, merge, deployment, and external actions. Once a stop condition forms, remaining state-changing actions pause and the evidence handback continues.

[Return to the repository skill collection](../README.md).
