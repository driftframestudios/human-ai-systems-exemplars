# Design-token pipeline stewardship

Carry visual meaning from its accepted source into reproducible platform
artifacts and receiving interfaces. This skill makes ownership, token layers,
aliases, compiler behavior, framework adapters, semantic changes, and recovery
easy to inspect together.

## Start here

- [Read the authoritative skill contract](SKILL.md)
- [Open the conditional tool and runtime reference](references/tool-and-runtime-boundaries.md) when Figma, Style Dictionary, or Adobe React libraries enter the implementation
- [Return to the repository skills catalog](../README.md)

## Why this is materially useful

A design-token pipeline coordinates decisions across design files, exchanged
data, build tooling, generated code, and live components. The same cobalt value
can appear in every tool while its meaning, state behavior, or source authority
drifts. This method keeps the semantic path visible:

```text
meaning owner
    -> authored source
    -> canonical token subset
    -> validated alias graph
    -> pinned compiler
    -> generated platform artifact
    -> supported UI adapter
    -> receiving observation and receipt
```

The path helps design and engineering review the intended change directly,
with generated-file volume held as supporting detail. It also gives release owners a known
accepted state when candidate generation or a receiving adapter fails.

## Use it when

Use the skill when work crosses at least two of these boundaries:

- Figma variables, modes, styles, or JSON exchange;
- DTCG-shaped or project-specific canonical token data;
- Style Dictionary transforms, filters, formats, or platform builds;
- generated CSS custom properties, JavaScript, TypeScript, native resources,
  or theme packages;
- React Stately state, React Aria interaction and accessibility behavior,
  React Spectrum components, or custom presentation; and
- brand, density, color-scheme, platform, component-state, or release variants.

One local value change inside an established contract can follow that contract's
existing edit and verification route.

## Getting started

1. Name the visual concept and the person or group who owns its meaning.
2. Identify the accepted authored source and the canonical exchanged form.
3. List the token types, alias rules, modes, brands, extensions, and optional
   Resolver profile the pipeline supports.
4. Separate admitted token data from reviewed executable configuration and
   hooks. Record the compiler package, version, runtime, lockfile, isolation,
   transforms, formats, and contained generated destinations.
5. Trace one representative token from primitive value through semantic alias
   and component or state binding into a live receiver.
6. Generate into an isolated candidate location, validate each receiving
   grammar, inspect the semantic diff, and run the smallest checks that exercise
   the affected receivers.
7. Record artifact digests and the prior accepted coordinate before promotion.

## Concrete example

| Part | Example |
| --- | --- |
| Situation | A `focus-ring` alias changes in one Figma mode and feeds web components through Style Dictionary. React Aria owns focus behavior, while a custom visual contract owns the ring's presentation. |
| Use | Export the supported token subset, validate alias type and cycle integrity, compile with the pinned toolchain, and bind the CSS variables through the receiving component styles. |
| Observable return | The semantic diff names the focus-ring alias and affected components, keyboard and forced-color checks exercise the behavior, generated artifact digests identify the candidate, and the previous accepted package remains available for recovery. |

## What the skill returns

- a source-and-authority map for the token families in scope;
- a declared canonical subset with type, alias, mode, and extension behavior;
- a separately versioned Resolver profile when sets, modifiers, or ordered
  context generation enter the route;
- a validated alias graph and version-pinned compiler coordinate;
- a reviewed-code OS/runtime sandbox, contained staging root, and
  target-grammar result;
- generated artifacts connected to supported platform adapters;
- a semantic diff that leads with meaning and receiving effect;
- proportionate runtime, accessibility, and visual observations; and
- a bounded receipt with artifact digests and a recovery coordinate.

## First exercise and publication standing

This initial skill version is being exercised against a visual-contract hub and
its programmatic styling guidance. It remains a public repository candidate
while another independent pipeline use tests its
cross-tool transfer and the complete package receives a publication review
with a fresh-source recheck of the conditional vendor reference.
