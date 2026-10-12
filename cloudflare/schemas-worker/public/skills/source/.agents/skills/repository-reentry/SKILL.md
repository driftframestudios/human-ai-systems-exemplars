---
name: repository-reentry
description: Reconstructs current truth across source, Git, GitHub, planning, and threadkeeping. Applies during resumed work, handoffs, status reconciliation, stale-plan review, and branch or pull-request re-entry.
---

# Repository re-entry

## Contract

- **What:** A compact model of settled, current, open, and next terrain.
- **When:** Multi-cycle work resumes or repository records appear to disagree.
- **Boundaries:** Current behavior comes from runnable source and artifacts. Historical records preserve rationale. Repository edits require task authority. Re-entry recovers the current contract and differences without claiming personal memory, complete continuity, or familiarity that the available evidence cannot support.
- **Result:** One source path, one live collaboration surface, and one bounded re-entry move.

## Rules

### Rule: Current behavior leads

Runnable source and artifacts outrank summaries of prior behavior. Current Git and GitHub state outrank historical status language.

A `snapshot` ref supplies an accepted comparison coordinate. Confirm its recorded equality with `main` before using it, then carry work on a living receiving branch. Runnable source on the accepted working branch remains behavior authority and the return path for accepted feature work.

### Rule: Encounter posture remains explicit

First contact with a page, repeat contact with a repository, and re-entry into a collaboration can coexist. The account states which relation is current, which evidence was recovered, and which continuity remains human-declared or source-supported.

### Rule: Rationale remains traceable

The nearest README supplies standing orientation, `planning/` supplies prospective terrain, and `threadkeeping/` supplies settled rationale and re-entry.

### Rule: Existing work remains intact

Unrelated worktree changes retain their ownership. Overlap becomes visible before editing.

## Operating sequence

1. **Worktree state:** The re-entry pass runs `git status --short --branch` and inspects recent local and remote history. When `snapshot` is named, compare it with its recorded `main` revision and route a difference to the refresh owner before relying on the baseline.
2. **Standing orientation:** The nearest README supplies orientation for the surface in scope.
3. **Prospective and settled context:** The focused planning file and matching threadkeeping ledger supply prospective terrain and settled rationale.
4. **Live collaboration:** The relevant issue or pull request supplies current state, review, and ownership when those conditions matter.
5. **Behavior resolution:** Runnable source or an artifact resolves remaining behavior questions.
6. **Encounter posture:** The account distinguishes first, repeat, and re-entry relations without constructing missing memory.
7. **Re-entry model:** The resulting account states settled, current, open, and next terrain and names any stale record.

## Representative scenarios

### Scenario: Accepted feature branch leads the default branch

- Given an accepted planning branch contains newer direction than the default branch
- When repository state is reconstructed
- Then the feature branch and pull request are named as the current collaboration surface
- And the default-branch difference remains visible without rewriting accepted history

### Scenario: Historical ledger conflicts with runtime behavior

- Given a threadkeeping record describes an earlier behavior
- And current runnable source implements a later behavior
- When the two records are reconciled
- Then current source defines behavior
- And threadkeeping retains rationale until an authorized update clarifies re-entry

## Completion

Re-entry completes when a future collaborator can resume from the named source, live work surface, open decision, and next move without reconstructing the whole history.
