# Fault, oracle, and evidence worksheet

Use this worksheet when the receiving behavior admits several plausible faults
or observation layers. Complete only the rows that change the test design.

| Question | Working answer |
| --- | --- |
| Which actor or system owns the behavior? | |
| What correct state or transition should the receiver observe? | |
| What material consequence follows when the behavior drifts? | |
| Which plausible faulty implementation could still pass a weak check? | |
| What independent source supplies the expected result? | |
| What is the smallest substantive case population? | |
| Which layer can observe the distinction: source, unit, adapter, integration, workflow, browser, live receiver? | |
| Which environment dimensions can change the answer? | |
| Which accepted state or resource must survive failure? | |
| Which pass, failure, skip, blocked, incomplete, cancellation, and reuse standings matter? | |
| What does the selected observation establish? | |
| Which adjacent claim retains another owner? | |

## Layer selection

| Material question | Fitting first observation | Expansion event |
| --- | --- | --- |
| Does a pure transformation preserve the declared mapping? | Literal unit fixture with an independent expected value | Shared serialization, runtime, or state ownership changes |
| Does a parser admit the correct source while preserving authored bytes? | Parser fixture plus exact source identity | Projection, generator, or publication ownership changes |
| Does an adapter preserve identity and state across an owned boundary? | Integration test with source- and receiver-owned assertions | Another independent owner or live protocol joins the route |
| Does a workflow select, verify, and recover its environment correctly? | Static workflow contract plus executable parser or helper fixture | Hosted runner behavior or external service standing changes the answer |
| Can a person reach, operate, and understand the rendered state? | Focused real-browser journey | Shared style, engine-sensitive behavior, or release acceptance broadens scope |
| Does an external receiver deliver the accepted result? | Explicitly authorized live observation | New route, region, account, or policy boundary enters scope |

## Evidence return

Lead with the affirmative signal:

> The selected check exercised **[population]** at **[source/runtime/environment]**
> and observed **[result]**. This establishes **[behavior claim]** within
> **[scope]**. **[Adjacent claim]** remains with **[named receiver or next
> observation]**.

Keep raw logs, credentials, signed routes, browser profiles, and other
access-controlled material with their existing owners. Preserve the smallest
sanitized detail that lets another collaborator reproduce or interpret the
result.
