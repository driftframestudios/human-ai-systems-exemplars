# Public research extract: works and editorial topics

This companion makes 13 selected public visualization works and their
21 editorial topic memberships inspectable through the Atlas's topic-by-kind
figure, exact table, and source-record account. It describes a curated
bibliography, with coverage complete only for the explicitly listed subset.

The source of record is [sources.v1.json](sources.v1.json). The deterministic
[summary.v1.json](summary.v1.json) carries both aggregates and full admitted
records. The selection date is 2026-10-04. The current request authorizes this
bounded extract of already-public citations and public Registry guidance.

## Selection and source standing

The candidate route was the visualization skills' public
[evidence and source map](../../../../.agents/skills/data-visualization-foundations/references/evidence-and-source-map.md),
which also indexes the Atlas bibliography. Each selected work has its public
source route, version or inspected living edition, inspection date and scope,
source credit, evidence standing, supported consequence, and transfer boundary.

Selection favors useful decisions about comparison, interpretation,
distribution/missingness, accessibility, web delivery/state, and production.
The 13 records themselves are the exact enumeration. The source's
`selection.exclusions` and `selection.coverage` retain the selection boundary;
this is not a systematic review or a census of literature, the Registry, or a
workspace. Search retrieval counts play no part in the dataset.

Inspection used primary/author documentation, public articles/PDFs, or the
publisher/author abstract where the record says so. The Registry record was
read through the connector under confirmed public Registry ancestry; its
`Full Source Entry` supplied the public route. The route's anonymous rendering
was not established. The extract carries that public route and a short
paraphrase, rather than connector metadata, page dumps, private locators, or
unrelated search results. Source content was inspected only to the declared
scope; a citation is not a claim to have replicated a study.

`citationUse: "observed-in-skill-evidence-map"` records a citation occurrence in
that named repository bibliography on the inspection date. It does not count
citations elsewhere or establish real-world use. Every record has
`realWorldApplication: "unspecified"`; the summary preserves a null application
count. Absence of application evidence supplies neither a zero nor a positive
application claim.

## Counting contract

- A work contributes once to `totals.works` and one descriptive evidence kind.
- Empirical studies include the defined publication review as well as the
  graph-design experiment. Technical guidance covers frameworks, official
  documentation, and specifications. Practitioner sources cover authored
  design reasoning and the Registry synthesis. These are source types, not
  evidence-strength ranks.
- A topic membership is an explicit editorial classification, not a measured
  outcome, demonstrated application, citation frequency, or impact score.
- Each work contributes at most once to each topic. Within one topic the three
  evidence-kind counts partition its works. Across topics a work can recur:
  topic totals sum to 21 memberships, not 13 unique works.
- Seven works have multiple topics. The kind totals are 2 empirical, 6
  technical-guidance, and 5 practitioner works.
- D3's inspected sections form one documentation-work record; Wilke's inspected
  chapter contributes one book record. Distinct commentary and the study it
  discusses are separate works, not independent empirical confirmations.
- Zero cells mean no assigned works in this supplied set. Wider coverage and
  organizational application remain unspecified.

The fixed topic order is `comparison`, `interpretation`,
`distribution-and-uncertainty`, `accessibility`, `web-delivery-and-state`, and
`production-and-validation`. The distribution/uncertainty topic includes
missing-observation support. A receiving figure may label these editorial
categories in ordinary language while preserving the ids and counting rule.

## API and ownership

The source owner is [atlas-research-data.mjs](../../../../tools/atlas-research-data.mjs).
It exports `SOURCE_PATH`, `SUMMARY_PATH`, `SOURCE_SHA256`, `EVIDENCE_KINDS`,
`TOPIC_KEYS`, and these functions:

- `validateResearchRecords(records)` validates and returns detached records.
- `parseResearchSource(text)` admits the version-1 source envelope:
  `{ id, version, selectedOn, selection, records }`.
- `summarizeResearch(records)` returns `{ totals, topics }`.
- `researchDocument(records)` returns a pure, source-neutral document containing
  records, aggregates, counting notes, the citation owner, and unspecified
  real-world application.
- `buildResearchData({ check: false })` verifies the fixed input bytes against
  the admitted SHA-256 and writes the summary. With `check: true`, it compares
  the existing summary without writing. It returns
  `{ works, topicMemberships, topics }`.

The summary's consumer contract is:

`totals: { works, topicMemberships, multiTopicWorks, byEvidenceKind }`

`topics: [{ id, works, byEvidenceKind, workIds }]`

`byEvidenceKind` always has `empirical-study`, `technical-guidance`, and
`practitioner-source` integer counts, including zero cells. `workIds` resolve
against the full `records` array. Record `evidenceStanding`,
`supportedConsequence`, and `transferBoundary` supply the source disposition.

Only the fixed-file build adds
`source: { path, sha256, standing, selectedOn, selection }`.
Its `byte-verified-public-editorial-extract` standing means byte identity with
this admitted selection. It does not verify external pages at build time,
certify empirical claims, or approve a receiving publication. Pure fixture
documents never acquire that digest or verified-file standing.

## Input and cost boundaries

The parser accepts at most 250,000 JSON characters and 64 work records. It
requires the exact versioned envelope and owned fields, plain records, dense
arrays, bounded nonempty text, real calendar dates, one declared kind per
work, one to six distinct topics, and one to four inspection routes. All
consumed properties are enumerable own data fields; missing values, accessors,
unsupported fields, sparse arrays, and inherited substitutes are rejected.
Ordinary plain data is the API contract, not live instances or proxies.

URLs must exactly match the small reviewed public-route set in the owner.
This gate does not infer that a generic HTTPS or Notion URL is public.
An added route or work needs source inspection and an explicit reviewed
source revision. Work ids and any shared canonical/inspection URI detect
duplicates; identity across entirely different URLs still requires editorial
review. Semantic classification and paraphrase accuracy remain review tasks.

Validation and aggregation take O(n + memberships) time with bounded fields
and a fixed topic/kind vocabulary; parsing also takes O(source-text length).
Detached records, identity sets, and topic work-id lists require
O(n + memberships) space. No sorting or network access occurs. Outputs retain
supplied work order and fixed topic/kind order, making repeated builds
deterministic. Only newly allocated output state is mutated.

## Generation, checks, and receiving boundary

From the repository root:

`node tools/atlas-research-data.mjs --write`

`node tools/atlas-research-data.mjs --check`

`node tools/build-atlas-research-view.mjs`

`node tools/build-atlas-research-view.mjs --check`

`node --test tests/visualization-fidelity-atlas/atlas-research-data.test.mjs tests/visualization-fidelity-atlas/atlas-research-view.test.mjs`

The focused fixtures independently exercise overlap, duplicate work/URI
admission, zero versus unspecified application, invalid/missing/owned fields,
record and evidence kinds, exact source routes, detached ownership, and
byte-bound derivation. These checks establish the data contract, not rendered
legibility, accessibility, or real-world use.

The [view owner](../../../../tools/build-atlas-research-view.mjs) derives the
[standalone SVG](../../../img/plot/atlas_public_research.svg), exact table, and
source dispositions in the
[Atlas research example](../../../context-canvas/visualization-fidelity-atlas.html#research-gallery-title).
It owns the `atlas-public-research` marker pair and reuses the Atlas's existing
figure, table, disclosure, and navigation styles. Pure fixture renderers retain
source-neutral wording; only the verified-file route includes released assets
and selection provenance.

The [suite catalog](../../../../tests/suites/catalog.json) keeps the data/view
contracts in `node.visualization-fidelity-atlas` and the rendered observation in
`browser.visualization-fidelity-atlas.atlas-research.browser`. The Python
`visitor-labels` component owns table inventory and projector agreement.
The focused browser route is:

`node --test tests/visualization-fidelity-atlas/atlas-research.browser.mjs`

That route exercises the table, source disclosure, full-size SVG link, narrow
keyboard scrolling, and print visibility. Its local iframe substitute keeps
the separately owned Atlas instrument outside this observation. Source counts,
rendered legibility, assistive-technology use, and organizational application
remain distinct evidence questions.

The asset inventory and production route manifest include the SVG and its three
source companions. Hosted publication remains held until a reviewed tag and
complete public carrier are produced.
