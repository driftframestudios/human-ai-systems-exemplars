# Repository Handoff Foundation v0.1

This working bundle gives a clean repository a source-neutral landing frame:
a future owner and authorized AI collaborator can orient, keep one current
Issue visible, receive actual site source, and reconcile the next foundation
move from repository-held context.

The bundle stays intentionally small. It carries four modules—orientation,
Concept Nursery, threadkeeping, and references—plus a source-awaiting profile
and a two-Issue semantic route. A plan-confirmed, create-only installer can
place absent foundation files while receiving-owner content remains current.
A separate plan-confirmed materializer can create the route's missing GitHub
labels, milestones, and Issues, resolve their repository-local links, and
record the resulting coordinates while preserving owner work observed before
finalization.
Received source supplies the runtime, package manager, lockfile, routes,
visual direction, and application behavior.

Status: `working`. Evidence from the first live receiving exercise can guide a
revision before a later version claims broader fit.

## Start with the three authorities

| Authority | Path | Job |
| --- | --- | --- |
| Foundation manifest | [`foundation.manifest.json`](foundation.manifest.json) | Declares each schema authority, installable source, and Issue seed; binds their source bytes with SHA-256; and names every selected profile, destination, activation condition, owner, collision policy, and verification policy |
| Source-awaiting profile | [`profiles/source-awaiting.profile.json`](profiles/source-awaiting.profile.json) | Selects the four modules and records the human-held decisions plus one next owner action |
| Issue-route seed | [`issue-route/source-awaiting.seed.example.json`](issue-route/source-awaiting.seed.example.json) | Supplies semantic labels, milestones, current front, two Issues, typed relation closure, acceptance, authority, next receivers, and body-source digests |

The JSON documents above are the sole executable authorities. Their `.yaml`
companions are deterministic readability projections whose bytes are exactly
the JSON bytes. JSON is a valid YAML 1.2 representation, so this arrangement
keeps one parseable content identity and avoids a second normalization rule.

The artifact-local schemas live in [`schema/`](schema/). Their URN identifiers
name each exact contract version while repository-relative paths provide local
retrieval. The v0.2 foundation-profile contract binds a received-source
profile to its exact manifest and technology observation record. The local
materialization receipt records the installer boundary. These schemas remain
artifact-local until a separate receiving use establishes a wider publication
route.

## Inspect, apply, and verify

From this source repository, the dependency-free command supports read-only
inspection plus one explicitly confirmed local write mode:

```sh
npm run check:repository-handoff-foundation
npm run plan:repository-handoff-foundation -- --target /path/to/receiving-repository
npm run apply:repository-handoff-foundation -- --target /path/to/receiving-repository --confirm-plan sha256:<digest-from-plan>
npm run verify:repository-handoff-foundation -- --target /path/to/receiving-repository
npm run plan:repository-handoff-issue-route -- --repo OWNER/REPOSITORY
npm run apply:repository-handoff-issue-route -- --repo OWNER/REPOSITORY --confirm-repository OWNER/REPOSITORY --confirm-plan sha256:<digest-from-plan> --receipt-out /existing/local/directory/issue-route-receipt.json
npm run verify:repository-handoff-issue-route -- --repo OWNER/REPOSITORY --receipt /path/to/accepted-issue-route-receipt.json
```

### Receive the executable with its runtime owner

The data bundle remains source-neutral. To run its checker from a separate
checkout, copy the bundle directory and these three files together, preserving
their relative locations:

- `tools/repository-handoff-foundation.mjs`
- `tools/node-runtime-admission.mjs`
- `tools/check-node-runtime.mjs`

Run the copied command with Node 22.23.4 or a later reviewed stable Node 22
patch. This execution closure uses only Node built-ins; npm installation is
unnecessary. The shared admission module checks the running executable before
the checker reads or materializes the bundle. Adding
`tools/repository-handoff-issue-route.mjs` to the same closure supplies the
separately authorized GitHub route. The isolated receiving tests exercise this
copy operation and its runtime refusal independently of the source checkout.

`check` admits the bundle and verifies its schema identities and bytes,
internal references, source digests, relation closure, and exact projections.
`plan` compares the selected
profile with a destination and reports creation candidates, compatible files,
preserved collisions, invalid filesystem entries, apply eligibility, and a
path-neutral plan digest. `apply` requires that exact digest and creates only
the selected files that remain absent after the target-local lock is acquired.
`verify` applies the declared target-file policies to an already prepared
destination. Add
`--profile source-awaiting` to select the default explicitly, or `--json` for
machine-readable output. Machine-readable results include both the manifest
and selected-profile SHA-256 coordinates.

Receiving-owner differences remain intact and appear in the result. The
installer admits every selected path before creation; an invalid path or an
exact-byte generator collision holds the complete apply for review. After a
caught failure, the installer rolls back files and directories whose
transaction identity still matches and preserves edited or ambiguous state
for review. The deterministic receipt lives at
`.repository-handoff/foundation-receipt.json`. Local apply changes selected
filesystem paths; Git, GitHub, network, Issue, account, and publication state
remain with their existing owners.

### Classify adoption fit before apply

The local and GitHub plans report what their bounded mechanisms can create,
preserve, bind, or hold. The receiving owner decides which planned addition
improves the collaboration route:

| Observed receiving state | Adoption classification |
| --- | --- |
| The planned file is absent and supplies a useful capability, or no live Issue route performs the seed's job | Materialize the selected module or seed after exact plan confirmation |
| One live resource already performs the semantic job | Supply an explicit reviewed binding, then plan again |
| A receiving-owner carrier supplies equivalent behavior | Preserve that carrier and record the equivalence; portable-profile conformance remains a separate decision |
| A richer live Issue graph already supplies the current front and continuation | Preserve the graph and retain the dry run as adoption evidence |
| Identity, fit, or authority remains unclear | Hold the write and route the named question to its owner |

Both apply commands execute the exact confirmed plan as a unit. Supply an
exact one-to-one binding before creating a fresh GitHub plan. For Preserve
existing or Hold, revise the selected profile, seed, or bindings, or retain the
plan as a read-only comparison. A plan becomes apply-ready when every proposed
mutation is classified Materialize.

`applyEligible` establishes the local installer's mechanical preconditions.
For GitHub state, a plan with an empty `blockers` collection establishes a
mechanically complete route proposal. The receiving owner makes the
receiving-fit decision. An accepted Preserve existing classification is a
complete comparison result when existing owners already provide the intended
ability.

The Issue-route commands address GitHub state separately. `plan` reads the
bounded label, milestone, and Issue collections, including closed items, and
filters pull requests from the shared Issues endpoint. It also renders every
eventual request with maximum-width Issue numbers and checks its field and
reserved-marker boundaries before apply. `apply` requires the exact canonical
repository name, operator-confirmed plan digest, and an unused receipt path.
Apply relies on an operator-held precondition: one active coordinator works on
the repository route during the run. The receipt records that precondition;
the materializer does not acquire a shared GitHub lock. It sends mutations
serially with a pause between writes, creates missing labels and milestones,
and creates each missing Issue with a recognizable pending body. After GitHub
supplies Issue numbers, it requires each pending Issue's
identity, title, body, active label set, and milestone to match before it writes
the resolved body. An observed repository-owner edit remains intact. An
operator can restore the exact generated pending state for automatic
finalization or reconcile the edited Issue outside this apply. Automatic apply
resumes only after a fresh plan observes the exact generated pending state.
GitHub supplies platform identities; the admitted seed supplies the initial
route; accepted live Issues supply current owner-authored work.

The materializer treats titles as orientation rather than identity. A title
match becomes a review suggestion. An accepted receipt, a semantic marker, or
an explicitly supplied binding identifies a live resource; disagreement among
those sources holds the run before another mutation. A final receipt records
the operator-confirmed plan, the verified live-state plan, immutable repository
and resource identities, the seed digest, an optional operator-supplied binding
digest, the resolved full-coordinate binding digest, the bootstrap Issue, the
coverage boundary, and the next owner action. The receipt parent directory
must already exist, and the output path must be unused. Before GitHub mutation,
the writer proves that the resolved directory supports create-only files,
durable file and directory writes, and same-directory hard links. It rejects
symbolic-link and special-file targets, synchronizes the receipt and its
directory entry, and creates the receipt once through a bounded no-follow
route.

The command follows GitHub's [REST guidance for serial
requests](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api?apiVersion=2026-03-10)
and uses the documented [Issues](https://docs.github.com/en/rest/issues/issues),
[labels](https://docs.github.com/en/rest/issues/labels), and
[milestones](https://docs.github.com/en/rest/issues/milestones) resources. A
read-only plan needs repository metadata and Issue visibility; apply needs
Issue write permission for the named repository. Use an authenticated `gh`
session with push access so GitHub assigns the seeded labels and milestone to
new Issues. GitHub can silently omit those fields at lower access; the
materializer detects the incomplete pending state and stops before any resolved
body update. An archived matching label causes the materializer to hold the
route because GitHub keeps that label outside Issue assignment. A network or
API failure stops the current run. The next run
reads live state and produces a fresh plan; the operator decides whether that
plan should continue. A held `verify` result exits unsuccessfully so automation
cannot treat an unresolved route as complete.

Receipt dispositions express stable ownership policy rather than a transient
byte comparison. `exact_source` identifies generator-owned bytes;
`receiving_owner_current` identifies content whose receiving owner may revise.
The plan and apply result report the observed create, exact, or preserved state
for the current run.

The target-local lock serializes cooperating apply processes. A caught failure
releases its unchanged lock through the guarded rollback route. A process exit
can leave the lock as a visible recovery signal: confirm the prior apply has
stopped, inspect the target and receipt state, remove
`.repository-handoff/.apply.lock`, and create a fresh plan before applying
again.

## Bundle map

```text
repository-handoff-foundation-v0.1/
├── README.md
├── foundation.manifest.json
├── schema/
│   ├── foundation-manifest.schema.v0.1.json
│   ├── foundation-manifest.schema.v0.2.json
│   ├── foundation-profile.schema.v0.1.json
│   ├── foundation-profile.schema.v0.2.json
│   ├── issue-route-bindings.schema.v0.1.json
│   ├── issue-route-materialization-receipt.schema.v0.1.json
│   ├── issue-route-seed.schema.v0.1.json
│   ├── local-materialization-receipt.schema.v0.1.json
│   └── technology-profile.schema.v0.1.json
├── examples/
│   ├── illustrative-source-received.profile.example.json
│   ├── illustrative-source-received.profile.example.yaml
│   ├── illustrative-source-received.technology-profile.example.json
│   └── illustrative-source-received.technology-profile.example.yaml
├── profiles/
│   ├── source-awaiting.profile.json
│   └── source-awaiting.profile.yaml
├── issue-route/
│   ├── source-awaiting.seed.example.json
│   ├── source-awaiting.seed.example.yaml
│   └── bodies/
│       ├── source-intake.md
│       └── foundation-reconciliation.md
└── modules/
    ├── orientation/
    │   ├── README.md
    │   └── AGENTS.md
    ├── concept-nursery/README.md
    ├── threadkeeping/README.md
    └── references/
        ├── README.md
        ├── public/README.md
        └── local/.gitignore
```

## Manifest semantics

Every path in the manifest is relative to the bundle root or receiving
repository root, uses `/` separators, and stays within that root. Stable keys
identify modules and entries independently of their eventual destination.

### Ownership

| Value | Receiving behavior |
| --- | --- |
| `foundation_generator` | The bundle remains the byte authority for a deterministic target. |
| `receiving_owner` | The bundle supplies initial content; once created, the destination becomes owner-authored repository state. |

### Collision policy

| Value | Receiving behavior |
| --- | --- |
| `create_if_absent` | Create the declared target when the path is absent. A present destination remains intact and appears in the plan or verification result. |
| `preserve_and_report` | Create the declared target when absent. Preserve a present destination, compare what can be compared safely, and report the difference for its receiving owner. |

Both policies preserve existing destination state. A plan establishes the
proposed action before any copy occurs.

### Verification policy

| Value | What a passing check establishes |
| --- | --- |
| `exact_bytes` | The target is a regular file and its SHA-256 equals the declared source digest. |
| `present_regular_file` | The target is a regular file. Its content may reflect later receiving-owner edits. |

During plan, apply, and verify in a cooperative local tree, symbolic-link path
components and special filesystem targets become explicit boundary findings.
Apply uses exclusive, no-follow file creation and revalidates the confirmed
plan beneath a target-local lock. Node's portable filesystem API lacks
descriptor-relative traversal for every ancestor, so a process with concurrent
write access remains an external trust boundary; the installer reports
detected drift and preserves ambiguous state for review.

## Source-awaiting profile

The source-awaiting profile selects all seven entries across the four modules:

- **Orientation** gives the repository a root README and collaboration ground.
- **Concept Nursery** gives useful possibilities a resting place with a return
  signal rather than turning them into implied commitments.
- **Threadkeeping** preserves settled rationale, evidence limits, recovery,
  and exact re-entry while live Issues remain the status authority.
- **References** separates public-safe material from an ignored local lane and
  keeps provenance, receiving use, and source authority visible.

The profile also keeps source acceptance, repository identity and rights,
credentials and account settings, transfer acceptance, publication and
domains, license and attribution carriers, and destructive recovery with
their named human owners. Each held decision names the useful preparation that
can continue and the observable event that releases the next step.

## Source-received contract family

The v0.2 profile schema distinguishes the source-awaiting and source-received
states structurally. A source-awaiting profile carries the neutral capability
selection. A derived source-received profile binds the exact base capability
profile, foundation manifest, and technology profile whose facts resolve to
evidence from a named source coordinate. Stack fields remain optional: source
evidence determines which runtimes, package managers, routes, services,
commands, and delivery facts enter the record.

The examples in [`examples/`](examples/) use an explicitly illustrative
fixture identity. They demonstrate base-profile, manifest, and
technology-profile binding; semantic closure among facts and evidence;
area-aligned coverage; exact base-profile selection; coverage states;
unresolved questions; environment-name handling; and exact JSON/YAML
projection. The current installer selects the manifest-declared
source-awaiting profile. A technical collaborator creates a derived
source-received record from the accepted source coordinate, and a later
reconciliation route can promote that record into a selectable runtime
profile.

Every source digest names a versioned byte procedure. `raw_bytes_sha256_v1`
hashes exact file bytes. `git_ls_tree_full_z_sha256_v1` hashes the exact stdout
bytes from `git ls-tree -r -z --full-tree <revision>`.
`portable_path_digest_manifest_sha256_v1` hashes an exact UTF-8 manifest whose
NFC portable paths are sorted by UTF-8 byte order and serialized as
`path`, NUL, decimal byte length, NUL, lowercase SHA-256, LF.
`utf8_label_sha256_v1` hashes the exact UTF-8 bytes of its declared label.

## Issue route

The example seed begins at `source-intake` and moves to
`foundation-reconciliation` after the source coordinate, technology facts,
reproducibility standing, and collisions are recorded. The manifest declares
the seed path, profile, stable key, and SHA-256; the selected profile names the
same key. Adding a similarly named file to the directory therefore leaves the
admitted route unchanged.

Typed relation closure is explicit:

- `prepares` and `receives` are reciprocal, while `runs_alongside` is
  self-reciprocal;
- each relation type declares that fixed inverse type;
- each relation names an inverse relation key;
- the inverse swaps source and destination Issues and uses the declared
  inverse type; and
- every Issue, label, milestone, relation type, inverse relation, and
  Issue-shaped next receiver resolves through a stable key in the seed.

The separate Markdown body sources carry the owner-readable outcome and work.
Their SHA-256 digests bind the seed to the exact admitted bodies. Structured
acceptance, authority, relations, and next receivers remain available for a
materializer and for owner-readable rendering.

Materialization uses two passes so every new Issue can receive its live number
before cross-links are rendered. During that short interval, the materializer
recognizes the complete generated pending state as eligible for automatic
finalization. The coordinator waits before the final read, then checks the
Issue identity, title, body, active label set, and milestone immediately before
PATCH. GitHub REST conditional requests do not cover this unsafe method, so an
edit committed after that final read can be overwritten by the PATCH. Keep one
coordinator active and leave the generated pending Issues quiet during this
short finalization interval. Any edit observed before the final read stays in
place and holds the route for reconciliation. The final full replan verifies
the state GitHub returns before receipt creation; it cannot recover content a
nonconditional PATCH already replaced. After the materializer verifies the
completed route and writes the receipt, live GitHub Issues become current
authority. Repeat runs preserve observed owner edits and report semantic
differences; the seed remains bootstrap, comparison, and recovery input.

The binding schema supports an explicit, operator-supplied identity map when a
pre-existing repository has matching resources without semantic markers.
Bindings may cover a subset of seed keys. The final receipt covers every seed
label, milestone, and Issue exactly once. Both contracts use semantic-keyed
maps so a collaborator can compare meaning independently of collection order.
`bootstrapFrontKey` names where the seeded route begins; live Issues own later
status and traversal.

A binding document names the exact seed and repository before mapping any
operator-confirmed pre-existing coordinates:

```json
{
  "$schema": "urn:repository-handoff-foundation:schema:issue-route-bindings:v0.1",
  "schemaVersion": "0.1",
  "artifactType": "repository_handoff_issue_route_bindings",
  "routeKey": "source-awaiting-owner-operable-route",
  "seedSha256": "6fd76d35d5275f238e8581682d5d0c9626abf1e7e4fd420603255c4639847823",
  "repository": {
    "immutableId": 123456789,
    "fullName": "OWNER/REPOSITORY"
  },
  "labels": {},
  "milestones": {},
  "issues": {
    "source-intake": {
      "immutableId": 987654321,
      "number": 1,
      "title": "Receive and characterize the actual site source"
    }
  }
}
```

Review the file, then pass it with `--bindings /path/to/bindings.json`. The plan
compares its immutable identities with semantic markers and any accepted
receipt before it proposes a write.

## Delivery forms

- **Repository transfer:** the platform carries the live repository and Issue
  history. Compare the seed with that live graph, preserve the live graph as
  authority, and reconcile settings before and after the human-held transfer.
- **Template creation:** reproduce selected files, then materialize the Issue
  route because the new repository receives files while its live Issue graph
  forms separately.
- **Fresh repository or clone:** install the selected entries into absent
  destinations, review every collision, then materialize the Issue route.

In every route, the current task grant governs repository and external writes.
Identity, rights, credentials, visibility, transfer acceptance, publication,
domains, and destructive recovery begin through their named human owners.

## Projection rule

Update an authoritative `.json` document first. Regenerate its `.yaml`
companion as an exact byte copy, including indentation and final newline. A
byte difference means the projection is stale even when both files parse to
equivalent data. The `projection` object inside each authority records the
source, target, mode, and derivation note.

## Evidence and recovery

A successful structural check establishes the digest-bound schema bytes and
identities, keys, references, bounded source reads, cooperative local-tree
observations, exact projections, and digests it exercised. It leaves
application behavior open for the received source and its fitting checks.
Focused temporary-repository tests establish create-only installation,
collision preservation, stale-plan refusal, deterministic receipts, and
identity-guarded rollback for the exercised local states. In-memory GitHub
adapter tests establish the two-pass request sequence, identity reconciliation,
owner-edit preservation after live Issues become current authority, bounded
pagination, pull-request filtering, archived-label and dropped-metadata holds,
rendered-request preflight, stale-plan refusal, failed-verification signaling,
and create-only receipt paths for the exercised cases. A live, explicitly
authorized GitHub exercise can establish current platform behavior and
preservation at that time.

When a target already exists, preserve it and return the collision to its
receiving owner. When source or profile facts change, retain the last verified
bundle and destination coordinates, revise the JSON authority, regenerate its
projection, recompute affected digests, and rerun the focused structural
check.
