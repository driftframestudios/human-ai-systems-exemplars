# Repository Handoff Foundation v0.1

This phase-one bundle gives a clean repository a source-neutral landing frame:
a future owner and authorized AI collaborator can orient, keep one current
Issue visible, receive actual site source, and reconcile the next foundation
move from repository-held context.

The bundle is intentionally small. It carries four modules—orientation,
Concept Nursery, threadkeeping, and references—plus a source-awaiting profile
and a two-Issue semantic route. It adds no application packages. Received
source supplies the runtime, package manager, lockfile, routes, visual
direction, and application behavior.

Status: `working`. The first live receiving exercise can revise this contract
before a later version claims broader fit.

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
name these exact v0.1 contracts while repository-relative paths provide local
retrieval. They validate this bundle and remain outside any wider published
schema cohort until a separate receiving use establishes that route.

## Read-only phase-one commands

From this source repository, the dependency-free command supports three
read-only modes:

```sh
npm run check:repository-handoff-foundation
npm run plan:repository-handoff-foundation -- --target /path/to/receiving-repository
npm run verify:repository-handoff-foundation -- --target /path/to/receiving-repository
```

`check` admits the bundle and verifies its schema identities and bytes,
internal references, source digests, relation closure, and exact projections.
`plan` compares the selected
profile with a destination and reports creation candidates, compatible files,
preserved collisions, and invalid filesystem entries. `verify` applies the
declared target-file policies to an already prepared destination. Add
`--profile source-awaiting` to select the default explicitly, or `--json` for
machine-readable output. Machine-readable results include both the manifest
and selected-profile SHA-256 coordinates.

Phase one keeps destination and GitHub state unchanged. A later explicitly
authorized installer or Issue materializer can consume the admitted plan and
seed after its own write and recovery contract is accepted.

## Bundle map

```text
repository-handoff-foundation-v0.1/
├── README.md
├── foundation.manifest.json
├── schema/
│   ├── foundation-manifest.schema.v0.1.json
│   ├── foundation-profile.schema.v0.1.json
│   └── issue-route-seed.schema.v0.1.json
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

During a read-only observation of a cooperative local tree, path components
seen as symbolic links and targets seen as special filesystem entries stay
outside the plan. The tool reports those boundary findings and leaves them
unchanged. A future writer needs a stronger descriptor-relative or staged-tree
boundary before an apply mode can earn a place here.

## Source-awaiting profile

The source-awaiting profile selects all seven entries across the four modules:

- **Orientation** gives the repository a root README and collaboration ground.
- **Concept Nursery** gives useful possibilities a resting place with a return
  signal rather than turning them into implied commitments.
- **Threadkeeping** preserves settled rationale, evidence limits, recovery,
  and exact re-entry without duplicating live Issue status.
- **References** separates public-safe material from an ignored local lane and
  keeps provenance, receiving use, and source authority visible.

The profile also keeps source acceptance, repository identity and rights,
credentials and account settings, transfer acceptance, publication and
domains, license and attribution carriers, and destructive recovery with
their named human owners. Each held decision names the useful preparation that
can continue and the observable event that releases the next step.

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
Their SHA-256 digests bind the seed to the exact reviewed bodies. Structured
acceptance, authority, relations, and next receivers remain available for a
materializer and for owner-readable rendering.

Materialization uses two passes so every new Issue can receive its live number
before cross-links are rendered. After verified materialization, live GitHub
Issues become current authority. Repeat runs preserve live owner edits and
report semantic differences; the seed remains bootstrap, comparison, and
recovery input.

## Delivery forms

- **Repository transfer:** the platform carries the live repository and Issue
  history. Compare the seed with that live graph, preserve the live graph as
  authority, and reconcile settings before and after the human-held transfer.
- **Template creation:** reproduce selected files, then materialize the Issue
  route because repository templates do not supply a new live Issue graph.
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
application behavior open for the received
source and its fitting checks. A later disposable-repository exercise can
establish install behavior. A live, explicitly authorized GitHub exercise can
establish Issue materialization and preservation against the platform at that
time.

When a target already exists, preserve it and return the collision to its
receiving owner. When source or profile facts change, retain the last verified
bundle and destination coordinates, revise the JSON authority, regenerate its
projection, recompute affected digests, and rerun the focused structural
check.
