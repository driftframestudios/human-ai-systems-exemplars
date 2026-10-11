# Batch object publication and resumable acceptance

Load this reference when two or more completed video-family packets share one
R2 publication window. The batch layer coordinates provider delivery. Each
family continues to receive its source preparation, poster, accessibility
companions, visitor contract, and human release standing through
`accessible-video-publication`.

## Batch contract

A batch is a finite roster of independently acceptable families. Before the
first remote write, give every family a semantic ID, asset version, complete
carrier list, exact media metadata, byte counts, digests, and activation owner.
The roster may keep protected source coordinates in its task-local copy; the
public return uses semantic identities and public-safe observations.

Each object is one commit member. R2 commits an object write atomically. The
family and batch use coordinated multi-object workflows. Keep the preceding
visitor pointers active until every required member of a family has been
retrieved and verified. Partial batch progress remains recoverable while
visitor pages continue to present the preceding accepted family.

## Choose the write mode

### Conditional S3-compatible writes

Use the S3-compatible `PutObject` route with `If-None-Match: *` when concurrent
publishers are possible or the release requires an enforced create-only
boundary. A successful response commits one unused key. A precondition failure
preserves the stored object and sends the caller to read and compare that key.
The storage guarantee remains per object. Family acceptance uses verified
checkpoints and a coordinated activation step after every required object
reaches its accepted state.

Keep the endpoint, credential profile, storage container, and protected source
paths in the authorized operator packet. Set exact content type and immutable
cache metadata on each write. Set content encoding when the carrier contract
explicitly selects it.

### Wrangler single-writer publication

Use Wrangler object upload for a human-approved publication window assigned to
exactly one writer. Reserve unused versioned keys, retrieve each exact key
before writing, serialize remote writes, then retrieve each accepted object
into a fresh local target and compare its byte count and digest. This sequence
provides the create-only coordination that the command's separate read and
write operations require.

This mode provides coordinated create-only behavior for one named writer. The
existence read and upload remain separate operations, so another writer could
win between them. A publication window with concurrent writers selects the
conditional S3-compatible route instead.

## Prepare broadly; publish deliberately

Local inspection, compatible remuxing or encoding, strict decode, poster
candidate generation, metadata observation, and digest calculation may run in
parallel when resources permit. Remote mutation follows the selected write
mode:

- the Wrangler route uses one serial writer;
- the conditional route may use bounded concurrency after every key and packet
  has passed review; and
- visitor markup continues to point at the preceding family until the new
  family completes retrieval and receiver checks.

A batch tool delegates media logic to the existing per-family preparation
owner. Add a helper after repeated batches show that orchestration saves
material time or protects a consequential boundary.

## Member-atomic checkpoint and resume

Record a compact task-local state for each carrier:

| State | Established condition | Next action |
| --- | --- | --- |
| `prepared` | Local candidate passed its family checks and has exact metadata, size, and digest. | Read the intended remote key. |
| `absent` | The selected remote observation found no object at the unused versioned key. | Run the selected create route. |
| `stored_unverified` | A write reported success or ended with an unknown outcome. | Retrieve the exact key into a fresh target. |
| `verified` | Retrieved bytes and metadata match the prepared member. | Continue with the next member or family receiver. |
| `conflict` | The key exists with different bytes or metadata. | Preserve it, hold activation, and select a new reviewed version. |

After interruption, start from remote observation and use its current state to
select the next action. Matching retrieved bytes advance the member to `verified`; an
absent key returns to the selected create route; a mismatch enters `conflict`.
Resume remaining members independently. Re-run only the local preparation or
receiver checks affected by a changed source, carrier, route, or page.

The checkpoint can live in the receiving Issue, an existing publication
manifest, or an ephemeral operator table. It is a progress view; existing
source contracts and release owners retain authority.

## Public-safe return

The public return can include:

- family semantic IDs and asset versions;
- carrier roles, media types, byte counts, and digests;
- normalized counts for prepared, verified, held, and remaining members;
- public routes and normalized transport or browser outcomes after activation;
- the selected write mode and its concurrency boundary; and
- one exact unresolved decision or receiver, when present.

Credentials, account and storage coordinates, private source paths, raw
metadata values, command transcripts, provider diagnostics, request IDs, and
generated development hostnames stay with the authorized operator. A private
finding holds the affected family while independently accepted families retain
their standing.

## Completion

The batch transport step completes when every required member has a matching
fresh retrieval, each family has an explicit accepted or held standing, and the
public return names the selected write mode and its evidence boundary. Visitor
activation remains a family-level decision governed by its accessible page
contract and human release owner.
