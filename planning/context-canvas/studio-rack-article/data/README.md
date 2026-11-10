# Studio story research data

These dated extracts let a collaborator recover source records, compare visual
encodings, and select episodes for the [future Article plan](../README.md).
They preserve the research observation of **9 November 2026**. The Article's
accepted final revision and drafting remain on the human's cue.

## Sources and retained owners

| File | Recoverable material | Counting unit and boundary |
| --- | --- | --- |
| [History](history.2026-11-09.json) | Declared path families, 201 scoped commit records, file changes, snapshots, 992-node ancestry graph, 42-commit branch corridor, and candidate historical anchors | Distinct nonmerge commit objects use full ancestry and SHA identity. The 160 Studio-specific records exclude the shared About host. Family memberships overlap; promotions can repeat patch content. |
| [GitHub collaboration](collaboration.2026-11-09.json) | 301 Issue/PR records, all 129 PR movement records, 20 search-coverage records, 1,194 unclassified body-reference edges, and selected discussion summaries | The seven principal aliases find 116 unique records. The wider union includes adjacent work. Current labels and milestones describe observation-time membership. |
| [Source mentions](mentions.2026-11-09.json) | Names and path aliases with source file, start/end line and occurrence counts | 2,419 readable tracked text files examined; 186 files and 1,550 unique match-start lines matched. Aliases and generated copies overlap. |
| [Narrative sources](narrative.2026-11-09.json) | 20 source-grounded records connecting rationale, preserved studies, contracts, media routes and possible story value | Curated editorial candidates retain their source and line reference. The records are planning inputs rather than Article prose. |
| [Measure candidates](measure-candidates.2026-11-09.json) | Seven reader questions with units, source fields, candidate forms and interpretation boundaries | Candidate visual contracts guide exploration; they carry no score or ranking of collaborators. |
| [Reviewed episodes](episodes.2026-11-09.json) | Selected episodes, typed Issue-to-PR relationships, complete selected-PR commit membership and shared-record identity | A later, bounded supplement reads source bodies and paginated membership. Addressed Issues and PR commit objects retain distinct counting units; contextual references stay outside the addressed-Issue count. |

The source revision is `6c0e090e121f1d708d019bb3926868de9dc2a390` on `dev`;
the independently observed `main` revision is
`4597faf76507cf71baa7febf5d43f2c220d567bb`. GitHub metadata was observed at
18:14:34 UTC; source-mention enumeration was recorded at 18:12:53 UTC.
These coordinates remain the extract's fixed basis as live work advances.

The original five JSON files retain that frozen observation. The episode JSON
adds its own observation time, source-reviewed relationships and commit-membership
coverage; it leaves the earlier unclassified references unchanged.

These JSON files are the retained data owners. The earlier CSV companions
and summary inventory repeat their records and are therefore omitted here.
The measure candidates' `source` strings name a retained file and its JSON
field. Numeric data and source identities retain their original meanings.

## Recovering a view

- **Snapshot treemap:** select one revision in `history.snapshot_files` or one
  candidate anchor in `history.story_anchor_snapshots`; group by `family` and
  `kind`, then sum `bytes`. The current `dev` selection is 225 files and
  5,113,448 bytes. Authored source, tests, generated projections, mixed HTML
  hosts, vendor notices and the shared About host retain separate kinds.
- **Change view:** `history.file_changes` supplies additions/deletions by SHA
  and path. Keep textual churn separate from snapshot bytes, and keep initial
  imports and generated copies visible in the selection rule.
- **Branch view:** `history.all_dev_dag` carries commit-parent edges;
  `collaboration.records[].pull_request` carries base/head references, merge
  dates and merge SHAs. Use `merged: true` for accepted PR movement. A body
  reference is a navigation lead until its relation has been read and classified.
- **Issue view:** select records whose `type` is `issue` before counting bug
  labels or Issue states. Milestone 23 contains 148 Issues at this observation,
  of which 34 carry `bug`. Label memberships can overlap. The `coverage` and
  `matched_searches` fields recover the chosen discovery population.
- **Story view:** combine a narrative source with a curated discussion summary
  and its public record. Preserve observation, interpretation, proposed transfer
  and human-held decision as distinct roles.
- **Episode scatterplot and relation map:** use the reviewed episode supplement.
  Count distinct addressed Issues and the union of selected PR member SHAs for
  each episode. Show relationship types, partial delivery and shared membership.
  Keep all-member, nonmerge-member and receiving-integration counts distinct;
  the [expanded visual plan](../visual-plan.md#episode-counting-and-relationship-meaning)
  specifies selection and interpretation.
- **Box plots:** select the earlier collaboration snapshot's 107 merged PRs
  assigned to milestone 23. Use `pull_request.commits` or
  `pull_request.changed_files` as separate raw observations. A detail selection
  excluding promotion #707 has 106 observations and keeps that PR's exact value
  and source separately visible. The
  [distribution contract](../visual-plan.md#distribution-contract) defines
  quartiles, whiskers and population boundaries.

Counts, byte weights and dated events support navigation through the material.
Working hours, human/AI contribution shares, productivity and AI capability
remain unspecified. GitHub record lifetime is elapsed calendar time; authored
and committed timestamps identify events. The first appearance of the two
original instruments in the August 26 successor baseline establishes repository
availability, while their prior creation history remains outside this extract.

## Reproduction and refresh

`history.methodology` contains the extraction and independent count shapes;
`history.scope_roots` defines every included path family. Full-history path
counts use:

```sh
git rev-list --count --full-history --no-merges <dev-revision> -- <family-paths>
```

Snapshot weights come from `git ls-tree -rl <revision>`. The history extraction
reads nonmerge `--numstat --no-renames` records from the complete declared
ancestry, then filters paths. All 13 family sets agree with independent
full-history traversal. `traversal_example` preserves why ordinary simplified
path history can omit a recorded promotion.

`collaboration.coverage` records each query, record type, searched fields,
retrieved count, page count and completeness flag. Replay those queries through
the GitHub connector in the named repository, exhaust the reported pages, and
deduplicate by repository plus Issue/PR number. Current indexed text supplies
discovery; earlier body revisions, deleted text and unindexed changes keep their
separate evidence boundary. Selected discussions received deeper reading;
`fetched_comment_sources` names that subset.

Source mentions enumerate `git ls-files` at the selected revision, admit readable
UTF-8 text, and record match starts while preserving end lines. Matching is
case-insensitive, spans whitespace, recognizes the hyphen variants in
Cross-Functional and the HTML ampersand in Project Resourcing & Spend, and uses
the ten aliases named in `stats`. Generated carriers remain in this discovery
view. A refresh can add another dated observation once the human chooses the
next story boundary; the present snapshot stays available for comparison.

## Public boundary and observation

These extracts retain public repository references, repository-relative paths,
normalized observations and source-grounded summaries. Exact gated locators,
raw discussion bodies, credentials, user-specific filesystem paths and browser
state stay with their authorized owners. Every extracted URL points into this
public repository; queries appear as search definitions rather than retrieval
URLs containing parameters.

The original preservation check parsed the five initial JSON files, reconciled snapshot totals
and unique record identities, inspected the admitted URL population, and found
zero private-workspace URL, credential-shaped token, user-path or opaque
workspace-ID matches in this bounded extract. That observation establishes the
reviewed extract's standing; repository history and hosted record revisions
retain their separate inspection scopes.
