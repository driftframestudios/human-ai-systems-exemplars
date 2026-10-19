# Contributing

Changes should preserve:

- one canonical implementation under `src`;
- stable sample identifiers;
- exact replay, revision, tenant, and evidence semantics;
- tests for success, material failure, and recovery;
- explicit execution scope and qualification stage;
- synthetic fixtures and redacted receipts;
- resolvable source and test paths in every manifest;
- evaluator-facing prose and code free of house syntax.
- native semantic primitives and named relational constraints;
- immutable Flyway migration files, forward-fix evolution, and successful
  `validate` output;
- explicit attestation before an established database receives a Flyway
  baseline, with `baselineOnMigrate=false`;
- secret-free checked configuration and runtime-supplied connection values;
- bounded Flyway LOGIN attributes, explicit `SET ROLE` owner delegation, and a
  provisioning-only cluster-administrator boundary;
- clean-install and supported-baseline schema convergence;
- bounded expand, backfill, validate, cutover, observe, and contract phases;
- affirmative comments that state the target invariant and its verification.

Run `PYTHONPATH=src python3 scripts/validate_pack.py` before review.
Database changes also run `./scripts/run_database_rehearsal.sh` against an
ephemeral supported PostgreSQL engine.
