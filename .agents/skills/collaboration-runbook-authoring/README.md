# Collaboration runbook authoring

Use this skill to turn a settled, repeatable multi-phase procedure into a versioned route another collaborator can enter, exercise, recover, and hand back safely.

## Start here

- Read the authoritative [skill contract](SKILL.md).
- Use a runbook for a known path with a known receiving state. Use a playbook for branching diagnosis, a research spike for an evidence-changing question, and a bounded support request for one finite contribution.
- Lead with the observable completed state, then name entry conditions, source owners, phase actions, checks, recovery, stop conditions, and handback.

## Concrete example

**Situation:** A release promotion repeatedly moves accepted source through package construction, parity checks, staged observation, activation, and post-activation verification. Different owners control source acceptance, generated packages, and external activation.

**Use:** Write one phase for each settled owner boundary. Give every phase an action mode, granted operations, a checkpoint and what it proves, a recovery point, and a stop condition. Keep external activation with its existing authority holder.

**Observable return:** A collaborator can enter at the stated source coordinate, stop safely when an entry condition fails, rebuild generated material through its owner, and return a concise `pass`, `friction`, or `blocker` result to one named receiver.

## A useful runbook shape

1. Desired receiving state and completion signal
2. Entry conditions and their safe hold state
3. Current owners and granted authority
4. Ordered phases with checks and recovery
5. Stop condition and handback
6. Re-entry event and lifecycle standing

## Boundaries

The current task grant authorizes action; the active Issue or equivalent owner supplies scope and acceptance; the runbook orders the route. Publication, deployment, merge, and destructive operations retain their existing approval boundaries.

[Return to the repository skill collection](../README.md).
