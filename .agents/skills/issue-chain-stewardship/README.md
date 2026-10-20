# Issue chain stewardship

Show how related Issues pass work to one another while every Issue keeps its own
outcome, acceptance criteria, priority, and decision authority.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative relationship types,
  transition rules, working capsule, and completion boundary.
- Return to the [repository skill catalog](../README.md) when re-entry,
  source-authority, or collaboration-accounting work owns the next result.

## What this skill returns

A compact chain identifies the desired end state, Issue currently receiving work, evidenced
relationships, pass condition, parallel or optional work, human-held decisions,
next receiver, and release event. Plain relations—**prepares**, **blocks**,
**receives**, **runs alongside**, **contains**, and **returns to**—make the route
readable while optional branches and held decisions stay visible.

## Concrete example

**Situation:** One Issue prepares a schema package, a second deploys its delivery
worker, and a third activates a public route after human review. Documentation
improvements can run alongside the deployment work.

**Use:** Name schema preparation as the Issue currently receiving work, record that it prepares
worker deployment, describe the accepted package and verification record it
passes, keep documentation parallel, and preserve activation as a human-held
decision.

**Observable return:** A collaborator can tell which Issue can advance now,
what evidence releases the worker Issue, which work can proceed in parallel,
and which event invites activation review.

## Working path

1. Reconcile the Issues, accepted pull requests, current source, and nearby plans.
2. Name the end state and explain why one Issue is current.
3. Type only relationships supported by repository or human evidence.
4. Separate blockers, held decisions, optional work, and parallel work.
5. Reuse one sufficient transition return or write the smallest missing one.
6. Release the chain when the next receiver accepts the handoff.

The reusable Markdown capsule and complete coordination sequence live in
[`SKILL.md`](SKILL.md). Current Issues, accepted work, and repository state
supply each chain’s evidence.
