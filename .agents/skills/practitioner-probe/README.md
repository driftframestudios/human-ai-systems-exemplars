# Practitioner probe

Turn a vague technical concern into the smallest question and observation that
can change an implementation decision.

## Start here

- Read [`SKILL.md`](SKILL.md) for the authoritative five-part probe anatomy,
  routing rules, scenarios, and completion boundary.
- Return to the [repository skill catalog](../README.md) when the finding needs
  a domain-specific implementation or evidence owner.

## Probe anatomy

1. **Question:** Which consequential behavior or boundary is under review?
2. **Why it matters:** Who bears the effect?
3. **Mechanism:** What browser, cascade, schema, origin, build, data, or
   organizational behavior could produce it?
4. **Observable evidence:** What smallest result distinguishes the possibilities?
5. **Instruction yield:** Which next instruction changes if the finding holds?

## Concrete example

**Situation:** A card crosses a multicolumn boundary in one browser while the
same markup appears contained in another.

**Use:** Ask whether the browser is fragmenting the card, whether an ancestor
changes the fragmentation context, and whether the affected element receives
the intended `break-inside` rule. Compare computed styles and one reduced
rendering in the affected and control engines.

**Observable return:** The finding identifies the responsible fragmentation or
cascade mechanism, the smallest source-owned repair, and the focused cross-engine
observation that can establish containment.

## Working path

Select one to three questions in order of discriminating value. Read the owning
source and one downstream consumer, then stop when the answer changes or bounds
an instruction, implementation route, observation, recovery move, or loop exit.

This skill is self-contained in [`SKILL.md`](SKILL.md); deterministic helpers or
domain references form only after repeated mechanics establish a stable family.
