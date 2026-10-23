# Shell-free cPanel artifact delivery and first cutover

This guide is the human-operated route for delivering the reviewed production
carrier to a cPanel account that supplies File Manager while keeping SSH and
Terminal outside the current plan. FTPS is a candidate successor whose TLS,
credential scope, staging reach, and rename behavior still need host-specific
observation. GitHub remains the working source of truth. cPanel receives one
immutable, prebuilt transfer envelope—an archive plus its external receipt;
signed-out observations establish the bytes and response behavior visitors
receive.

[Issue #540](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/540)
owns the current production source, carrier, tag, shell-free activation, live
assessment, and recovery sequence. Issue #464 preserves the immutable
`production-v0.3.0` receipt; Issues #118, #250, #251, and #253 preserve the
accepted `production-v0.2.0` implementation and receipt. The reusable procedure
below always begins with one explicitly selected annotated
`production-vMAJOR.MINOR.PATCH` tag.

## Reusable route and historical worked decision

cPanel uses the term **push deployment** for a developer who pushes Git commits
over SSH into a cPanel-managed repository. That feature still needs shell
access. A PHP URL that downloads or installs an archive would be a custom
deployment application rather than cPanel Git push deployment.

The current GoDaddy account has a provider-confirmed shell boundary. The
selected sequence is therefore:

1. select one human-approved annotated `production-v*` tag as the immutable
   payload identity;
2. form and verify one carrier archive in the trusted release environment;
3. use cPanel File Manager for the first staged, recoverable cutover;
4. retain manual GitHub Actions packaging as the next automation increment;
5. add FTPS transport only after the host-specific staging and rename contract
   is observed; and
6. revisit a narrow server-side finalizer only when repeated releases justify
   its security and recovery ownership.

This route keeps the private repository private. The cPanel account needs no
GitHub clone, deploy key, personal access token, GitHub App key, webhook, or
public deployment endpoint for the first pilot.

## Source, release, transfer, and live state

| Layer | Current owner | Meaning |
| --- | --- | --- |
| Authored source | `main` | Collaboration truth and maintained implementation |
| Stable comparison | Selected annotated `stable-core-v*` tag | Accepted stable-core coordinate `A` |
| Release integration | `release` | Reviewed source, evidence, and artifact-builder contract accepted for production promotion |
| Production carrier | Selected annotated `production-v*` tag on `prod` | Exact deployable carrier `R`; its manifest identifies source `S` |
| Transfer envelope | Archive receipt | One archive formation bound to the payload and committed packaging tool |
| Delivery attempt | Protected operator record | One upload, staging, activation, or recovery attempt |
| Live state | Current production Issue signed-out observation | Bytes, media types, response policy, redirects, cache behavior, and parent-child behavior visitors receive |

A human-approved deployment packet and Issue receipt authorize the first
pilot. Manual workflow dispatch is the future automated-transport authorization
event. The immutable tag and digests identify the payload. An additional moving
`deploy` branch would duplicate `prod` without strengthening either identity.

The accepted `production-v0.2.0` worked coordinates below are immutable
historical evidence. A later release takes its exact coordinates from its
current production Issue:

```text
A  stable-core-v0.2.0
   341bceb719a28be760775b6322021d78abaa919b

S  e73775743c518b8f99f2e41f2cd4cdfb3cf36fa0

R  production-v0.2.0
   2558bb8216a305aa7b87151019065d0e40e193df

manifest SHA-256
   633519229974411418c8b30a3ce6e0cf87190e1b90d0d5a23aa52834afc8d476

file-index SHA-256
   b42064abbdec685f0d3394670f0acd13104098c3b2586e2f3301d5de457541ba
```

The carrier contains 322 files / 28,611,470 bytes: 251 primary files,
69 iframe-origin files, and two manifest/index records. The current
transfer-envelope ZIP is about 18.5 MB, within GoDaddy's documented default 32 MB PHP upload
envelope; File Manager applies its own account-specific limit, so read that
limit in the actual interface before relying on the estimate.

## Option map

| Route | Guarantee and cost | Current disposition |
| --- | --- | --- |
| Existing cPanel Git pull plus Bash installer | Retains the strongest implemented manifest, preflight, pending-state, retry, and recovery contract | Available on a future shell-capable host; resting for this account |
| Official cPanel Git push | Pushes commits over SSH into a cPanel-hosted repository and runs `.cpanel.yml` | Unavailable without shell/SSH |
| File Manager archive | Uses the existing authenticated cPanel surface, stores no GitHub credential on the host, and keeps the first change human-visible | Selected first pilot |
| Manual Actions artifact, human File Manager activation | Gives packaging a repeatable hosted runner while retaining human host authorization and introducing no host credential in GitHub | Preferred next increment after the repository-owned package contract lands |
| Manual Actions plus explicit-TLS FTPS staging | Automates transport; requires protected credentials, concurrency, strict TLS, a private staging target, and a separate activation/verifier contract | Conditional after account probes and the first pilot |
| cPanel UAPI upload | Can send files over HTTPS to port 2083; current token scope and file-operation support are broad and provider-dependent | Probe only if API Tokens and required File Storage operations are enabled |
| PHP archive downloader/deployer | Can combine remote fetch and activation; creates a public management surface, long-lived repository credential, replay state, archive parser, lock, and recovery engine | Deferred |
| Cloudflare Pages or Workers Static Assets | Receives prebuilt static assets with versioned platform deployments and custom domains; changes the production host | Strong strategic exit from shared hosting; separate service decision |
| Amazon S3 plus CloudFront | Receives static assets through a mature object/CDN model with infrastructure and cost ownership | Strong infrastructure-owned exit; separate service decision |
| GoDaddy Node application | Adds a runtime and provider-specific application path to a static carrier | Useful only when a real server-side job appears and the account exposes the feature |

The static carrier already separates build from delivery. A later host change
can reuse that contract without converting the visitor surface into a Node
application.

## Human setup before the first cutover

Keep exact paths, account identifiers, limits, and credentials in a protected
operator record. Public Issues and pull requests receive normalized capability
results rather than those values.

### 1. Record the cPanel capability envelope

In GoDaddy, open **Web Hosting → Manage → cPanel Admin**. Then record:

1. **Domains:** the exact document root for the primary domain and the exact
   document root for the iframe subdomain.
2. **File Manager:** a private directory outside both document roots that can
   hold an archive, two expanded closures, and recovery material.
3. **Disk Usage:** free space for the archive, expanded carrier, both current
   roots, and a complete backup. A conservative first-cutover envelope is the
   current sites plus at least two expanded carrier copies and the archive.
4. **File Manager upload limit:** the value shown by the upload interface.
5. **File Manager operations:** whether a test directory can be compressed,
   extracted, moved, renamed, and restored from Trash in the relevant parent
   directories.
6. **Hidden files:** enable **Show Hidden Files** while classifying existing
   `.htaccess`, `.well-known/`, provider files, and other host-owned entries.
7. **Domains and subdomains:** record whether the roots are disjoint or one is
   nested inside the other, and whether a sibling staging directory can exist
   on the same filesystem as each root. The generation-directory cutover
   requires disjoint roots.
8. **Backup receiver:** confirm where a dated first-cutover backup will live
   and how it can be restored without depending on the new release.
9. **Response-policy receiver:** record the current Cloudflare and origin-owned
   redirect, header, cache, and error-response configuration plus its separate
   restoration route.

If the interface cannot stage outside a public root, create a denied staging
directory only through a reviewed host policy and keep its archive name free of
secrets. A genuinely private account-home directory remains the preferred
receiver.

### 2. Classify the existing roots

For each root, place every current entry in one class:

- **release-owned:** replaced by the accepted carrier;
- **host-owned and retained:** for example a reviewed `.well-known/`, provider
  `cgi-bin/`, or response-policy file;
- **legacy and recoverable:** moved into the dated backup; or
- **unresolved:** held before mutation until an owner decides.

The first cutover proceeds from empty release-owned space plus the smallest
explicit retained set. This makes stale files and recovery state legible.

### 3. Preserve a host backup

Use File Manager's **Compress** or **Copy/Move** operation to create a dated
backup of both roots outside the receiving roots. Download an additional copy
when the account permits it. Record the backup identity and creation time in
the protected operator record.

Leave both public roots unchanged until the release archive has been formed,
uploaded, extracted, and inspected in private staging.

## Form the selected release archive

Run this phase from a dedicated clean worktree at the reviewed transfer-tool
revision. The immutable production tag remains the payload input; the worktree
supplies the packaging and verification implementation. No private
`.env.public` input is needed because this phase verifies the already-built
carrier rather than reconstructing it.

```sh
git fetch --prune --tags origin
git worktree add ../hase-transfer-tool REVIEWED_TOOL_REVISION
cd ../hase-transfer-tool
: "${PRODUCTION_TAG:?Set the approved annotated production-v* tag}"
git rev-parse "${PRODUCTION_TAG}^{}" "${PRODUCTION_TAG}^{}^1"
git diff --no-renames --name-only "${PRODUCTION_TAG}^{}^1" "${PRODUCTION_TAG}^{}"
npm ci --ignore-scripts
npm run test:prod-deployment
```

The two Git coordinates should equal exact `R` and `S`. Every diff path should
remain beneath `deployment/cpanel/carrier/`. The builder repeats those release,
tree, manifest, index, and byte checks before it writes an archive. The receipt
records the exact committed tool revision and tool-file digest separately from
the immutable payload coordinate.

Form the transfer envelope directly from the annotated production tag:

```sh
npm run build:prod-carrier-transfer -- --tag "$PRODUCTION_TAG"
npm run verify:prod-carrier-transfer -- \
  --tag "$PRODUCTION_TAG" \
  --receipt ".cpanel-transfer/$PRODUCTION_TAG/hase-$PRODUCTION_TAG.receipt.json"
```

The dependency-free helper reads carrier blobs from the annotated tag rather
than the worktree. It requires `R^1 = S`, a carrier-only release diff, regenerated
manifest and index records, ordinary non-executable files, exact manifest/index
closure, and portable path names. It writes into an empty ignored directory,
then reopens and verifies the completed ZIP and its external receipt before
reporting success. Formations in separate empty output directories produce the
same archive bytes when tag, committed tool bytes, Node version, and zlib
version agree; the receipt records that runtime. Its creation time changes the
receipt, not the archive. A stopped formation remains available for diagnosis;
retry into a fresh empty directory selected with `--output`.

The carrier directory inside the archive should contain exactly:

```text
hase-<PRODUCTION_TAG>/
  deployment-files.tsv
  deployment-manifest.json
  iframe-public/
  primary-public/
```

The receipt binds the production tag object, exact `R` and `S`, relationship,
manifest and index digests, carrier counts, archive digest and size, and the
packaging-tool revision and file digest. It is a transfer record, not a new
release identity: a tooling-only change preserves the selected production tag,
while a change to carrier bytes or their source relationship requires a new
accepted carrier and tag. Keep the receipt beside the archive through staging
and retain its public-safe fields with the release handback.

If the Betterleaks helper is already installed and verified, observe the exact
carrier before transfer:

```sh
npm run security:secrets:artifact -- deployment/cpanel/carrier
```

A clean result establishes that the pinned scanner, canary, configuration, and
named carrier scope returned no unresolved matches. It remains separate from
archive integrity and live-host evidence.

## Upload and stage in cPanel

1. Open **cPanel → Files → File Manager** and navigate to the private staging
   directory recorded earlier.
2. Select **Upload**, choose both `hase-<PRODUCTION_TAG>.zip` and
   `hase-<PRODUCTION_TAG>.receipt.json`, substituting the selected tag value,
   and wait for both complete upload
   results.
3. Compare the displayed archive size with the protected release receipt.
4. Select the staged ZIP and choose **Download**. On the trusted release
   workstation, rerun `verify:prod-carrier-transfer` with the explicitly
   selected production tag, the locally retained receipt, and the downloaded
   ZIP passed through `--archive`. The local receipt remains the trust anchor;
   the round trip observes the complete uploaded archive before extraction.
5. Select the archive and choose **Extract** into a fresh, release-specific
   staging directory.
6. Navigate to the extracted `hase-<PRODUCTION_TAG>/` directory, substituting
   the selected tag value, and confirm
   the names above. Confirm that `deployment-manifest.json` and
   `deployment-files.tsv` are regular files and that both public directories
   are present.
7. Keep the archive and extracted generation outside both document roots while
   the current roots remain live.

The upload/download verification round trip establishes the staged archive bytes;
File Manager name and shape observations provide a bounded extraction check.
The current interface does not establish every extracted file's SHA-256. The
trusted pre-upload carrier check and #540's complete signed-out byte comparison
bracket that gap.

## Activate the two roots

### Preferred generation-directory route

Use this route only after the capability probe demonstrates disjoint document
roots and same-filesystem directory rename in the relevant parents. A nested
iframe root would travel with a primary-root rename and therefore does not
satisfy this route.

1. Copy or move `iframe-public/` into a fresh sibling generation beside the
   iframe document root.
2. Copy or move `primary-public/` into a fresh sibling generation beside the
   primary document root.
3. Keep the existing document-root directories as the accepted prior
   generation until both successors are present.
4. Rename the current iframe root to its dated recovery name, then rename the
   iframe successor to the exact configured iframe document-root name.
5. Observe the direct iframe routes and root `robots.txt` before changing the
   primary root.
6. Rename the current primary root to its dated recovery name, then rename the
   primary successor to the exact configured primary document-root name.
7. Preserve each prior generation until the complete signed-out assessment
   accepts the successor.

Each rename can provide one filesystem transition. The iframe and primary
switches remain an ordered recovery protocol rather than one cross-root atomic
transaction.

### Content-move compatibility route

Use this route when the configured document-root directory itself must remain
in place. When the iframe root is nested beneath the primary root, first record
that subtree as the separately owned iframe receiver, preserve it during every
primary-root selection or move, and confirm that the primary carrier owns no
path inside it. A nested route that cannot preserve this boundary pauses for a
separately exercised move plan or a cPanel document-root reassignment.

1. Move release-owned legacy content into the dated backup while preserving
   only the classified host-owned set.
2. Place iframe package-local assets and support files before iframe HTML entry
   documents; place the iframe `robots.txt` after `/v1/` is complete.
3. Observe the direct iframe closure.
4. Place primary assets and support files before primary HTML entry documents.
5. Place terminal primary routes such as `index.html`, `404.html`, `sitemap.xml`,
   and `robots.txt` last.
6. Continue with response behavior and signed-out verification.

This order reduces mixed-generation exposure. It does not make a sequence of
individual moves atomic.

## Apply response behavior and caches

The file carrier and response layer retain separate owners. After the bytes
land:

- make `www.vik.guru` redirect to the accepted apex URL;
- allow `https://iframes.vik.guru` through the primary origin's `frame-src`
  policy;
- apply #102's iframe MIME, UTF-8, `nosniff`, referrer, ancestry, CORS, and
  revalidation contract;
- preserve intentional 404 behavior;
- keep delivery-layer HTML rewriting outside the byte-parity route; and
- purge only the affected primary and iframe cache scopes after both roots
  reach the requested generation.

## Verify and accept the live result

From a trusted checkout at the accepted release coordinate, run:

```sh
npm run verify:iframe-routes:live
npm run verify:iframe-routes:policy
npm run verify:iframe-ancestry:live
```

The all-route commands establish bytes and response policy. The focused
ancestry command uses the fixed PODA carrier to require a live HTTP 200 with
the exact parent policy, refusal from a loopback parent, and successful loading
from its `https://vik.guru` parent. Then complete #540's primary manifest sweep,
apex and `www` behavior, robots, sitemap, cache, policy, intentional 404, and
remaining parent-child viewport observations.

The public-safe return names:

- exact production tag and `R`;
- archive, manifest, and file-index digests;
- normalized primary and iframe counts;
- response-policy and cache standing;
- recovery coordinate and whether it was exercised;
- evidence limit; and
- next receiver.

Credentials, private paths, account identifiers, raw headers, logs, and
protected configuration remain with the host operator.

## Recovery intervals

| Observed interval | Recovery move |
| --- | --- |
| Archive or staging check stops before public mutation | Leave both public roots unchanged; replace the staged input |
| Iframe transition stops before primary transition | Restore the prior iframe generation or deliberately complete the same release; keep primary unchanged |
| Primary transition stops after iframe succeeds | Preserve both prior generations and exact pending `R`; restore iframe or complete the same `R` after the named condition is corrected |
| Live byte verification differs | Restore both dated root generations, refresh affected caches, and retain the successor privately for diagnosis |
| Response policy differs while bytes agree | Restore the prior #102-owned redirect, header, cache, or error-response configuration; preserve accepted root bytes unless their own observation also differs |
| Bytes and response policy both differ | Coordinate both recovery owners: restore root generations and the prior delivery-layer configuration, then refresh affected caches |
| Verification succeeds and cleanup stops | Keep the accepted successor active and the prior generation inspectable until cleanup receives a separate bounded action |

A later retry uses the same release identity and receipt. A different release
waits until the current pending state has been accepted or restored.

## Future GitHub Actions receiver

The first hosted workflow should package and retain an artifact for human
activation. A later reviewed job can add FTPS staging. Both use
`workflow_dispatch`; a branch push and webhook remain unnecessary.

The packaging job runs without hosting credentials:

1. require an immutable production-tag input and explicit confirmation;
2. resolve the tag to the expected full commit and reject a branch name;
3. use `permissions: contents: read`, `persist-credentials: false`, and a
   bounded timeout;
4. install the reviewed Node 22.23.4 from a full-SHA-pinned GitHub action and use
   `npm ci --ignore-scripts`;
5. run `npm run test:prod-deployment` and the focused transfer-contract tests;
6. build the archive and receipt from tagged carrier blobs, then rerun the
   self-contained receipt and archive verification;
7. run the canary-proven artifact secret scan in the admitted hosted boundary;
8. retain the immutable artifact and sanitized receipt for the shortest useful
   interval; and
9. expose no host secret to release-controlled scripts.

A separate environment-gated transport job receives human approval and the
FTPS credentials. It uses the shared production concurrency group, downloads
the exact artifact from the packaging job through a full-SHA-pinned GitHub
action, rechecks its digest and receipt, and runs only pinned, audited transport
code. It executes no package lifecycle, repository script, or tag-controlled
code after the host secrets enter the job. GitHub environment approval delays
secret access; this job separation keeps untrusted release execution outside
the credential-bearing interval. Human host activation remains a later,
distinct event.

`npm run check:prod-carrier` reconstructs the projection and therefore needs
the accepted private `.env.public` input. The release environment runs that
check before production promotion. The Actions transport receiver should
verify the already-built carrier without receiving that private input; the
repository-owned self-contained verifier preserves this separation.

When FTPS earns activation:

- use explicit TLS with certificate verification;
- prefer directory-scoped, staging-only credentials;
- transfer the immutable archive and receipt into private staging;
- keep secrets in the smallest GitHub Actions secret surface supported by the
  repository plan;
- serialize production transfers with one concurrency group;
- keep verbose protocol logs and credential-bearing diagnostics outside public
  artifacts; and
- retain human activation until a narrow finalizer passes its state-transition
  and recovery tests.

Direct file mirroring into live roots makes transfer interruption a visitor
state. Staging keeps transport completion and publication as distinguishable
events.

## HTTP receiver and IP boundaries

The current route exposes no deployment script. If later evidence earns a PHP
finalizer, its smallest fitting job is to validate and activate an artifact
already present in private staging.

Its acceptance would include:

- authenticated `POST` with HTTPS;
- a credential-free URL and logs;
- HMAC-SHA-256 over the unmodified body with constant-time comparison;
- exact release, archive digest, timestamp, and single-use nonce or delivery
  identity in the signed meaning;
- replay records and one exclusive receiver lock;
- strict request, compressed-size, expanded-size, path-length, entry-count,
  and execution-time limits;
- rejection of absolute paths, traversal, duplicate normalized paths,
  symbolic links, special entries, and unexpected files;
- complete manifest/index verification before public mutation;
- durable pending-release and prior-generation recovery state; and
- generic public responses plus private, sanitized diagnostics.

GitHub webhook `hooks` addresses can be a defense-in-depth filter for a genuine
webhook, with HMAC retaining authentication authority. Standard GitHub-hosted
Actions runners use broad, changing address ranges that GitHub advises against
using as an allowlist. A static-IP runner is a separate paid infrastructure
choice, not a requirement for the manual-first route.

A webhook secret authenticates the webhook body. Private repository archive
access requires a separate credential, and a deploy key applies to SSH rather
than GitHub's archive API. These credential roles remain distinct.

## Current external references

- [cPanel — Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/)
- [cPanel — Guide to Git Deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/)
- [cPanel — File Manager](https://docs.cpanel.net/cpanel/files/file-manager/110/)
- [cPanel — FTP Accounts](https://docs.cpanel.net/cpanel/files/ftp-accounts/)
- [cPanel — Manage API Tokens](https://docs.cpanel.net/cpanel/security/manage-api-tokens-in-cpanel/)
- [cPanel — UAPI file upload tutorial](https://api.docs.cpanel.net/guides/quickstart-development-guide/tutorial-use-uapis-fileman-upload-files-function-in-custom-code)
- [GoDaddy — upload through cPanel File Manager](https://www.godaddy.com/help/upload-files-using-my-web-hosting-cpanel-file-manager-3239)
- [GoDaddy — unzip files in cPanel](https://www.godaddy.com/help/unzip-files-in-my-web-hosting-cpanel-account-8396)
- [GoDaddy — supported hosting components](https://www.godaddy.com/help/which-components-does-my-hosting-support-5614)
- [GoDaddy — add directory-scoped FTP users](https://www.godaddy.com/help/add-ftp-users-to-my-web-hosting-cpanel-account-16044)
- [GoDaddy — shared-hosting PHP upload limits](https://www.godaddy.com/help/php-upload-limits-on-shared-hosting-1475)
- [GitHub — manually run a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [GitHub — deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub — secure Actions use](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub — hosted-runner networking](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub — validate webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub — webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Cloudflare — Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare — Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [AWS — secure static website with S3 and CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/getting-started-secure-static-website-cloudformation-template.html)

Practitioner implementations also expose useful guardrails. The widely used
[FTP Deploy Action](https://github.com/SamKirkland/FTP-Deploy-Action) documents
explicit FTPS and strict certificate modes, while its issue history records the
destructive consequences a clean-slate or remote-state assumption can have.
This repository therefore keeps a third-party file-mirroring action outside the
initial route and gives archive formation, live-root replacement, and recovery
their own reviewed owners.
