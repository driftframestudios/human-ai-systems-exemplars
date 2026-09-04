# Repository governance

**Status:** Working draft

## Purpose and scope

Governance keeps source ownership, contribution credit, review, and
publication legible through a lightweight source-and-review pattern. Runnable
source remains behavior authority. The nearest README or manifest names the
local contract, and reviewed pull requests carry accepted change into the
repository.

## How changes enter

1. Start with the owning source and the current Issue or pull request.
2. Change the smallest source surface that can establish the desired state.
3. Run the nearest focused check and state its coverage boundary.
4. Keep merge, publication, and other consequential decisions with the named
   human receiver.
5. Preserve the accepted state and one clear re-entry move in the pull request
   or its receiving Issue.

## How to attribute contributions

Attribution uses distinct, centralized carriers so the codebase stays clean
and maintainable. [`AUTHORS`](AUTHORS) identifies copyright holders. Git
author metadata, agreed `Co-authored-by` trailers, and reviewed pull requests
carry contribution credit. [`LICENSE`](LICENSE) remains the authority for the
Apache License, Version 2.0. The bounded [`attribution.yml`](attribution.yml)
file projects the exact identity, authority paths, carrier scope, placements,
and exclusions for machine readers. [`CITATION.cff`](CITATION.cff) supplies
the standard repository citation metadata. Source-owning public documents and
visitor-visible notices carry copy-local attribution.

The current founding human author is **Vikrant Varun Kudesia**. For an
independently renderable public HTML document, file-header attribution lives
in its `<head>`. The current top-level Context Canvas routes,
manifest-selected Core routes, their maintained Context projections, and
canonical generator templates use the full human name in
`<meta name="author">`. Their approved visitor-visible notice names the
publishing company and license. Generated copies inherit attribution from
their canonical source.

Git author metadata, mutually agreed `Co-authored-by` trailers, and reviewed
pull requests preserve contribution credit. Credit follows the contribution:
use each contributor's actual identity, include an affiliation when the
contributor has confirmed it, and keep each contributor's identity distinct.
Commit subjects and bodies describe the change. Standing author notices stay
in the centralized and copy-local carriers named above.

Stylesheets, scripts, tests, schemas, manifests, and ordinary code comments
stay implementation-focused. The centralized carriers above hold
personal-name attribution. A source comment earns its place when a material
provenance or generation boundary changes how the file should be edited. Git
history and the nearest owning document provide ordinary authorship context.

### Contribution attribution pattern

- A person's commit uses that contributor's truthful Git identity.
- Joint human work may use agreed `Co-authored-by` trailers and the pull
  request description to make shared work legible.
- Code contributions receive contribution credit through Git history and
  reviewed pull requests. A new copyright holder enters `AUTHORS` only through
  an explicit, reviewed decision.
- Forks and adaptations preserve applicable upstream notices and add truthful
  adaptation or contributor attribution where appropriate. A publisher may
  update document author metadata when the adapted work's actual author
  changes, while retaining upstream copyright and attribution notices in the
  source or accompanying documentation. Public artifacts carry resolved
  publication identity directly in source and generated output.
- A complete, discoverable acknowledgment of collaborating AI systems and
  platforms remains a separate planned decision. Existing Git and pull-request
  records continue to credit the actual contributors to each change while the
  complete inventory is prepared.

### Examples: choose the fitting carrier

| Situation | Fitting carrier and action |
| --- | --- |
| A person or tool asks how to cite the repository. | Use `CITATION.cff`. |
| A contributor needs credit for a change. | Use truthful Git author metadata, an agreed `Co-authored-by` trailer when applicable, and the reviewed pull request. |
| A self-contained public HTML adaptation is prepared. | Preserve applicable upstream notices, add truthful adaptation credit, and resolve publication identity in the source-owning document before publication. |
| A question could change ownership, license interpretation, `NOTICE`, modified-file notice obligations, a CLA, transfer, or enforcement. | Record the open question and route the decision to the named human receiver or qualified counsel; implement the settled decision afterward. |

## Proportionate validation

`npm run test:attribution` checks the central identity and governance sources,
the machine-readable projection, and its referenced paths, then exercises the
existing Context and iframe carrier contracts. The projection uses the
JSON-compatible subset of YAML, so the check remains dependency-free beyond
the repository's locked Node toolchain.

The current local command and existing review-time carrier contracts are the
proportionate automated receivers. This arrangement makes validation available
in every clone and reuses the established carrier checks. Repeated drift or a
real external consumer can earn a focused hosted or pre-commit receiver.

`attribution.yml` serves as a bounded projection and validation input. Public
documents own resolved metadata and notices, route manifests own their carrier
populations, and Git owns revision history and content addressing. The
projection schema stays limited to current identity, authority paths, carrier
scope, and placement boundaries.

## Attribution recovery

The accepted upstream revision remains the attribution source when a
downstream copy is incomplete. Recover copyright-holder identity from
`AUTHORS`, contribution guidance from this document, exact machine-readable
values from `attribution.yml`, and document attribution from the accepted
source artifact. Compare package hashes where an existing route receipt
provides them. When a copied artifact omits these notices, the reviewed
upstream record remains the recovery source.

This projection provides structured attribution evidence inside each accepted
Git revision and supports discovery and comparison. It is repository metadata
rather than independent legal proof of ownership. Removal remains technically
possible, and comparison with the accepted revision can reveal it. A future
named release may use a signed annotated tag to bind an accepted tree and its
package hashes to a verifiable key. A root `NOTICE` file has a distinct
Apache-2.0 downstream role. Adding it requires a separate deliberate licensing
decision.

## Publication and public collaboration

Public Issues and pull requests contain the smallest decision-changing,
public-safe summary. Raw logs, credentials, signed or query-bearing URLs,
private routes, and user-specific workstation coordinates remain with their
existing access-controlled owner. Publication receivers use the artifact that
passed the named check. A local build receipt establishes that named check
result; a named human-approved publication receiver activates a live route.

## Evolving this draft

Revise this document through an ordinary reviewed pull request when repository
practice changes. Existing governance remains the receiving surface for
clarifications. Form a distinct policy, registry, or ledger only after a
materially distinct authority relationship and named human decision
demonstrate the need.
