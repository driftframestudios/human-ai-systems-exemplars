# Repository secret-material boundary

## Desired state

Repository source, exact proposed commits, locally available history, and named
generated artifacts can receive one repeatable secret-material observation
before they move toward another receiving branch or publication surface. Each observation
first proves that its detector path is alive with a newly generated synthetic
canary. A clean result stays tied to the engine version, reviewed configuration,
named scope, and the collaboration receipt that records the observation.

This boundary protects against accidental credential-shaped material. The
[Context Canvas public-reference materializer](context-canvas-public-reference-materialization.md)
owns public-possible Notion route formation, and the main public-boundary
receipt owns locator-free source history. A private Notion coordinate is a
publication-boundary concern rather than automatically a credential. A
repository-root reporter-facing security policy, `security.txt`, and hosted
service controls remain a separate publication concern and need a named
receiver before repository visibility changes.

## Selected mechanism

The retained-source secret-boundary issue selected Betterleaks 1.8.1 as the repository inspection engine. The scanner is a
pinned external binary rather than part of the dependency-free materializer.
The repository-owned installer:

- chooses one explicitly supported operating-system and architecture asset;
- bounds the release response to 128 MiB and sixty seconds;
- verifies the official release archive against its tracked SHA-256;
- accepts only the expected license, README, and executable archive layout;
- records the executable digest in an ignored, tool-owned install receipt; and
- verifies receipt ownership, executable bytes, and reported version before
  every scan.

The explicit install command is the only intended network step. Scans pass
`--validation=false`, so provider validation and candidate egress remain at
rest. Scanner and tool children receive a small operating-environment allowlist
rather than ambient credential variables. A verified install can be used
offline.

```sh
npm run security:secrets:install
npm run test:secret-material
npm run security:secrets
```

The complete command runs the generated canary, working-tree, staged-index,
and history observations. Focused routes remain available:

```sh
npm run security:secrets:canary
npm run security:secrets:tree
npm run security:secrets:staged
npm run security:secrets:history
npm run security:secrets:artifact -- path/inside/repository
npm run security:secrets:public-references
```

## Synthetic canary as executable proof

Every mode generates a fresh, non-issued GitHub-token-shaped value in process
memory and sends it to Betterleaks through standard input. The run proceeds
only when exactly one `github-pat` finding arrives through the designated
finding exit and its match and secret fields carry the expected mask. No
reusable token-shaped fixture enters source or configuration.

Betterleaks can retain candidate-shaped text in free-text report metadata such
as a filename, commit message, fingerprint, or attributes even when its match
and secret fields are redacted. The wrapper therefore treats the complete raw
JSON report and scanner diagnostics as sensitive, ephemeral process input. It
persists neither one. Only an allowlisted rule identifier, finding ordinal,
numeric line, and strictly validated abbreviated commit may leave the wrapper.
Tests place generated canaries in content, filenames, and commit metadata and
require the wrapper result and rendered diagnostic to remain canary-free.

The canary establishes that the pinned executable, configuration, one material
rule, finding exit, parser, and output sanitizer are operating together. It
does not establish the effectiveness of every rule or universal credential
absence.

## Inspection topology

### Working tree and ignored local material

`tree` observes tracked, untracked, and ignored filesystem material. Git
internals, the verified `.tools/` cache, and installed `node_modules/` trees
rest outside that pass. The wrapper first walks the receiving tree and stops on
an unreadable path, symbolic link, special entry, hidden scanner-ignore file,
or unexpected prefiltered-path type. Generated outputs such as
`.public-reference-build/` remain in scope.

### Exact Git index

`staged` rests when the index matches `HEAD`. Otherwise it materializes every
stage-zero index blob into a private temporary directory, scans the complete
snapshot, and removes it. Raw `git cat-file` reads preserve exact object bytes
without checkout or smudge filters. This includes unchanged and skip-worktree
entries alongside the changed files.

Conflicts, submodules, unsupported modes, staged-only ignore files, and paths
outside the materialization grammar stop the observation. Git variables that
can redirect the index, worktree, object database, namespace, shallow boundary,
or replacement graph are removed from wrapper Git calls and the Betterleaks
child; replacement objects are disabled. A caller's alternate index therefore
cannot silently become the inspected candidate.

### Diff-visible local history

`history` requires a complete, non-shallow clone. It asks Git for full-history
patches across all locally available refs and observes separate merge diffs, so
content introduced by merge resolution and content reachable only through a
non-current local ref can be detected.

The result covers diff-visible content supplied by those local refs. It does
not cover an unfetched remote, GitHub-native Issue or pull-request prose, a
fork, cache, dangling object, or bytes that Git omits from textual patch output.
In particular, some NUL-bearing historical binary blobs do not enter the
Betterleaks Git input. Current-tree and named-artifact scans retain their own
current-filesystem observation; an incident that needs object-forensic byte
enumeration earns a separately authorized tool and evidence boundary.

### Named generated artifact

`artifact` accepts one regular file or directory inside the repository. Both
lexical and real paths must remain contained; cross-drive Windows targets,
parent-symlink escape, final symlinks, and special entries stop the operation.
The configured public-reference subtree has a named command so it can receive
this observation before a publication-assembler handoff.

### Adjacent embedded metadata publication boundary

Credential-shaped material and embedded binary metadata now remain explicit
peer observations. Betterleaks can return a clean text and artifact receipt
while an image, document, media container, or archive still carries a precise
location, device or lens serial, author, capture time, workstation path, or
production-tool field. A human audience, rights, and consent decision remains a
third distinct claim.

During the 2026-09-25 public-visibility assessment at
`main@cb479e44f956362b1fde8f2d26cbe7b2d7ae8e81`, a format-aware reading of the
tracked raster collection found camera and lens serial fields in the XMP of
three related background variants. Seven raster files retained device model and
capture-time metadata. No EXIF GPS information field or XMP GPS coordinate key
was observed in the 76 raster files inspected. The raw serial values remain out
of this record.

The human confirmed that location capture had been purposefully disabled,
identified the affected research and historical infrastructure imagery as
synthetic, and accepted the observed camera and lens serial fields for this
exact source state. This acceptance settles the current metadata finding while
repository visibility remains with its separate gated, human-held decision.
Inspection of the exact future release closure establishes its carrier state; a
changed source, derivative, export path, archive, or intended audience reopens
the format-aware observation. Metadata normalization remains the source-owned
recovery route when a later public contract selects a narrower field set. The
portable skill routes that branch through
[embedded metadata at a publication boundary](../.agents/skills/secret-boundary-inspection/references/embedded-metadata-publication-boundary.md).

## One reviewed exception surface

`.betterleaks.toml` extends the engine defaults and is the only accepted
suppression surface. The wrapper disregards inline allow directives and rejects
`.betterleaksignore` or `.gitleaksignore` in the working tree and exact index,
apart from explicit dependency and tool internals that already rest outside the
scan. A finding-count baseline does not participate in acceptance.

Current filters describe narrow, source-readable non-credentials: named
synthetic LIMS/ELN fixtures, `/run/secrets/` runtime indirection,
`secretsmanager://` references, and one SQL runtime variable name. A later
exception belongs in the TOML with its exact path, rule or value shape,
rationale, and focused test. A Betterleaks upgrade is a separate review of the
pinned release, checksums, configuration behavior, canary, and real scopes.

## What a clean receipt establishes

A clean receipt says that Betterleaks 1.8.1, the printed configuration SHA-256,
and the named scope returned zero unresolved rule matches after the canary
passed. It does not establish:

- universal absence of credentials or correctness of every detector rule;
- whether a candidate is live, revoked, synthetic, or authorized;
- exhaustive historical binary-object or unfetched-remote coverage;
- signed-out publication availability or public audience fit;
- Enterprise Human-AI Practitioner Registry ancestry; or
- authority to publish, rotate a credential, rewrite history, or change refs.

Those claims retain their fitting evidence and decision owners.

The accepted population branch observation on 2026-08-26 passed 24 focused
tests, then returned clean for the working tree and ignored local material,
exact staged index, diff-visible history across all locally available refs, and
the generated Context Canvas public-reference artifact. Its configuration
receipt was
`sha256:38e3984625c576e83c8b74423979d990dbb5dba0fa9db857350338001c7bb93d`.

Successor settlement commit `607b5da17ecfdb312c9df6dfc61b53c8bcf5a171`
then received the pinned installer under Human-AI Systems Exemplars ownership
and ran the complete local boundary. The synthetic canary was detected and
fully redacted; the working tree and ignored material were clean; the exact
index was resting; and diff-visible history across every locally available ref
was clean. The successor configuration receipt is
`sha256:b779df05840d6774ba6980859038fa52b3a4aafe48cee2aae466de08b9ee5a05`.

## Finding response

A finding pauses the affected commit, snapshot, or delivery handoff and stays
inside private local triage. When a live credential is plausible:

1. revoke or rotate it with its provider and review relevant access logs;
2. remove the active worktree, index, and generated-artifact copies;
3. map reachable commits, refs, releases, caches, forks, and external copies;
4. coordinate history repair only after containment and with the affected
   collaborators; and
5. rerun the canary and each changed scope before the handoff resumes.

Candidate values do not enter Issues, pull requests, retained reports, or
command transcripts. GitHub's guidance similarly treats revocation and
rotation as a first response and describes history rewriting as a coordinated
operation with side effects:
[secret-scanning alerts](https://docs.github.com/en/code-security/concepts/secret-security/about-alerts)
and
[removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

## Option assessment and evidence

The selected route followed current tool behavior and the receiving boundary,
not a universal tool ranking.

| Route | Material affordance | Current disposition |
| --- | --- | --- |
| [Betterleaks](https://github.com/betterleaks/betterleaks) | Maintained Gitleaks-lineage engine with directory, Git, and standard-input modes; expressive configuration and optional provider validation | Selected at 1.8.1 with exact assets, local checksum verification, validation off, and a wrapper-owned information diet |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Mature predecessor and established rule/configuration lineage | Retained as lineage and security-fix context; the maintained successor receives this implementation |
| [Secretlint](https://github.com/secretlint/secretlint) | Extensible Node-oriented file/tree linting | Useful for a JavaScript-native receiving need; it does not supply the same Git-history route here |
| [detect-secrets](https://github.com/Yelp/detect-secrets) | Baseline-centered review and audit workflow | Useful where accepted findings already need a review baseline; this repository selected one source-readable TOML exception surface instead |
| [TruffleHog](https://github.com/trufflesecurity/trufflehog) | Broad target support and credential verification | Retained for a separately authorized incident or provider-verification use where network and report handling receive their own boundary |
| [GitHub secret protection](https://docs.github.com/en/code-security/concepts/secret-security/about-secret-scanning) | Hosted repository alerts and push protection when repository standing and plan capability admit them | Complementary later receiver; it does not observe ignored or untracked local material |

Betterleaks configuration and scan behavior are grounded in its
[configuration](https://github.com/betterleaks/betterleaks/blob/main/docs/config.md)
and
[scanning](https://github.com/betterleaks/betterleaks/blob/main/docs/scanning.md)
documentation. The empirical paper
[How Bad Can It Git?](https://arxiv.org/abs/2307.00714) found strong historical
Gitleaks recall in its studied versions and datasets. That evidence supports
the lineage as a serious candidate while remaining version-, corpus-, and
task-bounded; the repository's generated canary and adversarial fixtures carry
the current executable claim.

## Automation and later receivers

Local and manual use is the standing route. The current Actions policy admits
GitHub-owned actions at full commit SHAs and blocks third-party Marketplace
actions. This settlement keeps Betterleaks use within the repository-owned
installer and local wrapper while the current hosted workflows retain their
existing jobs.

A later named receiver can run the repository-owned installer after an
admitted checkout, fetch the complete refs required for its stated history
scope, inject no repository or environment credentials, retain no raw report,
and require the canary before interpreting a clean result. It first receives a
repository-level budget, activation event, timeout, evidence-retention choice,
and explicit off switch.

The populated successor has now rerun installer verification, focused tests,
canary, tree, exact index, and diff-visible history under its own package,
configuration, and receipt ownership. The retained observation remains useful
lineage; the successor-local receipt carries the current assembled tree. A
later publication artifact or hosted scanner receiver repeats the scopes named
in its own delivery packet.

## Skill accounting

[`secret-boundary-inspection`](../.agents/skills/secret-boundary-inspection/SKILL.md)
is now a standing portable contract. The merged executable implementation,
human review, and the successor's named reception issues establish a distinct
job: prove detector liveness, bind a material scope, keep scanner output on a
narrow information diet, and return a safe receipt or private finding route.

The skill routes this repository-owned behavior while the scripts, tests,
configuration, and this durable boundary continue to define executable
behavior. Successor adoption supplies its first receiving use. The
[formation account](collaboration-accounts/2026-08-26-secret-boundary-inspection.md)
can now receive this successor-local configuration and scope observation.

The 2026-09-25 metadata observation selects `iterate_now` for the existing
contract rather than forming a second scanner skill. The credential detector
retains one narrow completion claim; a conditional reference now makes the
adjacent binary-carrier check discoverable when a publication closure contains
images, documents, media, or archives. A later natural use can justify a
standalone embedded-metadata skill if that job develops its own repeated tools,
receipt schema, or receiving workflow.

## Re-entry

Return here when one of these events occurs:

- a later proposed commit has staged content and needs its exact-index receipt;
- Betterleaks or its bundled rules change;
- a real finding tests the information diet or response order;
- a hosted receiver gains a named budget and evidence job;
- another repository or hosted receiver accepts the implementation and supplies its own observation;
- a binary carrier, derivative profile, export tool, archive, or publication closure changes and needs an embedded-metadata observation;
  or
- another repository use exposes a distinct decision, friction, or fold path.

The re-entry packet is small: engine version, configuration hash, canary result,
named scopes, safe finding disposition, receiving Issue or pull request, and
one next move.
