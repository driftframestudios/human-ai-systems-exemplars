# Source-bound table observation stages

`table-reading-contract.mjs --plan` enumerates exact cases before executable work.
Unknown selectors and missing option values retain an actionable assertion. A normal invocation admits
source-owned definitions, serves captured local bytes, observes fresh browser
contexts, publishes complete cases, then publishes one validated generation.

```sh
node --test tests/tables/*.test.mjs
node tools/table-reading-contract.mjs --mode closure --family all --plan
node tools/table-reading-contract.mjs --mode closure --family all --output .visual-runs/table-repairs/contract-v3
node tools/table-reading-contract.mjs --mode closure --family all --output .visual-runs/table-repairs/contract-v3 --resume
node tests/tables/conditioning.browser.mjs --resume
node tools/core-planning-instrument-contract.mjs --artifact sharedSurface --resume
```

## Ownership and recovery

- `evidence-inputs.mjs` names material-check executable and data dependencies.
- `evidence-campaign.mjs` owns enumeration, captured input identity and complete
  campaign publication. The table runner supplies the first bounded adapter.
- `observation-checkpoint.mjs` owns atomic per-case recovery. Version 2 reopens
  records created under the earlier dependency contract.
- `plan.json` names the current requested population; `summary.json` names its
  result and completion reference. `completion.json` points to the most recent
  complete immutable generation. A failed attempt preserves that older pointer;
  its summary explicitly carries the current incomplete standing.
- Generations embed the exact requested inventory and complete case records with
  dependency/artifact hashes. Publication checks current local bytes and freshly
  packaged child bytes. A source change earns re-entry rather than a completion.
- Concurrent requests share one pending source capture. Screenshots use immutable
  content-addressed paths, published by flushed temporary-file rename under the
  writer lock. An interrupted successor preserves the prior generation's captured
  bytes as well as its completion pointer. A retry owns a fresh temporary path;
  abandoned temporary files remain outside generation membership.
- One writer holds `campaign.lock` per output directory. Ordinary exits release
  it. After a process interruption, inspect its local PID, retain the completed
  cases and remove a confirmed abandoned lock before `--resume`. An active writer
  keeps ownership. This contract covers process interruption; power-loss durability
  and multi-file source transactions retain separate owners.

## Cost model

Let F be declared families, N enumerated cases before exact-case filtering,
C selected cases, B unique admitted input bytes, E dependency entries,
R serialized result bytes and A artifact bytes. Parsing/package construction and
browser layout remain named external cost terms.

| Operation | Source-derived cost and boundary |
| --- | --- |
| Execution plan | O(F + N) time and O(N) storage, including viewport/state products before exact-case filtering |
| Snapshot admission | O(B) hashing/read work and retained bytes; cache lookups have expected constant-time map access |
| Fresh identity validation | O(total referenced bytes + E) per validation; repeated references are visible in metrics |
| Checkpoint read/write | O(serialized case bytes) plus receiving dependency validation and filesystem costs |
| Campaign publication | O(C log C + R + A) plus dependency validation; sorted identity comparison and one generation serialization |
| Browser observation | Existing table/token/Range traversal and browser layout costs; stage splitting makes no new asymptotic claim |

Capture reads, fresh reads, hash preparation time, executed navigations, reused
cases and stage durations retain their distinct units. These are diagnostic local
measurements rather than paired-policy cost estimates. The research receiver in
PR #327 / #320 interprets them; #330 owns later paired replay.

The finite fixtures establish exact selection, input perturbation, artifact
completion and actual inspector-transition assertions. Broader parser migration,
store compaction and predictive scheduling have separate adoption gates.
