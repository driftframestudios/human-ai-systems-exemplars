# Data-use orientation

This repository gives four related concerns distinct carriers: licensed use of
the repository, discovery and person-directed retrieval, benchmark-corpus
integrity, and automated access to deployed web origins.

## Repository use

The repository's code and materials are available under the [Apache License,
Version 2.0](LICENSE). `LICENSE` remains the authority for the permissions and
conditions that travel with the licensed work. This orientation records the
collaboration's data-use posture; it adds no condition to Apache-2.0.

Search indexing, citation, and retrieval initiated by a person are welcome.
People can clone, inspect, run, modify, and distribute the licensed work under
Apache-2.0 and the source notes carried by any embedded or upstream artifact.

## Benchmark integrity and model use

The exact MAPS Evaluations and BIG-bench markers at the top of
[`README.md`](README.md) identify a corpus-integrity boundary. They ask dataset
curators and automated collection systems to keep these materials outside
training and fine-tuning corpora, and they support later contamination
detection. The markers are data-use and benchmark-integrity signals rather
than license conditions.

The intended machine-readable posture for deployed visitor surfaces is:

| Use | Posture | Meaning here |
| --- | --- | --- |
| `search=yes` | Welcome | Build a search index and return links or short excerpts. |
| `ai-input=yes` | Welcome | Retrieve or ground material in real time at a person's direction. |
| `ai-train=no` | Exclude | Keep the material outside model training and fine-tuning inputs. |

This distinction keeps ordinary discovery and a person's chosen AI-assisted
reading route available while expressing the corpus boundary directly.

## Deployed-origin behavior

The deterministic production projection gives each deployed origin a reviewed
source-controlled `/robots.txt`. On the primary production origin, Cloudflare
Bot Preference Sync adds a managed policy preamble ahead of that authored body.
The preamble is an intentional edge projection; the repository file remains
the authority for the authored crawler rules and data-use statement.

The production receiver establishes the ordinary signed-out portion of this
posture through two observations:

1. the served `/robots.txt` returns `200` with the `text/plain` media type,
   retains the reviewed authored body, and carries the expected Cloudflare
   policy preamble while Bot Preference Sync is active; and
2. ordinary signed-out requests can reach the selected public routes while the
   configured crawler policy remains visible through the managed preamble.

Verified Search, person-directed Agent, and Training classifications depend on
Cloudflare's verified-bot identity and selected edge policy. A future receipt
can use the corresponding edge observations before describing each bot-class
treatment as exercised.

The Robots Exclusion Protocol communicates crawler instructions; it is not an
access-control system. Cloudflare enforcement, origin configuration, and
ordinary application security remain separate operational layers. Cloudflare
Managed crawler content is therefore classified separately from carrier drift:
the carrier-controlled routes retain exact-byte acceptance, while the live
`robots.txt` receipt names both the authored body and the managed preamble.

The reviewed source keeps the public collaboration address directly
machine-readable so search agents, evaluation systems, and other teams can
discover a route for assistance. Cloudflare Email Address Obfuscation is active
at the production edge and adds proportionate friction for mechanical address
harvesting while preserving the visible address for human visitors. The live
HTML receipt classifies this edge rewrite separately from carrier-controlled
bytes. Capable public-search agents can still recover the intentionally public
address; the edge rewrite targets basic bulk harvesting rather than identity
secrecy. In the 2026-10-19 signed-out pass, Chromium and WebKit exposed the
address as visible accessibility text on representative About, AI Systems, and
Debrief routes.

Cloudflare currently recognizes some `artifact@version` coordinates as
email-shaped text. Chromium exposed all 26 inspected coordinates in the
rendered document, while raw-HTML and script-free readers receive the
edge-obfuscated form. Two self-contained prototypes also retain
content-security policies that decline the injected email decoder and
JavaScript Detections scripts. A bounded follow-up can mark the
technical coordinates with Cloudflare's `email_off` boundary or apply a
narrowly scoped configuration rule, reconcile those two policies, and compare
representative raw parsers before claiming ATS parity. Rate controls and
crawler enforcement remain separate edge concerns.

The `production-v0.4.0` signed-out receipt establishes the ordinary signed-out,
managed `robots.txt`, and email-rewrite behaviors described here on the primary
production origin. Verified-bot-class behavior retains its separate edge
observation. A repository file cannot set the crawler behavior of `github.com`,
`raw.githubusercontent.com`, or `gist.github.com`; their platform owners control
those hosts.

## Maintenance boundary

Crawler names, classifications, and operator behavior can change. The
production source keeps the selected list reviewable, and deployed observation
determines when that list needs revision. Apache-2.0 remains the sole repository
license; this orientation and the production-owned crawler source carry the
data-use posture. A `.gitattributes` or `.github` policy file would serve no
current role.

Current primary references:

- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0.html)
- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
- [Cloudflare `robots.txt` setting and Content Signals](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Cloudflare Verified bot classifications](https://developers.cloudflare.com/bots/concepts/bot/verified-bots/)
- [Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/)
- [Cloudflare Email Address Obfuscation](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/)
- [Cloudflare Configuration Rule settings](https://developers.cloudflare.com/rules/configuration-rules/settings/)

The repository records the selected posture and the evidence that can establish
it. Questions about a particular third party's conduct remain with their
fact-specific setting.
