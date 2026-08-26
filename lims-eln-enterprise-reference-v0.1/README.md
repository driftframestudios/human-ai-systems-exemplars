# LIMS/ELN Enterprise Reference

This companion pack supports the FMI LIMS/ELN Solution and Implementation
Architecture Site Readings. It provides a synthetic, vendor-neutral laboratory
domain, executable failure contracts, and vendor-shaped Sapio, Benchling, and
LabKey integration seams.

The pack is a synthetic implementation exemplar. Configured vendor tenants,
organization-owned laboratory records, and accountable regulatory acceptance
remain distinct adoption evidence.

## What is executable

The standard-library verification suite exercises:

- attributable, versioned, replay-safe specimen transitions;
- reason-bearing skip and void decisions and signature-bearing release;
- transactional custody state, event, and outbox planning;
- raw-checksum-preserving instrument ingress and explicit quarantine;
- tenant-bound authorization and sensitive-field redaction;
- canonical LIMS port conformance with optimistic concurrency;
- Sapio request reservation, atomic record-graph intent, and ambiguous-outcome
  reconciliation;
- Benchling raw-body verification boundaries and durable inbox/job creation;
- LabKey validate-only migration, audit reasons, read-back parity, and artifact
  checksum verification;
- resumable migration checkpoints, duplicate-identity detection, reconciliation,
  and approval-gated cutover;
- bounded retry, quarantine, restore evidence, and deterministic execution
  receipts.
- PostgreSQL-native instants, UUID identities, exact scientific quantities,
  UCUM-coded units, binary digests, JSONB envelopes, and native booleans;
- tenant-preserving composite keys, provisioned login authority, forced row
  security, append-only evidence, lease fencing, governed write routines, and an
  exact privileged-routine allowlist with temporary-name shadow proofs;
- eight immutable canonical migrations managed by Flyway Community 13.0.0, an attested v0.1 upgrade path,
  semantic-fingerprint convergence, a distinct migration-evidence fingerprint,
  and a receipt-authorized contract phase;
- source-to-target semantic manifests, exact numeric boundary proofs, and
  receipt-bound checks for migration batches, five reconciliation criteria,
  restore/archive equivalence, and five-domain acceptance.

Run the complete offline check:

```sh
PYTHONPATH=src python3 scripts/validate_pack.py
```

The Python 3.12 command uses the declared, pinned JSON Schema and YAML
validators. It validates sample manifests, the 53-finding data-primitive
ledger, Flyway policy, SHA-256 release provenance, safe repository paths, native SQL
contracts, prohibited house syntax, and the full test suite. It proves that the
checked receipt names the exact authored source digest and file count. Local
caches and generated packaging trees sit outside that stable source boundary.

The hosted database proof runs the declared PostgreSQL 16 and 18 compatibility
boundaries against both a clean installation and an attested, pre-populated
historical v0.1 baseline:

```sh
LIMS_DB_PASSWORD="an-ephemeral-rehearsal-value" \
  ./scripts/run_database_rehearsal.sh
```

The rehearsal uses the pinned multi-architecture Flyway Community 13.0.0 OSS
Alpine image. Flyway owns version discovery, checksums, database
serialization, transactional application, validation, and its two operational
history tables. Connection values arrive through runtime environment variables;
the checked configuration carries no URL, user, or password. A generated LOGIN
role has `NOINHERIT`, no cluster-administration attributes, direct `CONNECT`
only on the target databases, and `SET TRUE`/`INHERIT FALSE` membership in the
stable `NOLOGIN` owner. A database-scoped login default adopts that owner on
every Flyway connection, including history-table connections; Flyway's
`afterConnect` callback verifies the transition and rejects any broader session
before history or migration work proceeds. V008 keeps forced row security
active and adds a policy addressed only to the stable owner. Its predicate
admits data movement only when the session login matches the exact ephemeral
attribute, single-membership, database-default, and direct-ACL contract. An
adversarial proof returns the session to its LOGIN identity and confirms that
the governed schema remains inaccessible before deliberately resuming the
owner role. The
cluster administrator provisions databases and roles and never enters the
Flyway container. Automatic baseline is disabled. The v0.1 catalog attestation
must pass before the rehearsal issues an explicit baseline command. Backfill,
validation, and cutover versions
V002–V004 then execute with Flyway `group=true`, so their source lock, semantic
manifests, history, and cutover become durable together.
Flyway validates the retained upgrade database through exact target V005 and
validates the separately authorized contract database through V006. The
release provenance authenticates both files, and the full contract rehearsal
therefore supplies the checksum proof for the migration intentionally retained
from the pre-contract database.

Clean and upgraded databases execute catalog, ownership, privilege,
adversarial tenant, temporary-name shadowing, append-only, queue, and exact
numeric boundary proofs.
The temporary-name shadowing proof grants database-local `TEMPORARY` only to
its disposable alpha login. The stable tenant runtime role and beta control
login retain the production database-authority contract, and cleanup revokes
the proof grant before dropping every ephemeral identity.
Their canonical semantic fingerprints converge while migration-evidence
fingerprints independently describe migration-control objects. The V005
successor attestation binds the effective V008 head and current
migration-evidence fingerprint before synthetic review. Contract cleanup
executes in a dedicated disposable simulation after persisted batch,
five-criterion reconciliation, restore/archive equivalence, and Scientific,
Quality, Regulatory, Security, and Operations acceptance satisfy the same
receipt-bound database guard used by an accountable deployment.

The reconstructed v0.1 fixture is a disposable provisioning aid for repeatable
tests. Authentic adoption starts from an already populated environment whose
catalog passes baseline attestation. The release receipt preserves that evidence
classification separately from Flyway's operational history.

## Evidence and qualification

| Class | Meaning |
|---|---|
| `illustrative_compilable` | The example parses and its local shape is checked. |
| `tested_excerpt` | Automated tests exercise the stated local contract. |
| `verified_running` | The complete offline reference path runs with synthetic fixtures. |
| `sandbox_qualified` | A configured vendor sandbox passed the shared conformance suite. |
| `production_qualified` | The adopting organization approved intended use, security, validation, procedures, training, recovery, and operations. |

Execution class and qualification stage are separate. A locally verified
algorithm remains locally verified even while its tenant, migration rehearsal,
or production qualification receipt stays open.

## Pack map

- `src/lims_eln_reference` — canonical domain, lifecycle, custody, instrument,
  security, evidence, migration, operations, workflow, and ports.
- `src/lims_eln_reference/adapters` — executable vendor-shaped integration
  boundaries for Sapio, Benchling, and LabKey.
- `samples` — stable sample manifests linking claims to code, tests, failure
  modes, populations, and receipts.
- `schema` — sample-manifest, execution-receipt, Machine Node, and data-ledger schemas.
- `database/flyway` — secret-free Flyway policy and canonical/legacy locations.
- `database/migrations` — authoritative clean-install PostgreSQL history.
- `database/legacy` and `database/upgrades` — executable historical baseline
  plus expand, backfill, validate, cutover, and contract phases.
- `database/verify` — semantic catalog, ownership, privilege, tenant-boundary,
  immutability, and queue proofs.
- `database/data-primitive-ledger.json` — stable finding identities,
  dispositions, and verification routes.
- `database/release-provenance.json` — SHA-256 release attestation for cluster
  bootstrap, legacy setup, canonical migrations, and upgrade artifacts.
- `docs` — architecture, qualification, vendor-version, and operating guidance.
- `receipts` — checked-in validation evidence and its explicit limitations.

Machine Node relations use URI references. Cross-system lineage can travel as
an absolute URI or stable URN, while an artifact inside this pack uses a
repository-relative path. The public pack therefore carries operator-blind
source identity and directly inspectable local receivers; the authorized
resolver retains exact gated lineage.

## Data and safety posture

All fixtures use synthetic identifiers and measurements. Organization-owned
patient identifiers, vendor credentials, API tokens, and tenant payloads stay
inside approved runtime and evidence boundaries. The security helpers
demonstrate allowlisting and redaction; adopting teams own threat modeling,
access review, key management, privacy review, and validated operating
procedures.

## Database decisions and evidence

[`docs/data-contract.md`](docs/data-contract.md) defines the semantic primitive
policy. [`docs/database-refactor-plan.md`](docs/database-refactor-plan.md)
records five options, their promotion-readiness probabilities, the recommended
additive synthesis, and six reevaluation interstitials.
[`docs/evidence-basis.md`](docs/evidence-basis.md) links the PostgreSQL, Flyway,
FDA, GitHub, pull-request, issue, and practitioner evidence behind the design.

## Vendor-version posture

The reviewed version evidence is dated 2026-07-28:

- `sapiopylib` final release `2026.6.3.307`;
- `benchling-sdk` stable release `1.25.0`;
- `labkey` PyPI stable release `4.2.0`;
- the LabKey upstream `develop` branch declares `4.3.0`, which is tracked as an
  upstream development state rather than a stable PyPI release.

See `docs/vendor-version-evidence.md` for sources and the tenant compatibility
contract.
