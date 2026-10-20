---
name: contextual-jargon-scan
description: Classifies potentially specialist or inside wording within a bounded corpus and revises replaceable shorthand into ordinary language. Applies when public, visitor-facing, or cross-team prose may rely on context its reader does not share, including an in-stride review of material already receiving substantive change.
---

# Contextual jargon scan

## Contract

- **What:** A context-aware language review that distinguishes useful precision from shorthand a reader must decode.
- **When:** A bounded public, visitor-facing, cross-team, or durable collaboration surface may carry terms whose meaning depends on local practice.
- **Boundaries:** Literal language, exact technical terms, quotations, citations, code, identifiers, governed vocabulary, accessibility meaning, and useful compact metaphors retain their source fidelity. The scan stays within the receiving task and leaves vocabulary governance and publication decisions with their established owners. Search and lint tools identify candidates; contextual reading decides disposition.
- **Result:** A scoped occurrence map with targeted revisions, intentional retentions, deferred receivers, and a verification signal tied to the changed prose.

## Fit and attention

- **Useful when:** A reader may understand the sentence grammatically while missing the intended object, action, relationship, or consequence.
- **Poor fit when:** The concern is primarily tone, evidence calibration, information architecture, technical correctness, or governed terminology rather than contextual shorthand.
- **Smallest useful dose:** Named word families across the files already in scope, plus enough surrounding prose to classify each material occurrence.
- **Interactions:** Desired-state, evidence-calibrated writing shapes replacement prose. `context-canvas-surface-reading` supplies the visitor job and source owners for Canvas pages. `source-authority-mapping` preserves exact language when another source governs the term. `collaboration-accounting` receives material natural-use evidence.
- **Rest or release when:** A term already performs an exact or useful job, or changing it requires a source-owner or content decision outside the current task. Record the fitting receiver only when the deferral changes continuation.

## Rules

### Rule: Scope precedes the scan

Name the receiving corpus, intended readers, files already changing, and explicit exclusions. An in-stride scan stays with the active surface rather than becoming an automatic repository-wide rewrite.

### Rule: Word families produce candidates

Search inflections and nearby forms of observed terms. Counts locate repetition and variation; they do not establish a defect or a completion threshold.

### Rule: Each occurrence receives a functional class

Classify a material occurrence as:

1. literal ordinary language;
2. an exact technical or governed term;
3. quoted, cited, or source-owned language;
4. a useful compact metaphor whose relationship is retrievable; or
5. replaceable shorthand that asks the reader to infer local meaning.

The same word family may receive several classes within one page.

### Rule: Replacement follows function

For replaceable shorthand, name the concrete object, action, relationship, boundary, or consequence the term was carrying. Prefer the smallest ordinary-language revision that preserves technical depth and the page's voice.

### Rule: Useful compact language can stay

Retain a specialist term or metaphor when it improves precision, retrieval, or continuity. Define it near first use when the receiving reader otherwise lacks enough context.

### Rule: Fidelity-bearing text keeps its owner

Preserve source titles, direct quotations, code, schema keys, identifiers, product names, established technical terms, and accessibility meaning. Route a disputed source-owned term to its authority rather than normalizing it locally.

### Rule: Reconciliation preserves meaningful variation

Reconcile duplicate definitions and conflicting uses when they describe the same concept. Route-specific voice, deliberate unevenness, and technically meaningful distinctions can remain.

### Rule: Tooling remains advisory

`rg`, a word-family inventory, or a future Vale rule may make candidates easier to inspect. A zero-occurrence result is neither required nor sufficient. Deterministic tooling forms only after repeated work demonstrates a stable mechanical check.

### Rule: Verification returns to the reader

Read each changed sentence in its paragraph, heading, table, metadata, or accessibility context. Confirm that the intended object and consequence remain clear, then run the receiving surface's existing structural checks.

## Operating sequence

1. **Bind the review:** Name corpus, reader, active change, exclusions, and candidate word families.
2. **Gather occurrences:** Search each family with enough context to read its actual role.
3. **Classify:** Mark material occurrences as literal, exact, source-owned, useful compact language, or replaceable shorthand.
4. **Choose the smallest action:** Retain, define, revise, or defer each decision-changing occurrence.
5. **Revise in context:** Replace shorthand with concrete nouns, verbs, relationships, or consequences; shape the resulting prose around the desired state, evidence, and next useful move.
6. **Reconcile locally:** Inspect nearby headings, repeated definitions, links, metadata, and accessibility text for agreement.
7. **Verify:** Re-read the receiving passage, perform a targeted rescan, and run the surface-owned checks.
8. **Return:** Name the scoped corpus, concrete changes, intentional retentions that matter, validation signal, coverage boundary, and any next receiver.

## Output contract

The return contains:

- the corpus and exclusions;
- candidate word families and material occurrence classes;
- the targeted change list or a grounded no-change result;
- intentional retentions only where their rationale changes future work;
- the exact verification command or reading signal and its coverage boundary; and
- a named receiver for any material deferral.

## Representative scenario

### Scenario: One word carries exact and vague meanings

- Given `seam` names a verified integration boundary in one passage
- And the same word loosely stands for an unspecified transition elsewhere
- When the occurrences are classified
- Then the exact boundary term remains, with a local definition when useful
- And the vague occurrence names the systems, handoff, or responsibility boundary it actually means
- And completion depends on reader legibility rather than eliminating the word family

## Completion

The scan completes when a reader can retrieve the material objects, actions, relationships, and consequences without relying on collaboration-local context; retained specialist language has an exact or useful role; revisions preserve source fidelity and technical depth; and verification plus any deferred receiver remain visible.
