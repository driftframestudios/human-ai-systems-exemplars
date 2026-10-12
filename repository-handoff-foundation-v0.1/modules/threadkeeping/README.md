# Threadkeeping

This directory preserves settled rationale and exact re-entry in a compact
record a future collaborator can use directly.

GitHub Issues and pull requests retain current work state. Runnable source
retains behavior authority. A threadkeeping record earns its place when a
decision, evidence boundary, recovery coordinate, or cross-cycle relationship
will remain useful after the active conversation ends.

## Record shape

Use one Markdown file per durable return and include:

```markdown
# Record title

## Coordinate
Branch, revision, Issue or pull request, and observation date.

## Settled
The accepted decision or relationship and its owner.

## Evidence
The exact command or source observation and normalized result.

## Establishes
The affirmative state supported by that evidence.

## Coverage boundary
The adjacent claim that still needs another observation or decision.

## Recovery
The last known-good coordinate and safe return route.

## Re-entry
The next receiver and one exact action or observable release event.
```

Keep records concise and link to the live owner; let that surface carry mutable
status. When current source differs from a record, name the difference and let
current source lead behavior.
