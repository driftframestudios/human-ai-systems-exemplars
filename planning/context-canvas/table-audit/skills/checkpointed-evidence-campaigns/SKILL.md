---
name: checkpointed-evidence-campaigns
description: Preserves completed source-bound observations across interruptions and selects the dependent cases for resumption. Applies to multi-page audits, browser campaigns, research trials, and other bounded sequences whose partial results have continuing value.
---

# Checkpointed evidence campaigns

## Contract

- **What:** A resumable observation sequence with case-level evidence and explicit invalidation.
- **When:** Several independently useful observations share a harness or environment and interruption or later repair is plausible.
- **Boundaries:** The source owner defines acceptance; user authority defines execution; the verification-window experiment guides timing. A checkpoint establishes a completed observation of named inputs. Changed inputs reopen that claim.
- **Result:** Completed cases remain reusable, incomplete cases resume directly, and the final receiver can distinguish observed, reused, review-required and outstanding coverage.

## Standing

Draft for the table-repair campaign, with natural use under Issues #319 and #320.
The draft supplies instructions before its first resumable run; promotion follows
the receiving behavior and independent review.

## Rules

1. Before execution, give each case a stable identity, dependency fingerprint, acceptance boundary and local evidence destination. Run a small positive/negative harness fixture first.
2. Complete each case's required observations and artifacts before atomically publishing its checkpoint. Keep attempt summaries separate from cumulative case evidence. An interrupted final write leaves its case pending.
3. On resume, reuse completed observations only while source dependencies, parameters, the harness and its executable helper closure, required artifacts and relevant environment agree. A changed owner reopens its dependent observations.
4. Preserve failures as evidence. The overall verdict includes every required dimension and confirms the expected content population. Application findings, harness defects and environmental interruptions receive distinct classifications and repair owners.
5. Support selecting a family or an exact case. A local failure retains unrelated completed evidence; a changed shared dependency selects the affected family.
6. Count browser launches, campaigns, page cases, resumed cases and harness retries separately. Counterfactual savings remain named policy comparisons until comparable observations exist.
7. Exercise the checkpoint before depending on it: interrupt or bound a run, resume it, and demonstrate that unchanged completed cases are reused and changed inputs are rerun.
8. After the campaign, return the smallest normalized result and remaining coverage. Raw logs and browser state stay local. Keep a new reusable instruction only when it changes the next receiving decision.

## Example

Given three completed source-bound cases and one interrupted case, when an
unchanged campaign resumes, then the three observations are reused and the
interrupted case runs. When a shared observer changes, its dependent cases run
under the new observation definition while their prior records retain history.

## Completion

The intended cases have an observed result or an explicit pending receiver,
resumption is demonstrated, and another broad run would need a changed input or
named uncertainty. Return to the prototype repair that supplied the evidence.
