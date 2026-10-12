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
| [Repository collaboration cycle](repository-collaboration-cycle.v0.1.md) | A cold or resumed AI collaborator should carry one authorized repository task from current truth through route selection, conditional setup, source-owned execution, evidence, delivery, and exact re-entry | Working; explicit observation-only and implementation phase paths; fresh-context traversal remains the first exercise |
| [Site repository build and handoff](site-repository-build-and-handoff.v0.1.md) | A technical collaborator should prepare and hand off a site repository that another owner and authorized AI collaborator can continue through live Issues | Working at 0.1.1; the first Context Canvas comparison established separate checks for mechanical apply eligibility and receiving-route fit. Source intake, transfer, and one post-transfer Issue-to-change cycle remain ahead |
| [Cross-repository cold-session docket](cross-repository-cold-session-docket.v0.1.md) | Work spans `human-ai-systems-exemplars`, `gist-registry`, the LIMS/ELN constellation, or their Notion, materializer, and production boundaries | Exercised through resumed-session source observation; current-instruction bootstrap, detached entry, distinct source/release/snapshot/package coordinates, and observation handback informed revision; independent blank-context and operational overlays retain separate exercise coverage |
| [Iframe and production publication stabilization](core-iframe-publication-stabilization.v0.1.md) | The accepted visitor and prototype changes must pass through one manifest-declared Core-and-Canvas package, protected destination-based promotion, cPanel closures, a host-supported pull or artifact receiver, hosted observation, public route documentation, and long-lived branch return | The shell-free packager and verifier are implemented; the first destination-based `release → prod` exercise is in progress under #469; release-bound host activation and live observations retain their Issue-owned acceptance |

For the bounded job of preparing a shell-free cPanel carrier, begin with the
[deployment quick entry](../../deployment/cpanel/README.md#quick-entry-prepare-a-shell-free-cpanel-carrier).
It distinguishes packaging an existing annotated tag from building a new
source/carrier release and routes the transfer and recovery details to their
canonical guide.

The
[`collaboration-runbook-authoring`](../skills/collaboration-runbook-authoring/SKILL.md)
skill owns the portable authoring contract. A runbook is complete when it and
its linked current owners give another collaborator enough orientation to
enter, act within granted authority, verify, recover, and return. A repeated
concrete drift case can earn a validator or additional metadata later; this first
practice remains instruction-only.
