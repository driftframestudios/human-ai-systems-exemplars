# fast-uri dependency security floor

## Desired state and next move

The repository-root npm tree resolves every `fast-uri` instance to a reviewed
stable version at or above 4.1.5. [Issue #292](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/292)
carries acceptance and current results; [PR #291](https://github.com/driftframestudios/human-ai-systems-exemplars/pull/291)
carries implementation and review.

After any Ajv or dependency-lock update, run the dependency-security check and
the affected schema consumers before proposing acceptance.

## Advisory observation

The maintainer advisories retrieved on 2026-09-30 distinguish two mechanisms:

- [CVE-2026-86472](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj)
  concerns host-case normalization after percent decoding. Fixed lines include
  2.4.7, 3.1.8, and 4.1.5.
- [CVE-2026-86818](https://github.com/fastify/fast-uri/security/advisories/GHSA-jvvf-x445-j334)
  concerns encoded mailto field names changing meaning across parse/serialize.
  The affected range is 4.1.3 through 4.1.4; 4.1.5 supplies the fix.

Both have moderate severity in the maintainer records. The previous lockfile's
3.1.8 was outside these two affected ranges. The explicit repository decision
adopts the stronger 4.1.5 floor requested for continued installation.

## Source-owned enforcement

The root `package.json` declares:

```json
"overrides": {
  "fast-uri": "4.1.5"
}
```

[npm reads overrides from the root package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).
The generated `package-lock.json` records the selected resolution and integrity.
Keep the policy in the manifest and regenerate the lock through npm.

Ajv 8.20.0 declares `fast-uri ^3.0.1`. The override intentionally crosses that
major-version range. The exact pin gives the compatibility observation a
reproducible target; later secure versions receive an explicit pin update and
the same consumer checks. The root-wide override also covers additional
transitive consumers introduced into this npm tree.

## Fitting observations

```sh
npm ci --ignore-scripts
npm ls fast-uri --all
npm run test:dependency-security
node --test tests/investment-analysis/core.test.mjs tests/schema-pages/builder.test.mjs tests/narrative-architectures/schema-contracts.test.mjs
npm run check:schemas
npm audit --json
```

The dependency check examines every fast-uri lock entry and matching installed
version, verifies Ajv's actual resolution, exercises both advisory mechanisms,
and compiles relative references with draft-07 and 2020-12 Ajv consumers.
Fixtures use reserved example hosts and local parsing; external requests stay
outside these tests.

The clean install establishes reproducibility. The regression and consumer
checks establish their named behaviors. The audit supplies the advisory
inventory available at observation time. These signals retain separate claims
about compatibility, known vulnerabilities, and runtime exposure.

## Scope and retirement

This record covers the repository-root npm installation. Independently managed
dependency trees retain their own lockfiles and observations. The investment
browser calculation layer remains dependency-free; Ajv serves local validation
and build/test tooling.

Retire or narrow the override when the owning direct dependencies naturally
resolve every instance at or above the floor, a clean install demonstrates that
resolution, and the focused compatibility checks pass. Keep the floor regression
available after retirement. New advisories or a changed consumer reopen the
version decision through the same Issue or a clearly linked successor.
