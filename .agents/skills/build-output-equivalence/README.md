# Build output equivalence

Use this skill when a build change should make the same files available through a faster or simpler implementation. Start with the artifact people download or consume. Work backward to the fixed inputs and the comparison that could reveal a consequential difference. [Skill contract](SKILL.md)

## Example

A team batches Git reads while rebuilding a static site. It supplies the old and new builders with the same source tree. The reviewer compares file paths and bytes, the generated index and the final archive. The receipt correctly identifies a new tool digest. The reviewer verifies that digest independently and compares the other receipt fields. A truncated input checks whether the builder closes the reader and leaves the previous output usable.

For a CSS optimization that promises equivalent appearance while intentionally changing bytes, select the existing viewport and interaction proof. For a comparable build-time claim, record both tool identities, the workload and the full measured operation. These checks answer different questions. [Cost and ownership analysis](../cost-and-ownership-analysis/README.md) · [Test suite composition](../test-suite-composition/README.md)

The first repository exercise measured a static-site projection and tagged transfer. The planning spike records its constraints, timings and receipt differences. Another consumer can use its own format, verifier and reproducibility requirements. [Repository study](../../../planning/testing-suite-consolidation/browser-and-production-cost-spike.md) · [Skill catalog](../README.md)
