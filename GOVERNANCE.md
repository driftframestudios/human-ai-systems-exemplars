# Repository governance

**Status:** Working draft

## Purpose and scope

Governance keeps source ownership, contribution credit, review, and
publication legible without turning this lightweight repository into an
authority system. Runnable source remains behavior authority. The nearest
README or manifest names the local contract, and reviewed pull requests carry
accepted change into the repository.

## How changes enter

1. Start with the owning source and the current Issue or pull request.
2. Change the smallest source surface that can establish the desired state.
3. Run the nearest focused check and state its coverage boundary.
4. Keep merge, publication, and other consequential decisions with the named
   human receiver.
5. Preserve the accepted state and one clear re-entry move in the pull request
   or its receiving Issue.

## How to attribute contributions

Attribution is centralized in [`AUTHORS`](AUTHORS), the headers of
source-owning public documents, and visitor-visible notices so the codebase
stays clean and maintainable. [`AUTHORS`](AUTHORS) identifies copyright
holders; it is not a complete contributor list. [`LICENSE`](LICENSE) remains
the authority for the Apache License, Version 2.0. The bounded
[`attribution.yml`](attribution.yml) file projects the exact identity, license,
carrier scope, and exclusions for machine readers; it does not replace these
human-readable and legal authorities. [`CITATION.cff`](CITATION.cff) answers
the narrower, standard question of how to cite the repository; its author list
is not a complete contributor ledger.

The current founding human author is **Vikrant Varun Kudesia**. In this
repository, a public HTML file's header means its `<head>`, not a copyright
comment banner. The current top-level Context Canvas routes, manifest-selected
Core routes, their maintained Context projections, and canonical generator
templates use the full human name in `<meta name="author">`. Their approved
visitor-visible notice names the publishing company and license. Generated
copies inherit attribution from their canonical source.

Git author metadata, mutually agreed `Co-authored-by` trailers, and reviewed
pull requests preserve contribution credit. Credit follows the contribution:
use each contributor's actual identity, and do not infer an affiliation or
replace one contributor's identity with another's. Commit subjects and bodies
describe the change; they do not repeat a standing author notice.

Stylesheets, scripts, tests, schemas, manifests, and ordinary code comments do
not carry personal-name banners. A comment may explain a material provenance
or generation boundary when that fact changes how the file should be edited;
Git history and the nearest owning document provide ordinary authorship
context.

### Contribution attribution pattern

- A person's commit uses that contributor's truthful Git identity.
- Joint human work may use agreed `Co-authored-by` trailers and the pull
  request description to make shared work legible.
- A new copyright holder enters `AUTHORS` only through an explicit, reviewed
  decision; contributing code does not automatically make that person a
  copyright holder.
- Forks and adaptations preserve applicable upstream notices and add truthful
  adaptation or contributor attribution where appropriate. A publisher may
  update document author metadata when the adapted work's actual author
  changes, while retaining upstream copyright and attribution notices in the
  source or accompanying documentation. This repository does not use
  unresolved `{{FirstName LastName}}` materialization tokens.
- A complete, discoverable acknowledgment of collaborating AI systems and
  platforms remains a separate planned decision; an incomplete list is not
  inferred from individual commits.

## Proportionate validation

`npm run test:attribution` checks the central identity and governance sources,
the machine-readable projection, and its referenced paths, then exercises the
existing Context and iframe carrier contracts. The projection uses the
JSON-compatible subset of YAML, so the check remains dependency-free beyond
the repository's locked Node toolchain.

No repository pre-commit framework or attribution-specific hosted workflow is
required. Hooks are not reliably shared by a clone, and a separate workflow
would duplicate the existing carrier contracts. A new automated receiver is
warranted only when repeated drift or a real external consumer demonstrates
that the local and review-time check is insufficient.

`attribution.yml` is a projection and validation input, not a materializer.
Public documents continue to own resolved metadata and notices, and the route
manifests continue to own their carrier populations. The projection carries no
self-hash, commit coordinate, signature, history, or downstream-copy ledger;
Git already supplies content addressing.

## Attribution recovery

The accepted upstream revision remains the attribution source when a
downstream copy is incomplete. Recover copyright-holder identity from
`AUTHORS`, contribution guidance from this document, exact machine-readable
values from `attribution.yml`, and document attribution from the accepted
source artifact. Compare package hashes where an existing route receipt
provides them. A copied artifact that omits these notices does not supersede
the reviewed upstream record.

This projection improves discovery and comparison; it does not prove ownership
or prevent removal. A future named release may use a signed annotated tag to
bind an accepted tree and its package hashes to a verifiable key. A root
`NOTICE` file has a separate role under Apache-2.0 and remains a deliberate
licensing decision outside this draft.

## Publication and public collaboration

Public Issues and pull requests contain the smallest decision-changing,
public-safe summary. Raw logs, credentials, signed or query-bearing URLs,
private routes, and user-specific workstation coordinates remain with their
existing access-controlled owner. Publication receivers use the artifact that
passed the named check; a local build receipt does not itself activate a live
route.

## Evolving this draft

Revise this document through an ordinary reviewed pull request when repository
practice changes. Prefer clarifying an existing rule over adding a parallel
policy, registry, or ledger.
