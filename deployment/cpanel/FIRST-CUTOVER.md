# cPanel pull-model enrollment and first cutover

> **Current GoDaddy account route — 2026-09-24:** the provider-confirmed plan
> keeps SSH and Terminal outside the account. This pull guide remains the
> reviewed route for a future shell-capable host. The current first cutover
> follows [shell-free cPanel artifact delivery](SHELL-FREE-ARTIFACT-DELIVERY.md),
> with [Issue #253](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/253)
> owning the adapter and host-capability envelope.

This guide is the human-operated route for connecting the private
`driftframestudios/human-ai-systems-exemplars` repository to cPanel, selecting
the reviewed `prod` carrier, and performing the first two-origin cutover.
GitHub remains the working source of truth. cPanel receives reviewed,
prebuilt carrier bytes and installs them into the primary and iframe document
roots.

Issue [#118](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/118)
owns the current activation coordinate and acceptance boundary. Read its
accepted-coordinate table immediately before acting. Issue
[#250](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/250)
owns any immutable tag decision, and
[#251](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/251)
receives the signed-out production result.

## The release shape

| Role | Meaning |
| --- | --- |
| `A` | Accepted authored stable core on `main` |
| `S` | Accepted production source; the first parent of the carrier release |
| `R` | Deployable `prod` commit carrying only `deployment/cpanel/carrier/**` beyond `S` |
| Managed clone | cPanel's clean, attached `prod` checkout, outside both document roots |
| Primary root | Document root for `https://vik.guru/` |
| Iframe root | Document root for `https://iframes.vik.guru/` |
| State root | Private installer lock and bounded release state, outside the clone and both public roots |

The immutable production tag, when accepted, identifies `R`. The cPanel
checkout remains attached to `prod` because the installer verifies both the
branch name and its carrier-only first-parent relationship.

## 1. Confirm the account can support the pull route

Before creating a repository, confirm these account capabilities with the
hosting provider or cPanel administrator:

- **Git Version Control**, **SSH Access**, and **Terminal** are available to the
  cPanel account.
- Outbound SSH to GitHub on port 22 is available.
- The cPanel account has enough quota for the managed clone, private staging,
  both public roots, and one external backup of the existing sites.
- `/bin/bash`, cPanel's Git installation, `find`, `sort`, `cmp`, `mktemp`, and
  either `sha256sum` or `shasum` are available. Node and npm remain on the
  release workstation; the host receives prebuilt bytes.
- The human operator can administer a deploy key on the GitHub repository and
  can read the domain and subdomain document roots in cPanel's **Domains**
  interface.
- The human operator can update the selected origin or Cloudflare response
  rules after the files land.

This route pauses before public mutation when any capability is unsettled.
The provider can then name the supported credential or repository-registration
path without placing the clone inside a web root. A provider-confirmed
shell-free account continues through the artifact-delivery guide instead of
simulating cPanel Git deployment with a public web script.

## 2. Freeze the release coordinate

From a trusted working checkout, refresh the remote view and compare it with
the exact coordinates in #118:

```sh
git fetch --prune --tags origin
git rev-parse origin/main origin/prod
git rev-parse origin/prod^1
git diff --name-only origin/prod^1 origin/prod
```

The final command should list only paths beneath
`deployment/cpanel/carrier/`. The release operator also repeats
`npm run check:prod-carrier` at exact `R` with the accepted private
`.env.public` receiver. That file stays on its authorized release workstation;
the cPanel installer reads the already-built carrier.

Complete #250's tag decision or explicitly reconfirm exact `R` immediately
before the first deployment. A moving `prod` branch requires a fresh coordinate
check.

## 3. Create one read-only GitHub deploy key in cPanel

Use cPanel **Terminal** or an SSH session as the cPanel account. First return
to the account home and record its canonical path; some providers place
accounts beneath `/home2` or another partition:

```sh
cd
pwd -P
```

This guide calls that result `<CPANEL_HOME>`. The commands below follow
cPanel's current private-repository guidance and use a dedicated RSA key for
broad managed-host compatibility:

```sh
umask 077
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t rsa -b 4096 -f ~/.ssh/hase_prod_deploy -C "cpanel-hase-prod"
```

cPanel's unattended pull flow requires a key it can use without an interactive
prompt. At the passphrase prompt, press Enter, then confirm the empty value.
Keep the private file on the cPanel account. Only the `.pub` value crosses to
GitHub.

Create or extend `~/.ssh/config` with a repository-specific alias:

```sshconfig
Host github-hase-prod
    HostName github.com
    User git
    IdentityFile ~/.ssh/hase_prod_deploy
    IdentitiesOnly yes
```

Set the configuration mode:

```sh
chmod 600 ~/.ssh/config ~/.ssh/hase_prod_deploy
chmod 644 ~/.ssh/hase_prod_deploy.pub
```

In GitHub:

1. Open **human-ai-systems-exemplars → Settings → Deploy keys**.
2. Select **Add deploy key**.
3. Use a durable title such as `cPanel vik.guru pull — hase prod`.
4. Paste the complete line from `~/.ssh/hase_prod_deploy.pub`.
5. Leave **Allow write access** clear. This receiver only reads the repository.
6. Save the key.

The clone uses SSH. cPanel's current private-repository route does not support
authenticated HTTPS clones, so the SSH alias and read-only deploy key are part
of the entry contract.

Test the exact alias from cPanel:

```sh
ssh -T git@github-hase-prod
```

Verify the presented host fingerprint against
[GitHub's published SSH fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
before accepting it. GitHub reports successful authentication while declining
shell access; its SSH test normally exits with status 1. A repository-scoped
deploy key can remain read-only for the full pull model.

## 4. Select four separate filesystem roles

Read the exact document roots from cPanel rather than inferring them from a
domain name. A clear starting shape is:

```text
<CPANEL_HOME>/repositories/human-ai-systems-exemplars  managed clone
<CPANEL_HOME>/hase-deployment-state                    private state
<cPanel primary document root>                         vik.guru
<cPanel iframe document root>                          iframes.vik.guru
```

The managed clone and state root stay outside both public roots. The two
document roots are distinct. A sibling iframe root is the simplest topology;
the installer also supports an iframe root nested beneath the primary root
when the primary carrier owns no path inside that subtree.

Create the private state directory before deployment and give the cPanel
account exclusive access:

```sh
mkdir -p ~/hase-deployment-state
chmod 700 ~/hase-deployment-state
```

Each configured root must be an existing, real directory owned by the cPanel
account. Symbolic links, overlapping clone/state roots, and a filesystem-root
binding stop during preflight.

## 5. Clone through cPanel Git Version Control

Open **cPanel → Files → Git Version Control → Create**:

1. Enable **Clone a Repository**.
2. Enter this clone URL:

   ```text
   git@github-hase-prod:driftframestudios/human-ai-systems-exemplars.git
   ```

3. Choose a repository path outside both web roots, such as
   `repositories/human-ai-systems-exemplars`.
4. Use a clear display name such as `Human–AI Systems Exemplars — prod pull`.
5. When cPanel presents GitHub host-key information, compare it with GitHub's
   published fingerprint before selecting **Save and Continue**.
6. Let the queued clone finish.

GitHub's default branch is `main`. After the clone completes, open **Manage →
Basic Information**, select `prod` as the checked-out branch, and choose
**Update**. Confirm that the displayed HEAD equals exact `R` from #118.

cPanel updates managed repositories with fast-forward-only behavior. A clean
clone supports that model. Repository edits, generated files, commits, and
configuration values stay outside the managed checkout.

### Clone timeout contingency

cPanel currently documents a hardcoded five-second timeout for some Git UI
operations and reports no general product workaround. This repository can
exceed that interval on some hosts. If the UI clone times out:

1. Preserve the SSH test result and the cPanel creation-log location.
2. Keep raw logs and account paths in the protected host receiver.
3. Ask the hosting provider whether it supports a shell-created clone followed
   by cPanel registration of the existing repository path.
4. Continue only through the provider-supported route, with the clone still
   outside both public roots.

The cPanel UI can omit repositories created solely at the command line, so a
provider-approved registration step is part of this contingency. Repeated UI
retries leave the five-second product limit unchanged.

## 6. Create the private installer configuration

The default configuration file sits beside the repository directory: one
level above the managed clone, named exactly
`.human-ai-systems-exemplars-cpanel.conf`.

For a clone at:

```text
<CPANEL_HOME>/repositories/human-ai-systems-exemplars
```

the default configuration path is:

```text
<CPANEL_HOME>/repositories/.human-ai-systems-exemplars-cpanel.conf
```

Copy the key names from `deployment/cpanel/host-config.example` and replace
the paths with values read from the cPanel account:

```ini
EXPECTED_BRANCH=prod
PRIMARY_DOCUMENT_ROOT=/absolute/path/to/vik.guru-document-root
IFRAME_DOCUMENT_ROOT=/absolute/path/to/iframes.vik.guru-document-root
STATE_ROOT=<CPANEL_HOME>/hase-deployment-state
PRIMARY_FIRST_CUTOVER_ALLOWLIST=
IFRAME_FIRST_CUTOVER_ALLOWLIST=
```

Both allowlist keys remain present even when their values are empty. Values
are comma-separated root-relative paths with no surrounding spaces. A trailing
slash admits one named directory tree, for example `.well-known/`. Classify
each retained entry by its host job before adding it. Common candidates include
an ACME `.well-known/` tree, a provider-owned `cgi-bin/`, or a reviewed origin
policy `.htaccess`.

Set the private file mode:

```sh
chmod 600 ~/repositories/.human-ai-systems-exemplars-cpanel.conf
```

The configuration contains private account paths rather than credentials, yet
it remains outside Git, both document roots, Issues, pull requests, and public
receipts.

## 7. Back up and classify the current public roots

Before first cutover:

1. Create a dated backup or quarantine copy of the current primary and iframe
   roots outside both document roots, the managed clone, and the private state
   root.
2. Record the backup coordinate in the protected operator record.
3. Decide which release can restore the prior public state. For the first
   cutover, the filesystem backup is the immediate recovery coordinate.
4. Move legacy visitor files out of both receiving roots.
5. Leave only entries named in the two first-cutover allowlists.

The installer reads every existing entry before mutation. Empty roots plus a
small classified host-owned set create the clearest first run. Unknown files,
symbolic links, special filesystem entries, and recognized-path bytes that
match neither the prior nor requested release stop the deployment before a
new surface is accepted.

## 8. Optionally rehearse against private canary roots

The installer has no dry-run mode. A realistic rehearsal uses two empty,
non-public directories, a separate state root, and a separate configuration
file. The canary state root stays separate because a successful deployment
binds its state to the exact document roots.

From the clean managed clone on attached `prod`, run:

```sh
/bin/bash deployment/cpanel/deploy.sh --config /absolute/private/path/to/canary.conf
```

A passing rehearsal establishes the host's Bash and filesystem behavior for
the carried bytes. It leaves DNS, public response rules, cache behavior, and
the production roots open for their own observations.

## 9. Perform the first pull and deployment

When the release coordinate, backup, configuration, roots, and response-policy
receiver are ready:

1. Open **cPanel → Files → Git Version Control → Manage → Pull or Deploy**.
2. Select **Update from Remote**.
3. Confirm the checked-out branch is `prod`, HEAD equals exact `R`, and the
   managed tree is clean.
4. Select **Deploy HEAD Commit** once.
5. Read the task result and cPanel's **Last Deployment Information**.
6. Preserve the normalized release SHA and completion state in #118. Raw
   logs, account paths, and protected configuration stay with the host owner.

The checked-in `.cpanel.yml` invokes only:

```text
/bin/bash deployment/cpanel/deploy.sh
```

The installer materializes the carrier from immutable Git blobs, verifies the
manifest and file index in private staging, preflights both roots, installs
iframe files before primary terminal routes, verifies every public byte, and
records success last.

### Interpreting an interrupted run

- A failure before mutation reports that public state remained unchanged.
- A failure after mutation may leave a verified mixture of the prior and
  requested releases. Correct the named host condition, then rerun the same
  `R`; the pending marker intentionally keeps a different release outside that
  recovery interval.
- A failure after all public bytes verify can be completed by rerunning the
  same `R` so the successful-state record settles.
- A stale `install.lock` receives human process inspection first. Remove it
  only after confirming that no deployment process remains.

An older production tag supplies a recovery identity, while the installer
requires an attached `prod` branch. The first cutover therefore uses the
external filesystem backup for immediate rollback through the protected host
procedure. After a successful deployment, the private `current-release` record
still identifies `R`; restoring legacy bytes makes that record temporarily
different from the live roots. Preserve the state record rather than deleting
or editing it. Before rerunning the same `R` or a reviewed descendant, move the
legacy content out of the managed roots again so preflight can recognize the
accepted state. A later Git-based recovery travels as a reviewed forward
carrier release on `prod`.

cPanel stores deployment diagnostics beneath the account's private `.cpanel`
logs. Keep raw diagnostic output private; the public handback needs the phase,
release coordinate, normalized result, and recovery action.

## 10. Apply response behavior and refresh scoped caches

The file installer and the delivery layer have separate ownership. After the
carrier lands:

- make `www.vik.guru` redirect to the selected apex URL;
- allow `https://iframes.vik.guru` through the primary origin's `frame-src`
  policy;
- apply #102's iframe MIME, UTF-8, `nosniff`, referrer, ancestry, CORS, and
  revalidation contract;
- preserve genuine missing-route and 404 behavior;
- keep delivery-layer HTML rewriting outside the accepted carrier path; and
- purge only the affected primary and iframe cache scope after the complete
  update.

Cloudflare features such as email-address rewriting can change served HTML
bytes. Byte-preserving delivery keeps the reviewed carrier and live verifier
in agreement.

## 11. Verify the signed-out receivers

Run the live verifiers from a trusted checkout at the accepted source or
release coordinate:

```sh
npm run verify:iframe-routes:live
npm run verify:iframe-routes:policy
npm run verify:iframe-ancestry:live
```

The all-route verifiers establish bytes and response policy. The focused
ancestry verifier uses the fixed PODA carrier to require a live HTTP 200 with
the exact parent policy, refusal from a loopback parent, and successful loading
from its `https://vik.guru` parent. Then complete #251's primary manifest sweep,
apex/`www`, robots, sitemap, cache, policy, intentional 404, and remaining
parent-child viewport observations. A
passing repository check establishes the carrier it exercised; the signed-out
observations establish the bytes and response behavior served to visitors.

Return one compact receipt:

- accepted stable-core identity and production `R` or immutable tag;
- deployment result and recovery coordinate;
- normalized primary and iframe counts;
- response-policy and cache standing;
- any remaining owner; and
- the next exact action.

## Optional interim iframe upload

An authorized manual upload can place the new iframe package before the full
cPanel cutover. Treat the complete `/v1/` package as one unit.

The local builder creates:

```text
.iframe-route-build/iframes.vik.guru/v1/
```

Upload that directory as `<IFRAME_DOCUMENT_ROOT>/v1/`, preserving every path
and byte. The accepted full iframe-origin carrier at `R` is:

```text
deployment/cpanel/carrier/iframe-public/
```

It adds the iframe-origin `robots.txt` beside `v1/`. Using the complete
`iframe-public/` closure is the simplest way to make the later first-cutover
preflight recognize every existing iframe-root byte. If only `v1/` travels
early, bring the root `robots.txt` into the accepted coordinate or clear it
before the cPanel first cutover.

Publish package support files before route entry documents and receipts, apply
#102's response contract, refresh the scoped cache, and run both live iframe
verifiers. This interim action establishes the iframe receiver it observes;
the final cPanel release still deploys the reviewed primary and iframe
closures together.

## Transferable release-reception map

This cPanel route uses a pattern that can transfer to another managed host
without transferring account paths or credentials:

| Operation row | This release |
| --- | --- |
| Visitor result | The primary and iframe origins serve one reviewed `R` together. |
| Operation identity | `R`, its first-parent `S`, carrier manifest, file index, and exact root binding define one deployment attempt. |
| Accepted pre-state | The checkout is clean and attached to `prod`; existing public bytes are empty, host-owned, or recognized from the requested or prior accepted release. |
| Aligned effects | Both public closures and the private current/pending release records agree on the installed carrier. |
| Publication point | The installer verifies every requested public byte, then records the successful release last. |
| Outcome families | First cutover installs `R`; a same-release retry resumes it; a later reviewed carrier advances from the prior accepted release. |
| Failure intervals | Preflight preserves the public roots; an interrupted install resumes the same `R`; a post-verification interruption settles through the same-release rerun. |
| Evidence owners | Repository tests own carrier behavior, cPanel owns the task result, signed-out checks own served bytes and policy, and the human operator owns release acceptance and recovery. |

The named `managed-host release reception` skill billet in
`planning/repository-skill-architecture.md` remains at rest until live cPanel
use or a second repository exposes a distinct, repeatable job beyond this
guide and the existing publication runbook.

## Future releases

Future source work continues through `main`. The accepted source moves through
the reviewed promotion path to `prod` as `S`; a carrier-only pull request then
forms `R`. cPanel performs **Update from Remote** followed by **Deploy HEAD
Commit**, and #251's fitting receiver check establishes live standing.

The managed clone remains a disposable receiver of GitHub state. Authored
changes, carrier generation, tags, and review stay in the source repository;
private paths, credentials, backups, DNS, response rules, and host logs stay
with their authorized operators.

The deploy key has no automatic expiry. Record its GitHub title and host owner,
review it with the release route, and revoke or rotate it when this cPanel
receiver is retired or its trust boundary changes.

## Current external references

- [cPanel — Set Up Access to Private Repositories](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-access-to-private-repositories/)
- [cPanel — Set Up Deployment](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-set-up-deployment/)
- [cPanel — Git Version Control](https://docs.cpanel.net/cpanel/files/git-version-control/)
- [cPanel — Advanced Configuration and Troubleshooting](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-advanced-configuration-and-troubleshooting/)
- [cPanel — Git UI timeout advisory](https://support.cpanel.net/hc/en-us/articles/4418071248791-Git-Repositories-may-timeout-when-cloned-or-updated-via-cPanel-s-Git-Version-Control-Feature)
- [GitHub — Managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [GitHub — SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
