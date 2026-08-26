# Genomic viewer repeatability — deep research payload

This payload supports the visitor-facing Repeatability beat and the focused Context Tree. It keeps the research questions, source boundaries, and receiving-surface consequences together so later collaborators can extend the work without turning the Debrief into a research ledger.

## Research use

Investigate which genomic-review decisions become more reliable when scenarios, tests, stories, components, and revision paths describe the same consequential behavior. Each finding earns space by changing a visible interface decision, a domain scenario, or a boundary-level test.

## Decision frame

1. Which disagreements should a living component library make inspectable?
2. Which context must travel with a genomic value for another population to interpret it correctly?
3. Where do contemporary interpretation products converge, and which surrounding operating concerns remain a useful product frontier?
4. Which scenarios can exercise the interface, service policy, handoff, and release rehearsal together?
5. Which industry facts transfer to this Debrief, and which remain bounded to a study, standard, vendor surface, assay, or cohort?

The durable unit is a **decision contract carried by a component**:

- genomic object under review;
- specimen, assay, modality, assembly, transcript, pipeline, and knowledge-source version;
- populations able to inspect, change, approve, or route it;
- competing explanation that remains plausible;
- observable behavior that preserves the distinction.

## Claim classes

- **Source-native observation:** the Genomic Viewer reading reports the behavior or outcome.
- **Verified fact:** a primary study or official record directly supports the claim in its named setting.
- **Standard-backed fact:** a standard defines the representation or exchange contract.
- **Supported inference:** multiple sources support a bounded product implication.
- **Open question:** an answer would materially change the interface or scenario.

## Research map

| Finding | Source and boundary | Receiving-surface consequence |
|---|---|---|
| NCI-MATCH found high SNV/indel detection agreement across 28 assays and 26 laboratories; filtering and interpretation contributed to reporting differences. | [NCI-MATCH concordance study](https://pubmed.ncbi.nlm.nih.gov/40465838/) · eight cell lines and two clinical samples in that network | Keep **Detected → Filtered → Interpreted → Reported** distinct, with a reason and source at each transition. |
| Harmonizing representations increased overlap across six oncology knowledgebases in the VICC study. | [VICC harmonized meta-knowledgebase](https://www.nature.com/articles/s41588-020-0603-8) · six knowledgebases studied in 2020 | Pair canonical identity with source-native forms; preserve assembly, accession/version, transcript, and protein projection. |
| GA4GH VRS provides precise, computable variation objects and identifiers. | [GA4GH VRS](https://www.ga4gh.org/product/variation-representation/) · adoption and local mappings remain implementation choices | Add an identity-crosswalk state and round-trip fixtures for HGVS, VCF, and VRS forms. |
| Genome in a Bottle and SEQC2 provide reference materials and cross-platform assessment substrates. | [NIST Genome in a Bottle](https://www.nist.gov/programs-projects/genome-bottle) · [FDA SEQC2](https://www.fda.gov/science-research/bioinformatics-tools/microarraysequencing-quality-control-maqcseqc) · each benchmark is bounded by its truth set, regions, mixtures, and variant classes | Give a pipeline release a compact benchmark envelope: material, truth-set version, regions, variant classes, and observed limits. |
| Plasma findings can have tumor, germline, clonal-hematopoiesis-associated, or unresolved origins. | [Paired plasma and buffy-coat study](https://pubmed.ncbi.nlm.nih.gov/39932457/) · gene-specific rates belong to its assay and cohort | Keep origin, supporting specimen, source, and review state visible together. |
| ClinVar represents germline, somatic oncogenicity, and somatic clinical-impact classifications. | [ClinVar 2025 update](https://pubmed.ncbi.nlm.nih.gov/39578691/) · one source among several, retaining submitter-level assertions | Show classification type, submitter, review status, version/date, and change since the issued report. |
| ClinGen curators document applied criteria, supporting data, and explanations for modified classifications. | [ClinGen standardized summary text](https://www.clinicalgenome.org/docs/standardized-text-for-clingen-variant-curation-expert-panels/) · VCEP practice | Treat explanation and revision as first-class component states rather than a free-text afterthought. |
| CIViC evidence items preserve source, disease context, evidence direction, revision, and editor review. | [CIViC curation documentation](https://docs.civicdb.org/en/latest/curating/evidence.html) · CIViC knowledge model | Rehearse competing evidence directions and context-specific interpretations without flattening them into one score. |
| HL7 Genomics Reporting defines report, study, specimen, variants, and implications while leaving operational routing to another layer. | [HL7 Genomics Reporting IG 3.0](https://www.hl7.org/fhir/uv/genomics-reporting/STU3/index.html) | Keep report structure and case-routing state linked and distinct. |
| FDA companion-diagnostic records bind biomarkers to named products, indications, and sample types. | [FDA-authorized companion diagnostics](https://www.fda.gov/medical-devices/in-vitro-diagnostics/list-fda-authorized-companion-diagnostic-devices-in-vitro-and-imaging-tools) · current labeling remains authoritative | A therapy-implication component carries biomarker, tumor context, sample type, named diagnostic, label source, and retrieval date. |

## Competitive capability scan

Public product documentation from [Illumina Connected Insights](https://help.connected.illumina.com/connected-insights), [QIAGEN QCI Interpret](https://www.qiagen.com/us/knowledge-and-support/knowledge-hub/events-and-webinars/webinars/clinical-reporting-for-high-throughput-oncology-1), [SOPHiA DDM](https://www.sophiagenetics.com/sophia-ddm-for-genomics/), [Velsera Clinical Genomics Workspace](https://velsera.com/products/clinical-genomics-workspace/), and [Franklin](https://help.genoox.com/en/articles/4277712-working-in-the-workbench) describes a recurring capability spine:

1. ingest multiple genomic inputs and variant classes;
2. annotate, filter, and prioritize;
3. aggregate curated knowledge;
4. support interpretation and professional review;
5. generate configurable reports;
6. reuse or refresh interpretations as knowledge changes.

These materials establish documented product surfaces, not independent comparative outcomes. A useful extension for this prototype is to foreground the organizational work surrounding that spine:

- profile-scoped eligibility before interpretation begins;
- assay, applicable body, lifecycle, and action capability as routing inputs;
- caller and filter lineage when detected and reported findings diverge;
- DNA, RNA, tissue, plasma, and matched-normal attribution at the value;
- issued interpretation and current knowledge shown as a reviewable difference;
- scenario-to-test continuity across CBO, Pathology, Quality, and Engineering;
- recovery for stale revisions, plate-level investigations, and reassignment.

## Case-review substrate

The workbench names product and infrastructure components that appear in the re-platforming corpus or its contemporary implementation companion. Coordination notes stay outside the product model.

| Product boundary | Concrete substrate | What the visible contract preserves |
|---|---|---|
| Case review and operational work | React / Next.js / TypeScript with bounded data-grid, drawer, dashboard, profile, search, and assignment components | Profile-scoped work, loading and recovery states, point-of-use evidence, and one inspectable case context. |
| Operational state and search projections | Java services; Spring Boot and PostgreSQL in the contemporary companion | Current assignment, qualification, issue, report, and revision state; keyset pagination and a named freshness watermark. |
| Genomic and report artifacts | Private Amazon S3 objects read through workload identity; exact object version and digest travel with the manifest | Large source artifacts stay version-addressed while the interface carries fitting metadata and authorized retrieval actions. |
| Cross-service movement | Transactional outbox/inbox with Amazon SQS at-least-once delivery | Stable event identity, idempotent application, observable retry, quarantine, and replay-safe recovery. |
| Runtime and configuration | Amazon ECS/ECR, Terraform modules, Parameter Store, environment-specific configuration, and bounded telemetry | Environment, deployment, configuration, and operating signals remain explicit without becoming scientific labels. |

**tk-gr-001 — On Re-Platforming Project Structure** directly supports React/Next.js, Java, shared Amazon S3/SQS libraries, Terraform, ECS, Parameter Store, and environment-specific builds. **tk-gr-002 — Implementation Architecture outcome companion** supplies Spring Boot 3.x, PostgreSQL 15+, hardened cursor/replay patterns, and OpenTelemetry-style telemetry. The stable keys pair this public-safe account with exact lineage in the authorized Threadkeeping resolver.

## Investment lens

- **Product + clinical informatics:** shape case context, decision seams, scenarios, and component behavior around real review work.
- **Platform:** bind profiles, assignments, allowed actions, current state, and typed service contracts.
- **Data engineering:** preserve versioned genomic artifacts, event identity, idempotent application, quarantine, and replay.
- **Operations + Quality:** carry exception ownership, release rehearsal, recovery paths, and learning back into the component family.

## Actor Context Board feedstock

### CBO / Curators

- **Decision carried:** classify, route, and prepare an interpretation for review.
- **Needs:** eligible work, assay identity, QC, genomic-object identity, modality-specific evidence.
- **Context to surface:** why this case reached this person; what changed since the prior review.
- **Repeatable scenario:** profile-scoped primary and secondary review.

### Pathology

- **Decision carried:** connect molecular findings to diagnostic and report context.
- **Needs:** compact case summary, specimen adequacy, source-supported interpretation, unresolved alternatives.
- **Context to surface:** tumor context, pipeline limits, curator handoff, and report revision.
- **Repeatable scenario:** knowledge changes before final sign-off.

### Translational Oncology

- **Decision carried:** explore cohorts, biomarker context, and trial relevance.
- **Needs:** query definition, assay coverage, trial criteria, knowledge date.
- **Context to surface:** why a case appears in or remains outside a cohort.
- **Repeatable scenario:** an advanced-search result changes after an evidence refresh.

### CBI

- **Decision carried:** explain how a genomic event moved through detection, filtering, and reporting.
- **Needs:** raw and derived measurements, caller/filter versions, benchmark envelope, novel-event inspection.
- **Context to surface:** the exact transition where two pipelines diverged.
- **Repeatable scenario:** a benchmark variant is detected by two pipelines and reported by one.

### Process / Automation

- **Decision carried:** contain a distributed operating anomaly and restore flow.
- **Needs:** plate relationships, contamination or discordance indicators, re-run and re-queue state.
- **Context to surface:** affected cases, containment boundary, and current owner.
- **Repeatable scenario:** one plate-level signal gathers distributed cases into one investigation.

### Quality / Regulatory

- **Decision carried:** connect intended use, issued state, changed artifact, and accountable release.
- **Needs:** applicable product and jurisdiction determination, exact release object, revision history.
- **Context to surface:** which rule, artifact, or source changed and which released work it affects.
- **Repeatable scenario:** new knowledge proposes re-review while the issued report stays preserved.

### AI assistance

- **Contribution:** propose normalized matches, relevant sources, and scenario extensions.
- **Context to surface:** source boundary, retrieval date, affected objects, uncertainty, reviewer state.
- **Receiving state:** proposals remain inspectable and editable; relevant people retain interpretation and release decisions.

## Scenario corpus

```gherkin
Scenario: Equivalent alterations arrive under different names
  Given an ERBB2 insertion is represented differently by two oncology knowledgebases
  When a curator opens the identity crosswalk
  Then the equivalent source forms share one normalized identity
  And assembly, accession, transcript, protein projection, source, and retrieval date remain visible
```

```gherkin
Scenario: A plasma TP53 finding has several plausible origins
  Given a low-VAF TP53 alteration is detected in plasma
  And matched white-blood-cell evidence is available
  When the finding enters interpretation
  Then tumor, clonal-hematopoiesis-associated, germline, and unresolved origins remain distinguishable
  And the reviewer can inspect the evidence supporting the current assessment
```

```gherkin
Scenario: DNA and RNA support belong to different specimens
  Given a fusion has DNA and RNA supporting-read evidence
  When a curator compares the evidence
  Then every value names its specimen and modality
  And the relevant source artifact remains one action away
```

```gherkin
Scenario: A detected alteration leaves the reportable set
  Given a benchmark alteration is present in caller output
  When filtering excludes it from the reportable set
  Then the interface displays the filter, reason, pipeline version, and report consequence
```

```gherkin
Scenario: Current knowledge differs from an issued interpretation
  Given a report retains the assertion approved at revision r17
  And a source publishes a later classification
  When the case is revisited
  Then the issued interpretation remains visible
  And current knowledge appears as a reviewable difference with source and retrieval date
```

```gherkin
Scenario: A new assay enters the operating surface
  Given a manager has an assay-and-jurisdiction sign-off model
  When profiles are assigned in batch
  Then eligible primary and secondary reviewers are visible before launch
  And the same scenarios exercise routing, component behavior, service policy, and release rehearsal
```

## Presentation contract

The Debrief receives a curated, view-only Context Tree presentation:

1. Actor Context Board — Soft Color Blocking, initial and prominent.
2. Situation Model — populations around Case, Specimen, Assay, Variant, Evidence, and Report.
3. Cross-organization Context Tree — group → knowledge need → context to surface → receiving architecture.
4. Repeatability Matrix — scenario × pure decision × component × transaction × benchmark.
5. Competitive Pattern Map — documented market baseline and foregrounded operating concerns.
6. Interface Storyboard — Cobalt Evidence views of eligible work, multimodal review, knowledge change, and a distributed investigation.

The presentation keeps view switching, group filters, contextual highlighting, a semantic table, and keyboard reading order. Authoring and aesthetic controls remain with the full collaboration prototype.

## Research boundaries

- Vendor materials describe advertised surfaces rather than independent clinical outcomes.
- Benchmarks establish performance inside their characterized truth sets, regions, mixtures, and variant classes.
- Somatic and germline classifications remain distinct concerns.
- Product classification follows actual intended use; this research does not classify the historical genomic viewer.
- Synthetic prototype cases remain free of patient-identifying information.

## Machine Node — genomic viewer repeatability research

```yaml
machine_node_update:
  node_id: "context-canvas.genomic-viewer.repeatability-research"
  kind: "threadkeeping"
  visibility: "collaboration_thread_only"
  research_object: "repeatable genomic-review decisions across populations, representations, modalities, sources, and releases"
  decision_targets:
    - scenario_bearing_component_library
    - actor_context_board
    - variant_identity_crosswalk
    - multimodal_provenance
    - knowledge_refresh_difference
    - competitive_capability_scan
  claim_classes:
    - source_native_observation
    - verified_fact
    - standard_backed_fact
    - supported_inference
    - open_question
  live_edge:
    current: "The research maps domain disagreements to visible interface states, scenarios, and test boundaries."
    next: "Use the Actor Context Board and Cobalt Evidence workbench to show which behavior transfers and which context must travel with it."
```
