# Figma token pipelines, DTCG, Style Dictionary, and Adobe UI layers

**Observed:** 2026-10-20  
**Decision:** add a vendor-neutral pipeline foundation, six practitioner probes,
and a portable stewardship skill to the Visual Fidelity Contracts hub. Prepare a
separate versioned runnable exemplar for the public Gist Registry. Hold a live
Figma synchronization implementation until a receiving system names its source
authority, access tier, supported token subset, and publication owner.

## Why this matters

The repository already distinguishes primitive values, semantic aliases, and
component or state bindings. A design-token pipeline can carry those distinctions
into generated software. Each adapter also needs controls that preserve meaning,
remove source metadata, and produce an artifact the receiving framework can use.
The pipeline therefore needs authority, compatibility, recovery, and runtime
observations alongside formatting.

## Five implementation shapes considered

| Shape | Value | Cost and risk | Disposition |
| --- | --- | --- | --- |
| Documentation-only note | Fast orientation | Leaves compiler and framework failures implicit | Use only as an introduction |
| Foundation + layered probes | Connects source, compiler, runtime, recovery, and evidence | Requires careful current-version research | **Implement in this hub** |
| Root repository Style Dictionary dependency and fixture | Produces immediate executable evidence | Expands this already broad PR and couples the root toolchain to one sample | Hold until a receiving sample needs root execution |
| Versioned Gist Registry exemplar | Gives teams a runnable, independently versioned sample with accepted/rejected fixtures | Needs its own package, release, and security review | **Prepare as the next receiver** |
| Live Figma REST synchronization | Exercises capture and write recovery against the real service | Requires Enterprise access, secrets, remote authority, publication ownership, and private-data controls | Hold for a named deployment |

The synthesis takes the second route now, prepares the fourth, and lets a later
receiving need choose between the third and fifth.

## Evidence reconciliation

The draft mixed durable architecture with assumptions whose scope changes by
package, product route, and release. The implementation posture below gives a
future collaborator the affirmative boundary to carry forward.

| Decision area | Evidence-backed implementation posture |
| --- | --- |
| Adobe licensing | Record the Apache-2.0 standing of the named React Spectrum repository and packages, plus NOTICE, transitive dependencies, assets, fonts, and trademark considerations for the release in view. |
| Style Dictionary provenance and adoption | Describe Style Dictionary as an Apache-2.0 transformation system created at Amazon and maintained by the Style Dictionary organization. Ground adoption statements in named observations. |
| Style Dictionary coordinate | Use `5.7.0` for this observation date. The release uses ESM and requires Node.js 22 or newer. |
| Custom transform API | Version 5 uses `filter` and `transform`; hook order and asynchronous completion belong in the build receipt. |
| Typography representation | Figma Variables carry typed values per mode. Figma text styles and DTCG typography tokens are separate composite constructs, joined through an owned adapter. |
| Figma and DTCG exchange | Figma provides native UI import/export for a supported subset. Its REST model remains Figma-specific and enters DTCG through an explicit adapter. |
| DTCG publication standing | DTCG 2025.10 is a stable Community Group Final Report intended for implementation and sits outside the W3C Standards Track. |
| DTCG Resolver | Treat the Resolver Module as a separate optional profile. Token documents use `application/design-tokens+json`; resolver documents use `application/json` and declare sets, modifiers, inputs and defaults, source order, and output coordinates. |
| DTCG compiler coverage | Publish a tested compatibility envelope for the pinned Style Dictionary release and the exact DTCG features the pipeline admits. |
| Compiler trust | Admit exchanged JSON or DTCG as bounded data. Treat JavaScript or TypeScript configuration and token modules plus custom hooks and actions as reviewed executable code with contained filesystem, environment, network, and dependency authority. |
| Generated-code safety | Apply target-specific identifier normalization and escaping, detect collisions after normalization, and parse or lint each generated artifact before promotion. |
| Adobe receiving adapters | React Spectrum v3 and Spectrum 2 use generation-specific integration contracts. React Aria plus contract-owned CSS is the direct route for a distinct visual language. |
| Generated-artifact ownership | Route repairs through reviewed source tokens or a named extension layer, then regenerate and verify the target family. |

## Operational findings

### Figma

- UI DTCG import and JSON mode export support a documented type and unit subset.
- The Variables REST API requires an Enterprise organization and explicit
  scopes. Requests are atomic within one 4 MB body.
- Collections support finite variable and mode counts. When shared-library
  distribution belongs to the receiving contract, an explicit publication
  action follows accepted writes.
- One request is one atomic operation. A multi-request synchronization acquires
  one participating writer or lease and begins with a remote checkpoint. Before
  each batch, the adapter compares the remote graph with its rolling expected
  checkpoint. Each confirmed or reconciled batch advances that checkpoint. An
  interrupted POST remains an unknown outcome until a read reconciles the
  remote graph. A `429` continuation follows `Retry-After` inside a bounded
  retry budget. Final semantic equality establishes target-state agreement;
  the receipt records lost-update standing separately. A concurrent change
  pauses mutation, releases or renews the lease through its named policy, and
  starts a fresh plan from the newly admitted graph. Shared-library publication
  follows complete reconciliation when distribution is in scope.
- Temporary IDs are request-scoped. Dependent creates follow topological order;
  each confirmed response contributes an admitted `tempIdToRealId` mapping whose
  bounded count and digest travel with the rolling checkpoint. Later batches
  substitute real IDs. Missing, duplicate, or unexpected mapping entries return
  a typed reconciliation failure before another mutation.
- Type migration creates a successor variable. Normalized-name collisions,
  unsupported units or color spaces, missing mode values, and private source
  metadata deserve preflight before admission.

### DTCG

- The compatibility profile declares admitted types and resolver behavior.
- A graph check catches missing references, type mismatch, alias and extension
  cycles, and reserved object keys in `O(N + E)` target time.
- Unknown namespaced extensions survive a lossless round trip. Preservation is
  an admission requirement; every other result returns a typed rejection. Curly-brace
  aliases and required JSON Pointer `$ref` behavior both enter the compatibility
  profile. Groups provide organization; declared token data carries meaning.
- The receiver declares source-byte, nesting, graph, extension, alias-depth,
  fan-out, target, file, generated-byte, time, and memory ceilings. Preflight
  applies before graph or output expansion, and receipts record the limits and
  observed maxima.
- An optional Resolver 2025.10 profile declares `sets`, `modifiers`, context
  defaults and inputs, and `resolutionOrder`. Ordered conflicts use the later
  source; alias resolution follows ordering. Resolver JSON uses
  `application/json`, while token documents use
  `application/design-tokens+json`.
- Resolver input values are strings. The receiver declares its comparison
  policy; the specification recommends case-insensitive comparison and allows
  an implementation to document another policy.
- For modifier-context counts `Cᵢ`, the complete resolution family is
  `R = ∏Cᵢ`. Admission compares `R` with the materialization ceiling first.
  Same-document references form the base profile. File or network references
  add canonical URL parsing; per-hop scheme, host, port, and resolved-address
  validation; validation of every A and AAAA candidate; connection only to one
  validated address while the original hostname remains available for HTTP
  `Host`, TLS SNI, and certificate verification; repeated resolution for
  redirects, retries, and fallback addresses; defense-in-depth egress controls;
  a redirect ceiling; globally reachable public destinations or
  explicitly owned private routes; content-type, compressed-byte,
  decompressed-byte, document, and time limits; digests; and bounded cache
  ownership. File references resolve beneath canonical admitted roots.

### Style Dictionary

- Exact version and lockfile pinning make the compiler coordinate reviewable.
- Instance-scoped hooks reduce build and test coupling.
- Warnings selected as release failures include broken references, collisions,
  missing required output, and unsupported compatibility features.
- Candidate formatting and validation precede publication. A small accepted
  pointer gives interruption and rollback one stable owner.
- The build wrapper owns the multi-dimensional theme manifest and materializes
  the named consumer combinations the release requires.
- JavaScript ESM and supported TypeScript configuration or token files, custom
  parsers, preprocessors, transforms, formats, filters, and actions run as code.
  A reviewed build uses a verified lockfile and a sandboxed process or container
  with bounded filesystem, network, environment, and subprocess authority. An
  isolated staging root or mounted volume provides file routing and portability
  inside that sandbox. Destination-path validation remains a defense-in-depth
  control for every generated write.
- Target formatters normalize and escape for their receiving grammar. Generated
  metadata stays bounded and non-executable. A parser, compiler, or linter
  validates each artifact before its digest enters the accepted manifest.

### React Stately, React Aria, and React Spectrum

- React Stately owns reusable state; the domain retains accepted business state
  and authority.
- React Aria owns behavior, accessibility, interaction, and internationalization.
  React Aria Components plus generated contract CSS fit a distinct visual system.
- React Spectrum v3 consumes a version-specific CSS-module theme shape.
- Spectrum 2 uses current Adobe styling, build-time macros, cascade layers, and
  bounded override points. Locale, extraction, minification, and package
  generation belong in its adapter receipt.
- A mixed-generation tree places the Spectrum 2 Provider innermost. The custom
  styling route records the `@react-spectrum/s2/style` macro import and chosen
  bundler configuration. A full-page application imports
  `@react-spectrum/s2/page.css` for root styling before JavaScript while the
  Provider continues to own application setup and font loading.

## Complexity boundary

For admitted source bytes `B`, tokens `N`, graph edges `E`, mode assignments
`W`, definitions visited per Resolver context `D`, materialized Resolver
coordinates `Vᵣ`, other non-platform variant coordinates `Vₒ`, platforms `P`,
transforms `Tₚ`, files `Fₚ`, and output bytes `Sₚ`:

- parsing and admission target `O(B + N + W + E)`;
- graph construction and cycle detection target `O(N + E)`;
- Resolver evaluation across selected contexts targets `O(Vᵣ(D + E))`;
- normalized-name collision detection is expected `O(N)` with a map;
- constant-cost transforms target `O(TₚN)` for each emitted platform and
  variant coordinate;
- formatting that scans every token for each file targets `O(FₚN + Sₚ)` for
  each emitted platform and variant coordinate; and
- the combined upper-bound model is
  `O(B + N + W + E + Vᵣ(D + E) + VᵣVₒ × Σₚ(TₚN + FₚN + Sₚ))`.

For Resolver modifier-context counts `Cᵢ`, `R = ∏Cᵢ` describes every declared
context. A release may materialize `Vᵣ ≤ R`. `Vₒ` counts other declared axes,
such as density or motion preference, while `P` counts target platforms exactly
once. Source bytes `B` include the root and each fetched document admitted by
the fetch profile.

This reference-architecture model frames measurement; each hook still needs its
own performance evidence. A transform that repeatedly scans the full dictionary for each token
creates quadratic work. Representative fixtures and measured peak memory decide
the useful concurrency bound. The declared resource envelope converts the
growth model into finite admission and generation limits for caller-supplied
data.

## Research and implementation handoff

The executable hub now receives the durable foundation and probes. A Gist
Registry successor should package one standalone DTCG-to-Style-Dictionary
example with accepted and rejected fixtures, deterministic outputs, semantic
diffs, source and output digests, Resolver ordering and fetch-policy fixtures,
executable-config containment, target-grammar injection checks, and
interrupted-publication recovery. A later
live Figma adapter should begin from a sanitized immutable capture and return a
typed candidate or complete rejection set. It should also exercise concurrent
edits, one-writer or lease ownership, rolling expected checkpoints, unknown
POST outcomes, bounded `Retry-After` handling, final semantic reconciliation,
temporary-to-real ID handoff across dependency-ordered batches, separate
lost-update standing, and library publication when shared distribution belongs
to the receiving contract. Resolver fixtures should exercise per-hop
destination validation, redirect ceilings, content-type checks, and decompressed
byte limits.

## Primary sources

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [OWASP server-side request-forgery prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [DTCG technical-report standing](https://www.designtokens.org/technical-reports/)
- [Figma Variables REST API](https://developers.figma.com/docs/rest-api/variables/)
- [Figma Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Figma REST API rate limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma variable modes and DTCG import/export](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Style Dictionary configuration](https://styledictionary.com/reference/config/)
- [Style Dictionary transforms](https://styledictionary.com/reference/hooks/transforms/)
- [Style Dictionary API](https://styledictionary.com/reference/api/)
- [Style Dictionary logging](https://styledictionary.com/reference/logging/)
- [Style Dictionary parsers](https://styledictionary.com/reference/hooks/parsers/)
- [Style Dictionary preprocessors](https://styledictionary.com/reference/hooks/preprocessors/)
- [Style Dictionary actions](https://styledictionary.com/reference/hooks/actions/)
- [Style Dictionary releases](https://github.com/style-dictionary/style-dictionary/releases)
- [Style Dictionary v5.7.0 release](https://github.com/style-dictionary/style-dictionary/releases/tag/v5.7.0)
- [Style Dictionary v5.7.0 package manifest](https://raw.githubusercontent.com/style-dictionary/style-dictionary/v5.7.0/package.json)
- [Style Dictionary license](https://github.com/style-dictionary/style-dictionary/blob/main/LICENSE)
- [React Spectrum architecture](https://github.com/adobe/react-spectrum/blob/main/rfcs/2019-v3-architecture.md)
- [React Spectrum license](https://github.com/adobe/react-spectrum/blob/main/LICENSE)
- [React Aria](https://react-spectrum.adobe.com/react-aria/)
- [React Spectrum v3 theming](https://react-spectrum.adobe.com/v3/theming.html)
- [Spectrum 2 styling](https://react-spectrum.adobe.com/styling)
- [Adobe Spectrum token tiers](https://opensource.adobe.com/spectrum-design-data/articles/understanding-spectrum-tokens/)

