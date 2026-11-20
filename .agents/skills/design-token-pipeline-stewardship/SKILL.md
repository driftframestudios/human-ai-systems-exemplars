---
name: design-token-pipeline-stewardship
description: Stewards a design-token pipeline from named source authority through a bounded canonical token set, validated alias graph, version-pinned compiler, generated platform artifacts, and receiving UI adapters. Applies when Figma variables, DTCG token data, Style Dictionary configuration, theme packages, or component-library bindings need a reproducible contract, semantic diff, recovery route, or publication receipt.
---

# Design-token pipeline stewardship

## Contract

- **What:** A portable method for carrying visual meaning from an authored source through interchange, validation, compilation, generated artifacts, and receiving interfaces.
- **When:** A team adds or revises a Figma export, DTCG-shaped token package, Style Dictionary build, theme package, brand or mode matrix, or React component-system adapter.
- **Boundaries:** The skill preserves the authority already assigned to design, engineering, accessibility, and release owners. Each tool retains its named authoring, exchange, compilation, or receiving role; the authority map assigns semantic ownership explicitly. Vendor behavior and current version constraints stay conditional and receive a current-source check before implementation.
- **Result:** A reproducible pipeline with named ownership, an explicit canonical subset, deterministic artifacts, reviewable semantic changes, a recoverable accepted state, and a concise receipt.

## Fit and attention

- **Useful when:** Several tools represent the same color, typography, spacing, state, density, brand, or component meaning and collaborators need to know which representation governs each decision.
- **Poor fit when:** One local style value changes inside an already governed component and the existing build, review, and accessibility checks fully cover the change.
- **Smallest useful dose:** Name the source authority, canonical token subset, compiler coordinate, one receiving adapter, and one artifact-and-diff check.
- **Foregrounds:** Meaning ownership, alias integrity, reproducible generation, state semantics, accessibility behavior, semantic change, and recovery.
- **May under-attend:** A token pipeline can preserve declared values while layout, language, content density, interaction behavior, and browser rendering still need their own observations.
- **Interactions:** `source-authority-mapping` clarifies ownership and projection roles. `schema-contract-authoring` governs a versioned exchange schema when one is created. `stateful-artifact-behavior-contracts` supplies focused runtime checks. `practitioner-probe` turns an uncertain tool boundary into a decision-changing observation.
- **Rest or release when:** One accepted pipeline state can be reproduced from its declared source and compiler inputs, each receiver can identify its adapter and authority boundary, and the next semantic change has a clear review route.

## Inputs, defaults, and output

Minimum useful inputs are:

- the design concepts and receiving platforms in scope;
- the semantic owner and authored source for each concept family;
- the canonical interchange shape and supported token types;
- the receiving route's source, graph, extension, target, output, time, and
  memory ceilings;
- the compiler package, version, runtime, configuration, and extensions;
- the generated artifact paths and receiving adapters; and
- the accepted comparison coordinate or artifact digests.

When ownership remains unsettled, preserve the candidate sources and return the missing decision to the named owner. When a tool supports only part of the canonical format, declare the supported subset and route unsupported values through a named adapter or separately governed source.

The primary output is a compact pipeline contract plus generated artifacts, semantic diff, validation results, and recovery coordinate. Source tokens and configuration remain authored inputs; generated files identify their generator and regeneration command through the repository's established convention.

## Rules

### Rule: Meaning authority precedes tool choice

Name who defines each token's meaning, who can revise it, and which source carries the accepted value before selecting an export or compiler route. Figma, a token repository, a schema, and a generated package can each hold distinct authority roles.

### Rule: The canonical subset is explicit

Declare the DTCG or project-specific token types, curly-brace aliases, JSON Pointer `$ref`, extensions, naming rules, mode behavior, and compatibility direction that the pipeline accepts. Lossless preservation of unrecognized extension data is an admission requirement; every other result returns a typed rejection. Validate that bounded subset at intake. A format label alone leaves type coverage and extension behavior unspecified.

### Rule: Resolver behavior has its own versioned profile

When the Design Tokens Resolver Module enters the route, version its profile separately from the token-format profile. Declare admitted sets, modifiers, context defaults, resolution order, ordered conflict behavior, string-valued inputs, and the input-name and value case-comparison policy. The report recommends case-insensitive comparison while permitting an implementation to document another policy. Token-format documents retain `application/design-tokens+json`; resolver documents use `application/json`. Apply a ceiling to the product of modifier contexts before materialization. Local, file, and network references each receive an explicit policy. The base route accepts local-document references. For each network hop, canonically parse the URL; validate scheme, host, port, and resolved address class; and apply the redirect ceiling. Admit globally reachable destinations through the normal public-network profile. Name each owned private, loopback, link-local, or metadata route as an explicit exception. Bound content type, compressed and decompressed bytes, elapsed time, document count, digests, and cache ownership. Resolve filesystem references beneath canonical admitted roots.
Validate every returned A and AAAA candidate, connect only to one validated
address, and preserve the original hostname for the HTTP `Host` field, TLS SNI,
and certificate verification. Redirects, retries, and fallback addresses repeat
resolution and validation. Network egress controls provide defense in depth.

### Rule: Resource limits precede graph and artifact expansion

Declare source-byte, nesting-depth, token, reference, extension, alias-depth,
fan-out, resolver-document, modifier-context, resolution-count,
target-coordinate, file-count, generated-byte, concurrency, elapsed-time, and
peak-memory limits for the receiving route. Preflight inexpensive structural
limits before graph construction, enforce graph limits during indexed traversal,
and enforce target and output limits before materialization. A limit returns a
typed result with stage, dimension, observed value, configured limit, and restart
point. Receipts record the configured envelope and observed maxima.

### Rule: Multi-request mutation advances a rolling checkpoint

Establish one participating writer or a lease honored by participating writers
before a Figma mutation spans requests. Capture the initial remote semantic
coordinate, then advance a rolling expected checkpoint after every confirmed or
reconciled batch. Compare the current graph with that checkpoint before the next
batch and return visible drift as a conflict. Request-scoped atomicity gives the
application a synchronization boundary rather than a cross-request compare-and-
swap. Record the coordination assumption and lost-update standing separately
from final-state equality. Publish a shared library only when that distribution
route is part of the receiver.

Temporary Figma IDs belong to one request. Build a dependency graph for creates,
partition batches in topological order, and keep same-request references local
to their batch. Admit each response's `tempIdToRealId` mapping, persist its
bounded count and digest beside the rolling checkpoint, and substitute real IDs
before a later dependent batch. A missing, duplicate, or unexpected mapping
entry returns a typed reconciliation failure before another mutation.

### Rule: Layers keep distinct jobs

- **Primitive tokens** carry material values such as a color channel, duration, dimension, font family, or numeric scale step.
- **Semantic or alias tokens** name purpose, such as `color.action.primary.background` or `space.content.compact`.
- **Component and state bindings** connect semantic tokens with a receiving component, interaction state, density, or exceptional local need.

Trace a receiving value back through these layers. Record an override as an owned state or component decision, while the semantic layer keeps its shared meaning.

### Rule: The alias graph is validated before compilation

Resolve token identity, type compatibility, and references as a graph. Detect cycles, unresolved references, duplicate canonical names, and cross-mode gaps before a compiler writes receiving artifacts. Keep stable identifiers separate from display labels so a presentation rename leaves consumer addresses intact.

### Rule: The compiler coordinate is part of the artifact

Pin the compiler package, runtime, configuration, transforms, formats, filters, and extension versions. Generate from a clean declared input set and compare repeated output. Custom transforms state their accepted type and returned unit; platform order and asynchronous behavior remain explicit where the compiler supports them.

### Rule: Exchange data and executable compiler inputs take separate routes

Admit caller-supplied tokens through bounded JSON or DTCG parsing. Treat JavaScript or TypeScript configuration and token modules, custom parsers, preprocessors, transforms, filters, formats, and actions as reviewed executable code. Run that code from a lockfile-verified dependency graph inside an OS- or runtime-sandboxed process or container with bounded filesystem, network, environment, and subprocess authority. A bounded Style Dictionary volume may route tool-owned file operations inside the sandbox; arbitrary project code retains native Node.js capability unless the sandbox constrains it. Name the staging root, output destinations, and cleanup owner. Resolve every declared candidate and action path and require containment inside the staging root as defense in depth before granting write authority.

### Rule: Every generated target receives its own grammar check

Normalize identifiers with a target-specific policy, detect collisions after normalization, escape values for the receiving grammar, and keep generated metadata comments bounded and non-executable. Parse, compile, or lint each CSS, JavaScript, TypeScript, XML, or native artifact before digest and promotion. Record the grammar tool and version alongside the artifact digest.

### Rule: Generated artifacts receive one-way ownership

The authored source and compiler configuration produce the platform artifacts. Collaborators revise those inputs and regenerate the artifacts. A generated file carries enough provenance for a cold collaborator to locate the generator, while the receiving application uses it as a stable dependency and routes revisions back to the authored inputs.

### Rule: Runtime adapters preserve framework boundaries

State ownership, interaction and accessibility behavior, and themed presentation remain separately identifiable. A React Stately state model, React Aria behavior hook or component, React Spectrum component, and custom visual contract can compose while each retains its own API and review boundary. A token object enters a provider or theme only through the API supported by that installed framework version.

### Rule: Modes and brands form named dimensions

Model brand, color scheme, density, locale-sensitive typography, platform, and interaction state as explicit dimensions with supported combinations. Declare fallback and default selection behavior. Measure a fully expanded artifact family against the number of brands, modes, platforms, and tokens before making every combination concrete.

### Rule: Semantic diffs lead review

Classify a change by meaning and receiving effect before presenting raw generated-file churn. Alias-target changes, type changes, removed identifiers, default-mode changes, state remapping, and component override changes receive named review. Primitive value adjustments retain their affected semantic and component paths in the diff.

### Rule: Recovery preserves the accepted carrier

Generate candidate artifacts in an isolated location, validate them, and promote the complete accepted set through an atomic or repository-equivalent transition. Keep the last accepted artifacts and their source coordinate available until the candidate passes its receiving checks. A failed generation returns the stage, token path, tool coordinate, and smallest restart point.

### Rule: Receipts establish a bounded claim

A receipt records source and configuration digests, format and optional Resolver profiles, per-hop fetch disposition, compiler and runtime coordinates, reviewed-code and lockfile digests, configured resource limits, observed maxima, token and alias counts, execution isolation, destination containment, target-grammar results, Figma batch and temporary-to-real mapping coordinates when applicable, artifact digests, semantic-change summary, receiving checks, and recovery coordinate. The receipt establishes only the pipeline stages and receivers it exercised.

## Operating sequence

1. **Frame the receiving decision.** Name the concept families, platforms, modes, brands, components, and release boundary in scope.
2. **Map authority.** Assign semantic, authored-source, schema, compiler, receiving, accessibility, and release authority where those roles differ.
3. **Declare intake.** Define the canonical token subset, optional Resolver profile, identifiers, types, aliases, extensions, dimensions, resource envelope, and unsupported-value route.
4. **Validate the graph.** Preflight bytes, depth, and counts; parse once; index token identifiers; enforce graph limits; check types and references; detect cycles; and report bounded diagnostics with source paths.
5. **Resolve bounded variants.** Validate string-valued Resolver inputs and the declared case policy, apply the per-hop destination and response envelope to admitted sources, apply ordered sources, resolve aliases, and compare the resolution count with the declared ceiling.
6. **Compile deterministically.** Run reviewed executable inputs and the pinned toolchain inside the isolated candidate boundary and compare a repeated build when reproducibility matters.
7. **Validate target grammars.** Normalize names, reject collisions, escape values, and parse or compile every emitted artifact before digesting it.
8. **Bind receivers.** Connect generated artifacts through each platform's supported adapter while keeping state, accessibility behavior, and visual presentation ownership legible.
9. **Review meaning.** Summarize semantic and compatibility changes before generated-file volume, then run the smallest source, artifact, runtime, accessibility, and visual checks fitted to the change.
10. **Promote or recover.** Move the complete accepted artifact set into service, or keep the accepted coordinate active and return an exact restart point. Reconcile a remote semantic graph before retrying a Figma write whose outcome remains unknown.
11. **Write the receipt.** Record what the checks establish, their coverage boundary, the recovery coordinate, and the next named receiver.

## Representative scenarios

### Scenario: A design mode becomes a web theme

- Given a design team owns semantic color meaning in an accepted variable collection
- And engineering owns a canonical DTCG-shaped subset and pinned compiler configuration
- When a new mode is exported, validated, compiled, and bound through the supported web-theme adapter
- Then the semantic diff identifies the changed aliases and affected components
- And the receipt connects the source coordinate with generated artifact digests and receiving checks

### Scenario: A provider API differs from an assumed token merge

- Given a receiving component library expects a version-specific theme or provider contract
- When a generic token object lacks that required shape
- Then the adapter follows the installed library's documented API
- And the canonical tokens remain available while a fitted adapter carries them through the provider's supported contract

### Scenario: An alias cycle reaches candidate generation

- Given two semantic tokens resolve through a circular reference
- When graph validation runs before artifact promotion
- Then the candidate stays isolated
- And the error names the complete reference path and source locations
- And the last accepted artifacts provide the recovery state while the source owner repairs the graph

### Scenario: A Figma response ends before the caller knows the outcome

- Given one reviewed change spans several request-sized batches
- And one participating writer or lease owns the synchronization route
- And the caller recorded the initial remote semantic digest before the first batch
- And dependent creates follow topological order with a bounded temporary-to-real ID mapping
- When a response ends after a batch may have committed
- Then the caller reads and reconciles the remote variables before another write
- And the rolling expected checkpoint advances from the reconciled state
- And every later dependent batch uses admitted real IDs from the persisted mapping
- And a shared library publishes when distribution is in scope, every batch has a known outcome, and the final semantic graph matches the reviewed candidate

## Conditional context

The skill loads [references/tool-and-runtime-boundaries.md](references/tool-and-runtime-boundaries.md) when Figma import or REST behavior, Style Dictionary configuration, Adobe React framework composition, complexity estimation, or a detailed receipt shape affects the current decision. Confirm current vendor documentation and installed versions before applying those conditional details.

## Completion

The pipeline is ready for its current receiver when a cold collaborator can identify the semantic owner, canonical subset, graph checks, compiler coordinate, generated artifacts, adapter boundaries, semantic change, receiving evidence, and recovery coordinate in one route. A changed tool version, token type, source-authority decision, platform adapter, or material receiving failure reopens the contract.
