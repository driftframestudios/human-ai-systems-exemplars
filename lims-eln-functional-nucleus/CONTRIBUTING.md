# Contributing to the LIMS/ELN Functional Nucleus

This directory supports cross-repository work while each standalone repository
continues to own its source history and releases. A useful contribution makes
the affected role, behavior, evidence scope, and reconciliation path easy for
the next collaborator to see.

## Choose the owning role

Begin with the repository whose authority matches the change:

- `site-reading-governance` owns shared evidence and authority grammar;
- `lims-eln-program-specification` owns requirements, wire contracts, operation
  meaning, and shared scenarios;
- `lims-eln-simulated-final-state` owns selected-future execution and simulated
  observations;
- `lims-eln-enterprise-implementation` owns runtime domain behavior, adapters,
  persistence, and the workbench;
- `lims-eln-comparative-evidence` owns admission, normalization, comparison,
  and adjudication.

When one behavior crosses roles, keep the contract small and make each side's
responsibility explicit. The program contract names wire meaning; services
retain authenticated identity, authorization, persistence, effects, and
accountable domain decisions.

## Shape a change

1. State the domain outcome and the evidence that will make it visible.
2. Change the smallest owning surface first.
3. Add a focused test at the boundary where behavior could diverge.
4. Exercise the affected vertical slice from scenario through observation or
   recovery receipt.
5. Record which standalone repositories should receive the change and which
   source coordinates should replace this snapshot in a later refresh.

Prefer domain assertions over document-shape repetition. A test earns its place
when it distinguishes a meaningful success, decision, invariant, or recovery
route from a plausible defect. Generated schema checks remain useful at the
external contract boundary; they complement rather than substitute for domain
behavior tests.

## Preserve evidence and safety boundaries

Use synthetic `SYN-` identities and invented laboratory values. Protected
patient, customer, credential, and production telemetry values remain in their
approved systems; use governed references or explicit redacted replacements in
repository evidence.

Keep evidence mode and assurance stage independent. A successful synthetic run
can establish local verification. Configured-environment qualification,
intended-use validation, accountable acceptance, and production authorization
advance through their named evidence and decision paths.

Hard tenant, authorization, privacy, and effect boundaries stay explicit. Pair
each blocked state with the safe next state: a corrected command, a new request
identity, an accountable approval, a recovery queue, or an approved evidence
store.

## Keep the encounter portable

Commit source-bearing files and repository metadata. Keep these local products
outside the integrated tree:

- nested `.git` databases;
- `.venv`, `venv`, and equivalent local environments;
- `build`, `dist`, wheel, and egg-info products;
- bytecode, coverage, test, type-checker, linter, and tool caches;
- dependency trees such as `node_modules`;
- operating-system and editor metadata.

Preserve each component's license, notice, security, governance, release, and
dormant `.github` material. Nested `.github` directories describe their source
repositories and remain inactive in the enclosing `prototype-exemplars`
repository.

## Validate and reconcile

Run the focused checks named in the affected component README. For a shared
contract change, install `lims-eln-program-specification` into the local
environment and run the consumer conformance tests in simulation,
implementation, and comparison.

Before refreshing a component snapshot, record its branch, HEAD, and
working-tree posture. Apply the exclusions listed in
[`constellation-manifest.json`](constellation-manifest.json), then use a
checksum-aware dry run to confirm that the filtered source and destination are
equal. Update [`copy-receipt.json`](copy-receipt.json) in the same change.

The integrated commit records the encounter. Reconcile durable code and
contracts with their owning standalone repositories through an intentional,
reviewable change so their source histories stay complete.
