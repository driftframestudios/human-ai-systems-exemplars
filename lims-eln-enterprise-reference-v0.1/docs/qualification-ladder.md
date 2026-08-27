# Execution and qualification ladder

## Local execution

`illustrative_compilable`, `tested_excerpt`, and `verified_running` describe
what this repository demonstrates. The checked-in receipt is scoped to Python
3.12, synthetic fixtures, and the source digest it names.

## Vendor sandbox

Sandbox qualification should run the same conformance cases through an
organization-controlled Sapio, Benchling, or LabKey tenant:

1. canonical round-trip fingerprint parity;
2. exact replay convergence;
3. conflicting replay rejection;
4. higher source revision replacement;
5. stale source revision rejection;
6. explicit absence;
7. duplicate external identity detection;
8. ambiguous outcome reconciliation;
9. identity, authorization, and tenant-boundary checks;
10. redacted operational evidence.

The receipt records platform release, SDK version, tenant configuration
revision, schema fingerprint, service identity, fixture set, execution time,
result, limitations, and reviewer.

## Migration rehearsal

A rehearsal adds representative volume, historical exceptions, restart from
checkpoint, read-back parity, performance budgets, rollback, restore, and
accountable approval.

The hosted PostgreSQL proof establishes a lower rung on PostgreSQL 16 and 18:
Flyway applies eight canonical migrations from empty and explicitly attested
v0.1 baselines;
tenant, privilege, append-only, queue, and exact numeric boundary controls run;
and both paths produce one canonical semantic fingerprint. The upgrade path
also emits a migration-evidence fingerprint, source manifest, and target
projection manifest.

Two proof modes carry distinct authority:

1. Disposable baseline provisioning reconstructs v0.1 and loads representative
   synthetic records. It proves repeatable fixture and migration behavior.
2. Authentic adoption begins with an already populated v0.1 environment. Its
   catalog passes baseline attestation before an explicit Flyway baseline and
   expand. A separate release receipt records adoption authority while Flyway
   records operational migration state.

For v0.1, Flyway versions V002–V004 execute as one `group=true` PostgreSQL
transaction with the migration's declared `REPEATABLE READ` source boundary.
The hosted contract simulation then supplies a completed batch; successful
source-row count, target-projection count, source-row manifest, restore-row
manifest, and exception-closure reconciliation; restore/archive equivalence;
and current Scientific, Quality, Regulatory, Security, and Operations
acceptance. Organization-owned volume, exception distributions, restore
objectives, accountable identities, and measured operating outcomes advance
this executable simulation into an adoption rehearsal.

## Production qualification

The implementing organization determines intended use and applicable
regulatory controls. Production acceptance includes security, privacy,
validation, procedures, training, monitoring, incident response, backup,
restore, data exit, change control, and periodic review.

Passing repository tests contributes engineering evidence. The five synthetic
acceptance decisions exercise the database guard and retain simulation scope.
Accountable Scientific, Quality, Regulatory, Security, and Operations decisions
assign applicability and production authority for the adopting organization.
