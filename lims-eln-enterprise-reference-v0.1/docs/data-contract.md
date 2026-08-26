# Laboratory data contract

This contract defines semantic meaning before storage and transport choices.
PostgreSQL 16–18 is the reference compatibility band. Applications supply UUID
identities so deterministic fixtures and migrations retain stable keys across
supported engine versions.

## Primitive policy

| Meaning | PostgreSQL representation | Interchange representation | Governing invariant |
|---|---|---|---|
| Recorded event instant | `control.finite_instant` (`timestamptz` domain) | Strict RFC 3339 with `Z` or a numeric offset | Equivalent finite instants compare and hash identically after UTC normalization; session `DateStyle` has no influence on ingress classification. |
| Civil laboratory date | `date` | ISO 8601 full date | Calendar meaning stays independent of a timezone conversion. |
| Recurring local schedule | `time` plus an IANA zone identifier | Local time and zone as separate fields | Wall-clock intent and zone rules remain visible. |
| Internal identity | `uuid` | Canonical lowercase UUID string | One generated identity denotes one durable object. |
| External identity | constrained `text` with tenant and source namespace | Unicode string plus namespace | Source meaning is retained while the internal key keeps one purpose. |
| Cryptographic digest | `bytea` with an octet-length check | Lowercase hexadecimal plus algorithm and canonicalization version | Digest bytes, algorithm, and canonical form travel together. |
| Exact scientific value | bounded `numeric` plus UCUM code | Decimal string plus unit, qualifier, and method revision | Finite values retain precision; original and normalized quantities preserve conversion provenance. |
| Boolean condition | `boolean` | JSON boolean | Truth values remain distinct from numeric values. |
| Queryable document | `jsonb` with envelope version and shape checks | Strict JSON | Duplicate keys and non-finite numbers are rejected at ingress. |
| Byte-faithful source | encrypted object reference, digest, size, and media type | URI/reference plus digest metadata | Exact source bytes remain independently verifiable. |

## Canonical bytes, digests, and signatures

The database derives and verifies digests where PostgreSQL owns the complete byte
representation, including migration manifests, catalog fingerprints, source-row
manifests, and governed scientific conversion contracts. Those receipts name the
algorithm and the database serialization profile used to create the bytes.

Cross-runtime specimen, event, outbox, and approval documents currently arrive
with application-produced digest bytes and a canonicalization label. PostgreSQL
preserves their shape, target relationships, digest width, version metadata, and
append-only lineage. RFC 8785 canonical-byte production and approval-signature
verification remain an explicit qualification boundary: a production promotion
receipt binds the exact canonical bytes, their parsed JSON meaning, recomputed
digest, signer key and algorithm, signature result, policy version, and target
object against a shared Unicode, decimal, ordering, and normalization corpus.
Until that receipt lands, `jcs-1.0` records the producing runtime's declared
profile rather than an independently proven database derivation.

## Identity and tenancy

Every tenant-owned relation carries `tenant_id uuid`. Composite foreign keys
include `tenant_id`, preventing a child from resolving to a parent in another
tenant. Transaction middleware sets a verified tenant context after
authorization; forced row-level security provides the database replacement
state. Database owners remain deployment identities, while workload roles own
their access through explicit group membership and carry `NOBYPASSRLS`.

Externally assigned identifiers use `(tenant_id, source_system,
external_identity)` uniqueness. Empty and whitespace-only values are rejected,
length is bounded, and comparison behavior is explicit. Internal UUIDs remain
stable when external systems rename or re-key a record.

## Scientific quantities

An observation records analyte, assay-method revision, raw decimal value, raw
UCUM unit, optional qualifier and detection limits, canonical decimal value,
canonical unit, conversion-rule revision, and the digest of the exact conversion
contract used. `numeric(38, 12)` is the released reference storage envelope;
each adopting assay contract declares its own scientific precision. The
governed write routine validates
finite input, scale, range, detection-limit ordering, assay-run membership,
specification validity, run state, and conversion identity before the bounded
cast. A runtime proof admits the largest supported exact value and rejects
excess scale, excess magnitude, `NaN`, and infinity. The assay specification
narrows scale, range, compatible units, and significant-figure rules. Inputs
outside that released envelope enter an explicit evidence and review route.

## Temporal model

Business occurrence and server recording are separate instants. Source text,
reported offset, and clock metadata may be retained for provenance while every
durable canonical instant uses the `control.finite_instant` domain. Its base
type is `timestamptz`, and its domain check admits finite values. Text ingress
uses one strict `YYYY-MM-DDTHH:MM:SS[.ffffff](Z|±HH:MM)` grammar before casting,
so `SQL, MDY` and `SQL, DMY` sessions classify the same source values. Civil
schedules use local clock fields and an IANA zone because their meaning follows
local rules rather than a single elapsed-time instant.

## Evidence and change

Events, custody transfers, approval decisions, execution receipts, migration
receipts, and their bindings are append-only. Corrections create a superseding
record and retain the earlier statement. Each canonical digest names its
algorithm, canonicalization version, and schema version. The derivation boundary
for each digest stays explicit: database-derived representations carry database
proof, while cross-runtime representations require the canonical-byte and
signature qualification receipt above. Applied migration files stay immutable;
corrections advance through a new forward revision. Flyway repair remains a
controlled recovery action with its own operator receipt.

Migration validation records two complementary representations. A source
manifest inventories every supported legacy population and its immutable
digest. A target projection manifest describes the canonical tenant, specimen,
event, custody, identity-map, and exception representation produced from that
source. Their digests remain bound to the cutover receipt and are recomputed
before the compatibility archive is contracted.

The canonical semantic fingerprint covers the durable application contract:
types, relations, columns, constraints, policies, routines, triggers, views,
indexes, ownership, and privileges. The migration-evidence fingerprint covers
the upgrade-only controls and receipts. This separation lets clean install and
supported upgrade paths converge semantically while retaining inspectable
migration lineage.

## Compatibility window

Expand migrations establish additive structures. For v0.1 adoption, a baseline
attestation first verifies the live legacy catalog. Backfill, validation, and
cutover run within one `REPEATABLE READ` transaction group while holding the
source relations stable. Old and new readers operate against declared,
read-only compatibility views until semantic parity evidence passes. The
contract phase is a separately authorized migration whose receipt binds batch
execution, the five required reconciliations, restore/archive equivalence, and
five-domain acceptance.
