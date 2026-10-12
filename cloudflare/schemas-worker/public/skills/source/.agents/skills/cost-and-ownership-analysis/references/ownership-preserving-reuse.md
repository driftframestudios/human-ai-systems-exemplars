# Ownership-preserving reuse

Load this reference for a scoped helper-selection or extraction decision. The
result belongs in the existing implementation or review return: the selected
owner and reusable part, any consequential mismatch, and the evidence still due.
Current task authority governs implementation and checks.

## Discover the owner before implementation

Start with the nearest README, the receiving call path and imports, and its
existing tests. Search relevant owner and shared-helper directories by symbol
and behavior, then follow direct provider or caller links where they change the
decision. Identify the implementation that predates the current change wave;
a newly extracted helper records its derivation from that earlier owner.

Name the source coordinate and callable, using an available revision or content
identity when needed. If pre-wave ownership remains unresolved, state that
uncertainty. A new helper within the current patch establishes the proposed
boundary; earlier source establishes prior ownership.

Stop when an existing owner fits or the inspected candidates expose a material
contract mismatch. Report the bounded search and the mismatch. An empty search
establishes only the searched scope; a decision that still depends on an unseen
owner calls for a named, narrow expansion. A new helper earns its place through
the smallest behavior that the existing candidates cannot supply, with its
caller, lifecycle responsibility, and fitting acceptance case made explicit.

## Compare the receiving contract

| Boundary | Decision-changing comparison |
| --- | --- |
| Inputs | Accepted shapes, grammar, trust, validation, size limits, and caller-owned values |
| Outputs | Meaning, type, ordering, literal values, source positions, and ownership of mutable results |
| Side effects | Mutations, listeners, files, navigation, network access, and publication |
| Lifecycle | Acquisition, registration, use, awaiting, release, and cleanup after partial setup or failure |
| Errors | Rejection versus returned diagnostics, thresholds, substitutions, and cleanup-error reporting |
| Dependencies | Runtime and import-time requirements, material transitive owners, and source identity |
| Cost | Repeated preparation, allocation, output size, and the whole receiving path |

Reuse the matching part directly or compose it through a small receiver-owned
adapter. Keep context creation and cleanup with the owner whose contract governs
them. A local helper can express a genuine boundary difference; its justification
is the required behavior and ownership, rather than a new framework or catalog.

## Preserve independent expectations and fresh state

Share mechanics such as fixture factories, event collection, and suitable
parsing primitives. Derive expected headings, row identities, error outcomes,
and state transitions from the owned contract independently of the implementation
under test. Literal expectations and parameterized counterexamples can expose a
wrong value that retains the expected shape.

Each case receives fresh nested mutable fixture state, counters, collectors, and
owned resources. Immutable shared inputs retain an explicit read-only contract.
A shared helper that computes both the actual value and its expected answer
needs an independent oracle for the consequential behavior.

## Carry changes through proof and checkpoints

A helper adoption or change updates the proof's behavior owners, including
material imported dependencies. Update the existing definition or source
fingerprints and affected fixtures before accepting checkpoints for the revised
implementation. Invalidate dependent checkpoints at the harness's supported
granularity; a whole-definition signature may invalidate the entire campaign.

Retain earlier receipts as observations of their original inputs. Matching case
counts or outputs alone leaves revised execution unestablished. Run the
authorized affected checks against the current helper and identify the observed
revision. When a required check awaits authorization, mark that evidence pending.

Use status words with their observation: **planned** names a selected change;
**applied** names edited source; **verified** names an executed check, its result,
and its coverage boundary. A source-only exercise establishes a contract
decision. Runtime behavior and any claim of effectiveness require their own
observations.

## Decision-changing examples

These examples guide interpretation; they are not executable checks.

### Shared telemetry, receiver-owned lifecycle

- **Given:** A pre-wave browser helper exposes `monitor(page)`, while `openFresh` also chooses a viewport, creates a context, navigates, and checks attribution.
- **When:** A campaign owns different script, media, routing, and checkpoint requirements.
- **Then:** Reuse `monitor` on each fresh caller-owned page and retain that campaign's context adapter. Attach observation before the relevant actions and admit telemetry through the final capture before publication.

Inspect the existing lock call path separately. Protect preparation after
successful lock acquisition as well as case execution. The owning lifecycle
attempts browser and lock cleanup even if another cleanup step fails; failed
acquisition leaves the other holder's lock intact. Fresh fixtures can assert
literal cleanup order and rejection outcomes. This comparison can justify a
small lock adapter while preserving the shared telemetry owner.

### Source preservation and semantic observation

- **Given:** An authored-source projector needs exact edit positions and preservation of unowned bytes, while a test observer returns normalized native-table records.
- **When:** Both paths read HTML to inspect labels.
- **Then:** Retain their distinct admission grammars and output contracts. Source-preservation fixtures protect editing; independently authored semantic expectations protect meaning. Reuse a genuinely matching primitive only after comparing its boundary.

Shared vocabulary or use of the same parser library leaves the two jobs
distinct. Source-editing limits belong to that editor's contract; the observer's
trusted-fixture contract supplies its own proportionate limits.

## Completion and revision

Return the reuse decision, retained owners, applied scope, and fitting evidence
or pending check to one receiver. Independent review or a later material use can
reopen a specific mismatch. Keep this guidance in the existing cost-and-ownership
skill; a separate routing entry requires a distinct receiving job.
