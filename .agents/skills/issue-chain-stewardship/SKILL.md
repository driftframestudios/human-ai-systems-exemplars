---
name: issue-chain-stewardship
description: Makes related repository issues legible as a revisable work route while each issue retains its own outcome, authority, and acceptance boundary. Applies when completion, evidence, or a human-held decision in one issue materially changes whether another issue can begin or settle.
---

# Issue chain stewardship

## Contract

- **What:** A compact account of the current front, typed issue relationships, held conditions, transition evidence, next receiver, and release event.
- **When:** Several issues form a decision-bearing sequence, branch, containment relationship, or return path that an individual issue cannot explain on its own.
- **Boundaries:** Current repository and GitHub evidence establishes relationships. Each issue retains its content, acceptance, execution authority, and priority; the chain coordinates only the transitions. Private lineage remains in its intended surface. A tidy sequence supplies orientation rather than proof that the work must proceed in that order.
- **Result:** A receiving collaborator can see why one issue is current, what each issue owns, what passes between them, which terrain runs in parallel, and which event releases the chain.

## Fit and attention

- **Useful when:** One issue prepares or blocks another, a tranche contains a smaller issue family, or completed work returns to an umbrella issue.
- **Poor fit when:** One issue and its acceptance criteria already describe the whole job, or a simple unordered related-issues list preserves enough context.
- **Smallest useful dose:** One current front, one or more evidenced relations, one pass condition, and one next receiver.
- **Interactions:** `repository-reentry` resolves each issue's current truth; `source-authority-mapping` traces cross-surface artifacts; desired-state writing shapes the handoff; `collaboration-accounting` receives promotion, revision, or retirement evidence.
- **Rest or release when:** The next issue accepts the handoff, the relationship dissolves, or new evidence changes the route.

## Rules

### Rule: Relations come from evidence

Use plain relations such as **prepares**, **blocks**, **receives**, **runs alongside**, **contains**, and **returns to** when issue bodies, accepted work, repository state, or a human decision supports them. Keep a plausible relationship as an open question when the evidence remains incomplete.

### Rule: Each issue keeps its own contract

The chain names what each issue owns and receives. Acceptance criteria, implementation authority, publication rights, and destructive actions remain with their existing owners.

### Rule: The current front stays visible

Name the issue whose next decision can materially advance the route and the evidence that makes it current. A blocked, parallel, or optional issue remains distinct from that front.

### Rule: Branches preserve optionality

Represent parallel work, contained tranches, optional enrichments, and return paths directly. A linear summary keeps every meaningful branch visible, and a blocker appears only when evidence establishes it.

### Rule: Human-held decisions remain human-held

Name the decision, the evidence available to support it, and the event that invites it. The chain preserves the boundary; the named human owner resolves the decision.

### Rule: Transitions reuse a sufficient public return

A passing issue states the material result, public-safe changed surfaces, remaining boundary, and receiving issue. A linked pull-request body, workflow summary, task response, or Issue comment can satisfy the transition when it already carries the pass condition. The receiver records acceptance or the bounded condition that keeps the handoff open. Sensitive diagnostics and protected coordinates remain with their existing local or access-controlled owner rather than being reproduced in the chain.

### Rule: Chains finish

The chain exits when the next receiver accepts the transition or the relationship no longer changes work. Ordinary issues and repository history retain the durable record; the chain remains a temporary coordination view. A dashboard, authority model, score, routing service, or standing status ritual requires its own material receiver.

## Operating sequence

1. **Resolve current truth:** Read the relevant issues, accepted pull requests, current source, and nearest planning or threadkeeping record.
2. **Name the route:** State the desired end state, current front, and why that front is current.
3. **Type the relationships:** Name what each issue owns, receives, and passes, using ordinary relation language.
4. **Separate terrain:** Make blockers, held conditions, parallel work, optional enrichments, and human-held decisions visible.
5. **Reuse or write the return:** Link an existing sufficient public-safe result, or record only the decision-changing evidence that satisfies the current pass condition and names the next receiver.
6. **Release or return:** Close the chain when the receiver accepts it; preserve one concrete re-entry event when the route remains open.

## Working capsule

```markdown
## Issue Chain

**Desired end state:**
**Current front:**
**Why this issue is current:**

| Issue | Relation | Owns | Receives | Passes when | Return |
| --- | --- | --- | --- | --- | --- |

**Held condition or blocker:**
**Parallel or optional terrain:**
**Human-held decision:**
**Next receiver:**
**Release or return condition:**
```

## Representative scenario

### Scenario: A public-route issue prepares a human-cued history decision

- Given one issue owns public receiving routes and a locator-free current tree
- And a later issue owns a public-history choice that requires direct human direction
- When the current-tree issue supplies its accepted route and locator receipt
- Then the chain passes that evidence to the history issue
- And the later issue retains the human-cued destructive-action boundary
- And the chain exits when the receiver accepts the handoff or names a remaining condition

## Completion

Issue chain stewardship completes when the current front, evidenced relations, issue-owned contracts, held decisions, one sufficient transition return, next receiver, and release event are legible, dependencies remain evidence-backed, and authority remains with its existing owners. A materially different receiving use, a missed branch, or a stale transition can reopen the contract through collaboration accounting.
