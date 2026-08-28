import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
  attributionContract,
  publishingCompany,
} from "../../tools/attribution-contract.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const canonicalStrategyTemplate = resolve(
  repositoryRoot,
  attributionContract.public_html.canonical_templates[0],
);

function occurrenceCount(source, value) {
  return source.split(value).length - 1;
}

async function htmlFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

test("central attribution sources name the current holder and contribution pattern", async () => {
  const [authors, governance, citation] = await Promise.all([
    readFile(resolve(repositoryRoot, "AUTHORS"), "utf8"),
    readFile(resolve(repositoryRoot, "GOVERNANCE.md"), "utf8"),
    readFile(resolve(repositoryRoot, "CITATION.cff"), "utf8"),
  ]);

  assert.equal(occurrenceCount(authors, artifactAuthor), 1);
  assert.equal(occurrenceCount(authors, publishingCompany), 1);
  assert.match(governance, /^## How to attribute contributions$/mu);
  assert.match(governance, /\[`AUTHORS`\]\(AUTHORS\)/u);
  assert.match(governance, /\[`LICENSE`\]\(LICENSE\)/u);
  assert.match(governance, /truthful Git identity/u);
  assert.match(governance, /Public artifacts carry resolved\s+publication identity/u);
  assert.match(citation, /given-names: "Vikrant Varun"/u);
  assert.match(citation, /family-names: "Kudesia"/u);
  assert.ok(citation.includes(`name: "${publishingCompany}"`));
  assert.ok(citation.includes(`repository-code: "${attributionContract.origin.repository}"`));
  assert.match(citation, /license: Apache-2\.0/u);
  assert.equal(attributionContract.authority.citation_metadata, "CITATION.cff");
  assert.equal(attributionContract.public_html.visible_notice, artifactAttribution);
  assert.equal(attributionContract.license.url, artifactLicense);
});

test("the machine-readable projection resolves its scope and placement boundaries", async () => {
  assert.deepEqual(attributionContract.public_html.required_placements, {
    author_metadata: {
      location: "document_head",
      selector: 'meta[name="author"]',
      value_from: "identity.human_author",
    },
    license_relation: {
      location: "document_head",
      selector: 'link[rel="license"]',
      value_from: "license.url",
    },
    visitor_notice: {
      location: "visible_footer",
      value_from: "public_html.visible_notice",
    },
  });
  assert.deepEqual(attributionContract.contribution_credit_placements, [
    "truthful_git_author_metadata",
    "agreed_co_authored_by_trailers",
    "reviewed_pull_requests",
  ]);
  assert.deepEqual(attributionContract.excluded_placements, [
    "commit_message_standing_notice",
    "ordinary_code_comment_banner",
    "nonpublic_file_header_banner",
  ]);

  const referencedPaths = [
    attributionContract.authority.copyright_holders,
    attributionContract.authority.license_terms,
    attributionContract.authority.contribution_guidance.split("#", 1)[0],
    attributionContract.authority.citation_metadata,
    attributionContract.public_html.core_route_manifest,
    ...attributionContract.public_html.core_projection_roots,
    ...attributionContract.public_html.standalone_prototype_roots,
    ...attributionContract.public_html.canonical_templates,
    attributionContract.public_html.context_canvas_prototype_root,
    attributionContract.public_html.context_canvas_top_level_glob.replace(/\/\*\.html$/u, ""),
  ];

  for (const path of referencedPaths) {
    const entry = await stat(resolve(repositoryRoot, path));
    assert.ok(entry.isFile() || entry.isDirectory(), `${path} should resolve`);
  }
});

test("the canonical Strategy source carries the resolved human author header", async () => {
  const html = await readFile(canonicalStrategyTemplate, "utf8");
  assert.equal(
    occurrenceCount(html, `<meta name="author" content="${artifactAuthor}">`),
    1,
  );
});

test("the standalone Participatory Design Kit declares its relationship without reusing the routed artifact identity", async () => {
  const [routed, ...standaloneVersions] = await Promise.all([
    readFile(resolve(
      repositoryRoot,
      "core-architectures-chimeric-prototype-current-pack-v0.1/participatory-design-kit-chimeric-prototype-v0.1.1.html",
    ), "utf8"),
    readFile(resolve(
      repositoryRoot,
      "participatory-design-kit-chimeric-prototype-set-v0.1/participatory-design-kit-chimeric-prototype-v0.1.html",
    ), "utf8"),
    readFile(resolve(
      repositoryRoot,
      "participatory-design-kit-chimeric-prototype-set-v0.1/participatory-design-kit-chimeric-prototype-v0.1.1.html",
    ), "utf8"),
  ]);
  const routedId = routed.match(/artifact_identity:\s*\{\s*id:'([^']+)'/u)?.[1];
  assert.ok(routedId, "the routed kit exposes an artifact identity");

  for (const standalone of standaloneVersions) {
    const standaloneId = standalone.match(/artifact_identity:\s*\{\s*id:'([^']+)'/u)?.[1];
    const variantOf = standalone.match(/\bvariant_of:'([^']+)'/u)?.[1];
    assert.ok(standaloneId, "the standalone kit exposes an artifact identity");
    assert.notEqual(standaloneId, routedId);
    assert.equal(variantOf, routedId);
  }
});

test("every prototype HTML source carries the bounded attribution contract", async () => {
  const roots = [
    ...attributionContract.public_html.core_projection_roots,
    ...attributionContract.public_html.standalone_prototype_roots,
    attributionContract.public_html.context_canvas_prototype_root,
  ];
  const paths = new Set();
  for (const root of roots) {
    for (const path of await htmlFiles(resolve(repositoryRoot, root))) paths.add(path);
  }
  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const label = path.slice(repositoryRoot.length + 1);
    assert.equal(
      [...html.matchAll(
        new RegExp(
          `<meta\\b[^>]*\\bname=["']author["'][^>]*\\bcontent=["']${artifactAuthor}["'][^>]*>`,
          "giu",
        ),
      )].length,
      1,
      `${label} author metadata`,
    );
    assert.equal(
      [...html.matchAll(
        new RegExp(
          `<link\\b[^>]*\\brel=["']license["'][^>]*\\bhref=["']${artifactLicense.replaceAll("/", "\\/")}["'][^>]*>`,
          "giu",
        ),
      )].length,
      1,
      `${label} license relation`,
    );
    assert.equal(
      [...html.matchAll(
        /<footer\b[^>]*\bclass=["'][^"']*\bartifact-attribution\b[^"']*["'][^>]*>/giu,
      )].length,
      1,
      `${label} attribution footer`,
    );
    assert.equal(
      occurrenceCount(html, artifactAttribution),
      1,
      `${label} visible notice`,
    );
  }
});
