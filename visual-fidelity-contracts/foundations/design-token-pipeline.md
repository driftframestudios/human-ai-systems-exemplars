# Design-token pipelines and programmatic styling

A token pipeline carries reviewed visual meaning into software that can render,
test, and release it. The useful unit is the complete route from authored
candidate through accepted contract, generated artifact, receiving component,
and recovery. A JSON export is one intermediate representation in that route.

## The working architecture

```text
Figma Variables, styles, or another authoring source
  → immutable source snapshot and leakage inspection
  → source-specific adapter
  → reviewed DTCG compatibility subset
  → graph, type, collision, and semantic-diff checks
  → version-pinned Style Dictionary build
  → candidate CSS / JavaScript / native artifacts
  → receiving adapter for React Aria, React Stately, React Spectrum, or another UI
  → browser, accessibility, and release observations
  → accepted manifest and recoverable publication pointer
```

Each arrow is an owned translation. A tool can occupy more than one stage, but
the receipt still names the distinct responsibility at each boundary.

| Stage | Authority and work | Useful receipt |
| --- | --- | --- |
| Authoring source | Produces candidate values, aliases, modes, styles, and descriptions | source kind, source revision, capture time, source digest |
| Admission adapter | Maps one source model into the admitted interchange subset | adapter version, source map, typed rejections, redaction result |
| Reviewed token contract | Authorizes token identity and meaning for the release | DTCG profile, semantic diff, approver, accepted revision |
| Compiler | Resolves admitted references and formats target artifacts | runtime, compiler version, configuration digest, target matrix |
| Generated candidate | Carries derived runtime values | filenames, media types, output digests, coverage result |
| Receiving adapter | Connects generated values to component behavior and styling | package generation, exact versions, supported integration point |
| Publication | Promotes a verified candidate while retaining the previous accepted output | accepted pointer, rollback coordinate, release observation |

## Keep the three token roles distinct

This hub uses three roles as an architectural policy:

1. **Primitives** hold material values such as a color, duration, or dimension.
2. **Semantic tokens** name the intended use, such as `text.status.attention` or
   `space.field.inline`.
3. **Component and state tokens** bind a semantic decision to a local part or
   state when the distinction merits a name beyond the shared semantic vocabulary.

Semantic tokens are the normal component-facing route. A component may need a
local token when it introduces a real decision. Existing meanings continue to
use their shared semantic token. The accepted contract records aliases, modes,
densities, state combinations, deprecation, and migration alongside the value.

The [Industrial Ink](../contracts/industrial-ink/README.md) and [Soft Color
Blocking](../contracts/soft-color-blocking/README.md) contracts already separate
material values from purpose and local binding. A pipeline preserves that
separation in data and tests.

## Treat Figma as a named adapter boundary

Figma Variables expose collections, modes, identifiers, aliases, scopes,
descriptions, code syntax, and typed values. That representation is useful
source material and differs from DTCG JSON. Record the chosen authority model:
Figma may own candidate authoring, a reviewed repository contract may authorize
release, and generated artifacts may carry runtime values.

Current Figma routes have different operating envelopes:

- the product UI can import DTCG JSON and export variable modes as JSON;
- the Variables REST API requires an Enterprise organization and explicit
  read or write scopes;
- a REST write is atomic within one request and has a 4 MB body limit; a route
  that distributes variables through a shared library adds a separate
  library-publication step;
- temporary IDs exist only inside one request, and the response returns
  `tempIdToRealId` mappings for newly created objects;
- variable type is fixed at creation, so type migration creates a successor and
  repoints aliases or bindings;
- name normalization and supported-type differences need a collision and loss
  preflight before an import or export is accepted.

A write larger than one request becomes a synchronization protocol. Establish
one participating writer or a lease honored by every participating writer.
Capture the remote coordinate before the first batch, then advance a rolling
expected checkpoint after each confirmed or reconciled batch. Before the next
batch, compare the current remote graph with that rolling checkpoint and return
a conflict when they differ. Figma's documented atomicity ends at one request;
the application-level writer or lease supplies cross-request coordination, and
the receipt records that coordination assumption.

Partition dependent creates in topological order. A batch may use temporary IDs
for dependencies created inside that same request. Before a later batch, admit
the response's `tempIdToRealId` mapping, replace every cross-batch temporary
reference with its real ID, persist the bounded mapping beside the rolling
checkpoint, and then plan the next request. A missing, duplicate, or unexpected
mapping entry returns a typed reconciliation failure before another mutation.

A timeout or dropped connection leaves the write outcome unknown, so the
caller reads the remote variables and reconciles the intended semantic changes
before it advances the checkpoint or retries. A `429` response follows the
service's `Retry-After` value inside a bounded retry budget. A final semantic
match establishes the current remote state; the coordination receipt carries
the separate lost-update standing. When shared-library distribution is in
scope, publication begins after all batches have a known outcome and the final
remote graph matches the reviewed candidate.

Capture an immutable response before adaptation. Keep access tokens, private
descriptions, file keys, proprietary extension data, and stable external IDs
inside their authorized boundary. A public adapter fixture uses synthetic
identities and records which fields were removed or mapped.

## Publish an explicit DTCG compatibility envelope

The Design Tokens Format Module 2025.10 is a stable Community Group Final
Report intended for implementation. It is outside the W3C Standards Track. A
pipeline therefore names the exact types, curly-brace aliases, JSON Pointer
`$ref`, `$root`, `$extends`, and `$extensions` behavior it admits and scopes
its compatibility claim to that documented envelope.

Admission should establish that:

- every token has a declared or inherited type;
- aliases, JSON Pointer `$ref`, and group extension references resolve within
  the admitted graph;
- cycles, missing references, incompatible types, and reserved object keys
  become typed rejections;
- unknown namespaced extensions survive a lossless round trip; preservation is
  an admission requirement, and every other result returns a typed rejection;
- groups organize tokens while token meaning comes from the accepted contract;
- normalized target names remain unique; and
- a semantic diff reports changed identity, meaning, value, alias, mode, and
  lifecycle separately.

Use the media type `application/design-tokens+json` for a delivered DTCG token
document when the carrier supports media-type configuration.

### Add the Resolver Module as a separate compatibility profile

The Design Tokens Resolver Module 2025.10 defines an optional resolver document
alongside the token-format document. A resolver profile names the admitted
`sets`, `modifiers`, modifier `contexts` and defaults, and `resolutionOrder`.
It also preserves the specified merge order: later sources replace earlier
conflicts, then aliases resolve after the ordered token structure is complete.
Resolver input values are strings. The profile also declares how it compares
input names and values: the report recommends case-insensitive matching, while
an implementation may choose another documented policy.

Keep the two carriers distinct. Token-format documents use
`application/design-tokens+json`; resolver documents use `application/json`
and conventionally end in `.resolver.json`. Record the resolver report version,
input context, defaults applied, ordered source digests, conflicts replaced,
resolved output digest, and final token count in the receipt.

The number of complete resolver outputs equals the product of the selected
modifier-context counts when every combination is materialized. Apply the
variant ceiling before expanding that product. Local-document references may
enter the base profile. File or network references need an explicit fetch
profile. Canonically parse each URL, validate the scheme, host, port, and
resolved address class before connecting, and repeat those checks at every
redirect hop inside a redirect ceiling. Validate every returned A and AAAA
candidate, connect only to one validated address, and preserve the original
hostname for the HTTP `Host` field, TLS SNI, and certificate verification.
Redirects, retries, and fallback addresses repeat resolution and validation.
Network egress controls provide defense in depth. The normal public-network profile
admits globally reachable destinations; a receiver that owns a private,
loopback, link-local, or metadata route names that destination explicitly.
Bound compressed and decompressed bytes, content type, elapsed time, document
count, content digest, and cache ownership. Filesystem references resolve under
admitted roots after canonicalization. A pipeline begins with local-document
resolution and opens each broader source boundary through a receiving-system
decision.

## Bound intake before graph expansion

A token document is caller-supplied structured data. The receiving route sets a
resource envelope before it parses the complete graph, retains extension data,
or materializes a target matrix. Name the limits that fit the receiver and its
operating budget:

- source bytes and JSON nesting depth;
- token, mode assignment, alias-reference, and extension counts;
- total extension bytes, alias-chain depth, and reference fan-out;
- brand, mode, density, locale, and platform combinations;
- resolver sets, modifiers, contexts, referenced documents, and resolution
  combinations;
- generated file count, bytes per file, total candidate bytes, concurrency,
  elapsed time, and peak memory.

Preflight source bytes, structural depth, and inexpensive counts before graph
construction. Apply graph limits while building indexed adjacency data, then
apply target and byte budgets before candidate materialization. A limit returns
a typed `RESOURCE_ENVELOPE_EXCEEDED` result with the stage, dimension, observed
value, configured limit, and smallest restart point. Diagnostics carry bounded
paths and counts rather than source values or private extension payloads.

The envelope belongs to the receiving route, so this foundation supplies fields
instead of universal numbers. Representative fixtures should reach each limit,
exercise a value immediately below and above it, and confirm that the accepted
publication pointer stays usable. Record configured limits and observed maxima
in the release receipt. This keeps lossless extension handling, high-fan-out
aliases, and multi-axis generation within an inspectable memory and time budget.

## Compile candidates before publication

Style Dictionary is an Apache-2.0 token transformation system created at
Amazon and maintained by Style Dictionary contributors. Older material may
call it Amazon Style Dictionary or AWS Style Dictionary; receipts use the
current project and package name. A reviewed pipeline pins an exact release and
lockfile. As of the review date for this document, the current release is
`5.7.0`, uses ECMAScript modules, and requires Node.js 22 or newer.

Style Dictionary 5 custom transforms use `filter` and `transform`. Build and
format methods return promises, and asynchronous transforms run in declared
order. Instance-scoped hooks keep tests and concurrent builds isolated. Prefer
the built-in selective composite expansion before introducing a custom
transform.

Treat the compiler coordinate as reviewed executable code. Style Dictionary can
load JavaScript ESM and, on supported runtimes, TypeScript configuration and
token files. Parsers, preprocessors, transforms, formats, filters, and actions
can run project code; actions can copy or remove files and launch other build
work. Admit an untrusted exchange document through the bounded JSON or DTCG
parser first. Run reviewed configuration and hooks from a lockfile-verified
dependency graph inside an OS- or runtime-sandboxed process or container with
bounded filesystem, network, environment, and subprocess authority. A bounded
Style Dictionary filesystem volume may route tool-owned file operations inside
that sandbox; arbitrary project code can call native Node.js capabilities, so
the volume alone is a portability adapter rather than an isolation boundary.
Use a named staging root and resolve every declared output and action path
inside it as defense in depth before a hook receives write authority.

A production compiler route should:

1. parse and validate the admitted source;
2. distinguish enumerated base-to-source overrides from accidental collisions;
3. stop on broken references, source collisions, transformed-name collisions,
   empty required outputs, and unsupported compatibility features;
4. build a sorted, finite brand × mode × density × platform matrix;
5. format candidates in memory when possible;
6. normalize identifiers for each target grammar, detect post-normalization
   collisions, escape values for the target syntax, and keep metadata comments
   bounded and non-executable;
7. parse or compile and lint the generated CSS, JavaScript, TypeScript, XML, or
   native artifact before calculating its candidate digest;
8. write each candidate to an immutable or uniquely staged coordinate; and
9. promote one small manifest or pointer after every target passes.

The pipeline replaces generated output from reviewed source tokens. A repair
enters through the admitted source or an explicit extension layer, regenerates
the target family, and receives the same semantic and browser observations.

## Choose the Adobe integration by generation and intent

React Stately, React Aria, React Spectrum v3, and Spectrum 2 carry different
jobs:

| Layer | Primary job | Token-pipeline decision |
| --- | --- | --- |
| React Stately | Presentation-independent React state hooks and models | Keep accepted, draft, selection, request, and recovery ownership explicit and use stable identities with immutable updates. |
| React Aria Components and hooks | Accessible behavior, interaction, internationalization, and semantic state exposure | Apply contract-owned CSS and generated custom properties when a distinct visual language is required; descend from components to hooks for a named DOM or behavior need. |
| React Spectrum v3 | Adobe Spectrum-styled components with a v3 theme and scale contract | Treat its CSS-module theme shape (`global`, color schemes, and scales) as a version-specific adapter. |
| Spectrum 2 | Current Adobe Spectrum components with build-time style macros and bounded override points | Use Spectrum styling when that is the product intent; keep resets in a lower cascade layer and consolidate generated CSS where the build permits. |

A supported Spectrum theme starts with the documented contract for its selected
package generation. The adapter names the exact package versions,
Provider contract, server-rendering locale, cascade layers, CSS extraction,
and permitted extension points before integration.

When Spectrum 2 and another Spectrum generation share an application, place the
Spectrum 2 Provider innermost. Record the selected macro and bundler
configuration, including the documented
`@react-spectrum/s2/style` import with `{type: 'macro'}` when custom Spectrum
styling enters the build. A full-page Spectrum 2 application imports
`@react-spectrum/s2/page.css` so the
document background and color scheme exist before JavaScript loads; an embedded
application keeps that page-level ownership with its host.

## Cost model

Let `B` be source bytes, `D` token definitions visited by one ordered Resolver
merge, `N` admitted tokens in one resolved result, `E` alias and group-reference
edges, `W` Figma mode-value assignments, `Vᵣ` selected Resolver-context
coordinates, `Vₒ` materialized non-platform variant coordinates outside the
Resolver profile, `P` target platforms, `Tₚ` transforms for platform `p`, `Fₚ`
files for that platform, and `Sₚ` emitted bytes for one coordinate.

For a Resolver profile with modifier-context counts `Cᵢ`, the declared complete
resolution count is `R = ∏Cᵢ`. The receiving route may select a bounded subset
`Vᵣ ≤ R`. Brand, density, locale, or other axes outside that profile form
`Vₒ`; the platform coordinate remains separate. Use `Vᵣ = 1` when the Resolver
profile is inactive and `Vₒ = 1` when every non-platform axis lives in the
Resolver. `B` includes the root document and every fetched document admitted by
the reference policy.

| Stage | Target time | Working space |
| --- | ---: | ---: |
| Bounded preflight, parse, and admission | `O(B + N + W + E)` | `O(B + N + W + E)` within the configured envelope |
| Graph construction and cycle detection | `O(N + E)` | `O(N + E)` |
| Ordered Resolver merge and alias traversal | `O(Vᵣ(D + E))` | `O(N + E)` when selected results stream sequentially, plus retained outputs |
| Normalized-name collision check | expected `O(N)` with a map; `O(N log N)` with sorted comparison | `O(N)` |
| Constant-cost ordered transforms for platform `p` | `O(TₚN)` | `O(N)` plus resolved representation |
| Format files for platform `p` | `O(FₚN + Sₚ)` when each formatter scans all tokens | `O(Sₚ)` for buffered candidates |
| Digest source and outputs | `O(B + VᵣVₒ × ΣₚSₚ)` | `O(1)` beyond I/O buffers |

The complete matrix scales with the named combinations actually materialized:
approximately `O(Vᵣ(D + E) + VᵣVₒ × Σₚ(TₚN + FₚN + Sₚ))`. A custom transform
that scans the complete dictionary for each token changes a linear lookup stage
into quadratic work; build an index once. Bounded concurrency follows measured
peak memory and unique output ownership. Sequential variant builds remain the
safe starting point.

The asymptotic model describes growth inside the admitted envelope. The source
byte, nesting, graph, extension, variant, file, and output ceilings provide the
finite operating bound that turns those expressions into a runnable service
contract.

These expressions describe the reference architecture. A pinned compiler,
custom hook, formatter, filesystem, and workload still receive measured
observations at representative `10²`, `10³`, and `10⁴` token fixtures when
scale affects a release decision.

## Recovery and release receipt

A failed adapter or compiler run leaves the last accepted publication pointer
in place. A multi-request Figma write records its writer or lease, rolling
expected checkpoint, completed batch coordinates, and bounded temporary-to-real
ID mapping, then reconciles the
remote semantic graph after an unknown outcome and before every retry or
publication step. Candidate output
directories remain distinct from accepted output until promotion.

Record at least:

- source kind, sanitized source digest, authority decision, and any remote
  writer or lease standing;
- Figma batch coordinates, rolling checkpoint, and temporary-to-real ID mapping
  count and digest when mutation spans requests;
- adapter version, DTCG format profile, and optional Resolver profile;
- resolver input contexts, ordered source digests, conflict dispositions, and
  resolved-output digest;
- Node.js, Style Dictionary, and receiving-package versions;
- reviewed-code, lockfile, configuration, source, and generated-artifact
  digests;
- compiler isolation, filesystem root, network policy, and output-containment
  result;
- target matrix, selected Resolver contexts, other variant coordinates, and
  selected composite expansion;
- configured resource limits and observed maxima for source, graph, extension,
  target, output, time, and memory dimensions;
- warnings promoted to errors and every typed rejection class;
- semantic diff and generated coverage result;
- target-grammar parse or compile result, escaped metadata policy, and
  normalized-identifier collision result;
- browser, keyboard, pointer, touch, RTL, forced-colors, text-resize, and
  assistive-technology observations fitted to the receiving components;
- package license, NOTICE, transitive dependency, font, asset, and trademark
  review; and
- accepted pointer, rollback coordinate, and named publication owner.

Use the [design-token pipeline probes](../probes/design-token-pipelines/README.md)
to turn a plausible concern at any stage into a repeatable observation.

## Completion and re-entry

The route is complete for one receiver when the accepted semantic contract can
reproduce its generated artifacts from named source and compiler coordinates,
the receiving adapter passes its fitted behavior and accessibility checks, and
the release owner can identify both the active manifest and recovery
coordinate. A changed authoring API, DTCG feature, compiler version, target
matrix, framework generation, or publication boundary reopens the relevant
adapter and probe.

## Current primary references

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [Figma Variables REST API](https://developers.figma.com/docs/rest-api/variables/)
- [Figma Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Figma variable modes and DTCG import/export](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Style Dictionary configuration](https://styledictionary.com/reference/config/)
- [Style Dictionary transforms](https://styledictionary.com/reference/hooks/transforms/)
- [Style Dictionary v5 migration](https://styledictionary.com/versions/v5/migration/)
- [Style Dictionary v5.7.0 release](https://github.com/style-dictionary/style-dictionary/releases/tag/v5.7.0)
- [Style Dictionary v5.7.0 package manifest](https://raw.githubusercontent.com/style-dictionary/style-dictionary/v5.7.0/package.json)
- [Style Dictionary license](https://github.com/style-dictionary/style-dictionary/blob/main/LICENSE)
- [React Spectrum architecture](https://github.com/adobe/react-spectrum/blob/main/rfcs/2019-v3-architecture.md)
- [React Spectrum license](https://github.com/adobe/react-spectrum/blob/main/LICENSE)
- [React Aria](https://react-spectrum.adobe.com/react-aria/)
- [React Spectrum v3 theming](https://react-spectrum.adobe.com/v3/theming.html)
- [Spectrum 2 styling](https://react-spectrum.adobe.com/styling)
- [Adobe Spectrum token tiers](https://opensource.adobe.com/spectrum-design-data/articles/understanding-spectrum-tokens/)

