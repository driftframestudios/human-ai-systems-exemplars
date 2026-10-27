import './node-runtime-admission.mjs';
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
import { assertPublicationRevision, copySchemaPayload, retrievalUrl, schemaCompanionRoutes, schemaPublication } from "./schema-publication.mjs";
import { pagesReleaseTag } from "./schema-site-release.mjs";
import {
  assertExactFileInventory,
  assertPublicMaterial,
  assertTermsAbsent,
  resolvePublicationFile,
  serializeJsonForHtmlScript,
} from "./publication-boundary.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(repositoryRoot, "schemas");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const skillsOutputRoot = resolve(outputRoot, "skills");
const collaborationGuidePath = resolve(outputRoot, "collaboration/index.html");
const skillSelectionPath = resolve(
  repositoryRoot,
  ".agents/skills/publication-selection.json",
);
const marker = "  <!-- schema-pages:deployment-metadata -->";
const collaborationMarker = "  <!-- schema-pages:collaboration-deployment-metadata -->";
const navigationStartMarker = "  <!-- schema-pages:primary-navigation:start -->";
const navigationEndMarker = "  <!-- schema-pages:primary-navigation:end -->";
const publicContactEmail = "consulting@vik.guru";
const publicCarrierPaths = Object.freeze([
  "LICENSE",
  "AUTHORS",
  "CITATION.cff",
  "attribution.yml",
  "AI-DATA-USE.md",
]);
const featuredSkillNames = Object.freeze([
  "embedded-prototype-layout",
  "semantic-table-design",
]);
const visualizationLadder = Object.freeze([
  { name: "data-visualization-foundations", label: "Shared foundation" },
  { name: "conversation-data-visualization", label: "Conversation route" },
  { name: "web-data-visualization", label: "Web route" },
  { name: "pdf-data-visualization", label: "PDF route" },
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

function renderPrimaryNavigation(relativeRoot, currentArea) {
  requirement(
    new Set(["registry", "skills", "collaboration"]).has(currentArea),
    `primary navigation needs a recognized current area: ${currentArea}`,
  );
  const links = [
    ["registry", relativeRoot || "./", "Schema registry"],
    ["skills", `${relativeRoot}skills/`, "Skills"],
    ["collaboration", `${relativeRoot}collaboration/`, "Collaboration guide"],
  ];
  const items = links
    .map(([area, href, label]) => {
      const current = area === currentArea ? ' aria-current="page"' : "";
      return `<li><a href="${href}"${current}>${label}</a></li>`;
    })
    .join("");
  return `${navigationStartMarker}
  <nav class="site-nav" aria-label="Primary"><div class="site-nav__inner"><ul>${items}</ul></div></nav>
${navigationEndMarker}`;
}

function projectPrimaryNavigation(source, relativeRoot, currentArea) {
  const start = source.indexOf(navigationStartMarker);
  const end = source.indexOf(navigationEndMarker);
  requirement(
    start >= 0 && end > start,
    `${currentArea} source must carry one primary navigation block`,
  );
  requirement(
    source.indexOf(navigationStartMarker, start + navigationStartMarker.length) < 0 &&
      source.indexOf(navigationEndMarker, end + navigationEndMarker.length) < 0,
    `${currentArea} source must carry one primary navigation block`,
  );
  return `${source.slice(0, start)}${renderPrimaryNavigation(relativeRoot, currentArea)}${source.slice(end + navigationEndMarker.length)}`;
}

function validatePrimaryNavigation(source, relativeRoot, currentArea, surfaceName) {
  const start = source.indexOf(navigationStartMarker);
  const end = source.indexOf(navigationEndMarker);
  requirement(start >= 0 && end > start, `${surfaceName} must carry primary navigation`);
  const navigation = source.slice(start, end + navigationEndMarker.length);
  const expected = [
    ["registry", relativeRoot || "./", "Schema registry"],
    ["skills", `${relativeRoot}skills/`, "Skills"],
    ["collaboration", `${relativeRoot}collaboration/`, "Collaboration guide"],
  ];
  requirement(
    occurrenceCount(navigation, '<nav class="site-nav" aria-label="Primary">') === 1,
    `${surfaceName} must expose one labeled primary navigation`,
  );
  requirement(
    occurrenceCount(navigation, 'aria-current="page"') === 1,
    `${surfaceName} must expose one current primary area`,
  );
  for (const [area, href, label] of expected) {
    const current = area === currentArea ? ' aria-current="page"' : "";
    requirement(
      navigation.includes(`<a href="${href}"${current}>${label}</a>`),
      `${surfaceName} must link ${label} through ${href}`,
    );
  }
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

function validateVisitorBoundaryFooter(source, surfaceName) {
  const attributionPosition = source.lastIndexOf(artifactAttribution);
  requirement(
    occurrenceCount(source, artifactAttribution) === 1,
    `${surfaceName} must carry one visible attribution notice`,
  );

  const footerStart = source.lastIndexOf("<footer", attributionPosition);
  const footerEnd = source.indexOf("</footer>", attributionPosition);
  requirement(footerStart >= 0 && footerEnd > attributionPosition, `${surfaceName} attribution must remain inside one footer`);
  const footer = source.slice(footerStart, footerEnd + "</footer>".length);
  const boundaryMatches = [...footer.matchAll(
    /<div\b(?=[^>]*\bdata-visitor-boundary(?:\s|>))(?=[^>]*\baria-label=["']Training-data canary markers["'])[^>]*>([\s\S]*?)<\/div>/giu,
  )];
  requirement(boundaryMatches.length === 1, `${surfaceName} footer must carry one labeled visitor-boundary wrapper`);

  const contextMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(contextMatches.length === 1, `${surfaceName} footer must carry one ordinary-language canary context`);
  requirement(
    visibleText(contextMatches[0][1]) === visitorBoundary.contextText,
    `${surfaceName} canary context must match the central contract`,
  );
  requirement(
    occurrenceCount(source, visitorBoundary.contextText) === 1,
    `${surfaceName} must carry the exact canary context once`,
  );

  const markerMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
  )];
  requirement(
    JSON.stringify(markerMatches.map((match) => match[1])) ===
      JSON.stringify(visitorBoundary.markers.map((boundaryMarker) => boundaryMarker.id)),
    `${surfaceName} footer marker IDs must match the central contract in order`,
  );
  requirement(
    boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
      boundaryMatches[0][1].indexOf(markerMatches[0][0]),
    `${surfaceName} ordinary-language context must precede the exact markers`,
  );

  markerMatches.forEach((match, index) => {
    const markerContract = visitorBoundary.markers[index];
    requirement(
      normalizedMarkerText(match[2]) === markerContract.lines.join("\n"),
      `${surfaceName} ${markerContract.id} marker text must match the central contract`,
    );
    for (const line of markerContract.lines) {
      requirement(
        occurrenceCount(source, line) === 1,
        `${surfaceName} ${markerContract.id} marker must carry each exact line once`,
      );
    }
  });

  const boundaryPosition = footer.indexOf(boundaryMatches[0][0]);
  const footerAttributionPosition = footer.indexOf(artifactAttribution);
  requirement(
    boundaryPosition >= 0 && boundaryPosition < footerAttributionPosition,
    `${surfaceName} canary boundary must precede the visible attribution`,
  );
  requirement(
    visibleText(source.slice(attributionPosition + artifactAttribution.length)) === "",
    `${surfaceName} attribution notice must remain the final visible text`,
  );
}

function validateRegistryIndex(source, deploymentBase = null) {
  validatePrimaryNavigation(source, "", "registry", "the registry page");
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

  validateVisitorBoundaryFooter(source, "the registry page");

  for (const skillName of featuredSkillNames) {
    requirement(
      source.includes(`href="skills/${skillName}/"`),
      `the registry page must feature ${skillName}`,
    );
  }
  requirement(
    source.includes('href="skills/#visualization-ladder"'),
    "the registry page must route visitors into the visualization ladder",
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
const releaseTag = process.env.PAGES_RELEASE_TAG ? pagesReleaseTag(process.env.PAGES_RELEASE_TAG) : null;

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
    <p>This site provides open-source implementation contracts, examples, and orientation for researchers and engineers. Some routes support work with benchmarks, evaluations, and related methods. The data-use note explains this repository's expectations for automated use.</p>
    <ul class="footer-links"><li><a href="${relativeRoot}AUTHORS" rel="author">Authors and provenance</a></li><li><a href="${relativeRoot}CITATION.cff">Citation metadata</a></li><li><a href="${relativeRoot}attribution.yml">Machine-readable attribution</a></li><li><a href="${relativeRoot}LICENSE" rel="license">Apache 2.0 license</a></li><li><a href="${relativeRoot}AI-DATA-USE.md">Data-use posture</a></li></ul>
    <p class="site-contact">For assistance or collaboration, write to ${publicContactEmail}.</p>
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
    : "<p>The linked <code>SKILL.md</code> is the complete public source package for this skill.</p>";
  const structuredData = serializeJsonForHtmlScript(
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
    .skip-link { position:absolute; left:.75rem; top:.75rem; z-index:4; padding:.65rem .85rem; color:var(--paper); background:var(--ink); transform:translateY(-180%); } .skip-link:focus { transform:translateY(0); }
    .site-nav { color:var(--paper); background:var(--ink); } .site-nav__inner { width:min(76rem,calc(100% - 2rem)); margin-inline:auto; } .site-nav ul { display:flex; flex-wrap:wrap; gap:.25rem .55rem; margin:0; padding:.55rem 0; list-style:none; } .site-nav li { max-width:100%; } .site-nav a { display:block; border:1px solid transparent; border-radius:999px; color:inherit; padding:.4rem .7rem; } .site-nav a[aria-current="page"] { border-color:currentColor; font-weight:800; text-decoration:none; }
    .hero { background:var(--field); border-bottom:1px solid var(--line); } .hero__inner, main, .site-footer__inner { width:min(76rem,calc(100% - 2rem)); margin-inline:auto; } .hero__inner { padding:clamp(2.5rem,7vw,6rem) 0 clamp(2rem,5vw,4rem); }
    .eyebrow { margin:0 0 1rem; font-size:.78rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; } h1 { max-width:17ch; margin:0; font-size:clamp(2.25rem,6vw,5.2rem); line-height:.98; letter-spacing:-.04em; } .lede { max-width:66ch; font-size:clamp(1.05rem,2vw,1.35rem); }
    main { padding:2.5rem 0 5rem; } main > section { margin-block:0 3rem; } h2 { font-size:clamp(1.6rem,3vw,2.4rem); line-height:1.1; } .skill-actions { display:flex; flex-wrap:wrap; gap:.55rem 1rem; } .skill-actions a:first-child { border:2px solid currentColor; border-radius:999px; font-weight:750; padding:.55rem .9rem; text-decoration:none; }
    .contract-result { max-width:72ch; border-left:.4rem solid var(--accent); background:var(--card); padding:1.15rem 1.3rem; } .contract-result h2 { margin-top:0; } .contract-result p:last-child { margin-bottom:0; }
    .skill-facts { display:grid; gap:.8rem; grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr)); margin:0; } .skill-facts div { background:var(--card); border:1px solid var(--line); border-radius:.65rem; padding:1rem; min-width:0; } .skill-facts dt { color:var(--muted); font-size:.78rem; font-weight:750; letter-spacing:.08em; text-transform:uppercase; } .skill-facts dd { margin:.25rem 0 0; overflow-wrap:anywhere; }
    .dependency-list { display:grid; gap:.85rem; padding-left:1.25rem; } pre { background:var(--code); border-radius:.75rem; color:#f7f9ff; max-width:100%; overflow:auto; padding:1rem; white-space:pre; } pre code { overflow-wrap:normal; } .skill-source:focus-visible { outline:.2rem solid #2458d6; outline-offset:.22rem; }
    .site-footer { border-top:1px solid var(--line); background:#eef0f3; } .site-footer__inner { padding:2.5rem 0 1.5rem; } .footer-links { display:flex; flex-wrap:wrap; gap:.5rem 1.1rem; padding:0; list-style:none; } .canary-stack { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--line); } .visitor-boundary__context { max-width:70ch; font-size:.84rem; } .canary { max-width:none; font-family:ui-monospace,monospace; font-size:.72rem; overflow-wrap:anywhere; } .artifact-attribution { max-width:none; margin-top:1.5rem; font-size:.8rem; color:var(--muted); }
    @media (max-width:48rem) { .site-nav__inner,.hero__inner,main,.site-footer__inner { width:min(100% - 1.25rem,76rem); } } @media (forced-colors:active) { .skill-facts div,.skill-actions a:first-child,.contract-result { border-color:CanvasText; } }
    @media print { .skip-link,.site-nav,.skill-actions { display:none; } pre { border:1px solid currentColor; color:inherit; white-space:pre-wrap; } }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to skill content</a>
  ${renderPrimaryNavigation("../../", "skills")}
  <header class="hero"><div class="hero__inner"><p class="eyebrow">Public-ready repository skill</p><h1>${htmlEscape(skill.title)}</h1><p class="lede">${htmlEscape(skill.description)}</p></div></header>
  <main id="main-content" tabindex="-1">
    <nav class="skill-actions" aria-label="Skill formats"><a href="${sourceHref}">Open exact Markdown</a><a href="projection.json">Open JSON projection</a><a href="../">Browse all public skills</a></nav>
    <section class="contract-result" aria-labelledby="result-title"><h2 id="result-title">What this produces</h2><p data-contract-result>${htmlEscape(skill.produces)}</p></section>
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
          <p data-use-when><strong>Use when:</strong> ${htmlEscape(skill.useWhen)}</p>
          <p data-produces><strong>Produces:</strong> ${htmlEscape(skill.produces)}</p>
          <p class="skill-links"><a href="${htmlEscape(skill.pagePath)}"><strong>Read this skill</strong></a> · <a href="${htmlEscape(skill.projectionPath)}">JSON projection</a> · <a href="${htmlEscape(skill.sourceRoute)}">Exact Markdown</a></p>
        </li>`)
    .join("");
  const featuredCards = featuredSkillNames
    .map((name) => {
      const skill = catalog.skills.find((entry) => entry.name === name);
      requirement(skill, `${name} must be public-ready before it is featured`);
      return `<article class="featured-card" data-featured-skill="${skill.name}"><p class="card-label">Featured in this collection</p><h3>${htmlEscape(skill.title)}</h3><p><strong>Use when:</strong> ${htmlEscape(skill.useWhen)}</p><p><strong>Produces:</strong> ${htmlEscape(skill.produces)}</p><p><a href="${htmlEscape(skill.pagePath)}">Read ${htmlEscape(skill.title)}</a></p></article>`;
    })
    .join("");
  const visualizationSkills = visualizationLadder.map(({ name, label }) => {
    const skill = catalog.skills.find((entry) => entry.name === name);
    requirement(skill, `${name} must be public-ready before it enters the visualization ladder`);
    return { ...skill, label };
  });
  const visualizationFoundation = visualizationSkills[0];
  const visualizationDestinations = visualizationSkills
    .slice(1)
    .map((skill) => `<article class="visualization-ladder__card" data-visualization-skill="${skill.name}"><p class="card-label">${htmlEscape(skill.label)}</p><h3>${htmlEscape(skill.title)}</h3><p><strong>Use when:</strong> ${htmlEscape(skill.useWhen)}</p><p><strong>Produces:</strong> ${htmlEscape(skill.produces)}</p><p><a href="${htmlEscape(skill.pagePath)}">Read ${htmlEscape(skill.title)}</a></p></article>`)
    .join("");
  const visualizationLadderMarkup = `<article class="visualization-ladder__foundation" data-visualization-skill="${visualizationFoundation.name}"><p class="card-label">${htmlEscape(visualizationFoundation.label)}</p><h3>${htmlEscape(visualizationFoundation.title)}</h3><p><strong>Use when:</strong> ${htmlEscape(visualizationFoundation.useWhen)}</p><p><strong>Produces:</strong> ${htmlEscape(visualizationFoundation.produces)}</p><p><a href="${htmlEscape(visualizationFoundation.pagePath)}">Read ${htmlEscape(visualizationFoundation.title)}</a></p></article><p class="visualization-ladder__route-label" id="visualization-destinations-title">Choose one receiving surface</p><div class="visualization-ladder__destinations" aria-labelledby="visualization-destinations-title">${visualizationDestinations}</div>`;
  const structuredData = serializeJsonForHtmlScript(
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Human–AI Systems Exemplars public skills",
      description: "Repository-local portable skill contracts with exact sources and schema-valid exchange projections.",
      author: { "@type": "Person", name: artifactAuthor },
      publisher: { "@type": "Organization", name: publishingCompany },
      license: artifactLicense,
    },
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
    .skip-link { position:absolute; left:.75rem; top:.75rem; z-index:4; padding:.65rem .85rem; color:var(--paper); background:var(--ink); transform:translateY(-180%); } .skip-link:focus { transform:translateY(0); }
    .site-nav { color:var(--paper); background:var(--ink); } .site-nav__inner { width:min(76rem,calc(100% - 2rem)); margin-inline:auto; } .site-nav ul { display:flex; flex-wrap:wrap; gap:.25rem .55rem; margin:0; padding:.55rem 0; list-style:none; } .site-nav li { max-width:100%; } .site-nav a { display:block; border:1px solid transparent; border-radius:999px; color:inherit; padding:.4rem .7rem; } .site-nav a[aria-current="page"] { border-color:currentColor; font-weight:800; text-decoration:none; }
    .hero { background:var(--field); border-bottom:1px solid var(--line); } .hero__inner, main, .site-footer__inner { width:min(76rem, calc(100% - 2rem)); margin-inline:auto; } .hero__inner { padding:clamp(3rem,8vw,7rem) 0 clamp(2.5rem,6vw,5rem); }
    .eyebrow { margin:0 0 1rem; font-size:.78rem; font-weight:750; letter-spacing:.16em; text-transform:uppercase; } h1 { max-width:13ch; margin:0; font-size:clamp(2.6rem,7.5vw,6.3rem); line-height:.94; letter-spacing:-.045em; } .lede { max-width:60ch; font-size:clamp(1.1rem,2.3vw,1.5rem); }
    main { padding:3rem 0 5rem; } main > section + section { margin-top:clamp(3.5rem,7vw,6rem); } h2 { font-size:clamp(1.8rem,4vw,3rem); line-height:1.05; } .orientation { max-width:72ch; } .featured-grid,.skill-list,.visualization-ladder__destinations { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr)); gap:1rem; } .featured-grid { margin-top:1.25rem; } .skill-list { padding:0; list-style:none; }
    .featured-card,.skill-card,.visualization-ladder__foundation,.visualization-ladder__card { max-width:none; padding:1.25rem; border:1px solid var(--line); border-radius:.8rem; background:var(--card); } .featured-card { border-top:.42rem solid #2458d6; } .visualization-ladder { display:grid; gap:1rem; margin-top:1.25rem; } .visualization-ladder__foundation { border-left:.42rem solid var(--accent); background:var(--field); } .visualization-ladder__route-label { margin:.35rem 0 -.35rem; color:var(--muted); font-size:.75rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; } .featured-card h3,.skill-card h3,.visualization-ladder h3 { margin:0; font-size:1.08rem; } .card-label { margin:0 0 .45rem; color:var(--muted); font-size:.75rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; } .skill-links { color:var(--muted); }
    .practice-example { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.4fr); gap:1.25rem; align-items:start; } .practice-copy { padding:1.25rem; border-left:.4rem solid var(--accent); background:var(--card); } .practice-frame { min-width:0; margin:0; } .practice-frame iframe { display:block; width:100%; min-height:30rem; border:1px solid var(--line); background:var(--card); } .practice-frame figcaption { margin-top:.55rem; color:var(--muted); font-size:.92rem; }
    .site-footer { border-top:1px solid var(--line); background:#eef0f3; } .site-footer__inner { padding:2.5rem 0 1.5rem; } .footer-links { display:flex; flex-wrap:wrap; gap:.5rem 1.1rem; padding:0; list-style:none; } .canary-stack { margin-top:2.5rem; padding-top:1.25rem; border-top:1px solid var(--line); } .visitor-boundary__context { max-width:70ch; font-size:.84rem; } .canary { max-width:none; font-family:ui-monospace,monospace; font-size:.72rem; overflow-wrap:anywhere; } .artifact-attribution { max-width:none; margin-top:1.5rem; font-size:.8rem; color:var(--muted); }
    @media (max-width:48rem) { .site-nav__inner,.hero__inner,main,.site-footer__inner { width:min(100% - 1.25rem,76rem); } .practice-example { grid-template-columns:1fr; } .practice-frame iframe { min-height:34rem; } } @media (forced-colors:active) { .featured-card,.skill-card,.visualization-ladder__foundation,.visualization-ladder__card,.practice-copy,.practice-frame iframe { border-color:CanvasText; } }
    @media print { .skip-link,.site-nav,.practice-frame { display:none; } }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to skill catalog</a>
  ${renderPrimaryNavigation("../", "skills")}
  <header class="hero"><div class="hero__inner"><p class="eyebrow">Repository-local public skills</p><h1>Working methods with their sources intact.</h1><p class="lede">Each entry pairs a portable collaboration contract with an exact source package and a machine-readable projection. The collection stays specific to Human–AI Systems Exemplars.</p></div></header>
  <main id="main-content" tabindex="-1">
    <section class="orientation" aria-labelledby="orientation-title"><h2 id="orientation-title">Use the source when judgment matters</h2><p>The JSON projection makes the contract easy to exchange. The linked <code>SKILL.md</code> defines its meaning, boundaries, and completion. Current intent, repository evidence, and granted authority continue to govern each use.</p><p><a href="catalog.json">Download the complete public catalog</a> · <a href="../collaboration-skills/0.1.0/collaboration-skill.schema.json">Read the projection schema</a> · <a href="../">Return to the schema registry</a></p></section>
    <section id="visualization-ladder" aria-labelledby="visualization-ladder-title"><h2 id="visualization-ladder-title">Visualization ladder: settle meaning, then choose the receiving surface</h2><p>Begin with the shared data contract: reader question, admitted records, transformations, visual encoding, and exact-value companion. Then select the destination that will receive the figure. Conversation supports bounded exploration; web supports responsive and coordinated views; PDF supports fixed physical placement and reproducible export.</p><div class="visualization-ladder">${visualizationLadderMarkup}</div><p>When exact lookup or relationship comparison is the central job, <a href="semantic-table-design/">semantic table design</a> keeps the table and each extracted record meaningful.</p></section>
    <section aria-labelledby="featured-title"><h2 id="featured-title">Featured methods for tables and embedded prototypes</h2><p>These two contracts join meaning, comparison, and the actual parent-and-child layout boundary while keeping their responsibilities distinct.</p><div class="featured-grid">${featuredCards}</div></section>
    <section id="methods-in-practice" aria-labelledby="practice-title"><h2 id="practice-title">Methods in practice</h2><div class="practice-example"><div class="practice-copy"><p class="card-label">Worked reference · Native table + embedded preview</p><h3>Keep comparison meaning intact inside its real frame</h3><p>This source-owned example gives the child document native table relationships and gives the parent page the preview size, contextual title, sandbox, and onward route.</p><p>Source inspection establishes the ownership pattern. Browser observation of this reviewed artifact establishes its tested layout; accessibility conformance and behavior on another host each require their own observation.</p><p><a href="../examples/readable-table-embedded-layout/">Open the example in a full view</a></p></div><figure class="practice-frame"><iframe src="../examples/readable-table-embedded-layout/" title="Worked example of a semantic comparison table inside an embedded preview" sandbox loading="lazy"></iframe><figcaption>The same source-owned child opens independently through the full-view route.</figcaption></figure></div></section>
    <section aria-labelledby="skills-title"><h2 id="skills-title">${catalog.skills.length} public-ready contracts</h2><ul class="skill-list">${cards}
      </ul></section>
  </main>
  ${renderSkillFooter("../")}
</body>
</html>
`;
}

async function buildSkillsProjection() {
  const { selection, entries, possibleTerms, publicSourcePaths } =
    await loadSkillPublicationSelection();
  const sourceRevision = await readSourceRevision(publicSourcePaths);
  await assertPublicationRevision(repositoryRoot, sourceRevision, [
    "schemas", ".agents/skills/publication-selection.json", ...publicSourcePaths,
    "tools/build-schema-pages.mjs", "tools/schema-publication.mjs", "tools/schema-publication-lock.json",
    "tools/schema-receiver-routes.mjs", "tools/schema-site-release.mjs", "tools/publication-boundary.mjs",
    "tools/attribution-contract.mjs", "package.json", "package-lock.json", ...publicCarrierPaths,
    "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
    ...[...schemaReceiverRoutes, ...schemaCompanionRoutes].map(({ source }) => source),
  ]);
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
    schemaRefRole: "canonical_schema_identity",
    schemaRetrievalUrl: baseUrl
      ? retrievalUrl("collaboration-skills/0.1.0/collaboration-skill.schema.json", baseUrl)
      : "../collaboration-skills/0.1.0/collaboration-skill.schema.json",
    publicationStanding: "public_ready",
    selectionRule: selection.publicationPolicy.sourceRule,
    skills: projections.map(({ entry, projectionPath }) => ({
      name: entry.name,
      title: entry.parsed.title,
      description: entry.parsed.description,
      useWhen: entry.parsed.contract.when[0],
      produces: entry.parsed.contract.result,
      publicationStanding: "public_ready",
      pagePath: `${entry.name}/`,
      projectionPath,
      projectionRetrievalUrl: baseUrl ? retrievalUrl(`skills/${projectionPath}`, baseUrl) : projectionPath,
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

  for (const route of [...schemaReceiverRoutes, ...schemaCompanionRoutes]) {
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

  source = projectPrimaryNavigation(source, "", "registry");

  await writeFile(indexPath, source);
}

async function projectCollaborationGuideLinks(catalog) {
  let source = await readFile(collaborationGuidePath, "utf8");

  for (const carrierPath of publicCarrierPaths) {
    source = source.replaceAll(
      `href="../../${carrierPath}"`,
      `href="../${carrierPath}"`,
    );
  }

  for (const skill of catalog.skills) {
    source = source.replaceAll(
      `href="../../${skill.sourcePath}"`,
      `href="../skills/${skill.name}/"`,
    );
  }

  source = projectPrimaryNavigation(source, "../", "collaboration");

  await writeFile(collaborationGuidePath, source);
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
  validatePrimaryNavigation(source, "../", "skills", "the skills page");
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
    requirement(
      source.includes(`<p data-use-when><strong>Use when:</strong> ${htmlEscape(skill.useWhen)}</p>`),
      `${skill.name} must expose its source-derived trigger`,
    );
    requirement(
      source.includes(`<p data-produces><strong>Produces:</strong> ${htmlEscape(skill.produces)}</p>`),
      `${skill.name} must expose its source-derived result`,
    );
  }
  for (const featuredName of featuredSkillNames) {
    requirement(
      occurrenceCount(source, `data-featured-skill="${featuredName}"`) === 1,
      `${featuredName} must appear once in first-contact discovery`,
    );
    requirement(
      !source.includes(`data-visualization-skill="${featuredName}"`),
      `${featuredName} must retain its distinct table-and-layout feature role`,
    );
  }
  const visualizationSection = source.match(
    /<section id="visualization-ladder"[\s\S]*?<\/section>/u,
  )?.[0];
  requirement(visualizationSection, "the skills page must expose the visualization ladder");
  let previousVisualizationPosition = -1;
  for (const { name } of visualizationLadder) {
    const position = visualizationSection.indexOf(`data-visualization-skill="${name}"`);
    requirement(position >= 0, `${name} must appear in the visualization ladder`);
    requirement(
      !source.includes(`data-featured-skill="${name}"`),
      `${name} must retain its distinct visualization-ladder role`,
    );
    requirement(
      position > previousVisualizationPosition,
      "the visualization ladder must keep foundation and destination order",
    );
    requirement(
      visualizationSection.includes(`href="${name}/"`),
      `${name} must link to its readable skill route from the visualization ladder`,
    );
    previousVisualizationPosition = position;
  }
  requirement(
    source.includes('id="methods-in-practice"') &&
      source.includes('href="../examples/readable-table-embedded-layout/"') &&
      source.includes('src="../examples/readable-table-embedded-layout/"'),
    "the skills page must carry the source-owned methods-in-practice route",
  );
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

function validateCollaborationGuide(source, catalog, possibleNames, deploymentBase = null) {
  validatePrimaryNavigation(source, "../", "collaboration", "the collaboration guide");
  requirement(
    occurrenceCount(source, `<meta name="author" content="${artifactAuthor}">`) === 1,
    "the collaboration guide must carry one resolved author metadata value",
  );
  requirement(
    source.includes(`<link rel="license" href="${artifactLicense}">`),
    "the collaboration guide must link to the central license",
  );
  validateVisitorBoundaryFooter(source, "the collaboration guide");

  const loopIds = [
    "skill-from-receiving-use",
    "visitor-surface-change",
    "repository-reentry",
    "public-release",
  ];
  for (const loopId of loopIds) {
    const loop = source.match(
      new RegExp(`<article\\b[^>]*\\bid="${loopId}"[\\s\\S]*?<\\/article>`, "u"),
    )?.[0];
    requirement(loop, `the collaboration guide must carry loop ${loopId}`);
    for (const dimension of [
      "Entry",
      "Source owners",
      "Human decision",
      "Evidence",
      "Exit",
      "Recovery",
      "Re-entry",
    ]) {
      requirement(loop.includes(`<dt>${dimension}</dt>`), `${loopId} must name ${dimension}`);
    }
  }

  for (const anchor of [
    "collaboration-loops",
    "coordination-horizon",
    "schema-guided-inquiry",
    "common-questions",
  ]) {
    requirement(source.includes(`href="#${anchor}"`), `the collaboration guide must link #${anchor}`);
    requirement(source.includes(`id="${anchor}"`), `the collaboration guide must expose #${anchor}`);
  }

  const structuredDataSource = source.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  requirement(structuredDataSource, "the collaboration guide must carry FAQ structured data");
  const structuredData = JSON.parse(structuredDataSource);
  requirement(structuredData["@type"] === "FAQPage", "the collaboration guide structured data must be FAQPage");
  requirement(structuredData.author?.name === artifactAuthor, "the collaboration guide author must match attribution.yml");
  requirement(structuredData.publisher?.name === publishingCompany, "the collaboration guide publisher must match attribution.yml");
  requirement(structuredData.license === artifactLicense, "the collaboration guide license must match attribution.yml");

  const visibleFaqs = [...source.matchAll(
    /<details\s+class="faq">\s*<summary>([^<]+)<\/summary>\s*<p\s+data-faq-answer>([^<]+)<\/p>/gu,
  )].map((match) => ({ question: match[1].trim(), answer: match[2].trim() }));
  const structuredFaqs = structuredData.mainEntity?.map((entry) => ({
    question: entry.name,
    answer: entry.acceptedAnswer?.text,
  }));
  requirement(visibleFaqs.length >= 8, "the collaboration guide must expose at least eight visible questions");
  requirement(
    visibleFaqs.some(({ question, answer }) =>
      question === "Do I need a framework or orchestration script to use these loops?" &&
      answer.includes("The platform and environment determine")),
    "the collaboration guide must explain the optional orchestration and environment-specific autonomy boundary",
  );
  requirement(
    JSON.stringify(structuredFaqs) === JSON.stringify(visibleFaqs),
    "FAQ structured data must reproduce the visible questions and answers",
  );

  const executableScripts = [...source.matchAll(/<script\b([^>]*)>/gu)]
    .filter((match) => !/type="application\/ld\+json"/u.test(match[1]));
  requirement(executableScripts.length === 0, "the collaboration guide must remain complete without executable JavaScript");

  const requiredSkills = [
    "practitioner-probe",
    "collaboration-accounting",
    "declarative-skill-authoring",
    "context-canvas-surface-reading",
    "context-canvas-css-ownership",
    "context-canvas-visual-verification",
    "repository-reentry",
    "issue-chain-stewardship",
    "source-authority-mapping",
    "secret-boundary-inspection",
    "stateful-artifact-behavior-contracts",
  ];
  const catalogNames = new Set(catalog.skills.map((skill) => skill.name));
  for (const skillName of requiredSkills) {
    requirement(catalogNames.has(skillName), `${skillName} must be public-ready before the guide links it`);
    requirement(
      source.includes(`href="../skills/${skillName}/"`),
      `the collaboration guide must link the public ${skillName} page`,
    );
  }
  for (const possibleName of possibleNames) {
    requirement(!source.includes(possibleName), `${possibleName} must remain outside the collaboration guide`);
  }

  if (deploymentBase) {
    const canonical = `${deploymentBase}/collaboration/`;
    requirement(
      source.includes(`<link rel="canonical" href="${canonical}">`),
      "the collaboration guide must carry its configured canonical URL",
    );
    requirement(!source.includes(collaborationMarker), "the configured collaboration marker must resolve");
  } else {
    requirement(source.includes(collaborationMarker), "a local build must retain the collaboration marker");
  }
}

function validateSkillPage(source, skill, sourceRevision, possibleNames, deploymentBase = null) {
  validatePrimaryNavigation(source, "../../", "skills", `${skill.name} page`);
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
    source.includes(`<p data-contract-result>${htmlEscape(skill.produces)}</p>`),
    `${skill.name} page must expose its exact Contract Result`,
  );
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
await copySchemaPayload(repositoryRoot, outputRoot);
const schemaCatalog = await schemaPublication(repositoryRoot, baseUrl, publicSkillCatalog.sourceRevision);
await writeFile(resolve(outputRoot, "schema-catalog.json"), `${JSON.stringify(schemaCatalog, null, 2)}\n`);
await writeFile(resolve(outputRoot, "release.json"), `${JSON.stringify({
  schemaVersion: "1", releaseTag, sourceRevision: publicSkillCatalog.sourceRevision,
  deliveryBase: baseUrl, schemaCatalog: "schema-catalog.json", skillCatalog: "skills/catalog.json",
}, null, 2)}\n`);
const registryPath = resolve(outputRoot, "index.html");
let registry = await readFile(registryPath, "utf8");
for (const contract of schemaCatalog.contracts) {
  const anchor = registry.indexOf(`href="${contract.path}"`);
  requirement(anchor >= 0, `the registry must link ${contract.path}`);
  const end = registry.indexOf("</li>", anchor);
  const details = `<details data-schema-path="${htmlEscape(contract.path)}"><summary>Identity and source: ${htmlEscape(contract.path.split("/").at(-1))}</summary><p>Download from this site: <a href="${htmlEscape(contract.path)}">${htmlEscape(contract.retrievalUrl)}</a></p><p>Stable schema identity: <code>${htmlEscape(contract.canonicalId)}</code></p><p>Repository source: <code>${htmlEscape(contract.sourcePath)}</code></p><p>SHA-256: <code>${contract.sha256}</code></p></details>\n`;
  registry = registry.slice(0, end) + details + registry.slice(end);
}
registry = registry.replace("<!-- schema-pages:release -->", `<p>Site release: <code>${releaseTag ?? "local build"}</code>. Source revision: <code>${publicSkillCatalog.sourceRevision}</code>.</p><p><a href="release.json">Release coordinates</a> · <a href="schema-catalog.json">Schema identities, downloads, and digests</a></p>`);
await writeFile(registryPath, registry);
await projectRegistryReadmeLinks();
await projectCollaborationSkillsReadmeLinks();
await projectRegistryIndexLinks();
await projectCollaborationGuideLinks(publicSkillCatalog);
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

  const collaborationSource = await readFile(collaborationGuidePath, "utf8");
  if (!collaborationSource.includes(collaborationMarker)) {
    throw new Error(`schema collaboration guide is missing ${collaborationMarker.trim()}`);
  }
  const collaborationBase = `${baseUrl}/collaboration/`;
  const collaborationMetadata = [
    `  <link rel="canonical" href="${collaborationBase}">`,
    `  <meta property="og:url" content="${collaborationBase}">`,
    `  <meta name="twitter:url" content="${collaborationBase}">`,
  ].join("\n");
  await writeFile(
    collaborationGuidePath,
    collaborationSource.replace(collaborationMarker, collaborationMetadata),
  );
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
validateCollaborationGuide(
  await readFile(collaborationGuidePath, "utf8"),
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
