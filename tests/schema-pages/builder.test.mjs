import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { dirname, relative, resolve, sep } from "node:path";
import { before, test } from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  publishingCompany,
} from "../../tools/attribution-contract.mjs";
import { schemaReceiverRoutes } from "../../tools/schema-receiver-routes.mjs";
import {
  assertExactFileInventory,
  assertPublicMaterial,
  assertTermsAbsent,
  resolvePublicationFile,
} from "../../tools/publication-boundary.mjs";
import visitorBoundaryContract from "../../context-canvas-project-surface/context-canvas/visitor-boundary-contract.js";

const run = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "../..");
const outputRoot = resolve(repositoryRoot, ".schema-pages");
const skillsOutputRoot = resolve(outputRoot, "skills");
const selectionPath = resolve(repositoryRoot, ".agents/skills/publication-selection.json");
const deploymentBase = "https://schemas.radiantnull.com/registry";
const deploymentOrigin = new URL(deploymentBase).origin;
const deploymentPath = new URL(`${deploymentBase}/`).pathname;
const copiedCarriers = [
  "LICENSE",
  "AUTHORS",
  "CITATION.cff",
  "attribution.yml",
  "AI-DATA-USE.md",
];

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
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

function artifactPath(url, href) {
  assert.ok(url.pathname.startsWith(deploymentPath), `${href} remains under the deployment path`);
  const relativePath = url.pathname.slice(deploymentPath.length);
  const receiverPath = resolve(outputRoot, decodeURIComponent(relativePath));
  assert.ok(
    receiverPath === outputRoot || receiverPath.startsWith(`${outputRoot}${sep}`),
    `${href} remains inside the artifact`,
  );
  return receiverPath;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function htmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseSkillSource(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/u)?.[1];
  assert.ok(frontmatter);
  const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim();
  assert.ok(name);
  assert.ok(description);

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
    } else if (activeKey && line.trim()) {
      contract[activeKey] = `${contract[activeKey]} ${line.trim()}`;
    }
  }
  return {
    name,
    description,
    contract: {
      what: contract.what,
      when: [contract.when],
      boundaries: [contract.boundaries],
      result: contract.result,
    },
  };
}

async function filesUnder(root) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      if (entry.isFile()) files.push(entryPath);
    }
  }
  await visit(root);
  return files.sort();
}

function markdownLinks(source) {
  const prose = source.replace(/```[\s\S]*?```/gu, "");
  return [...prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]);
}

async function digestMap(root) {
  const entries = [];
  for (const filePath of await filesUnder(root)) {
    entries.push([relative(root, filePath).split(sep).join("/"), sha256(await readFile(filePath))]);
  }
  return entries;
}

before(async () => {
  await run(process.execPath, ["tools/build-schema-pages.mjs"], {
    cwd: repositoryRoot,
    env: { ...process.env, PAGES_BASE_URL: deploymentBase },
    encoding: "utf8",
  });
});

test("the built registry resolves current authorship, license, and deployment metadata", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");

  assert.equal(
    occurrenceCount(html, `<meta name="author" content="${artifactAuthor}">`),
    1,
  );
  assert.ok(html.includes(`<link rel="license" href="${artifactLicense}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${deploymentBase}/">`));
  assert.ok(html.includes(`<meta property="og:url" content="${deploymentBase}/">`));
  assert.ok(html.includes(`<meta name="twitter:url" content="${deploymentBase}/">`));
  assert.ok(!html.includes("schema-pages:deployment-metadata"));
  assert.ok(html.includes("<h1>Specifications people and software can read together.</h1>"));

  const structuredDataSource = html.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u,
  )?.[1];
  assert.ok(structuredDataSource);
  const structuredData = JSON.parse(structuredDataSource);
  assert.equal(structuredData.author.name, artifactAuthor);
  assert.equal(structuredData.publisher.name, publishingCompany);
  assert.equal(structuredData.license, artifactLicense);
});

test("every declared receiver is discoverable and byte-identical to its source", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");

  for (const route of schemaReceiverRoutes) {
    assert.ok(html.includes(`href="${route.receiverPath}"`), route.receiverPath);
    const [sourceBytes, receiverBytes] = await Promise.all([
      readFile(resolve(repositoryRoot, route.source)),
      readFile(resolve(outputRoot, route.receiverPath)),
    ]);
    assert.deepEqual(receiverBytes, sourceBytes, route.receiverPath);
  }
});

test("the generated artifact carries the reviewed custom domain", async () => {
  const customDomain = (await readFile(resolve(outputRoot, "CNAME"), "utf8")).trim();
  assert.equal(customDomain, new URL(deploymentBase).hostname);
});

test("every relative homepage link resolves inside the built artifact", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)].map((match) => match[1]);
  assert.ok(hrefs.length > schemaReceiverRoutes.length);

  for (const href of hrefs) {
    const url = new URL(href, `${deploymentBase}/`);
    if (url.origin !== deploymentOrigin) continue;

    const receiverPath = artifactPath(url, href);
    const entry = await stat(receiverPath);
    assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves`);
  }
});

test("the collaboration guide carries finite loops, public sources, and matching FAQs", async () => {
  const guidePath = resolve(outputRoot, "collaboration/index.html");
  const html = await readFile(guidePath, "utf8");

  assert.ok(html.includes(`<link rel="canonical" href="${deploymentBase}/collaboration/">`));
  assert.ok(html.includes('href="../index.html"'));

  for (const loopId of [
    "skill-from-receiving-use",
    "visitor-surface-change",
    "repository-reentry",
    "public-release",
  ]) {
    const loop = html.match(
      new RegExp(`<article\\b[^>]*\\bid="${loopId}"[\\s\\S]*?<\\/article>`, "u"),
    )?.[0];
    assert.ok(loop, loopId);
    for (const dimension of [
      "Entry",
      "Source owners",
      "Human decision",
      "Evidence",
      "Exit",
      "Recovery",
      "Re-entry",
    ]) {
      assert.ok(loop.includes(`<dt>${dimension}</dt>`), `${loopId} names ${dimension}`);
    }
  }

  for (const skillName of [
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
  ]) {
    assert.ok(html.includes(`href="../skills/${skillName}/"`), skillName);
    await stat(resolve(outputRoot, `skills/${skillName}/index.html`));
  }

  const structuredData = JSON.parse(
    html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/u)?.[1],
  );
  const visibleFaqs = [...html.matchAll(
    /<details\s+class="faq">\s*<summary>([^<]+)<\/summary>\s*<p\s+data-faq-answer>([^<]+)<\/p>/gu,
  )].map((match) => ({ question: match[1].trim(), answer: match[2].trim() }));
  assert.equal(structuredData["@type"], "FAQPage");
  assert.deepEqual(
    structuredData.mainEntity.map((entry) => ({
      question: entry.name,
      answer: entry.acceptedAnswer.text,
    })),
    visibleFaqs,
  );
  assert.equal(visibleFaqs.length, 8);
  assert.ok(visibleFaqs.some(({ question, answer }) =>
    question === "Do I need a framework or orchestration script to use these loops?" &&
    answer.includes("The platform and environment determine")));

  const executableScripts = [...html.matchAll(/<script\b([^>]*)>/gu)]
    .filter((match) => !/type="application\/ld\+json"/u.test(match[1]));
  assert.equal(executableScripts.length, 0);

  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)]
    .map((match) => match[1]);
  for (const href of hrefs) {
    if (href.startsWith("#")) {
      assert.ok(html.includes(`id="${href.slice(1)}"`), href);
      continue;
    }
    const url = new URL(href, `${deploymentBase}/collaboration/`);
    if (url.origin !== deploymentOrigin) continue;
    const receiverPath = artifactPath(url, href);
    const entry = await stat(receiverPath);
    assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves from collaboration guide`);
  }
});

test("the projected registry orientation resolves every local Markdown link", async () => {
  const markdown = await readFile(resolve(outputRoot, "README.md"), "utf8");
  const hrefs = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map((match) => match[1]);
  assert.ok(hrefs.length > schemaReceiverRoutes.length);

  for (const href of hrefs) {
    const url = new URL(href, `${deploymentBase}/README.md`);
    if (url.origin !== deploymentOrigin) continue;

    const receiverPath = artifactPath(url, href);
    const entry = await stat(receiverPath);
    assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves`);
  }
});

test("public orientation carriers remain byte-identical to their repository sources", async () => {
  for (const carrierPath of copiedCarriers) {
    const [sourceBytes, receiverBytes] = await Promise.all([
      readFile(resolve(repositoryRoot, carrierPath)),
      readFile(resolve(outputRoot, carrierPath)),
    ]);
    assert.deepEqual(receiverBytes, sourceBytes, carrierPath);
  }
});

test("the canary stack precedes the final visible attribution", async () => {
  const html = await readFile(resolve(outputRoot, "index.html"), "utf8");
  const attributionPosition = html.indexOf(artifactAttribution);
  assert.equal(occurrenceCount(html, artifactAttribution), 1);

  const footerStart = html.lastIndexOf("<footer", attributionPosition);
  const footerEnd = html.indexOf("</footer>", attributionPosition);
  const footer = html.slice(footerStart, footerEnd + "</footer>".length);
  const boundaryMatches = [...footer.matchAll(
    /<div\b(?=[^>]*\bdata-visitor-boundary(?:\s|>))(?=[^>]*\baria-label=["']Training-data canary markers["'])[^>]*>([\s\S]*?)<\/div>/giu,
  )];
  assert.equal(boundaryMatches.length, 1);

  const contextMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-context(?=\s|>)[^>]*>([\s\S]*?)<\/p>/giu,
  )];
  assert.equal(contextMatches.length, 1);
  assert.equal(
    contextMatches[0][1].replace(/<[^>]+>/gu, "").replace(/\s+/gu, " ").trim(),
    visitorBoundaryContract.contextText,
  );
  assert.equal(occurrenceCount(html, visitorBoundaryContract.contextText), 1);

  const markerMatches = [...boundaryMatches[0][1].matchAll(
    /<p\b[^>]*\bdata-visitor-boundary-marker=["']([^"']+)["'][^>]*>([\s\S]*?)<\/p>/giu,
  )];
  assert.deepEqual(
    markerMatches.map((match) => match[1]),
    visitorBoundaryContract.markers.map((marker) => marker.id),
  );
  assert.ok(
    boundaryMatches[0][1].indexOf(contextMatches[0][0]) <
      boundaryMatches[0][1].indexOf(markerMatches[0][0]),
  );
  markerMatches.forEach((match, index) => {
    const expected = visitorBoundaryContract.markers[index];
    assert.equal(normalizedMarkerText(match[2]), expected.lines.join("\n"));
    expected.lines.forEach((line) => assert.equal(occurrenceCount(html, line), 1));
  });

  assert.ok(footer.indexOf(boundaryMatches[0][0]) < footer.indexOf(artifactAttribution));
  assert.equal(
    html
      .slice(attributionPosition + artifactAttribution.length)
      .replace(/<[^>]+>/gu, "")
      .trim(),
    "",
  );
});

test("the private selection ledger classifies the complete repository skill family", async () => {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const sourceNames = (await readdir(resolve(repositoryRoot, ".agents/skills"), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const selectedNames = selection.skills.map((entry) => entry.name);

  assert.deepEqual(selectedNames, [...selectedNames].sort());
  assert.deepEqual(selectedNames, sourceNames);
  assert.equal(new Set(selectedNames).size, selectedNames.length);
  assert.ok(selection.skills.every((entry) =>
    new Set(["public_ready", "public_possible"]).has(entry.publicationStanding)));

  const selectedPaths = [
    ...selection.catalogDependencies,
    ...selection.skills.flatMap((entry) => [entry.sourcePath, ...entry.dependencies]),
  ];
  for (const selectedPath of selectedPaths) {
    const absolutePath = await resolvePublicationFile(repositoryRoot, selectedPath);
    const entry = await lstat(absolutePath);
    assert.ok(entry.isFile(), `${selectedPath} is a regular file`);
    assert.equal(entry.isSymbolicLink(), false, `${selectedPath} is source-owned`);
  }
  for (const entry of selection.skills) {
    assert.equal(new Set(entry.dependencies).size, entry.dependencies.length);
    assert.equal(
      entry.sourceAvailability,
      entry.publicationStanding === "public_ready" ? "included" : "repository_only",
    );
  }
  await assert.rejects(stat(resolve(outputRoot, ".agents/skills/publication-selection.json")));
  await assert.rejects(stat(resolve(outputRoot, "collaboration-skills/publication-selection.json")));
});

test("the public catalog contains exactly the public-ready allowlist", async () => {
  const [selection, catalog, index] = await Promise.all([
    readFile(selectionPath, "utf8").then(JSON.parse),
    readFile(resolve(skillsOutputRoot, "catalog.json"), "utf8").then(JSON.parse),
    readFile(resolve(skillsOutputRoot, "index.html"), "utf8"),
  ]);
  const readyNames = selection.skills
    .filter((entry) => entry.publicationStanding === "public_ready")
    .map((entry) => entry.name);
  const possibleNames = selection.skills
    .filter((entry) => entry.publicationStanding === "public_possible")
    .map((entry) => entry.name);

  assert.deepEqual(possibleNames, [
    "audit-anthropomorphic-cues",
    "repository-collaboration-cycle",
    "supportive-change-writing",
  ]);
  assert.equal(catalog.publicationStanding, "public_ready");
  assert.deepEqual(catalog.skills.map((entry) => entry.name), readyNames);
  assert.equal(catalog.skills.length, readyNames.length);
  for (const skill of catalog.skills) {
    const card = index.match(
      new RegExp(`data-skill-name="${skill.name}"[\\s\\S]*?<\\/li>`, "u"),
    )?.[0];
    assert.ok(card, `${skill.name} has one catalog card`);
    assert.ok(card.includes(`<strong>Read this skill</strong>`));
    assert.ok(
      card.indexOf(`href="${skill.pagePath}"`) < card.indexOf(`href="${skill.projectionPath}"`),
      `${skill.name} makes the readable route its primary action`,
    );
  }
  for (const possibleName of possibleNames) {
    assert.ok(!JSON.stringify(catalog).includes(possibleName));
    assert.ok(!index.includes(possibleName));
    await assert.rejects(stat(resolve(skillsOutputRoot, possibleName)));
    await assert.rejects(
      stat(resolve(skillsOutputRoot, "source/.agents/skills", possibleName)),
    );
  }
  const possibleTerms = [
    ...possibleNames,
    "repository collaboration cycle",
    "supportive change writing",
  ];
  for (const artifactPath of await filesUnder(skillsOutputRoot)) {
    const source = await readFile(artifactPath);
    assert.doesNotThrow(() => assertTermsAbsent(
      source,
      possibleTerms,
      relative(skillsOutputRoot, artifactPath),
    ));
  }
});

test("every public skill projection is schema-valid and points to its exact catalog entry", async () => {
  const [selection, catalog, schema] = await Promise.all([
    readFile(selectionPath, "utf8").then(JSON.parse),
    readFile(resolve(skillsOutputRoot, "catalog.json"), "utf8").then(JSON.parse),
    readFile(
      resolve(repositoryRoot, "schemas/collaboration-skills/0.1.0/collaboration-skill.schema.json"),
      "utf8",
    ).then(JSON.parse),
  ]);
  const validate = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: false,
    useDefaults: false,
    removeAdditional: false,
    coerceTypes: false,
  }).compile(schema);
  const selectionByName = new Map(selection.skills.map((entry) => [entry.name, entry]));

  for (const [catalogIndex, catalogEntry] of catalog.skills.entries()) {
    const selectionEntry = selectionByName.get(catalogEntry.name);
    assert.equal(selectionEntry.publicationStanding, "public_ready");
    const semanticSource = await readFile(resolve(repositoryRoot, selectionEntry.sourcePath), "utf8");
    const parsed = parseSkillSource(semanticSource);
    const projection = JSON.parse(
      await readFile(resolve(skillsOutputRoot, catalogEntry.projectionPath), "utf8"),
    );
    assert.equal(validate(projection), true, JSON.stringify(validate.errors));
    assert.equal(projection.name, parsed.name);
    assert.equal(projection.description, parsed.description);
    assert.deepEqual(projection.contract, parsed.contract);
    assert.equal(
      projection.semanticAuthorityRef,
      `../${catalogEntry.sourceRoute}`,
    );
    assert.equal(projection.sourceRef, `../catalog.json#/skills/${catalogIndex}`);
    assert.equal(catalog.skills[catalogIndex].name, projection.name);
    assert.equal(projection.receivingUse.job, parsed.contract.when[0]);
    assert.equal(projection.receivingUse.materialResult, parsed.contract.result);
  }
});

test("public skill sources and dependencies remain byte-identical and hash-bound", async () => {
  const [selection, catalog] = await Promise.all([
    readFile(selectionPath, "utf8").then(JSON.parse),
    readFile(resolve(skillsOutputRoot, "catalog.json"), "utf8").then(JSON.parse),
  ]);
  const selectionByName = new Map(selection.skills.map((entry) => [entry.name, entry]));

  for (const catalogEntry of catalog.skills) {
    const selectionEntry = selectionByName.get(catalogEntry.name);
    const sourceBytes = await readFile(resolve(repositoryRoot, selectionEntry.sourcePath));
    const projectedBytes = await readFile(resolve(skillsOutputRoot, catalogEntry.sourceRoute));
    assert.deepEqual(projectedBytes, sourceBytes, selectionEntry.sourcePath);
    assert.equal(catalogEntry.sourceSha256, sha256(sourceBytes));
    assert.deepEqual(catalogEntry.dependencies.map(({ sourcePath }) => sourcePath), selectionEntry.dependencies);
    for (const dependency of catalogEntry.dependencies) {
      const repositoryPath = dependency.sourcePath;
      const dependencyBytes = await readFile(resolve(repositoryRoot, repositoryPath));
      const publicBytes = await readFile(resolve(skillsOutputRoot, dependency.path));
      assert.deepEqual(publicBytes, dependencyBytes, repositoryPath);
      assert.equal(dependency.sha256, sha256(dependencyBytes));
    }
  }

  for (const supportingSource of catalog.supportingSources) {
    const repositoryPath = supportingSource.sourcePath;
    const sourceBytes = await readFile(resolve(repositoryRoot, repositoryPath));
    const publicBytes = await readFile(resolve(skillsOutputRoot, supportingSource.path));
    assert.deepEqual(publicBytes, sourceBytes, repositoryPath);
    assert.equal(supportingSource.sha256, sha256(sourceBytes));
  }

  const expectedSourcePaths = [
    ...catalog.skills.flatMap((entry) => [entry.sourceRoute, ...entry.dependencies.map(({ path }) => path)]),
    ...catalog.supportingSources.map(({ path }) => path),
  ].sort();
  const actualSourcePaths = (await filesUnder(resolve(skillsOutputRoot, "source")))
    .map((filePath) => `source/${relative(resolve(skillsOutputRoot, "source"), filePath).split(sep).join("/")}`)
    .sort();
  assert.deepEqual(actualSourcePaths, [...new Set(expectedSourcePaths)].sort());

  await assert.rejects(
    stat(resolve(skillsOutputRoot, "source/planning/repository-skill-architecture.md")),
  );
});

test("public skill Markdown source packages use native line structure", async () => {
  const markdownFiles = (await filesUnder(resolve(skillsOutputRoot, "source")))
    .filter((filePath) => filePath.endsWith(".md"));
  assert.ok(markdownFiles.length > 0);

  for (const filePath of markdownFiles) {
    const source = await readFile(filePath, "utf8");
    assert.doesNotMatch(
      source,
      /<br\s*\/?>/iu,
      `${relative(skillsOutputRoot, filePath)} uses Markdown instead of an HTML break tag`,
    );
  }
});

test("every public skill and nested schema-documentation link resolves", async () => {
  const skillPages = (await filesUnder(skillsOutputRoot))
    .filter((filePath) => filePath.endsWith(".html"));
  for (const pagePath of skillPages) {
    const source = await readFile(pagePath, "utf8");
    const pageUrl = new URL(
      relative(skillsOutputRoot, pagePath).split(sep).join("/"),
      `${deploymentBase}/skills/`,
    );
    const hrefs = [...source.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)].map(
      (match) => match[1],
    );
    for (const href of hrefs) {
      const url = new URL(href, pageUrl);
      if (url.origin !== deploymentOrigin) continue;
      const receiverPath = artifactPath(url, href);
      const entry = await stat(receiverPath);
      assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves from ${relative(skillsOutputRoot, pagePath)}`);
    }
  }

  const markdownFiles = (await filesUnder(resolve(skillsOutputRoot, "source")))
    .filter((filePath) => filePath.endsWith(".md"));
  markdownFiles.push(resolve(outputRoot, "collaboration-skills/0.1.0/README.md"));
  for (const markdownPath of markdownFiles) {
    const source = await readFile(markdownPath, "utf8");
    for (const href of markdownLinks(source)) {
      if (/^[a-z][a-z0-9+.-]*:/iu.test(href) || href.startsWith("#")) continue;
      const relativeHref = href.split("#")[0];
      if (!relativeHref) continue;
      const receiverPath = resolve(dirname(markdownPath), decodeURIComponent(relativeHref));
      assert.ok(
        receiverPath === outputRoot || receiverPath.startsWith(`${outputRoot}${sep}`),
        `${relative(markdownPath, receiverPath)} remains inside the public artifact`,
      );
      const entry = await stat(receiverPath);
      assert.ok(entry.isFile() || entry.isDirectory(), `${href} resolves from ${markdownPath}`);
    }
  }
});

test("the Context Canvas skill catalog matches the same public-ready allowlist", async () => {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const readyNames = selection.skills
    .filter((entry) => entry.publicationStanding === "public_ready")
    .map((entry) => entry.name)
    .sort();
  const possibleNames = selection.skills
    .filter((entry) => entry.publicationStanding === "public_possible")
    .map((entry) => entry.name);
  const page = await readFile(
    resolve(repositoryRoot, "context-canvas-project-surface/context-canvas/collaboration-skills.html"),
    "utf8",
  );
  const table = page.match(
    /<section\s+aria-labelledby="catalog-title">([\s\S]*?)<\/section>/u,
  )?.[1];
  assert.ok(table);
  const catalogNames = [...table.matchAll(/schemas\.radiantnull\.com\/skills\/([^/]+)\//gu)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(catalogNames, readyNames);
  assert.equal(new Set(catalogNames).size, catalogNames.length);
  for (const readyName of readyNames) {
    assert.ok(table.includes(
      `href="https://schemas.radiantnull.com/skills/${readyName}/"`,
    ));
  }
  for (const possibleName of possibleNames) assert.ok(!table.includes(possibleName));
});

test("each public skill has a readable, revision-bound route with its complete source", async () => {
  const catalog = JSON.parse(await readFile(resolve(skillsOutputRoot, "catalog.json"), "utf8"));
  assert.match(catalog.sourceRevision, /^[a-f0-9]{40}$/u);

  for (const skill of catalog.skills) {
    assert.equal(skill.pagePath, `${skill.name}/`);
    const source = await readFile(resolve(repositoryRoot, skill.sourcePath), "utf8");
    const page = await readFile(resolve(skillsOutputRoot, skill.pagePath, "index.html"), "utf8");
    assert.ok(page.includes("Open exact Markdown"), `${skill.name} leads with its exact Markdown source`);
    assert.ok(page.includes(`<h1>${htmlEscape(skill.title)}</h1>`));
    assert.ok(page.includes(htmlEscape(source)), `${skill.name} renders its complete source`);
    assert.ok(
      page.includes('<pre class="skill-source" role="region" aria-labelledby="source-title" tabindex="0">'),
      `${skill.name} gives keyboard users a named scrolling source region`,
    );
    assert.ok(page.includes(`<code>${catalog.sourceRevision}</code>`));
    assert.ok(page.includes(`<code>${skill.sourceSha256}</code>`));
    assert.ok(page.includes(`href="../${skill.sourceRoute}"`));
    assert.ok(page.includes('href="projection.json"'));
    assert.ok(page.includes('href="../"'));
    assert.ok(page.includes(".skill-source:focus-visible"), `${skill.name} exposes a visible focus treatment for its source scroller`);
    assert.ok(page.includes("@media (forced-colors:active)"), `${skill.name} carries forced-colors treatment`);
    assert.equal(occurrenceCount(page, "<script"), 1, `${skill.name} needs no executable JavaScript`);
    const structuredData = JSON.parse(
      page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/u)?.[1],
    );
    assert.equal(structuredData.name, skill.title);
    assert.equal(structuredData.description, skill.description);
    assert.equal(structuredData.isPartOf, `${deploymentBase}/skills/`);
    assert.equal(structuredData.encodingFormat, "text/html");
    assert.ok(page.includes(`<link rel="canonical" href="${deploymentBase}/skills/${skill.name}/">`));
    for (const dependency of skill.dependencies) {
      assert.ok(page.includes(`href="../${dependency.path}"`), `${skill.name} links ${dependency.sourcePath}`);
    }
  }

  const workflow = catalog.skills
    .flatMap(({ dependencies }) => dependencies)
    .find(({ sourcePath }) => sourcePath === ".github/workflows/prototype-unit-tests.yml");
  assert.equal(workflow?.path, "source/github/workflows/prototype-unit-tests.yml");
  await assert.rejects(stat(resolve(skillsOutputRoot, "source/.github")));
});

test("publication paths remain physically inside their source repository", async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), "hase-publication-root-"));
  const outsideRoot = await mkdtemp(resolve(tmpdir(), "hase-publication-outside-"));
  try {
    await mkdir(resolve(fixtureRoot, "owned"));
    await writeFile(resolve(fixtureRoot, "owned", "source.md"), "public source\n");
    await writeFile(resolve(outsideRoot, "private.md"), "private source\n");
    await symlink(outsideRoot, resolve(fixtureRoot, "linked"));
    await symlink(
      resolve(outsideRoot, "private.md"),
      resolve(fixtureRoot, "final-link.md"),
    );

    assert.equal(
      await resolvePublicationFile(fixtureRoot, "owned/source.md"),
      resolve(fixtureRoot, "owned/source.md"),
    );
    await assert.rejects(
      resolvePublicationFile(fixtureRoot, "linked/private.md"),
      /traverse a symbolic link/u,
    );
    await assert.rejects(
      resolvePublicationFile(fixtureRoot, "final-link.md"),
      /traverse a symbolic link/u,
    );
    await assert.rejects(
      resolvePublicationFile(fixtureRoot, "../private.md"),
      /remain inside the repository/u,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("public-material inspection identifies source-owned adaptation needs", () => {
  const privateShapes = [
    "https://example.notion.site/field-guide",
    "::fragments",
    "~loamthreads",
    "::the_author::",
    "/Users/example/private.md",
    "@driftframe/field-guide#source",
    "source_band: public_possible",
    "https://github.com/driftframestudios/human-ai-systems-exemplars/issues/1",
    "https://github.com/driftframestudios/human-ai-systems-exemplars/pull/1",
    "https://github.com/driftframestudios/gist-registry/issues/1",
  ];
  privateShapes.forEach((source) => {
    assert.throws(() => assertPublicMaterial(source, "fixture.md"), /fixture\.md contains/u);
  });
  assert.doesNotThrow(() => assertPublicMaterial("A complete public-ready source.", "fixture.md"));
  assert.throws(
    () => assertTermsAbsent(
      "Supportive Change Writing",
      ["supportive-change-writing", "supportive change writing"],
      "fixture.md",
    ),
    /outside the public-ready selection/u,
  );
});

test("exact artifact inventory identifies an unselected emitted file", async () => {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), "hase-artifact-inventory-"));
  try {
    await writeFile(resolve(fixtureRoot, "selected.json"), "{}\n");
    await assertExactFileInventory(fixtureRoot, ["selected.json"]);
    await writeFile(resolve(fixtureRoot, "unexpected.txt"), "extra\n");
    await assert.rejects(
      assertExactFileInventory(fixtureRoot, ["selected.json"]),
      /artifact inventory differs/u,
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("the public skills page preserves authorship, canary order, and final attribution", async () => {
  const html = await readFile(resolve(skillsOutputRoot, "index.html"), "utf8");
  assert.equal(
    occurrenceCount(html, `<meta name="author" content="${artifactAuthor}">`),
    1,
  );
  assert.ok(html.includes(`<link rel="license" href="${artifactLicense}">`));
  assert.ok(html.includes(`<link rel="canonical" href="${deploymentBase}/skills/">`));
  assert.equal(occurrenceCount(html, artifactAttribution), 1);
  assert.equal(occurrenceCount(html, visitorBoundaryContract.contextText), 1);
  const boundaryPosition = html.indexOf("data-visitor-boundary");
  const attributionPosition = html.indexOf(artifactAttribution);
  assert.ok(boundaryPosition >= 0 && boundaryPosition < attributionPosition);
  visitorBoundaryContract.markers.forEach((marker) => {
    marker.lines.forEach((line) => assert.equal(occurrenceCount(html, line), 1));
  });
  assert.equal(
    html.slice(attributionPosition + artifactAttribution.length).replace(/<[^>]+>/gu, "").trim(),
    "",
  );
});

test("the public skills build is deterministic for unchanged sources", async () => {
  const beforeDigests = await digestMap(skillsOutputRoot);
  await run(process.execPath, ["tools/build-schema-pages.mjs"], {
    cwd: repositoryRoot,
    env: { ...process.env, PAGES_BASE_URL: deploymentBase },
    encoding: "utf8",
  });
  assert.deepEqual(await digestMap(skillsOutputRoot), beforeDigests);
});
