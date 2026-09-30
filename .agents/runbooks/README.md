# AI collaboration runbooks

Runbooks give AI collaborators a re-entrant route through a known, multi-phase
procedure. They complement the repository's current surfaces:

- GitHub Issues remain the collaboration docket, outcome, and acceptance
  boundary.
- A bounded support request remains one finite invocation with a named action
  mode and stop condition.
- A playbook remains the fitting form for branching diagnosis or exploration.
- A handback remains the smallest safe return that lets the receiving lane
  continue.

Tracked runbooks are public-possible source material. They depend only on
public repository sources, public links, and public-possible Registry handles.
Internal-only runbooks stay with their authorized private workspace and point
outward to a safe public projection when one exists.

## Header and standing

Use the smallest metadata that changes routing:

```yaml
---
title: Short descriptive title
version: 0.1.0
status: working
audience: ai_collaborators
source_band: public_possible
task_type: operational_collaboration
---
```

`working`, `exercised`, `stable`, and `retired` describe observed maturity.
They do not grant authority, rank quality, or replace current GitHub state.
Git preserves chronology; the active Issue preserves the work decision.

## Contents

| Runbook | Use it when | Standing |
| --- | --- | --- |
| [Repository collaboration cycle](repository-collaboration-cycle.v0.1.md) | A cold or resumed AI collaborator should carry one authorized repository task from current truth through route selection, conditional setup, source-owned execution, evidence, delivery, and exact re-entry | Working; fresh-context traversal is the first exercise |
| [Cross-repository cold-session docket](cross-repository-cold-session-docket.v0.1.md) | Work spans `human-ai-systems-exemplars`, `gist-registry`, the LIMS/ELN constellation, or their Notion, materializer, and production boundaries | Working; the first complete cold-session traversal is the exercise |
| [Iframe and production publication stabilization](core-iframe-publication-stabilization.v0.1.md) | The accepted visitor and prototype changes must pass through one manifest-declared Core-and-Canvas package, cPanel closures, a host-supported pull or artifact receiver, hosted observation, public route documentation, and long-lived branch return | Exercised through a read-only cold-start traversal; the shell-free adapter and live implementation follow their active Issues |

The
[`collaboration-runbook-authoring`](../skills/collaboration-runbook-authoring/SKILL.md)
skill owns the portable authoring contract. A runbook is complete when it and
its linked current owners give another collaborator enough orientation to
enter, act within granted authority, verify, recover, and return. A repeated
concrete drift case can earn a validator or additional metadata later; this first
practice remains instruction-only.
