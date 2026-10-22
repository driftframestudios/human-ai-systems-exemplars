# Repository-owned Node runtime

Use Node **22.23.4** with its bundled npm **10.9.9** for the reviewed local and
CI lane. The supported stable interval is `>=22.23.4 <23`; later Node 22 patches
enter through the same review and verification route. Canonical SemVer build
metadata retains the underlying stable release coordinate; prereleases remain
outside the stable interval. Input has a 64-character budget and safe-integer
major, minor, and patch components. `.node-version` selects
the reproducible default. `tools/check-node-runtime.mjs` owns runtime admission
and the component receipt; manifest ranges and workflow pins are checked
against that owner.

```sh
node tools/check-node-runtime.mjs
npm --version
npm ci --ignore-scripts
npm --prefix cloudflare/schemas-worker ci --ignore-scripts
npm run test:node-runtime
```

Each root and schema Worker package command calls the shared checker before
its original command. This explicit command boundary works with older npm
clients and with `--ignore-scripts`; it preserves the two-stage dependency
intake. Both installation roots use `engine-strict=true`. Keep lifecycle
scripts disabled during lock-based installation and exercise required package
behavior through the repository's explicit checks.

Every maintained Node module starts with `tools/node-runtime-admission.mjs` as
its first dependency. Direct script calls, test-runner calls, suite-catalog
commands, nested builders, and symlinked entry paths therefore admit the running
executable before downstream module evaluation. The shared module evaluates
once per module graph. Node resolves and links that graph first: an absent
dependency or unparsable source can produce a loader diagnostic before admission.

Use `npm run playwright -- <arguments>` and `npm run wrangler -- <arguments>`
for the repository's locked external tools. These aliases admit Node in the
same command before launching the tool. The schema Worker also owns its local
`wrangler` alias. Maintained inline Node commands preload the shared admission
module with `--import` as the first Node option. Additional preparatory work
receives its own admitted command; Node evaluates CommonJS preloads before ES
module preloads, as described in the [Node CLI contract](https://nodejs.org/api/cli.html#--importmodule).
The Pages workflow takes that module from its current
release-tools checkout when it inspects an older accepted source.

`npm run check:node-routes` inventories tracked JavaScript owners, first-import
admission, suite members, and maintained command carriers. Browser/shared
modules, workerd modules, the policy bootstrap, and the frozen accepted Worker
publication each retain an explicit owner. The inventory inspects maintained
command shapes; it supplements executable regression cases and does not parse
arbitrary shell programs. A runtime mismatch exits with the selected coordinate
and rerun action. Select `.node-version` and repeat the command.

This boundary covers maintained repository execution. The host's arbitrary
inline programs, deliberate runtime-property changes, dependency internals,
and separately executed historical source retain their own execution owners.

Every active Node workflow selects the exact patch and emits the checker
receipt before installation. The Pages workflow uses its workflow-owned
release-tools checkout so an older accepted source remains verifiable under
the current runtime policy. Preserve the runtime receipt alongside each
release/carrier check result. Carrier transfer receipts already record Node
and zlib versions; artifact schemas retain their existing owners.

| Execution role | Runtime owner |
| --- | --- |
| Repository scripts, Playwright drivers, build/materialization, live probes | Reviewed Node 22 lane |
| Wrangler CLI and its local tooling | Reviewed Node 22 lane |
| Deployed schema and media Workers | Cloudflare workerd, under their existing compatibility configurations |
| Visitor JavaScript | Visitor browser engine |
| GitHub JavaScript actions | Runtime embedded in the pinned action |
| Field Guide package | Data-only exports; its consumer chooses the runtime |

`cloudflare/r2-video-delivery/package.json` defines the Worker's module format;
its CLI commands and locked dependencies belong to the root package. The
schema Worker has a separate npm closure and receives the same Node floor.
Neither Worker currently enables Node compatibility in its deployed config.

The accepted `cloudflare/schemas-worker/public/` tree includes historical
workflow examples from a pinned publication. Keep that complete tree and its
publication lock together. Current execution uses `.github/workflows/`; a
future skill/Pages release refreshes the historical copies through the
publication owner after byte comparison and authorization.

Future skill projections carry the admission module, policy checker, and this
runtime guide beside their selected Node test-source examples. Those examples
retain their repository test-fixture and dependency prerequisites. The accepted
frozen Worker publication continues to use its recorded source bytes.

Focused tests cover floor boundaries, unsupported majors, malformed input,
subprocess refusal before a sentinel effect, original-command preservation,
direct script and test execution, dependency effects, route-inventory faults,
and manifest/lock/CI agreement. Runtime changes reach the full repository-owned
`all + browser`, schema, secret-boundary, route, carrier, and generated-byte
checks. Package audits describe dependency advisories; the runtime receipt
identifies Node core. Live probes retain their explicit receiver boundary.

The [Node October 2026 security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
and [Node 22.23.4 release](https://nodejs.org/en/blog/release/v22.23.4/)
establish this floor. A later advisory affecting this supported line or a
reachable execution role reopens the assessment. Preserve the fixed floor
while repairing any newly observed compatibility issue; retain the exact
pre-change branch coordinate and the runtime receipt for recovery.
