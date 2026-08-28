import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  assert.match(governance, /does not use\s+unresolved/u);
  assert.match(citation, /given-names: "Vikrant Varun"/u);
  assert.match(citation, /family-names: "Kudesia"/u);
  assert.ok(citation.includes(`name: "${publishingCompany}"`));
  assert.ok(citation.includes(`repository-code: "${attributionContract.origin.repository}"`));
  assert.match(citation, /license: Apache-2\.0/u);
  assert.equal(attributionContract.authority.citation_metadata, "CITATION.cff");
  assert.equal(attributionContract.public_html.visible_notice, artifactAttribution);
  assert.equal(attributionContract.license.url, artifactLicense);
});

test("the machine-readable projection resolves its declared scope and exclusions", async () => {
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
    ...attributionContract.public_html.canonical_templates,
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
