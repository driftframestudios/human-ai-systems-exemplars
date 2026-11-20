# Design-token pipeline and programmatic-styling probes

These probes examine the route from authored visual decisions to accepted
runtime values. Each probe names the authority boundary, mechanism, controlled
fault, observation, and receipt that can change an implementation decision.

Begin with the [design-token pipeline foundation](../../foundations/design-token-pipeline.md).
Use the probe closest to the stage that currently carries risk.

## VF-T1 · Figma source capture and publication

**Question:** Which Figma artifact supplies candidate values, which reviewed
artifact authorizes release, and which actor publishes the accepted variables?

**Exercise:** Capture an immutable local-variables response or UI export. Run
source-map, normalized-name, supported-type, unit, color-space, missing-mode,
and leakage preflights. For a write path, establish one participating writer or
lease, capture the initial remote digest, split a synthetic payload at the 4 MB
boundary, and advance a rolling expected checkpoint after each confirmed or
reconciled request. Compare the current remote graph with that checkpoint before
the next request. Order dependent creates topologically, keep same-request
dependencies together where practical, and apply each response's
`tempIdToRealId` mapping before planning a later dependent batch. Interrupt one
response after the service may have committed it, then read and reconcile the
remote graph. Exercise a `429` with its `Retry-After` value inside a bounded
retry budget.

**Controlled fault:** introduce two names that normalize to the same imported
path, request a type change for an existing variable, omit one mode value, or
place a private description in the candidate snapshot. Add a concurrent remote
edit between the checkpoint read and mutation, an unknown POST outcome after
transmission, a later batch that retains an earlier request's temporary ID, an
incomplete `tempIdToRealId` response mapping, and a writer that bypasses the
declared coordination route.

**Expected observation:** the adapter returns either one sanitized candidate
with complete source mapping or typed rejections for every unmapped construct.
Accepted repository state and the published Figma library each retain their
named authority. The interrupted batch is reconciled before a retry, the
rolling checkpoint advances only after a known outcome, and visible concurrent
drift becomes a conflict. The receipt distinguishes current-state equality from
the lost-update standing supplied by the writer or lease. Dependent batches use
persisted real IDs from an admitted bounded mapping. A route that uses a shared
Figma library publishes after a complete semantic match.

**Receipt:** Figma route and access tier; capture revision and digest; collection
and mode counts; adapter version; admitted and rejected fields; writer or lease;
batch and rolling-checkpoint coordinates; temporary-to-real ID mapping count
and digest; unknown-outcome disposition; observed concurrency window; retry
count and delay; distribution route; publish owner; reconciliation result.

**Instruction yield:** name the exact exchange route, supported subset,
collision policy, publication stage, metadata inspection, and restart
checkpoint before generating a mutation.

## VF-T2 · DTCG compatibility and semantic round trip

**Question:** Which Design Tokens Format Module 2025.10 features does this
pipeline preserve, transform, or reject?

**Exercise:** Validate declared and inherited types, curly-brace aliases, JSON
Pointer `$ref`, `$root`, `$extends`, and namespaced `$extensions`. When the
Resolver profile is in view, validate `sets`, `modifiers`, context defaults,
string-valued inputs, the declared case-comparison policy, and
`resolutionOrder`; apply sources in order with later conflicts replacing earlier
ones; then resolve aliases. For network references, canonically parse the URL
and validate its scheme, host, port, and resolved address class before each
connection and redirect hop. Validate every returned A and AAAA candidate,
connect only to one validated address while preserving the original hostname
for the HTTP `Host` field, TLS SNI, and certificate verification, and repeat
resolution for redirects, retries, and fallback addresses. Exercise egress
controls as defense in depth. Apply the redirect, document, content-type,
compressed-byte, decompressed-byte, and elapsed-time ceilings. Round-trip the
admitted document and compare token identity, meaning, value, mode policy, and
lifecycle. Treat raw property order as incidental serialization detail.

**Controlled fault:** add a reference cycle, malformed or unresolved JSON
Pointer, missing alias, type mismatch, unknown extension that the adapter drops,
unsupported composite value, source above the configured byte or nesting limit,
or a graph whose alias depth, fan-out, or extension budget exceeds the declared
envelope. Add a non-string resolver input, a case-variant input collision under
the declared comparison policy, duplicate inline name, context product
above the variant ceiling, disallowed file path, redirect outside the allowed
host, redirect to a private, loopback, link-local, or metadata address outside
an explicitly owned route, DNS answer that changes address class, content-type
mismatch, decompression expansion above its ceiling, or external response above
its byte or time limit.

**Expected observation:** the compatibility envelope admits known features,
preserves every unrecognized extension losslessly, and returns a typed rejection
before admission when preservation or another required feature is unavailable.
The semantic diff distinguishes value changes from meaning and identity changes.
A resource rejection names the stage, dimension, observed value, configured
limit, and restart point while the accepted pointer remains usable.
Resolver output follows the declared source order, uses `application/json`, and
records every bounded source coordinate and digest. Each network hop passes the
same canonical destination policy and response envelope.

**Receipt:** DTCG report version; compatibility-profile version; token and edge
counts; extension dispositions; graph result; semantic diff; media type;
Resolver profile, string inputs, and case-comparison policy; ordered source
digests; conflict dispositions;
configured fetch and redirect policy; resolved address-class disposition;
content-type and compressed/decompressed byte observations; configured resource
limits; observed maxima; accepted revision.

**Instruction yield:** declare curly-brace and JSON Pointer reference support,
extension preservation, resolver behavior, and semantic-diff expectations
before translating syntax.

## VF-T3 · Style Dictionary build, collision, and recovery

**Question:** Does one exact compiler configuration produce deterministic,
isolated candidates across the declared target matrix while failures preserve
the accepted release?

**Exercise:** Run the pinned Style Dictionary release from a clean checkout.
Create a fresh instance per matrix coordinate, await every build and hook,
format candidates before publication, then compare output bytes and manifests
across two runs. Admit exchange data through JSON or DTCG parsing, then execute
reviewed configuration and hooks inside an OS- or runtime-sandboxed process or
container with bounded filesystem, network, environment, and subprocess
authority. Use a Style Dictionary volume for tool-owned file routing when
useful. Keep its staging-root and path-containment checks as defense in depth.
Normalize and escape one token family for each target grammar, parse or compile
the candidates, and verify every declared output path remains inside the
staging root.

**Controlled fault:** add a broken reference, source collision,
transformed-name collision, reserved object key, empty required output, delayed
asynchronous transform, or interrupted promotion. Add a JavaScript token file,
an action that targets a sibling directory, two names that collide after target
normalization, and metadata containing a comment terminator or string delimiter.

**Expected observation:** warning classes selected as release failures stop the
candidate before promotion. Both clean runs produce byte-identical artifacts.
Executable inputs enter the sandboxed reviewed-code route, the volume stays a
file-routing adapter, output traversal is rejected, and each emitted artifact
parses in its target grammar. An interruption leaves the last accepted pointer
usable.

**Receipt:** Node.js and Style Dictionary versions; lockfile and configuration
digests; instance and hook scope; matrix coordinates; token, transform, file,
and byte counts; elapsed time and peak memory; rejection class; candidate and
accepted output digests; execution isolation and permission policy; destination
containment; target-parser result; identifier-collision result; rollback result.

**Instruction yield:** pin compiler and runtime coordinates, compatibility
fixtures, deterministic output checks, collision gates, and promotion semantics
before writing generated artifacts.

## VF-T4 · React Stately ownership and collection identity

**Question:** Which state belongs to the domain, React Stately, a remote cache,
and render-only presentation?

**Exercise:** Edit a draft, replace the selected entity, reconcile a newer
accepted revision, and restore after interruption. Repeat with collection
items whose order changes while stable IDs remain.

**Controlled fault:** mutate a collection item in place, reuse a positional key,
or let a render-only state replace accepted domain state.

**Expected observation:** stable identities preserve the intended selection.
Immutable updates produce coherent snapshots. Draft, accepted, request,
selection, and recovery state remain with their declared owners.

**Receipt:** React Stately package version; state owner map; collection and item
IDs; accepted and draft revisions; replacement trigger; recovery result.

**Instruction yield:** name durable-state ownership, stable identity, preserved
local intent, and replacement behavior before binding presentation tokens.

## VF-T5 · React Aria behavior with a contract-owned visual language

**Question:** Do generated visual values preserve React Aria's semantic,
interaction, internationalization, and accessibility state across every input
path the component supports?

**Exercise:** Apply contract-owned CSS custom properties to React Aria
Components. Exercise keyboard, pointer, touch, focus, validation, disabled,
pending, RTL, forced-colors, text-resize, and assistive-technology paths. Move
to hooks only when an identified DOM or behavior requirement calls for that
control.

**Controlled fault:** style only a pointer hover, hide state behind color,
disconnect a label, or let generated CSS suppress the browser focus indicator.

**Expected observation:** semantic state remains available through markup and
documented data attributes; every supported input path reaches the same owned
decision; the visual contract preserves a visible non-color distinction and a
programmatic name.

**Receipt:** React Aria package and component-or-hook route; generated artifact
digest; state attributes; input and direction matrix; browser and assistive
technology observations; exception rationale.

**Instruction yield:** name the semantic element, accessible name, interaction
and direction states, forced-colors behavior, and contract-owned style binding
before implementing the component.

## VF-T6 · React Spectrum generation and supported styling boundary

**Question:** Which React Spectrum generation owns the component, and which
documented integration point accepts generated visual values?

**Exercise:** Record v3 or Spectrum 2 and exact package versions. For v3, test
the declared CSS-module theme and scale contract. For Spectrum 2, exercise the
style-macro, cascade-layer, extraction, and supported-override route. Pin the
server-rendering locale and compare server and client output. When generations
mix, place the Spectrum 2 Provider innermost. For a full-page Spectrum 2 app,
exercise the documented `@react-spectrum/s2/style` import with
`{type: 'macro'}`, import `@react-spectrum/s2/page.css`, and observe the root
background and color scheme before JavaScript; retain page-level styling with
the host for an embedded app.

**Controlled fault:** pass an arbitrary token object as a generic Provider
theme, place a global reset above the component layer, split identical atomic
rules across avoidable bundles, or hydrate with a different locale.
For a mixed-generation fixture, reverse the Provider order. For a full-page
fixture, delay JavaScript while omitting the early root stylesheet.

**Expected observation:** the selected package generation accepts only its
documented adapter shape. Server and client agree on locale and initial state.
Global resets retain a lower cascade priority, and the built CSS keeps the
measured duplication budget. The mixed-generation fixture keeps Spectrum 2
innermost, and the full-page fixture presents its root background before script
execution.

**Receipt:** package generation and versions; Provider and styling contract;
theme or macro adapter; locale; cascade order; extraction and minification
configuration; Provider nesting; full-page or embedded ownership; early root
style result; CSS rule and byte counts; hydration result; documented escape
hatch.

**Instruction yield:** name the Spectrum generation, documented integration
API, build route, cascade ownership, and upgrade observation before proposing a
theme or override.

## Complexity and scale probe

Record token definitions visited per Resolver merge `D`, resolved token count
`N`, reference edges `E`, selected Resolver coordinates `Vᵣ`, other
non-platform variant coordinates `Vₒ`, platforms `P`, transforms `T`, files
`F`, output bytes `S`, elapsed time, and peak resident memory. Graph admission
should target `O(N + E)`. Selected Resolver work targets `O(Vᵣ(D + E))` when
ordered merge and alias traversal remain linear. Constant-cost transforms target
`O(TN)` per platform. The complete family targets
`O(Vᵣ(D + E) + VᵣVₒ × Σₚ(TₚN + FₚN + Sₚ))`; the platform coordinate stays in
the sum. A transform that scans the full token set for each token should surface
as quadratic growth and return to an indexed design.

Use `10²`, `10³`, and `10⁴` synthetic token fixtures when a scale decision is
in view. Long-chain and high-fan-out fixtures reveal resolver behavior beyond
the simpler behavior visible in a flat palette. Boundary fixtures exercise each
receiver-owned source, nesting, graph, extension, variant, file, output, time,
and memory ceiling immediately below and above the accepted limit.

## Evidence boundary

These probes define decision-changing observations and receipts. They establish
runtime standing when a named adapter runs against exact package, browser,
operating-system, and assistive-technology versions. Primary documentation
supports the mechanism and current API claim; the receiving system's results
establish local fit.

