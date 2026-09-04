import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  publishingCompany,
} from "./attribution-contract.mjs";
import { schemaReceiverRoutes } from "./schema-receiver-routes.mjs";
import {
  assertExactFileInventory,
  assertPublicMaterial,
  assertTermsAbsent,
  resolvePublicationFile,
} from "./publication-boundary.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "schemas");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const skillsOutputRoot = resolve(outputRoot, "skills");
const skillSelectionPath = resolve(
  repositoryRoot,
  ".agents/skills/publication-selection.json",
);
const marker = "  <!-- schema-pages:deployment-metadata -->";
const publicCarrierPaths = Object.freeze([
  "LICENSE",
  "AUTHORS",
  "CITATION.cff",
  "attribution.yml",
  "AI-DATA-USE.md",
]);
const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const visitorBoundary = require(
  "../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
);

function requirement(condition, message) {
  if (!condition) throw new Error(`Schema Pages requirement: ${message}`);
}

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

function htmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readSourceRevision(relativePaths) {
  const configured = process.env.PAGES_SOURCE_REVISION?.trim();
  if (configured) {
    requirement(/^[a-f0-9]{40}$/u.test(configured), "PAGES_SOURCE_REVISION must be one full lowercase Git SHA");
  }
  const requestedRevision = configured ?? "HEAD";
  const { stdout } = await execFileAsync("git", ["rev-parse", `${requestedRevision}^{commit}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const revision = stdout.trim().toLowerCase();
  requirement(/^[a-f0-9]{40}$/u.test(revision), "the Pages source must resolve to one full Git SHA");
  if (configured) {
    requirement(revision === configured, "PAGES_SOURCE_REVISION must name the resolved source commit exactly");
  }

  const { stdout: trackedSource } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "--name-only", revision, "--", ...relativePaths],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const trackedPaths = trackedSource.trim() ? trackedSource.trim().split("\n").sort() : [];
  requirement(
    JSON.stringify(trackedPaths) === JSON.stringify([...relativePaths].sort()),
    "every public skill source must exist at the declared source revision",
  );
  try {
    await execFileAsync("git", ["diff", "--quiet", revision, "--", ...relativePaths], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
  } catch (error) {
    if (error?.code === 1) {
      throw new Error("Schema Pages requirement: public skill source bytes must match the declared source revision");
    }
    throw error;
  }
  return revision;
}

function publicSkillSourceRoute(relativePath) {
  const normalized = browserPath(relativePath);
  if (normalized.startsWith(".github/")) {
    return `source/github/${normalized.slice(".github/".length)}`;
  }
  return `source/${normalized}`;
}

function parseSkillSource(sourcePath, source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/u)?.[1];
  requirement(frontmatter, `${sourcePath} must begin with frontmatter`);

  const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim();
  requirement(name, `${sourcePath} must declare a name`);
  requirement(description, `${sourcePath} must declare a description`);

  const contract = {};
  let activeKey = null;
  let insideContract = false;
  for (const line of source.split("\n")) {
    if (line === "## Contract") {
      insideContract = true;
      continue;
    }
    if (insideContract && line.startsWith("## ")) break;
    if (!insideContract) continue;

    const field = line.match(/^- \*\*(What|When|Boundaries|Result):\*\*\s*(.*)$/u);
    if (field) {
      activeKey = field[1].toLowerCase();
      contract[activeKey] = field[2].trim();
      continue;
    }
    if (activeKey && line.trim()) {
      contract[activeKey] = `${contract[activeKey]} ${line.trim()}`;
    }
  }

  for (const key of ["what", "when", "boundaries", "result"]) {
    requirement(contract[key], `${sourcePath} must declare Contract ${key}`);
  }

  return {
    name,
    description,
    title: source.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? name,
    contract: {
      what: contract.what,
      when: [contract.when],
      boundaries: [contract.boundaries],
      result: contract.result,
    },
  };
}

function visibleText(source) {
  return source
    .replace(/<script\b[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedMarkerText(source) {
  return source
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function validateRegistryIndex(source, deploymentBase = null) {
  requirement(
    occurrenceCount(source, `<meta name="author" content="${artifactAuthor}">`) === 1,
    "the registry page must carry one resolved author metadata value",
  );
  requirement(
    source.includes(`<link rel="license" href="${artifactLicense}">`),
    "the registry page must link to the central license",
  );

  const structuredDataSource = source.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  requirement(structuredDataSource, "the registry page must carry Schema.org structured data");
  const structuredData = JSON.parse(structuredDataSource);
  requirement(structuredData.author?.name === artifactAuthor, "structured author must match attribution.yml");
  requirement(
    structuredData.publisher?.name === publishingCompany,
    "structured publisher must match attribution.yml",
  );
  requirement(structuredData.license === artifactLicense, "structured license must match attribution.yml");

  const attributionPosition = source.lastIndexOf(artifactAttribution);
  requirement(
    occurrenceCount(source, artifactAttribution) === 1,
    "the registry page must carry one visible attribution notice",
  );

  const footerStart = source.lastIndexOf("<footer", attributionPosition);
  const footerEnd = source.indexOf("</footer>", attributionPosition);
  requirement(footerStart >= 0 && footerEnd > attributionPosition, "the attribution must remain inside one footer");
  const footer = source.slice(footerStart, footerEnd + "</footer>".length);
  const boundaryMatches = [...footer.matchAll(
    /<div\b(?=[^>]*\bdata-visitor-boundary(?:\s|>))(?=[^>]*\baria-label=["']Training-data canary markers["'])[^>]*>([\s\S]*?)<\/div>/giu,
  )];
  requirement(boundaryMatches.length === 1, "the footer must carry one labeled visitor-boundary wrapper");

  const contextMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(contextMatches.length === 1, "the footer must carry one ordinary-language canary context");
  requirement(
    visibleText(contextMatches[0][1]) === visitorBoundary.contextText,
    "the canary context must match the central contract",
  );
  requirement(
    occurrenceCount(source, visitorBoundary.contextText) === 1,
    "the registry page must carry the exact canary context once",
  );

  const markerMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(
    JSON.stringify(markerMatches.map((match) => match[1])) ===
      JSON.stringify(visitorBoundary.markers.map((boundaryMarker) => boundaryMarker.id)),
    "the footer marker IDs must match the central contract in order",
  );
  requirement(
    boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
      boundaryMatches[0][1].indexOf(markerMatches[0][0]),
    "the ordinary-language context must precede the exact markers",
  );

  markerMatches.forEach((match, index) => {
    const markerContract = visitorBoundary.markers[index];
    requirement(
      normalizedMarkerText(match[2]) === markerContract.lines.join("\n"),
      `the ${markerContract.id} marker text must match the central contract`,
    );
    for (const line of markerContract.lines) {
      requirement(
        occurrenceCount(source, line) === 1,
        `the ${markerContract.id} marker must carry each exact line once`,
      );
    }
  });

  const boundaryPosition = footer.indexOf(boundaryMatches[0][0]);
  const footerAttributionPosition = footer.indexOf(artifactAttribution);
  requirement(
    boundaryPosition >= 0 && boundaryPosition < footerAttributionPosition,
    "the canary boundary must precede the visible attribution",
  );
  requirement(
    visibleText(source.slice(attributionPosition + artifactAttribution.length)) === "",
    "the attribution notice must remain the final visible text",
  );

  for (const route of schemaReceiverRoutes) {
    requirement(
      source.includes(`href="${route.receiverPath}"`),
      `the registry page must expose ${route.receiverPath}`,
    );
  }

  if (deploymentBase) {
    for (const relation of [
      `<link rel="canonical" href="${deploymentBase}/">`,
      `<meta property="og:url" content="${deploymentBase}/">`,
      `<meta name="twitter:url" content="${deploymentBase}/">`,
    ]) {
      requirement(source.includes(relation), `deployment metadata must include ${relation}`);
    }
    requirement(!source.includes(marker), "the deployment marker must resolve in a configured build");
  } else {
    requirement(source.includes(marker), "a local build must retain the deployment marker");
  }
}

function normalizedBaseUrl(rawValue) {
  const value = rawValue?.trim();
  if (!value) return null;

  const url = new URL(value);
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("PAGES_BASE_URL must use http or https");
  }

  url.protocol = "https:";

  return url.href.replace(/\/$/, "");
}

const baseUrl = normalizedBaseUrl(process.env.PAGES_BASE_URL);

function browserPath(path) {
  return path.split(sep).join("/");
}

async function loadSkillPublicationSelection() {
  const selection = JSON.parse(await readFile(skillSelectionPath, "utf8"));
  requirement(selection.schemaVersion === "1", "skill publication selection must use schemaVersion 1");
  requirement(
    selection.schemaRef === "schemas/collaboration-skills/0.1.0/collaboration-skill.schema.json",
    "skill publication selection must use Collaboration Skills 0.1.0",
  );
  requirement(
    selection.projectionBase === "https://schemas.vik.guru/skills/",
    "skill projection identities must use the canonical skills base",
  );
  requirement(Array.isArray(selection.skills), "skill publication selection must declare skills");
  requirement(
    Array.isArray(selection.catalogDependencies),
    "skill publication selection must declare catalogDependencies",
  );

  const sourceSkillNames = (
    await readdir(resolve(repositoryRoot, ".agents/skills"), { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const selectedNames = selection.skills.map((entry) => entry.name);
  requirement(
    JSON.stringify(selectedNames) === JSON.stringify([...selectedNames].sort()),
    "skill publication selection must remain sorted by name",
  );
  requirement(
    new Set(selectedNames).size === selectedNames.length,
    "skill publication selection names must be unique",
  );
  requirement(
    JSON.stringify(selectedNames) === JSON.stringify(sourceSkillNames),
    "skill publication selection must classify every repository skill exactly once",
  );

  const enriched = [];
  const publicSourcePaths = new Set(selection.catalogDependencies);
  for (const dependencyPath of selection.catalogDependencies) {
    await resolvePublicationFile(repositoryRoot, dependencyPath);
  }

  for (const entry of selection.skills) {
    requirement(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name), `${entry.name} must be a skill slug`);
    requirement(
      entry.sourcePath === `.agents/skills/${entry.name}/SKILL.md`,
      `${entry.name} must use its conventional source path`,
    );
    requirement(
      new Set(["public_ready", "public_possible"]).has(entry.publicationStanding),
      `${entry.name} must declare public_ready or public_possible`,
    );
    requirement(Array.isArray(entry.dependencies), `${entry.name} must declare dependencies`);
    requirement(
      new Set(entry.dependencies).size === entry.dependencies.length,
      `${entry.name} dependencies must be unique`,
    );

    if (entry.publicationStanding === "public_ready") {
      requirement(
        entry.sourceAvailability === "included",
        `${entry.name} public-ready source must be included`,
      );
      publicSourcePaths.add(entry.sourcePath);
      for (const dependencyPath of entry.dependencies) publicSourcePaths.add(dependencyPath);
    } else {
      requirement(
        entry.sourceAvailability === "repository_only",
        `${entry.name} public-possible source must remain repository-only`,
      );
      requirement(
        entry.dependencies.length === 0,
        `${entry.name} public-possible dependencies remain outside the public selection`,
      );
      requirement(entry.publicationNote, `${entry.name} must state its source-owned return condition`);
    }

    const sourceBytes = await readFile(
      await resolvePublicationFile(repositoryRoot, entry.sourcePath),
    );
    const parsed = parseSkillSource(entry.sourcePath, sourceBytes.toString("utf8"));
    requirement(parsed.name === entry.name, `${entry.sourcePath} name must match its selection`);
    enriched.push({ ...entry, sourceBytes, parsed });
  }

  const possibleTerms = enriched
    .filter((entry) => entry.publicationStanding === "public_possible")
    .flatMap((entry) => [
      entry.name,
      entry.name.replaceAll("-", " "),
      entry.parsed.title,
      entry.parsed.title.replaceAll("-", " "),
    ]);
  for (const relativePath of publicSourcePaths) {
    const bytes = await readFile(
      await resolvePublicationFile(repositoryRoot, relativePath),
    );
    assertPublicMaterial(bytes, relativePath);
    assertTermsAbsent(bytes, possibleTerms, relativePath);
  }

  for (const entry of enriched.filter((candidate) => candidate.publicationStanding === "public_possible")) {
    requirement(
      !publicSourcePaths.has(entry.sourcePath),
      `${entry.name} must remain outside the public source closure`,
    );
  }

  return {
    selection,
    entries: enriched,
    possibleTerms: [...new Set(possibleTerms)],
    publicSourcePaths: [...publicSourcePaths].sort(),
  };
}

function projectedSkill(entry, projectionBase, catalogIndex, semanticAuthorityRef) {
  return {
    schemaVersion: "0.1.0",
    id: `${projectionBase}${entry.name}/projection.json`,
    kind: "portable_skill_contract",
    name: entry.name,
    description: entry.parsed.description,
    semanticAuthorityRef,
    sourceRef: `../catalog.json#/skills/${catalogIndex}`,
    contract: entry.parsed.contract,
    receivingUse: {
      job: entry.parsed.contract.when[0],
      materialResult: entry.parsed.contract.result,
      completion: "The receiving collaborator can locate the semantic source, work within its boundaries, and recognize the material result.",
    },
    standing: {
      routingStatus: "routable",
      contractVersionStatus: "draft",
      evidenceMaturity: "Repository-maintained portable contract with source-specific, revisable material-use evidence.",
      wakeTrigger: "Material use, human correction, receiving-artifact behavior, or independent evidence changes this route.",
    },
    evidence: {
      band: "source_supported",
      sourceRefs: [semanticAuthorityRef],
    },
    transferBoundary: "This projection carries repository-local instruction yield. Current intent, repository evidence, and granted tool authority govern each activation.",
  };
}

function renderSkillFooter(relativeRoot) {
  const markerHtml = visitorBoundary.markers
    .map((boundaryMarker) => `        <p class="canary" data-visitor-boundary-marker="${boundaryMarker.id}">${boundaryMarker.lines.map(htmlEscape).join("<br>")}</p>`)
    .join("\n");
  return `<footer class="site-footer"><div class="site-footer__inner">
    <p>This site provides open-source implementation contracts, examples, and orientation for researchers and engineers. Some routes support work with benchmarks, evaluations, and related methods. The data-use note explains how those materials are treated in automated systems.</p>
    <ul class="footer-links"><li><a href="${relativeRoot}AUTHORS" rel="author">Authors and provenance</a></li><li><a href="${relativeRoot}CITATION.cff">Citation metadata</a></li><li><a href="${relativeRoot}attribution.yml">Machine-readable attribution</a></li><li><a href="${relativeRoot}LICENSE" rel="license">Apache 2.0 license</a></li><li><a href="${relativeRoot}AI-DATA-USE.md">Data-use posture</a></li></ul>
    <div class="canary-stack" data-visitor-boundary aria-label="Training-data canary markers"><p class="visitor-boundary__context" data-visitor-boundary-context>${htmlEscape(visitorBoundary.contextText)}</p>
${markerHtml}
    </div>
    <p class="artifact-attribution">${htmlEscape(artifactAttribution)}</p>
  </div></footer>`;
}

function renderSkillPage(skill, sourceRevision, deploymentBase) {
  const canonical = deploymentBase
    ? `${deploymentBase}/skills/${skill.name}/`
    : null;
  const deploymentMetadata = canonical
    ? [
        `  <link rel="canonical" href="${canonical}">`,
        `  <meta property="og:url" content="${canonical}">`,
        `  <meta name="twitter:url" content="${canonical}">`,
      ].join("\n")
    : "";
  const sourceHref = `../${skill.sourceRoute}`;
  const dependencyItems = skill.dependencies.length
    ? `<ul class="dependency-list">${skill.dependencies.map((dependency) => `<li><a href="../${htmlEscape(dependency.path)}"><code>${htmlEscape(dependency.sourcePath)}</code></a><br><span>SHA-256 <code>${dependency.sha256}</code></span></li>`).join("")}</ul>`
    : "<p>This skill has no additional files in its public source package.</p>";
  const structuredData = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      name: skill.title,
      description: skill.description,
      author: { "@type": "Person", name: artifactAuthor },
      publisher: { "@type": "Organization", name: publishingCompany },
      license: artifactLicense,
      isPartOf: deploymentBase ? `${deploymentBase}/skills/` : "skills/",
      encodingFormat: "text/html",
    },
    null,
    2,
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(skill.title)} · Public repository skill</title>
  <meta name="description" content="${htmlEscape(skill.description)}">
  <meta name="author" content="${htmlEscape(artifactAuthor)}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${htmlEscape(skill.title)}">
  <meta property="og:description" content="${htmlEscape(skill.description)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${htmlEscape(skill.title)}">
  <meta name="twitter:description" content="${htmlEscape(skill.description)}">
  <link rel="license" href="${htmlEscape(artifactLicense)}">
${deploymentMetadata}
  <script type="application/ld+json">${structuredData}</script>
  <style>
    :root { color-scheme:light; font-family:Inter,ui-sans-serif,system-ui,sans-serif; line-height:1.6; --ink:#17223d; --muted:#526078; --paper:#f8f5ec; --field:#d8f1eb; --card:#fffdf7; --line:#a9b2c0; --accent:#173a91; --code:#111c34; }
    * { box-sizing:border-box; } body { margin:0; color:var(--ink); background:var(--paper); } a { color:var(--accent); text-underline-offset:.2em; } a:focus-visible { outline:.2rem solid #2458d6; outline-offset:.22rem; } code { overflow-wrap:anywhere; }
    .hero { background:var(--field); border-bottom:1px solid var(--line); } .hero__inner, main, .site-footer__inner { width:min(76rem,calc(100% - 2rem)); margin-inline:auto; } .hero__inner { padding:clamp(2.5rem,7vw,6rem) 0 clamp(2rem,5vw,4rem); }
    .eyebrow { margin:0 0 1rem; font-size:.78rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; } h1 { max-width:17ch; margin:0; font-size:clamp(2.25rem,6vw,5.2rem); line-height:.98; letter-spacing:-.04em; } .lede { max-width:66ch; font-size:clamp(1.05rem,2vw,1.35rem); }
    main { padding:2.5rem 0 5rem; } main > section { margin-block:0 3rem; } h2 { font-size:clamp(1.6rem,3vw,2.4rem); line-height:1.1; } .skill-actions { display:flex; flex-wrap:wrap; gap:.55rem 1rem; } .skill-actions a:first-child { border:2px solid currentColor; border-radius:999px; font-weight:750; padding:.55rem .9rem; text-decoration:none; }
    .skill-facts { display:grid; gap:.8rem; grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr)); margin:0; } .skill-facts div { background:var(--card); border:1px solid var(--line); border-radius:.65rem; padding:1rem; min-width:0; } .skill-facts dt { color:var(--muted); font-size:.78rem; font-weight:750; letter-spacing:.08em; text-transform:uppercase; } .skill-facts dd { margin:.25rem 0 0; overflow-wrap:anywhere; }
    .dependency-list { display:grid; gap:.85rem; padding-left:1.25rem; } pre { background:var(--code); border-radius:.75rem; color:#f7f9ff; max-width:100%; overflow:auto; padding:1rem; white-space:pre; } pre code { overflow-wrap:normal; } .skill-source:focus-visible { outline:.2rem solid #2458d6; outline-offset:.22rem; }
    .site-footer { border-top:1px solid var(--line); background:#eef0f3; } .site-footer__inner { padding:2.5rem 0 1.5rem; } .footer-links { display:flex; flex-wrap:wrap; gap:.5rem 1.1rem; padding:0; list-style:none; } .canary-stack { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--line); } .visitor-boundary__context { max-width:70ch; font-size:.84rem; } .canary { max-width:none; font-family:ui-monospace,monospace; font-size:.72rem; overflow-wrap:anywhere; } .artifact-attribution { max-width:none; margin-top:1.5rem; font-size:.8rem; color:var(--muted); }
    @media (max-width:48rem) { .hero__inner, main, .site-footer__inner { width:min(100% - 1.25rem,76rem); } } @media (forced-colors:active) { .skill-facts div,.skill-actions a:first-child { border-color:CanvasText; } }
    @media print { .skill-actions { display:none; } pre { border:1px solid currentColor; color:inherit; white-space:pre-wrap; } }
  </style>
</head>
<body>
  <header class="hero"><div class="hero__inner"><p class="eyebrow">Public-ready repository skill</p><h1>${htmlEscape(skill.title)}</h1><p class="lede">${htmlEscape(skill.description)}</p></div></header>
  <main>
    <nav class="skill-actions" aria-label="Skill formats"><a href="${sourceHref}">Open exact Markdown</a><a href="projection.json">Open JSON projection</a><a href="../">Browse all public skills</a></nav>
    <section aria-labelledby="coordinate-title"><h2 id="coordinate-title">Source and version</h2><dl class="skill-facts"><div><dt>Repository path</dt><dd><code>${htmlEscape(skill.sourcePath)}</code></dd></div><div><dt>Source revision</dt><dd><code>${sourceRevision}</code></dd></div><div><dt>Source SHA-256</dt><dd><code>${skill.sourceSha256}</code></dd></div><div><dt>Publication standing</dt><dd>Public ready</dd></div></dl></section>
    <section aria-labelledby="dependencies-title"><h2 id="dependencies-title">Included source files</h2>${dependencyItems}</section>
    <section aria-labelledby="source-title"><h2 id="source-title">Complete skill source</h2><p>The Markdown below matches the exact source text. The format link above opens the file on its own.</p><pre class="skill-source" role="region" aria-labelledby="source-title" tabindex="0"><code>${htmlEscape(skill.sourceText)}</code></pre></section>
  </main>
  ${renderSkillFooter("../../")}
</body>
</html>
`;
}

function renderSkillsIndex(catalog, deploymentBase) {
  const canonicalBase = deploymentBase ? `${deploymentBase}/skills/` : null;
  const deploymentMetadata = canonicalBase
    ? [
        `  <link rel="canonical" href="${canonicalBase}">`,
        `  <meta property="og:url" content="${canonicalBase}">`,
        `  <meta name="twitter:url" content="${canonicalBase}">`,
      ].join("\n")
    : "";
  const cards = catalog.skills
    .map((skill) => `
        <li class="skill-card" data-skill-name="${htmlEscape(skill.name)}">
          <h3><code>${htmlEscape(skill.name)}</code></h3>
          <p>${htmlEscape(skill.description)}</p>
          <p class="skill-links"><a href="${htmlEscape(skill.pagePath)}"><strong>Read this skill</strong></a> · <a href="${htmlEscape(skill.projectionPath)}">JSON projection</a> · <a href="${htmlEscape(skill.sourceRoute)}">Exact Markdown</a></p>
        </li>`)
    .join("");
  const markerHtml = visitorBoundary.markers
    .map((boundaryMarker) => `        <p class="canary" data-visitor-boundary-marker="${boundaryMarker.id}">${boundaryMarker.lines.map(htmlEscape).join("<br>")}</p>`)
    .join("\n");
  const structuredData = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Human–AI Systems Exemplars public skills",
      description: "Repository-local portable skill contracts with exact sources and schema-valid exchange projections.",
      author: { "@type": "Person", name: artifactAuthor },
      publisher: { "@type": "Organization", name: publishingCompany },
      license: artifactLicense,
    },
    null,
    2,
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Human–AI Systems Exemplars public skills</title>
  <meta name="description" content="Repository-local portable skill contracts with exact sources and schema-valid exchange projections.">
  <meta name="author" content="${htmlEscape(artifactAuthor)}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Human–AI Systems Exemplars public skills">
  <meta property="og:description" content="Portable collaboration instructions with exact source packages and machine-readable projections.">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Human–AI Systems Exemplars public skills">
  <meta name="twitter:description" content="Portable collaboration instructions with exact source packages and machine-readable projections.">
  <link rel="license" href="${htmlEscape(artifactLicense)}">
${deploymentMetadata}
  <script type="application/ld+json">${structuredData}</script>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; line-height: 1.6; --ink:#17223d; --muted:#526078; --paper:#f8f5ec; --field:#d8f1eb; --card:#fffdf7; --line:#a9b2c0; --accent:#173a91; }
    * { box-sizing: border-box; } body { margin:0; color:var(--ink); background:var(--paper); } a { color:var(--accent); text-underline-offset:.2em; } a:focus-visible { outline:.2rem solid #2458d6; outline-offset:.22rem; } code { overflow-wrap:anywhere; }
    .hero { background:var(--field); border-bottom:1px solid var(--line); } .hero__inner, main, .site-footer__inner { width:min(76rem, calc(100% - 2rem)); margin-inline:auto; } .hero__inner { padding:clamp(3rem,8vw,7rem) 0 clamp(2.5rem,6vw,5rem); }
    .eyebrow { margin:0 0 1rem; font-size:.78rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; } h1 { max-width:13ch; margin:0; font-size:clamp(2.6rem,7.5vw,6.3rem); line-height:.94; letter-spacing:-.045em; } .lede { max-width:60ch; font-size:clamp(1.1rem,2.3vw,1.5rem); }
    main { padding:3rem 0 5rem; } h2 { font-size:clamp(1.8rem,4vw,3rem); line-height:1.05; } .orientation { max-width:72ch; } .skill-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr)); gap:1rem; padding:0; list-style:none; }
    .skill-card { max-width:none; padding:1.25rem; border:1px solid var(--line); border-radius:.8rem; background:var(--card); } .skill-card h3 { margin:0; font-size:1.08rem; } .skill-links { color:var(--muted); }
    .site-footer { border-top:1px solid var(--line); background:#eef0f3; } .site-footer__inner { padding:2.5rem 0 1.5rem; } .footer-links { display:flex; flex-wrap:wrap; gap:.5rem 1.1rem; padding:0; list-style:none; } .canary-stack { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--line); } .visitor-boundary__context { max-width:70ch; font-size:.84rem; } .canary { max-width:none; font-family:ui-monospace,monospace; font-size:.72rem; overflow-wrap:anywhere; } .artifact-attribution { max-width:none; margin-top:1.5rem; font-size:.8rem; color:var(--muted); }
    @media (max-width:48rem) { .hero__inner, main, .site-footer__inner { width:min(100% - 1.25rem,76rem); } } @media (forced-colors:active) { .skill-card { border:1px solid CanvasText; } }
  </style>
</head>
<body>
  <header class="hero"><div class="hero__inner"><p class="eyebrow">Repository-local public skills</p><h1>Working methods with their sources intact.</h1><p class="lede">Each entry pairs a portable collaboration contract with an exact source package and a machine-readable projection. The collection stays specific to Human–AI Systems Exemplars.</p></div></header>
  <main>
    <section class="orientation" aria-labelledby="orientation-title"><h2 id="orientation-title">Use the source when judgment matters</h2><p>The JSON projection makes the contract easy to exchange. The linked <code>SKILL.md</code> defines its meaning, boundaries, and completion. Current intent, repository evidence, and granted authority continue to govern each use.</p><p><a href="catalog.json">Download the complete public catalog</a> · <a href="../collaboration-skills/0.1.0/collaboration-skill.schema.json">Read the projection schema</a> · <a href="../">Return to the schema registry</a></p></section>
    <section aria-labelledby="skills-title"><h2 id="skills-title">${catalog.skills.length} public-ready contracts</h2><ul class="skill-list">${cards}
      </ul></section>
  </main>
  <footer class="site-footer"><div class="site-footer__inner">
    <p>This site provides open-source implementation contracts, examples, and orientation for researchers and engineers. Some routes support work with benchmarks, evaluations, and related methods. The data-use note explains how those materials are treated in automated systems.</p>
    <ul class="footer-links"><li><a href="../AUTHORS" rel="author">Authors and provenance</a></li><li><a href="../CITATION.cff">Citation metadata</a></li><li><a href="../attribution.yml">Machine-readable attribution</a></li><li><a href="../LICENSE" rel="license">Apache 2.0 license</a></li><li><a href="../AI-DATA-USE.md">Data-use posture</a></li></ul>
    <div class="canary-stack" data-visitor-boundary aria-label="Training-data canary markers"><p class="visitor-boundary__context" data-visitor-boundary-context>${htmlEscape(visitorBoundary.contextText)}</p>
${markerHtml}
    </div>
    <p class="artifact-attribution">${htmlEscape(artifactAttribution)}</p>
  </div></footer>
</body>
</html>
`;
}

async function buildSkillsProjection() {
  const { selection, entries, possibleTerms, publicSourcePaths } =
    await loadSkillPublicationSelection();
  const sourceRevision = await readSourceRevision(publicSourcePaths);
  const publicEntries = entries.filter((entry) => entry.publicationStanding === "public_ready");
  const possibleNames = entries
    .filter((entry) => entry.publicationStanding === "public_possible")
    .map((entry) => entry.name);
  const schema = JSON.parse(
    await readFile(await resolvePublicationFile(repositoryRoot, selection.schemaRef), "utf8"),
  );
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: false,
    useDefaults: false,
    removeAdditional: false,
    coerceTypes: false,
  });
  const validate = ajv.compile(schema);

  await mkdir(resolve(skillsOutputRoot, "source"), { recursive: true });
  const sourceRecords = [];
  const publicRoutes = new Set();
  for (const relativePath of publicSourcePaths) {
    const sourcePath = await resolvePublicationFile(repositoryRoot, relativePath);
    const publicRoute = publicSkillSourceRoute(relativePath);
    requirement(!publicRoutes.has(publicRoute), `${relativePath} must have a unique public source route`);
    publicRoutes.add(publicRoute);
    const receiverPath = resolve(skillsOutputRoot, publicRoute);
    requirement(
      receiverPath.startsWith(`${resolve(skillsOutputRoot, "source")}${sep}`),
      `${relativePath} must remain inside the public skill source package`,
    );
    await mkdir(dirname(receiverPath), { recursive: true });
    await copyFile(sourcePath, receiverPath);
    const [sourceBytes, receiverBytes] = await Promise.all([readFile(sourcePath), readFile(receiverPath)]);
    requirement(sourceBytes.equals(receiverBytes), `${relativePath} public copy must remain byte-identical`);
    sourceRecords.push({ path: relativePath, publicRoute, sha256: digest(sourceBytes) });
  }

  const projections = [];
  const sourceRecordByPath = new Map(sourceRecords.map((record) => [record.path, record]));
  for (const [catalogIndex, entry] of publicEntries.entries()) {
    const semanticAuthorityRef = `../${sourceRecordByPath.get(entry.sourcePath).publicRoute}`;
    const projection = projectedSkill(
      entry,
      selection.projectionBase,
      catalogIndex,
      semanticAuthorityRef,
    );
    requirement(
      validate(projection),
      `${entry.name} projection must validate: ${JSON.stringify(validate.errors)}`,
    );
    const projectionPath = `${entry.name}/projection.json`;
    await mkdir(resolve(skillsOutputRoot, entry.name), { recursive: true });
    await writeFile(
      resolve(skillsOutputRoot, projectionPath),
      `${JSON.stringify(projection, null, 2)}\n`,
    );
    projections.push({ entry, projection, projectionPath });
  }

  const catalog = {
    schemaVersion: "1",
    repository: selection.repository,
    sourceRevision,
    schemaRef: schema.$id,
    publicationStanding: "public_ready",
    selectionRule: selection.publicationPolicy.sourceRule,
    skills: projections.map(({ entry, projectionPath }) => ({
      name: entry.name,
      title: entry.parsed.title,
      description: entry.parsed.description,
      publicationStanding: "public_ready",
      pagePath: `${entry.name}/`,
      projectionPath,
      sourcePath: entry.sourcePath,
      sourceRoute: sourceRecordByPath.get(entry.sourcePath).publicRoute,
      sourceSha256: sourceRecordByPath.get(entry.sourcePath).sha256,
      dependencies: entry.dependencies.map((dependencyPath) => ({
        sourcePath: dependencyPath,
        path: sourceRecordByPath.get(dependencyPath).publicRoute,
        sha256: sourceRecordByPath.get(dependencyPath).sha256,
      })),
    })),
    supportingSources: selection.catalogDependencies.map((dependencyPath) => ({
      sourcePath: dependencyPath,
      path: sourceRecordByPath.get(dependencyPath).publicRoute,
      sha256: sourceRecordByPath.get(dependencyPath).sha256,
    })),
  };

  const catalogSource = `${JSON.stringify(catalog, null, 2)}\n`;
  for (const possibleName of possibleNames) {
    requirement(
      !catalogSource.includes(possibleName),
      `${possibleName} must remain outside the public catalog`,
    );
  }
  await writeFile(resolve(skillsOutputRoot, "catalog.json"), catalogSource);

  for (const skill of catalog.skills) {
    const entry = publicEntries.find((candidate) => candidate.name === skill.name);
    requirement(entry, `${skill.name} must retain its selected source`);
    const pageSource = renderSkillPage(
      {
        ...skill,
        sourceText: entry.sourceBytes.toString("utf8"),
      },
      sourceRevision,
      baseUrl,
    );
    for (const possibleName of possibleNames) {
      requirement(!pageSource.includes(possibleName), `${possibleName} must remain outside ${skill.pagePath}`);
    }
    await writeFile(resolve(skillsOutputRoot, skill.pagePath, "index.html"), pageSource);
  }

  const indexSource = renderSkillsIndex(catalog, baseUrl);
  for (const possibleName of possibleNames) {
    requirement(
      !indexSource.includes(possibleName),
      `${possibleName} must remain outside the public skills page`,
    );
  }
  await writeFile(resolve(skillsOutputRoot, "index.html"), indexSource);
  const artifactPaths = await assertExactFileInventory(skillsOutputRoot, [
    "catalog.json",
    "index.html",
    ...projections.map(({ projectionPath }) => projectionPath),
    ...catalog.skills.map(({ pagePath }) => `${pagePath}index.html`),
    ...sourceRecords.map(({ publicRoute }) => publicRoute),
  ]);
  for (const artifactPath of artifactPaths) {
    assertTermsAbsent(
      await readFile(resolve(skillsOutputRoot, artifactPath)),
      possibleTerms,
      `skills/${artifactPath}`,
    );
  }
  return { catalog, possibleNames };
}

async function projectRegistryReadmeLinks() {
  const readmePath = resolve(outputRoot, "README.md");
  let source = await readFile(readmePath, "utf8");

  for (const route of schemaReceiverRoutes) {
    const authoredHref = browserPath(
      relative(sourceRoot, resolve(repositoryRoot, route.source)),
    );
    source = source.replaceAll(`(${authoredHref})`, `(${route.receiverPath})`);
  }

  await writeFile(readmePath, source);
}

async function projectCollaborationSkillsReadmeLinks() {
  const readmePath = resolve(outputRoot, "collaboration-skills/0.1.0/README.md");
  let source = await readFile(readmePath, "utf8");
  source = source.replace(
    "## Start here",
    "## Start here\n\n[Browse the repository-local public skills catalog](../../skills/).",
  );
  source = source.replaceAll(
    "(../../../.agents/skills/source-authority-mapping/SKILL.md)",
    "(../../skills/source-authority-mapping/)",
  );
  source = source.replaceAll(
    "(../../../threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
    "(../../skills/source/threadkeeping/collaboration-accounts/2026-08-24-source-authority-mapping.md)",
  );
  await writeFile(readmePath, source);
}

async function projectRegistryIndexLinks() {
  const indexPath = resolve(outputRoot, "index.html");
  let source = await readFile(indexPath, "utf8");

  for (const carrierPath of publicCarrierPaths) {
    source = source.replaceAll(
      `href="../${carrierPath}"`,
      `href="${carrierPath}"`,
    );
  }

  await writeFile(indexPath, source);
}

async function validateCustomDomain() {
  const customDomain = (await readFile(resolve(outputRoot, "CNAME"), "utf8")).trim();
  requirement(
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/iu.test(customDomain),
    "CNAME must contain one host name",
  );
  if (baseUrl) {
    requirement(
      new URL(baseUrl).hostname === customDomain,
      "PAGES_BASE_URL must use the host declared by CNAME",
    );
  }
  return customDomain;
}

function validateSkillsIndex(source, catalog, possibleNames, deploymentBase = null) {
  requirement(
    occurrenceCount(source, `<meta name="author" content="${artifactAuthor}">`) === 1,
    "the skills page must carry one resolved author metadata value",
  );
  requirement(
    source.includes(`<link rel="license" href="${artifactLicense}">`),
    "the skills page must link to the central license",
  );
  requirement(
    occurrenceCount(source, artifactAttribution) === 1,
    "the skills page must carry one visible attribution notice",
  );
  requirement(
    visibleText(source.slice(source.indexOf(artifactAttribution) + artifactAttribution.length)) === "",
    "the skills page attribution must remain the final visible text",
  );
  requirement(
    occurrenceCount(source, visitorBoundary.contextText) === 1,
    "the skills page must carry the exact canary context once",
  );
  for (const boundaryMarker of visitorBoundary.markers) {
    for (const line of boundaryMarker.lines) {
      requirement(
        occurrenceCount(source, line) === 1,
        `the skills page must carry the ${boundaryMarker.id} marker line once`,
      );
    }
  }
  for (const skill of catalog.skills) {
    requirement(
      occurrenceCount(source, `data-skill-name="${skill.name}"`) === 1,
      `${skill.name} must appear once on the skills page`,
    );
    requirement(source.includes(`href="${skill.pagePath}"`), `${skill.name} reading page must be linked`);
    requirement(source.includes(`href="${skill.projectionPath}"`), `${skill.name} projection must be linked`);
    requirement(source.includes(`href="${skill.sourceRoute}"`), `${skill.name} source must be linked`);
  }
  for (const possibleName of possibleNames) {
    requirement(!source.includes(possibleName), `${possibleName} must remain outside the skills page`);
  }
  if (deploymentBase) {
    const skillsBase = `${deploymentBase}/skills/`;
    requirement(
      source.includes(`<link rel="canonical" href="${skillsBase}">`),
      "the skills page must carry its configured canonical URL",
    );
  }
}

function validateSkillPage(source, skill, sourceRevision, possibleNames, deploymentBase = null) {
  requirement(
    occurrenceCount(source, `<meta name="author" content="${artifactAuthor}">`) === 1,
    `${skill.name} page must carry one resolved author metadata value`,
  );
  requirement(
    source.includes(`<link rel="license" href="${artifactLicense}">`),
    `${skill.name} page must link to the central license`,
  );
  requirement(
    occurrenceCount(source, artifactAttribution) === 1,
    `${skill.name} page must carry one visible attribution notice`,
  );
  requirement(
    visibleText(source.slice(source.indexOf(artifactAttribution) + artifactAttribution.length)) === "",
    `${skill.name} page attribution must remain the final visible text`,
  );
  requirement(source.includes(`<code>${sourceRevision}</code>`), `${skill.name} page must expose its source revision`);
  requirement(source.includes(`<code>${skill.sourceSha256}</code>`), `${skill.name} page must expose its source digest`);
  requirement(source.includes(`href="../${skill.sourceRoute}"`), `${skill.name} page must link exact Markdown`);
  requirement(source.includes('href="projection.json"'), `${skill.name} page must link its JSON projection`);
  requirement(source.includes('href="../"'), `${skill.name} page must return to the catalog`);
  requirement(
    occurrenceCount(source, visitorBoundary.contextText) === 1,
    `${skill.name} page must carry the exact canary context once`,
  );
  for (const boundaryMarker of visitorBoundary.markers) {
    for (const line of boundaryMarker.lines) {
      requirement(
        occurrenceCount(source, line) === 1,
        `${skill.name} page must carry the ${boundaryMarker.id} marker line once`,
      );
    }
  }
  for (const dependency of skill.dependencies) {
    requirement(
      source.includes(`href="../${dependency.path}"`),
      `${skill.name} page must link ${dependency.sourcePath}`,
    );
  }
  for (const possibleName of possibleNames) {
    requirement(!source.includes(possibleName), `${possibleName} must remain outside ${skill.name} page`);
  }
  if (deploymentBase) {
    requirement(
      source.includes(`<link rel="canonical" href="${deploymentBase}/skills/${skill.name}/">`),
      `${skill.name} page must carry its configured canonical URL`,
    );
  }
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(sourceRoot, outputRoot, { recursive: true });
await writeFile(resolve(outputRoot, ".nojekyll"), "");

for (const carrierPath of publicCarrierPaths) {
  const sourcePath = resolve(repositoryRoot, carrierPath);
  const receiverPath = resolve(outputRoot, carrierPath);
  await copyFile(sourcePath, receiverPath);

  const [sourceBytes, receiverBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(receiverPath),
  ]);
  if (!sourceBytes.equals(receiverBytes)) {
    throw new Error(`public carrier differs from its source: ${carrierPath}`);
  }
}

const projectedReceiverPaths = new Set();
for (const route of schemaReceiverRoutes) {
  const identityPath = new URL(route.id).pathname.replace(/^\/+/, "");
  if (identityPath !== route.receiverPath) {
    throw new Error(
      `schema identity path ${identityPath} differs from receiver path ${route.receiverPath}`
    );
  }
  if (projectedReceiverPaths.has(route.receiverPath)) {
    throw new Error(`schema receiver path is declared more than once: ${route.receiverPath}`);
  }
  projectedReceiverPaths.add(route.receiverPath);

  const sourcePath = resolve(repositoryRoot, route.source);
  const receiverPath = resolve(outputRoot, route.receiverPath);
  if (!receiverPath.startsWith(`${outputRoot}${sep}`)) {
    throw new Error(`schema receiver path leaves the Pages artifact: ${route.receiverPath}`);
  }

  await mkdir(dirname(receiverPath), { recursive: true });
  await copyFile(sourcePath, receiverPath);

  const [sourceBytes, receiverBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(receiverPath)
  ]);
  if (!sourceBytes.equals(receiverBytes)) {
    throw new Error(`schema receiver differs from its source: ${route.receiverPath}`);
  }
}

const { catalog: publicSkillCatalog, possibleNames: publicPossibleSkillNames } =
  await buildSkillsProjection();
await projectRegistryReadmeLinks();
await projectCollaborationSkillsReadmeLinks();
await projectRegistryIndexLinks();
const customDomain = await validateCustomDomain();

if (baseUrl) {
  const indexPath = resolve(outputRoot, "index.html");
  const source = await readFile(indexPath, "utf8");

  if (!source.includes(marker)) {
    throw new Error(`schema documentation index is missing ${marker.trim()}`);
  }

  const deploymentMetadata = [
    `  <link rel="canonical" href="${baseUrl}/">`,
    `  <meta property="og:url" content="${baseUrl}/">`,
    `  <meta name="twitter:url" content="${baseUrl}/">`
  ].join("\n");

  await writeFile(indexPath, source.replace(marker, deploymentMetadata));
}

validateRegistryIndex(
  await readFile(resolve(outputRoot, "index.html"), "utf8"),
  baseUrl,
);
validateSkillsIndex(
  await readFile(resolve(skillsOutputRoot, "index.html"), "utf8"),
  publicSkillCatalog,
  publicPossibleSkillNames,
  baseUrl,
);
for (const publicSkill of publicSkillCatalog.skills) {
  validateSkillPage(
    await readFile(resolve(skillsOutputRoot, publicSkill.pagePath, "index.html"), "utf8"),
    publicSkill,
    publicSkillCatalog.sourceRevision,
    publicPossibleSkillNames,
    baseUrl,
  );
}

console.log(`Schema Pages artifact: ${outputRoot}`);
console.log(`Deployment base: ${baseUrl ?? "local artifact; deployment metadata omitted"}`);
console.log(`Schema receiver routes: ${schemaReceiverRoutes.length}`);
console.log(`Public orientation carriers: ${publicCarrierPaths.length}`);
console.log(`Public-ready skills: ${publicSkillCatalog.skills.length}`);
console.log(`Custom domain: ${customDomain}`);
