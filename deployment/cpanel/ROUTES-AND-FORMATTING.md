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

**Keep HTML attribute quotes.** The repository sets `removeAttributeQuotes` to `false`. Leave `--remove-attribute-quotes` out of CLI invocations so authors can reopen the same markup with Prettier. Conservative HTML whitespace collapse, JavaScript printing with names and comments retained, and the pinned `@prettier/plugin-xml` allow contributors to keep working in source. The repository formatter also protects verbatim text in `pre` and `textarea`, adjacent SVG text spans, and XML metadata. The Prettier maintainers illustrate the reason with an inline element beside punctuation. A newline on the wrong side of the element can introduce a visible space. [HTML configuration](../../html-minifier.config.json) · [Repository formatter](../../tools/cpanel-format.mjs) · [Prettier maintainers on whitespace-sensitive HTML](https://prettier.io/blog/2018/11/07/1.15.0#whitespace-sensitive-formatting)

### IntelliJ and AI working on the same source

Use one writer per file at a time. IntelliJ soft wraps let a person read a long line while command-line tools and AI collaborators still read the compact bytes on disk. Running `pretty` writes an expanded file to disk. An AI collaborator reading that path now receives the expanded text. For a human edit, expand the source you own, edit it, compact it and review the diff before handing it back. For an AI edit, locate the owner first, read the relevant element, function or data record and leave unrelated files compact. [IntelliJ editor actions and soft wraps](https://www.jetbrains.com/help/idea/settings-editor-general.html)

| IntelliJ action | Configuration |
| --- | --- |
| Expand this file for editing | Keep your existing on-open action, or bind an External Tool to a keyboard shortcut. Use the project's declared Node executable, arguments `tools/cpanel-format.mjs pretty "$FilePath$"`, and working directory `$ProjectFileDir$` when the project is opened at the repository root. |
| Compact after editing | Use the same executable and working directory with `tools/cpanel-format.mjs compact "$FilePath$"`. An explicit External Tool action keeps an expanded file readable across saves. A File Watcher can run the compact action on save when that is the preferred handoff. |
| Scope the watcher | Limit it to the supported source files you edit. Clear **Auto-save edited files to trigger the watcher** and **Trigger the watcher on external changes**. IntelliJ can also run a save-triggered watcher when the window loses focus. Exclude build directories and dependencies and give this scope one formatting action. |

File Watchers respond to changes and saves. The separate expansion action makes opening a file useful for reading and prevents a save-time formatter and a watcher from repeatedly undoing each other's work. [JetBrains File Watchers](https://www.jetbrains.com/help/idea/using-file-watchers.html) · [JetBrains External Tools](https://www.jetbrains.com/help/idea/configuring-third-party-tools.html)

**Edit generated content at its source.** For example, the About Studio chapters pane gets its chapter-specific styles from `collaboration/about-investment-studio-chapters/chapters.css`. Edit that file, compact it, run `npm run build:about-studio-chapters`, then `npm run check:about-studio-chapters`. The builder also names the full Studio HTML, the chapter adapter and the embedded-height script for edits to those parts. Formatting a generated pane is safe for inspection. Its next build will replace independent edits. [About Studio chapter inputs and builder](../../tools/materialize-about-studio-chapters.mjs)

**A Git hook is optional.** The formatter and carrier build run from the checkout with the locked dependencies. Git's client hooks are installed per clone and a developer can bypass a pre-commit hook. A team that wants a local reminder can check its staged files. Keep the reviewer's selected hunks intact by compacting a working file before staging it. A hook that rewrites and re-stages the entire working file can include edits the author intended to keep for another commit. Review the selected changes with `git diff --cached`. [Pro Git on client-side hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) · [Git staging behavior](https://git-scm.com/docs/git-add)

### What a formatting round trip preserves

Prettier parses source and prints a new layout. It cannot infer an author's original line breaks from compact bytes. In this checkout, two consecutive compact passes produced identical bytes for the Showcase catalog HTML, its JavaScript and the Genomic Viewer strategy SVG. Inserting a pretty pass between them changed whitespace around HTML navigation elements and wrapped SVG attributes. The JavaScript recovered its compact bytes. Use Git to retrieve an exact historical spelling. Use the receiving check for the property that matters. A figure can render correctly and still have a different SHA-256. [How Prettier prints source](https://prettier.io/docs) · [XML plugin whitespace modes](https://github.com/prettier/plugin-xml#whitespace) · [Carrier formatting tests](../../tests/prod-deployment/cpanel-format.test.mjs)

For a freshly compacted path, review `git diff -- path/to/file` before staging it. Compare a visible behavior in the browser when spacing, figure labels or links changed. For a generated diagram, example or versioned prototype, run its generator's check and verify the published copies and declared digests together. The cPanel ZIP verifier compares bytes **after** route projection and formatting. It establishes agreement with that build plan. The original author's spacing is available from the corresponding Git revision.

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
