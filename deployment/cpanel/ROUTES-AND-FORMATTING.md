# Share a clean URL and edit its source

A résumé can link to `https://vik.guru/genomic-viewer-replatforming`. The cPanel build writes `genomic-viewer-replatforming/index.html`. A directory-index server adds the trailing slash and serves that document. The original `.html` address serves the same page, including incoming queries and bookmarks. The canonical URL, sitemap and portfolio navigation use the directory spelling. The About page stays at the root, and the host retains its `404.html` error document. [Apache directory index and trailing-slash behavior](https://httpd.apache.org/docs/2.4/mod/mod_dir.html)

The single naming exception lives in the [cPanel configuration](production-projection.config.json). The [Showcase catalog source](../../context-canvas-project-surface/context-canvas/debriefs.html) publishes at `/showcase/`. Existing `/debriefs`, `/debriefs/` and `/debriefs.html` links open the same catalog and preserve their query and fragment. Individual entries keep their own case-study or article names.

## Build from a working branch

Start at the repository root with the [declared Node runtime](../../NODE-RUNTIME.md), locked dependencies and the approved public profile in the ignored `.env.public` file. Commit the intended inputs on any local branch. The builder reads that clean revision and validates both document roots.

```sh
npm ci
npm run build:prod-projection
npm run test:cpanel-navigation-browser
python3 -m http.server 8000 --bind 127.0.0.1 --directory .prod-projection-build/primary-public
```

The browser check serves the built primary root on loopback. It opens a printed Showcase link with a query and bookmark, checks the older catalog addresses, loads the two case-study previews, and follows the footer to the native Studio. To check an extracted ZIP, append `-- path/to/primary-public` to the test command.

Open `http://127.0.0.1:8000/showcase?ref=cv`, select a Showcase item and follow its preview. Use a separate terminal to build the ZIP. The ZIP command can also run directly from a clean checkout.

```sh
npm run build:cpanel-zip
```

The command reports the archive under `.cpanel-transfer/local/`. It builds both public roots, includes the deployment manifest and file index, reopens the ZIP, and checks every member against the build plan. The filename includes the source revision and an archive digest prefix. A fixture professional profile is suitable for local review. An operator preparing a release uses the approved value and the [tagged release procedure](SHELL-FREE-ARTIFACT-DELIVERY.md).

## Edit, compact and prettify

The primary manifest and the iframe family manifests select the delivered files. Source files retain their existing names on the working branch. The cPanel builder alone adds the directory indexes. Edit the named source or generator input when a page contains a generated section. From the repository root, these commands use the pinned local tools.

```sh
npm run format:carrier -- list --carrier
npm run format:carrier -- pretty context-canvas-project-surface/context-canvas/debriefs.html
npm run format:carrier -- compact context-canvas-project-surface/context-canvas/debriefs.html
npm run format:carrier -- pretty context-canvas-project-surface/img/plot/genomic_viewer_strategy_canvas.svg
npm run format:carrier -- compact context-canvas-project-surface/img/plot/genomic_viewer_strategy_canvas.svg
```

Pass several paths to format a selection. Use `compact --carrier` to compact the whole source selection. HTML, CSS, JavaScript modules and classic scripts, JSON, XML and SVG each use their own parser. Images, PDFs, fonts and archived media retain their binary encoding. Preserve Markdown block boundaries, plain-text instructions and line-based protocols such as robots.txt.

**Keep HTML attribute quotes.** The [HTML configuration](../../html-minifier.config.json) sets `removeAttributeQuotes` to `false`. Leave `--remove-attribute-quotes` out of CLI invocations so Prettier and IntelliJ can expand the markup reliably. HTML uses conservative whitespace collapse. JavaScript keeps names and comments. XML formatting uses the pinned `@prettier/plugin-xml` development dependency. SVG text, accessible titles, IDs and metadata carry meaning. The compact pass preserves them. Prettier reconstructs indentation and layout. Git retains earlier editorial formatting. [Prettier XML whitespace modes](https://github.com/prettier/plugin-xml#whitespace)

In an IntelliJ File Watcher, set the working directory to the repository root, use the project Node runtime, and pass `tools/cpanel-format.mjs compact "$FilePath$"` as the Node arguments. Run `pretty "$FilePath$"` as the open/edit action. Give the watcher one explicit save or before-commit trigger. Excluding external file changes from that trigger prevents prettifying a file from immediately compacting it again. Exclude build folders, node_modules and the generated ZIP.

## Why these choices fit this carrier

| Option | What it contributes |
| --- | --- |
| Move HTML sources into page directories | Gives a static server native directory indexes. Applying the layout at export keeps the source tree easy to navigate. |
| Rewrite extensionless requests in Apache | Can support old links centrally, but depends on the host’s rewrite settings. Physical indexes also work on a simple local static server. |
| Generate a redirect page per printed URL | Small payload. A real page at the printed URL keeps working when scripts are unavailable and retains a useful address after navigation. |
| Emit a real index and retain the original HTML | Selected for the portfolio. Both spellings open the same content. Duplicate HTML costs bytes in the extracted tree. Images, scripts and styles remain shared. |
| Optimize only the transfer | The final formatting pass also covers generated HTML and URLs inserted during the build. Verification and hashing follow the transformation. |
| Compact selected working sources and prettify on demand | Reduces repeated model input and preserves editable names, quoted attributes and semantic text. Source and byte-contract owners change together. |

The historical v0.2 Strategy schema has a separate frozen public release. Its Pages and Worker receivers retain the published bytes and compare the parsed schema with the compact working copy.

Use the source tree for editing, the projection for local browser verification, and the verified ZIP for transfer. A clean working-branch build supplies all three without a push to `prod`.

## What compact source saves an AI collaborator

This census measures input tokens, separately from download size. It reads the 2,725 tracked paths at `beba9154`, counts each of the 2,473 UTF-8 text files independently using `gpt-tokenizer@3.4.0` and `o200k_base`, then counts the same file after transformation. The other 252 paths contributed no text to this comparison. A task that reads only one page spends tokens on that page. A model, tokenizer, cache or retrieval policy can produce a different result.

| Priority for an AI collaborator | Files | Before | After | Potential saving |
| --- | ---: | ---: | ---: | ---: |
| Orientation, skills and README routes | 238 | 392,436 | 376,762 | 15,674 (4.0%) |
| Portfolio sources and their inline owners | 376 | 3,829,302 | 3,598,151 | 231,151 (6.0%) |
| Build scripts, tests and workflows | 402 | 1,817,406 | 1,589,263 | 228,143 (12.6%) |
| Other source, schemas and fixtures | 1,347 | 6,464,584 | 5,846,337 | 618,247 (9.6%) |
| Planning, history and release records | 110 | 1,176,731 | 951,632 | 225,099 (19.1%) |
| **All tracked text** | **2,473** | **13,680,459** | **12,362,145** | **1,318,314 (9.6%)** |

The portfolio row uses the format-aware compactor for every member. For other rows, the experiment applies the same compactor to supported formats. For the remaining 939 files, including Markdown, YAML and executable shell examples, it models collapsing ASCII whitespace to single spaces. That part of the comparison can destroy syntax, code fences and instructions. It estimates a hypothetical token count and supplies no working migration for those formats.

Read the nearest README and relevant skills first. Their headings, lists and command boundaries save search and re-entry work. Compact frequently edited portfolio code and high-volume fixtures, then expand the particular file under review. Keep checks and generators readable where diagnosing a failure depends on locating a specific statement. Historical records provide the largest percentage reduction in this census, but a task that never opens an archive gains zero tokens from compacting it. No recurring measurement dependency is needed in the portfolio.
