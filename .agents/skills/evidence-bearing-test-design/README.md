# Evidence-bearing test design

Create a test that can answer one consequential question and explain why its
answer is trustworthy. This skill connects the intended behavior, a plausible
fault, an independent expected result, and the smallest observation that can
tell them apart.

## Start here

- [Read the authoritative skill contract](SKILL.md).
- [Use the fault, oracle, and evidence worksheet](references/fault-oracle-evidence-worksheet.md) when several test layers or fault paths appear plausible.
- [Return to the repository skills catalog](../README.md).

## Use it when

Use this skill when a new assertion needs an oracle, a passing check may be
vacuous, a failure path needs retained-state evidence, or a browser or workflow
claim needs the observation layer that can actually establish it.

## What it returns

- one owned behavior and receiving consequence;
- one plausible faulty alternative;
- one independently grounded expectation;
- the smallest fitting source, unit, integration, workflow, or browser check;
- actual pass, failure, skip, blocked, incomplete, cancelled, or reuse standing; and
- a concise statement of what remains for another receiver.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | A CI lane restores FFmpeg packages from a cache and finishes much faster than an earlier run. |
| Use | Test the cache identity and direct-install fallback as workflow behavior, then run the complete media and browser suite under every cache standing. |
| Observable return | The workflow proof establishes how dependency bytes are selected and recovered. The unchanged media suite establishes application behavior. The timing receipt describes cost; the owned behavior checks establish correctness. |

## Working route

1. State the behavior and consequence.
2. Name a plausible fault that would matter.
3. Derive the expected result independently.
4. Select the smallest layer that can expose the fault.
5. Require a substantive case population.
6. Run or specify the observation and return its exact standing.

## Boundaries

The source owner defines intended behavior. Suite composition selects groups of
checks. Domain, security, accessibility, publication, and live-service owners
retain their acceptance decisions. This skill makes one behavior claim
discriminating and interpretable.
