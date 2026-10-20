# Third-party posture

## Installed Python dependencies

The offline Python verification surface uses two pinned direct dependencies:

- `jsonschema 4.26.0` — MIT; Draft 2020-12 instance and format validation.
- `PyYAML 6.0.3` — MIT; safe Machine Node parsing before schema validation.

Their package metadata carries the complete transitive license set installed
by the adopting environment. Dependency automation proposes reviewed version
advances through the repository's pull-request controls.

## Downloaded rehearsal tooling

The hosted database rehearsal downloads pinned container images at execution
time. The repository records image coordinates and digests and does not
redistribute their layers.

- `flyway/flyway:13.0.0-alpine` — [Flyway Community source is
  Apache-2.0](https://github.com/flyway/flyway/blob/main/LICENSE.md). The
  multi-architecture image is pinned by manifest-list digest. The image's own
  license and notice inventory remains authoritative for its Alpine, JVM, JDBC,
  and other packaged components.
- `postgres:16-bookworm` and `postgres:18-bookworm` — PostgreSQL is distributed
  under the [PostgreSQL License](https://www.postgresql.org/about/licence/).
  Each Docker image is pinned by digest; the
  image's packaged notices remain authoritative for Debian and bundled
  components.

Digest pinning establishes artifact identity. Dependency review, vulnerability
policy, notice retention, export controls, and image-registry admission remain
part of the adopting organization's software-supply-chain process.

Optional production adapters may use vendor-supported packages after tenant and
license review:

- `sapiopylib` — MPL-2.0.
- `benchling-sdk` — Apache-2.0.
- `labkey` — Apache-2.0.

This file records review context rather than redistributing packages or
container images. Repository licensing and contribution policy govern this
exemplar itself.
