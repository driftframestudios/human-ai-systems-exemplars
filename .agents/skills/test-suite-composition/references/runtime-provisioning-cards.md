# Runtime provisioning cards

Use the card that matches the selected suite. Each card names the identity that
can change admitted dependencies, the evidence that stays with the behavior
owner, and the event that justifies a broader preparation route.

## Node and package-manager work

| Decision field | Working contract |
| --- | --- |
| Identity | Admitted Node version, operating system, architecture, package-manager version, lockfile digest, and material build inputs |
| First preparation route | Use the repository's reviewed runtime admission and lock-aware install |
| Reuse route | Use the package manager's supported dependency cache or an immutable artifact whose key binds the identity above |
| Behavior proof | Run the selected Node suites with their original case population and failure semantics |
| Expansion event | Native modules, another operating system, a changed package manager, browser installation, or release packaging joins the receiving claim |

A cache of downloaded packages and a cache of installed dependency trees carry
different compatibility contracts. Select the narrower closure whose verifier
can still establish admitted bytes after restoration.

## Python environments

| Decision field | Working contract |
| --- | --- |
| Identity | Admitted Python version, platform, environment manager, lock or requirement digest, indexes, and native build inputs |
| First preparation route | Use the repository-declared lock and environment tool; use an isolated dependency declaration for a bounded one-off tool |
| Reuse route | Cache downloaded wheels or the environment manager's reviewed cache when the lock and platform provide a stable identity |
| Behavior proof | Run the selected unit, integration, database, or application suite inside the admitted environment |
| Expansion event | An unlocked range resolves differently, a native wheel changes platform support, a database service joins, or release history enters scope |

A broad requirement such as `package>=x` names an admissible range rather than
one immutable closure. Record the resolved environment for comparison, and let
a lock or exact artifact digest supply stronger reuse authority when the
receiver needs it.

## Browsers and browser engines

| Decision field | Working contract |
| --- | --- |
| Identity | Browser name, channel or engine, version, operating system, runner image, automation library, and relevant launch options |
| First preparation route | Use an already available reviewed browser when it satisfies the narrow receiver; otherwise install the exact declared engine |
| Reuse route | Use a browser cache or image only when its version and platform coordinates remain inspectable |
| Behavior proof | Retain the selected interaction, focus, layout, media, telemetry, and engine-specific checks |
| Expansion event | Cross-engine compatibility, print, forced colors, device behavior, or live delivery becomes part of acceptance |

A hosted Chrome observation can serve a focused Chrome lane. An independently
owned Chromium, Firefox, and WebKit matrix continues to carry the contract that
requires those exact engines.

## System packages and APT

| Decision field | Working contract |
| --- | --- |
| Identity | Cache schema, distribution, architecture, runner image version, repository metadata coordinate, and digest of the resolved package plan |
| First preparation route | Resolve and install through the package manager's reviewed manifest |
| Reuse route | Cache package archives; let the package manager verify and install them through a direct fallback-compatible route |
| Behavior proof | Run the same application and workflow checks after every exact, compatible, rejected, miss, and unavailable standing |
| Expansion event | Repository metadata, candidate versions, runner image, architecture, or native ABI changes |

Exercise the plan parser against fresh-install, upgrade-shaped, and malformed
records. Separate archive download from archive installation so a restored
closure proves that the package manager can complete from the accepted bytes.

## Containers and prebuilt runners

| Decision field | Working contract |
| --- | --- |
| Identity | Consumer and base image digests, operating system, architecture, runtimes, browsers, system packages, build recipe, SBOM, and provenance |
| First preparation route | Use a reviewed hosted runner until measured preparation cost justifies image ownership |
| Reuse route | Pull an immutable digest and retain the prior accepted digest as rollback |
| Behavior proof | Run the selected suite after pull and verify the tool coordinates required by the receiver |
| Expansion event | Patch cadence, registry availability, pull cost, credentials, or another consumer changes the ownership calculation |

An image shifts update, provenance, registry, and rollback work into a new
owner. Compare full pull and rebuild cost with the existing preparation path
before adopting it.

## Database and service-backed checks

| Decision field | Working contract |
| --- | --- |
| Identity | Service image or version, schema or migration coordinate, seed fixture, role and permission state, and client/runtime coordinate |
| First preparation route | Start the exact declared service and apply the owned migration and fixture route |
| Reuse route | Reuse immutable service images or explicitly versioned snapshots whose accepted-state and reset contract is known |
| Behavior proof | Retain ordinary-role queries, transactions, restart behavior, cleanup, and configured application checks |
| Expansion event | Engine version, migration graph, role, collation, persistence mode, or production-like topology changes |

Treat service readiness, schema acceptance, application behavior, and cleanup as
separate observations. A ready port establishes availability; it leaves query
meaning and transaction behavior to their focused checks.

## Release history and live receivers

| Decision field | Working contract |
| --- | --- |
| Identity | Full source revision, required history or tags, artifact digest, destination, route, and receiving policy |
| First preparation route | Fetch the depth and artifacts required by the named release or live observation |
| Reuse route | Reuse a receipt only while its source, artifact, destination, observation, and policy identities remain valid |
| Behavior proof | Preserve build, package, promotion, delivery, and live checks as distinct evidence owners |
| Expansion event | A tag, branch topology, carrier, host, route, credential boundary, or policy changes |

A shallow checkout fits source checks that depend only on the current tree. A
release check that reads ancestry or tags receives the history it actually
uses. Record the receiving coordinate so reused evidence stays bounded to the
same release question.
