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

The intended deterministic production projection gives each deployed origin
its own source-controlled `/robots.txt`. The reviewed file will express the
posture above and name the current crawler families that need explicit allow
or exclusion rules. Cloudflare's verified-bot and AI Crawl Control behavior
will apply the matching server-side treatment while keeping `/robots.txt`
available for crawlers to read.

The production receiver owns two observations before this posture is described
as live:

1. the served `/robots.txt` returns `200` with the `text/plain` media type and
   exactly matches its reviewed source bytes; and
2. verified Search and person-directed Agent traffic can reach the selected
   public routes while verified Training traffic receives the configured edge
   treatment.

The Robots Exclusion Protocol communicates crawler instructions; it is not an
access-control system. Cloudflare enforcement, origin configuration, and
ordinary application security remain separate operational layers. Cloudflare
Managed `robots.txt` stays disabled where it would prepend changing content and
break the required source-to-runtime byte comparison.

Until the production projection and signed-out observations exist, these are
the intended deployed-origin behaviors rather than claims about current live
routes. A repository file also cannot set the crawler behavior of
`github.com`, `raw.githubusercontent.com`, or `gist.github.com`; their platform
owners control those hosts.

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

The repository records the selected posture and the evidence that can establish
it. Questions about a particular third party's conduct remain with their
fact-specific setting.
