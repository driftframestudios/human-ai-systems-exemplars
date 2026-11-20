---
name: build-output-equivalence
description: Compares the artifacts a build or packaging change delivers at fixed inputs. Applies when a team replaces a reader, index, cache, compiler step, or packager and needs to establish which output bytes, metadata, and failure guarantees survive.
---

# Build output equivalence

## Contract

- **What:** Compare two implementations of a build through the files, archives and verification records their consumers receive.
- **When:** A team changes how a build reads, selects, transforms or packages inputs and intends to preserve a published artifact contract.
- **Boundaries:** The release owner defines which properties consumers rely on and authorizes publication. A local comparison can exercise the release verifier in temporary storage. Timing, rendered behavior and live delivery each have their own observation.
- **Result:** A reviewer can identify the fixed inputs, the outputs compared, each expected difference, the first unexplained difference or verified match, and the revision that restores the accepted behavior.

## Fit and attention

A good first use is a compiler or build-tool refactor that promises identical deliverables. If a team intentionally redesigns a page, the design owner supplies the new visual expectations. If the change only reorganizes test scheduling, the suite owner compares case membership and outcomes. For a one-file deterministic generator, one saved input, an independently obtained expected file and an exact byte comparison can complete the work.

## Rules

### Rule: The payload and the builder have distinct identities

Record the input tree, configuration, toolchain, and both builder revisions. Fix the options and receipt clock when they affect the result. Run each builder against the same selected input. A clean checkout for each implementation can still feed two different payloads when a build embeds its current revision. Supply the same input tree explicitly where the interface permits it. Otherwise record and investigate that difference at the field that carries it.

### Rule: Consumers determine the comparison

Compare relative paths and file types first. Include order and modes wherever readers or the format depend on them. Then compare lengths and bytes for each member. When teams ship an archive, compare the archive itself and open it with the receiving verifier. Equal extracted files establish payload equality. Compression, ordering, timestamps or permissions can still change the downloadable archive. For a format with intentionally variable encoding, the release owner names the semantic comparison before anyone interprets timing.

### Rule: Attestation describes the builder that actually ran

A receipt can truthfully identify a new tool even when every delivered byte agrees. Name the specific fields expected to differ, verify their new values against the actual tool, and compare the remaining fields in full. A broad allowance for metadata could absorb a changed source revision or an unexpected member. Keep the first unexplained difference visible.

### Rule: A faster failure preserves the caller’s recovery path

Choose one fault made plausible by the change. A streaming reader might stop midway through a declared payload. A path index might encounter two names with the same portable spelling. Start with accepted output, exercise the fault through its normal entry point, and inspect the failure and the retained output. When a temporary file or child process belongs to the builder, observe its release. The caller should be able to retry from a known state.

## Operating sequence

1. Ask which deliverable will be accepted, who consumes it and which known-good build or artifact supplies the expectation.
2. Record the input revision, selection, tool revisions and reproducibility-sensitive settings. Use isolated temporary destinations for the ordinary build and verification commands.
3. Compare membership, content, and the outer format. Check attestation fields against their own source. Report a discrepancy at the earliest layer where it appears.
4. Exercise a fault that distinguishes the candidate mechanism from the accepted one. Keep the successful comparison and the failure-path observation separately inspectable.
5. Once the artifacts agree within the stated contract, alternate the two builders on the same workload if cost affects adoption. Record each complete attempt, emitted bytes, elapsed phases, and any setup cost transferred to another process or runner.
6. Return the observed differences and recovery revision to the release owner. Keep the measured source and workload beside any speed claim.

## Scenario

- **Given** a build replaces individual object reads with one framed stream and its receipt includes the packaging tool digest,
- **When** both tools package the same tagged tree and the candidate also receives a truncated reply,
- **Then** the reviewer can verify matching archive bytes, validate the new tool digest, and observe the candidate release the reader and preserve the accepted artifact on failure.

## Recovery and completion

An unexpected difference stops the adoption comparison at the affected layer. Reuse the known-good builder for the accepted output and replay the smallest input that reproduces the discrepancy. The work is complete when the receiving verifier accepts the artifact, every observed difference has an agreed meaning, and the selected fault produces the promised recovery state. A new archive format, tool-identity field or consumer requirement reopens that comparison.
