# GitHub Issue label projection

## Purpose

Load this reference when a GitHub Issue carries a bounded support packet or receives its return. Labels make the current routing state inexpensive to scan. The Issue body or linked current-packet comment carries the operative packet, and a posted pass, friction, or blocker receipt carries the evidence.

## Composable labels

| Label | Meaning |
| --- | --- |
| `bounded support request` | The Issue carries a finite packet or is the named surface for its direct return. |
| `for codex` | An OpenAI Codex receiving surface is selected or prepared. |
| `for spark` | OpenAI Codex Spark is the narrower selected projection. Pair this with `for codex`. |
| `bounded support: awaiting return` | The packet is ready for its named handback. |
| `bounded support: receipt posted` | A pass, friction, or blocker receipt is present on the named handback surface. |

Use `for codex` by itself when the receiving task can move among Codex models or surfaces. Add `for spark` when its fast, focused iteration posture materially fits the packet. Platform and model labels support discovery; action authority stays in the packet.

## State transition

Apply exactly one bounded-support lifecycle label:

1. apply `bounded support: awaiting return` when the packet fields, action mode, handback surface, and stop condition are ready;
2. replace it with `bounded support: receipt posted` only after the named surface contains a concise pass, friction, or blocker receipt; and
3. return to `bounded support: awaiting return` when a fresh packet requests materially new support.

`bounded support: receipt posted` establishes that a return can be found. Human review, acceptance, follow-on authority, publication, merge, deployment, and Issue closure retain their own decisions. Issue open or closed state can express whether the wider undertaking has settled, so a third lifecycle label adds little routing value.

## Receipt boundary

A lifecycle label answers a scanning question. The receipt records the starting coordinate, observations, changed surfaces when granted, known-good point, remaining strain, and next available packet. If a label and the named handback surface disagree, the handback evidence leads and the label returns to the matching state.
