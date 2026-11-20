# Tool and runtime boundaries

Load this reference when a design-token pipeline uses Figma, Style Dictionary,
React Stately, React Aria, or React Spectrum, or when compiler cost and receipt
detail affect an implementation decision. Confirm installed versions and the
current official documentation before applying a vendor-specific mechanism.

## Keep the roles distinct

| Layer | Primary job | Review question |
| --- | --- | --- |
| Semantic owner | Defines what a token means and when that meaning changes | Who can approve a changed purpose, state, or fallback? |
| Figma variables and styles | Provide a design authoring and exchange environment | Which variable collections, styles, modes, aliases, scopes, and code syntax carry accepted meaning? |
| Canonical token package | Carries the bounded exchange contract | Which DTCG types, project extensions, aliases, and dimensions can every intended receiver interpret? |
| Style Dictionary | Compiles source tokens into platform artifacts | Which pinned transforms, filters, formats, and platform configurations produced this artifact? |
| React Stately | Owns reusable state models | Which controlled or uncontrolled state, collection identity, selection model, and transition semantics belong here? |
| React Aria | Owns interaction and accessibility behavior | Which keyboard, pointer, focus, labeling, locale, and assistive-technology behaviors does this layer supply? |
| React Spectrum | Supplies Adobe's themed component implementation | Which Spectrum generation, provider, theme, styling, and bundler contract does the installed package support? |
| Custom visual contract | Owns local presentation meaning and fidelity | Which semantic tokens and component states express the intended art direction? |

These roles can compose. Composition gives each owner an explicit adapter and
review route, and the authority map keeps decisions with their named owners.

## Figma source and exchange boundary

Figma exposes two related routes whose data contracts remain distinct:

1. **UI import and export** can exchange supported variables through JSON,
   including a supported subset of the Design Tokens Community Group format.
   Supported token types, unit constraints, mode selection, name normalization,
   and collision behavior shape the usable subset.
2. **Variables REST endpoints** expose Figma-native collections, modes,
   variables, resolved types, aliases, scopes, and values. Access level, file
   plan, authorization scopes, payload limits, collection limits, local versus
   published variables, and publish timing remain operational inputs. REST
   payloads require an explicit adapter before they become a canonical DTCG
   package.

Styles still carry visual concepts that require composite representation beyond
one variable, including some gradients, shadows, and text styles. Assign those
concepts a named source and adapter so their relationships remain intact across
exchange.

One Variables POST is atomic within its request body and has a 4 MB ceiling.
Temporary identifiers also belong to that one request. A larger synchronization
therefore has independently committed batches. Establish one participating
writer or a lease honored by participating writers. Capture the initial remote
semantic coordinate, then advance a rolling expected checkpoint after every
confirmed or reconciled batch. Compare the current graph with that checkpoint
before the next batch and return visible drift as a conflict.

Create dependencies form a graph. Partition them in topological order, keep
temporary references inside the request that creates them where practical, and
admit the returned `tempIdToRealId` mapping before a later batch uses a created
object. Persist a bounded mapping count and digest beside the rolling checkpoint,
then substitute real IDs in every cross-batch reference. Missing, duplicate, and
unexpected mapping entries become typed reconciliation failures.

The endpoint documentation defines atomicity at one request; the application
supplies cross-request coordination rather than relying on a documented
compare-and-swap. A read-before-write check still has a concurrency window, so
the receipt records the writer or lease assumption and keeps lost-update
standing separate from final-state equality. When a timeout leaves a POST
outcome unknown, read the remote variables and reconcile the semantic graph
before another write. For `429`, honor `Retry-After` inside a bounded retry and
elapsed-time budget. A route that distributes through a shared library publishes
after all batches and the final remote graph match the reviewed candidate.

Useful official sources:

- [Figma Variables REST API](https://developers.figma.com/docs/rest-api/variables/)
- [Figma Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Figma Variables types](https://developers.figma.com/docs/rest-api/variables-types/)
- [Figma REST API rate limits](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma modes and variable JSON import/export](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Figma variables guide](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)

### Intake questions

- Does the source use variables, styles, or both?
- Which modes and collections enter this release?
- Which identifiers remain stable when a display name changes?
- Which aliases cross collections or libraries?
- Which values need an adapter because their required fidelity exceeds the
  selected interchange subset?
- Does the REST route distribute through a shared library and therefore need a
  later publication step before another file can consume the updated variables?
- Which writer or lease, rolling checkpoint, conflict result, ambiguous-outcome
  reconciliation, retry budget, and publication gate govern a multi-request
  write?

## DTCG canonical subset

The DTCG format is a stable Community Group Report published outside the W3C
Standards Track. A project can use it as an interchange contract while naming
the exact report version, token types, resolver behavior, and extensions that
its toolchain supports.

An intake validator should establish:

- explicit or inherited `$type` compatibility;
- one stable canonical token identity per path;
- valid references and an acyclic alias graph;
- lossless preservation for unrecognized extension namespaces as an admission
  requirement, with typed rejection for every other result;
- curly-brace alias and JSON Pointer `$ref` compatibility behavior;
- supported units and color spaces; and
- complete values for each required mode or a declared fallback.

Useful official source:

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)

### Optional Resolver profile

The Design Tokens Resolver Module 2025.10 is a separate document contract. A
profile states which `sets`, `modifiers`, modifier contexts and defaults, and
`resolutionOrder` behavior the route accepts. Resolver input values are strings,
and the profile declares the input-name and value comparison policy. The report
recommends case-insensitive matching while allowing an implementation to
document another policy. Sources combine in declared order and the later
occurrence supplies the value for a conflict. Alias resolution follows ordering.
Resolver documents conventionally end in `.resolver.json` and use
`application/json`; token-format documents use
`application/design-tokens+json`.

Materializing every modifier combination produces the product of the modifier
context counts. Calculate that product and compare it with the variant ceiling
before resolution. Record resolver version, supplied inputs, defaults, ordered
source coordinates and digests, replaced conflicts, resolved token count, and
output digest.

Local-document `$ref` values can stay inside the base resolver profile. File and
network references add a fetch profile. Canonically parse every URL, validate
scheme, host, port, and resolved address class before connecting, and repeat the
same validation at every redirect hop inside a redirect ceiling. The public
profile admits globally reachable destinations. Validate every returned A and
AAAA candidate, connect only to one validated address, and preserve the original
hostname for the HTTP `Host` field, TLS SNI, and certificate verification.
Redirects, retries, and fallback addresses repeat resolution and validation;
egress controls provide defense in depth. Private, loopback, link-local,
and metadata routes enter only as explicitly owned destinations. Bound content
type, compressed and decompressed bytes, elapsed time, document count, digest
verification, and cache ownership. Resolve file references beneath canonical
admitted roots. The default profile confines resolution to the loaded document;
a receiving system opens each broader boundary through an owned decision.

Useful official source:

- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [OWASP server-side request-forgery prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

### Resource-envelope fields

Treat imported token documents and extension payloads as caller-supplied data.
Set receiver-owned ceilings for source bytes, JSON depth, tokens, mode values,
references, extension entries and bytes, alias depth, fan-out, target
coordinates, generated files and bytes, concurrency, elapsed time, and peak
memory. Check inexpensive structural limits before allocating the complete graph
or retaining arbitrary extension payloads. Check target and byte budgets before
materializing the cross-product.

Use a typed result such as `RESOURCE_ENVELOPE_EXCEEDED` with `stage`,
`dimension`, `observed`, `limit`, and `restart_from`. Bound diagnostic path
length and include counts or digests in place of source values. Exercise each
configured edge with below-limit and above-limit fixtures; keep the previous
accepted pointer active during every rejected candidate.

## Style Dictionary compiler boundary

Use **Style Dictionary** as the current project and package name. Historical
origin can provide provenance, while the installed package coordinate and
official project documentation identify the compiler used by the build.

Current major versions use an ECMAScript-module toolchain and `filter` and
`transform` hooks. Transforms can be asynchronous and execute in configured
order. Formats, filters, parsers, preprocessors, transforms, and actions can
change artifact semantics, so pin them with the compiler and runtime. Confirm
current DTCG type coverage: compiler support can arrive incrementally across
structured color, dimensions, gradients, durations, and reference resolution.

Configuration and source routes have different trust standing. JSON, JSONC,
and JSON5 can enter as parsed data. JavaScript ESM and supported TypeScript
configuration or token files execute through the selected runtime. Custom
parsers, preprocessors, transforms, filters, formats, and actions are project
code. Actions can copy files, run other build work, and define cleanup behavior;
the CLI also supports cleaning generated files. Review executable inputs and
their dependency graph before the build receives filesystem, environment, or
network authority.

Use a fresh Style Dictionary instance inside an OS- or runtime-sandboxed process
or container rooted at one candidate directory. Bound filesystem, network,
environment, and subprocess authority at that boundary. A Style Dictionary
volume may redirect tool-owned file operations inside the sandbox; imported
configuration, hooks, and actions remain arbitrary Node.js code and can call
native capabilities directly. Resolve declared configuration, source, include,
build, destination, action, and cleanup paths before execution and require each
writable path to remain inside that root as defense in depth. Pin and verify the
lockfile, pass only named environment values, and retain the previous accepted
carrier while candidate code executes.

For each platform:

- select only the token families the receiver owns;
- order transforms deliberately;
- state unit conversion and color-space behavior;
- preserve or resolve references according to the receiving format;
- generate declarations before references when the target language requires it;
- write into an isolated candidate path; and
- compare repeated output when byte stability matters.

Target data becomes code when a formatter emits it. Normalize identifiers per
target grammar, detect collisions after normalization, escape string and value
contexts, and encode source-derived comments so a bounded description or
`codeSyntax` value remains inert within its comment or declaration. Parse,
compile, or lint generated CSS, JavaScript, TypeScript, XML, and native artifacts before their digests enter
the promotion manifest.

Useful official sources:

- [Style Dictionary configuration](https://styledictionary.com/reference/config/)
- [Transforms](https://styledictionary.com/reference/hooks/transforms/)
- [Formats](https://styledictionary.com/reference/hooks/formats/)
- [Filters](https://styledictionary.com/reference/hooks/filters/)
- [Parsers](https://styledictionary.com/reference/hooks/parsers/)
- [Preprocessors](https://styledictionary.com/reference/hooks/preprocessors/)
- [Actions](https://styledictionary.com/reference/hooks/actions/)
- [Style Dictionary API and filesystem volume option](https://styledictionary.com/reference/api/)
- [DTCG utilities](https://styledictionary.com/reference/utils/dtcg/)
- [Style Dictionary v5.7.0 release](https://github.com/style-dictionary/style-dictionary/releases/tag/v5.7.0)
- [Style Dictionary v5.7.0 package manifest](https://raw.githubusercontent.com/style-dictionary/style-dictionary/v5.7.0/package.json)
- [Style Dictionary license](https://github.com/style-dictionary/style-dictionary/blob/main/LICENSE)
- [DTCG 2025.10 support tracker](https://github.com/style-dictionary/style-dictionary/issues/1590)

## Adobe React framework boundaries

The Adobe React Spectrum repository separates state, behavior, and themed
presentation into layers:

- **React Stately** supplies state hooks and models. Review controlled and
  uncontrolled ownership, stable item keys, collection immutability, selection
  state, and transitions independently from visual tokens.
- **React Aria** supplies accessible interaction and behavior through hooks and
  components. State attributes can expose a styling inlet, while keyboard,
  pointer, focus, labeling, locale, and assistive-technology behavior remain
  part of the Aria contract.
- **React Spectrum** supplies Adobe-themed components. Spectrum v3 and Spectrum
  2 have distinct packages, provider contracts, styling systems, bundler needs,
  and composition guidance. Follow the installed generation's documented theme
  API. A generic token-map spread into a provider becomes valid only when that
  provider explicitly accepts the resulting shape.

A custom visual fidelity contract can use React Stately and React Aria while
owning presentation directly. A team can also adopt React Spectrum components
and keep local semantic tokens at the documented theme or styling boundary.
Mixing component generations receives an explicit provider-order, style-reset,
server-rendering, and bundle observation.

When Spectrum 2 shares an application with another Spectrum generation, Adobe's
guide places the Spectrum 2 Provider innermost. A full-page Spectrum 2
application imports `@react-spectrum/s2/page.css` so root background and color
scheme styling exists before JavaScript loads; the Provider remains part of the
application setup and font loading. An embedded Spectrum 2 region leaves page
styling with its host. Record the documented `@react-spectrum/s2/style` import
with `{type: 'macro'}`, the exact bundler configuration,
CSS extraction, minification, and shared-bundle strategy for the chosen
framework route.

Useful official sources:

- [React Spectrum repository and layered architecture](https://github.com/adobe/react-spectrum)
- [React Spectrum architecture RFC](https://github.com/adobe/react-spectrum/blob/main/rfcs/2019-v3-architecture.md)
- [React Aria](https://react-spectrum.adobe.com/react-aria/)
- [React Spectrum 2 getting started](https://react-spectrum.adobe.com/getting-started)
- [React Spectrum v3 Provider](https://react-spectrum.adobe.com/v3/Provider.html)
- [React Spectrum v3 theming](https://react-spectrum.adobe.com/v3/theming.html)
- [React Spectrum collections](https://react-spectrum.adobe.com/collections.html)

## Complexity model

Use these expressions as reference-architecture estimates. Measure the selected
vendor and project hooks before setting performance budgets.

Let:

- `q` = source bytes admitted by the route;
- `n` = token count;
- `e` = alias-reference count;
- `p` = generated platforms;
- `t` = configured transforms per platform;
- `f` = files whose formatter scans the token collection per platform;
- `d` = token definitions visited by one ordered Resolver merge;
- `vᵣ` = selected Resolver-context coordinates;
- `vₒ` = materialized non-platform variant coordinates outside the Resolver;
  and
- `z` = total generated output bytes.

| Stage | Time | Working memory | Material influence |
| --- | --- | --- | --- |
| Bounded preflight, parse, and index | `O(q + n)` | `O(q + n)` within the configured envelope | Source bytes, nesting depth, file count, parser behavior, and duplicate checks |
| Alias validation and cycle detection | `O(n + e)` | `O(n + e)` | Reference density and diagnostic path retention |
| Selected Resolver contexts | `O(vᵣ(d + e))` | `O(n + e)` with sequential streaming, plus retained outputs | Ordered-source size, alias edges, and selected context count |
| Per-platform transform and format | Approximately `O(p(tn + fn) + z)` when each transform is constant-cost and each file formatter scans all tokens | `O(n + e)` plus candidate buffers | Custom hooks and sorting can dominate |
| Fully expanded variant family | Up to `O(vᵣvₒ * p * (tn + fn) + z)` after Resolver work | Depends on streaming versus retained variants | `p` remains separate from Resolver and other non-platform coordinates |
| Digest and compare | `O(z)` | `O(1)` streaming or `O(z)` buffered | Diff strategy and artifact count |

A custom transform that sorts all tokens costs at least `O(n log n)` for that
stage. A transform that repeatedly scans the complete token set can approach
`O(n^2)`. Index once, traverse references as a graph, and measure the actual
build when scale or release latency changes a decision.

Asymptotic expressions describe growth. The declared source, graph, extension,
matrix, file, byte, time, and memory ceilings supply the finite runtime bound.

## Semantic diff shape

Lead with changes a receiving team can act on:

```yaml
semantic_diff:
  source_coordinate: <accepted source revision or digest>
  candidate_coordinate: <candidate revision or digest>
  added_tokens: []
  removed_tokens: []
  renamed_display_labels: []
  changed_types: []
  changed_alias_targets: []
  changed_primitive_values: []
  changed_mode_defaults: []
  changed_component_or_state_bindings: []
  affected_receivers: []
  required_reviews: []
```

A display-label change can retain canonical identity. A canonical-path change
is a compatibility event for every consumer that addresses the old path.

## Receipt shape

```yaml
design_token_pipeline_receipt:
  source_authority: <role or governed source>
  source_coordinate: <revision or digest>
  canonical_contract: <format, version, and supported subset>
  canonical_digest: <digest>
  compiler:
    package: <name>
    version: <exact version>
    runtime: <runtime coordinate>
    configuration_digest: <digest>
  graph:
    token_count: <count>
    alias_count: <count>
    validation: <result>
  resolver:
    profile: <version and admitted behavior, when used>
    inputs_and_defaults: <selected modifier contexts>
    ordered_source_digests: []
    conflict_dispositions: []
    resolved_digest: <digest>
    fetch_policy: <canonical URL, per-hop destination, redirect, content type, decompressed-byte, time, digest, and cache rules>
  figma_mutation:
    writer_or_lease: <coordination standing, when used>
    rolling_checkpoint: <latest reconciled semantic coordinate>
    batch_coordinates: []
    temporary_to_real_mapping: <bounded count and digest>
  execution_boundary:
    reviewed_code_digest: <configuration and hook digest>
    lockfile_digest: <digest>
    staging_root: <contained candidate root>
    network_and_environment_policy: <named policy>
    destination_containment: <result>
  resource_envelope:
    configured_limits: <source, graph, extension, target, output, time, memory>
    observed_maxima: <bounded measurements from this run>
  artifacts:
    - receiver: <platform or package>
      path: <artifact path>
      digest: <digest>
      grammar_check: <parser, compiler, or linter result>
  semantic_diff: <path or concise summary>
  receiving_checks: []
  accepted_coordinate: <current accepted state>
  recovery_coordinate: <last accepted state or rebuild input>
  evidence_boundary: <what this receipt establishes>
  next_receiver: <role, review, or release event>
```

The receipt can remain compact when the repository already owns source,
configuration, and artifact inventories. Link those owners and record only the
decision-changing coordinates.
