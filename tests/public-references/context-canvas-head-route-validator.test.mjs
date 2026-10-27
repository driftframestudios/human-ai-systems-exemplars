import "../../tools/node-runtime-admission.mjs";

import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTEXT_CANVAS_404_PATH,
  CONTEXT_CANVAS_HEAD_ROUTE_CONTRACT_ID,
  CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH,
  CONTEXT_CANVAS_SOURCE_ROOT,
  contextCanvasHeadRouteExitCode,
  deriveIndexedContextCanvasPages,
  formatContextCanvasHeadRouteDiagnostics,
  inspectContextCanvasHeadDocument,
  validateContextCanvasHeadRoutes,
} from "../../tools/context-canvas-head-route-validator.mjs";

const TOKENS = Object.freeze({
  home: "PUBLIC_URL_PAGE_ABOUT",
  homeId: "PUBLIC_URL_PAGE_ABOUT_WEBPAGE",
  sample: "PUBLIC_URL_PAGE_SAMPLE",
  sampleId: "PUBLIC_URL_PAGE_SAMPLE_ARTICLE",
  image: "PUBLIC_URL_ASSET_SAMPLE_CARD",
  imageAlternate: "PUBLIC_URL_ASSET_SAMPLE_CARD_ALTERNATE",
});
const ROUTES = new Map([
  [TOKENS.home, "https://vik.guru/"],
  [TOKENS.homeId, "https://vik.guru/#webpage"],
  [TOKENS.sample, "https://vik.guru/sample.html"],
  [TOKENS.sampleId, "https://vik.guru/sample.html#article"],
  [TOKENS.image, "https://vik.guru/img/sample-card.webp"],
  [TOKENS.imageAlternate, "https://vik.guru/img/sample-card-alternate.webp"],
]);

function routeAuthority({ reject = new Map() } = {}) {
  return {
    resolveToken(token) {
      return ROUTES.get(token);
    },
    assertTokenCarrier(token, carrier, source) {
      if (reject.get(token)?.has(carrier)) {
        const error = new Error("carrier rejected");
        error.diagnostics = [{
          code: "PUBLIC_ROUTE_CARRIER_REJECTED",
          authority_class: token.includes("_ASSET_") ? "asset" : "page",
          observed: carrier,
          expected: "an allowed carrier",
          remediation: `Use the tracked carrier for ${source}.`,
        }];
        throw error;
      }
    },
    assertResolvedCarrier(value, carrier) {
      const token = [...ROUTES].find(([, route]) => route === value)?.[0];
      const isAsset = token?.includes("_ASSET_") === true;
      const allowed = isAsset
        ? new Set(["jsonld", "open_graph_image", "twitter_image"])
        : new Set(["canonical", "jsonld", "open_graph_url", "sitemap"]);
      if (token !== undefined && allowed.has(carrier)) return value;
      if (new URL(value).hostname !== "vik.guru") return value;
      const error = new Error("unowned literal");
      error.diagnostics = [{
        code: token === undefined
          ? "HEAD_ROUTE_LITERAL_UNOWNED"
          : "HEAD_ROUTE_LITERAL_CARRIER_MISMATCH",
        authority_class: isAsset ? "asset" : "page",
        observed: { value, carrier },
        expected: [...allowed],
        remediation: "Use the fixture route authority.",
      }];
      throw error;
    },
  };
}

function token(key) {
  return `{{${key}}}`;
}

function page({
  title,
  pageToken,
  idToken,
  type = "Article",
  extraJson = "",
  malformedJson = false,
  extraHead = "",
  omit = new Set(),
  includeAuthor = true,
  twitterImageToken = TOKENS.image,
} = {}) {
  const meta = (key, value, attribute = "property") =>
    omit.has(key) ? "" : `<meta ${attribute}="${key}" content="${value}">`;
  const json = malformedJson
    ? `{"@context":"https://schema.org","@type":"${type}",}`
    : `{
      "@context": "https://schema.org",
      "@type": "${type}",
      "@id": "${token(idToken)}",
      "url": "${token(pageToken)}",
      "headline": "${title}",
      "dateModified": "2026-10-27",
      ${includeAuthor ? '"author": {"@type": "Person", "name": "Example Author"},' : ""}
      "publisher": {"@type": "Organization", "name": "Driftframe Studios"}${extraJson}
    }`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${omit.has("canonical") ? "" : `<link rel="canonical" href="${token(pageToken)}">`}
  ${meta("og:title", title)}
  ${meta("og:description", `${title} description.`)}
  ${meta("og:url", token(pageToken))}
  ${meta("og:image", token(TOKENS.image))}
  ${meta("og:image:alt", `${title} visual.`)}
  ${meta("twitter:card", "summary_large_image", "name")}
  ${meta("twitter:title", title, "name")}
  ${meta("twitter:description", `${title} description.`, "name")}
  ${meta("twitter:image", token(twitterImageToken), "name")}
  ${meta("twitter:image:alt", `${title} visual.`, "name")}
  ${extraHead}
  <script type="application/ld+json">${json}</script>
</head>
<body><h1>${title}</h1></body>
</html>
`;
}

function noindexPage(title) {
  return `<!doctype html><html><head><title>${title}</title><meta name="robots" content="noindex, follow"></head><body></body></html>\n`;
}

function withJsonLd(source, document) {
  return source.replace(
    /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/u,
    (_block, opening, closing) => `${opening}${JSON.stringify(document)}${closing}`,
  );
}

function fixture({ home, sample, sitemap } = {}) {
  const manifest = {
    id: "fixture.primary-route-manifest.v1",
    version: "1",
    files: [
      {
        source_path: CONTEXT_CANVAS_404_PATH,
        projected_path: "404.html",
        media_type: "text/html",
      },
      {
        source_path: `${CONTEXT_CANVAS_SOURCE_ROOT}/index.html`,
        projected_path: "index.html",
        media_type: "text/html",
      },
      {
        source_path: `${CONTEXT_CANVAS_SOURCE_ROOT}/sample.html`,
        projected_path: "sample.html",
        media_type: "text/html",
      },
      {
        source_path: "collaboration/example/index.html",
        projected_path: "collaboration/example/index.html",
        media_type: "text/html",
      },
    ],
  };
  const documents = new Map([
    [
      `${CONTEXT_CANVAS_SOURCE_ROOT}/index.html`,
      home ?? page({
        title: "About",
        pageToken: TOKENS.home,
        idToken: TOKENS.homeId,
        type: "WebPage",
      }),
    ],
    [
      `${CONTEXT_CANVAS_SOURCE_ROOT}/sample.html`,
      sample ?? page({
        title: "Sample",
        pageToken: TOKENS.sample,
        idToken: TOKENS.sampleId,
      }),
    ],
    [CONTEXT_CANVAS_404_PATH, noindexPage("Missing")],
    [CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH, noindexPage("Retained")],
  ]);
  return {
    primaryManifest: manifest,
    documents,
    sitemapSource:
      sitemap ??
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${token(TOKENS.home)}</loc></url>
  <url><loc>${token(TOKENS.sample)}</loc></url>
</urlset>\n`,
    authority: routeAuthority(),
    expectedPageCount: 2,
  };
}

test("derives only indexed top-level Context Canvas pages from the primary manifest", () => {
  const input = fixture();
  const result = deriveIndexedContextCanvasPages(input.primaryManifest, {
    expectedPageCount: 2,
  });
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    result.pages.map(({ projectedPath }) => projectedPath),
    ["index.html", "sample.html"],
  );
});

test("accepts source tokens, records their typed carriers, and preserves standing", () => {
  const result = validateContextCanvasHeadRoutes(fixture());
  assert.equal(result.id, CONTEXT_CANVAS_HEAD_ROUTE_CONTRACT_ID);
  assert.equal(result.accepted, true);
  assert.equal(result.pageCount, 2);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(
    [...new Set(result.records.map(({ carrier }) => carrier))].sort(),
    ["canonical", "jsonld", "open_graph_image", "open_graph_url", "sitemap", "twitter_image"],
  );
  assert.equal(result.records.some(({ token: key }) => key === TOKENS.sampleId), true);
  assert.equal(contextCanvasHeadRouteExitCode(result), 0);
  assert.match(
    formatContextCanvasHeadRouteDiagnostics(result),
    /PASS \(2 pages;/u,
  );
});

test("accepts generated literal routes through the same identity contract", () => {
  const materialize = (source) => {
    let selected = source;
    for (const [key, route] of ROUTES) {
      selected = selected.replaceAll(token(key), route);
    }
    return selected;
  };
  const input = fixture();
  input.documents = new Map(
    [...input.documents].map(([path, source]) => [path, materialize(source)]),
  );
  input.sitemapSource = materialize(input.sitemapSource);
  const result = validateContextCanvasHeadRoutes(input);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.records.some(({ token: key }) => key !== null), false);
});

test("rejects a self-consistent generated page route outside tracked authority", () => {
  const materialize = (source) => {
    let selected = source;
    for (const [key, route] of ROUTES) {
      selected = selected.replaceAll(token(key), route);
    }
    return selected;
  };
  const input = fixture();
  const accepted = ROUTES.get(TOKENS.sample);
  const unowned = "https://vik.guru/collaboration/wrong-but-reachable/";
  input.documents = new Map(
    [...input.documents].map(([path, source]) => [
      path,
      materialize(source).replaceAll(accepted, unowned),
    ]),
  );
  input.sitemapSource = materialize(input.sitemapSource).replaceAll(accepted, unowned);
  const result = validateContextCanvasHeadRoutes(input);
  assert.equal(result.accepted, false);
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_ROUTE_LITERAL_UNOWNED"),
    true,
  );
});

test("enforces fragment-bearing roots, unique graph definitions, and Article authorship", () => {
  const fragmentInput = fixture({
    sample: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sample,
      includeAuthor: false,
      extraJson: `, "hasPart": [
        {"@type": "Thing", "@id": "${token(TOKENS.sampleId)}", "name": "First definition"},
        {"@type": "Thing", "@id": "${token(TOKENS.sampleId)}", "name": "Second definition"}
      ]`,
    }),
  });
  const result = validateContextCanvasHeadRoutes(fragmentInput);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.equal(codes.has("HEAD_JSONLD_ROOT_FRAGMENT_MISSING"), true);
  assert.equal(codes.has("HEAD_JSONLD_ID_DUPLICATE"), true);
  assert.equal(codes.has("HEAD_JSONLD_AUTHOR_MISSING"), true);
});

test("requires one canonical-matching page root", () => {
  const first = {
    "@type": "Article",
    "@id": token(TOKENS.sampleId),
    url: token(TOKENS.sample),
    headline: "First root",
    author: { "@type": "Person", name: "Example Author" },
    publisher: { "@type": "Organization", name: "Driftframe Studios" },
  };
  const second = { ...first, headline: "Second root" };
  const source = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.sampleId,
  }).replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/u,
    `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [first, second],
    })}</script>`,
  );
  const result = validateContextCanvasHeadRoutes(fixture({ sample: source }));
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_JSONLD_ROOT_AMBIGUOUS"),
    true,
  );
});

test("binds the page-root identifier base to the canonical route", () => {
  const source = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.homeId,
    extraJson: `, "citation": {"@id": "${token(TOKENS.homeId)}"}`,
  });
  const result = validateContextCanvasHeadRoutes(fixture({ sample: source }));
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_JSONLD_ROOT_ID_MISMATCH"),
    true,
  );
  assert.equal(
    result.diagnostics.some(({ locator, code }) =>
      locator.includes("/citation") && code === "HEAD_JSONLD_ROOT_ID_MISMATCH"),
    false,
  );
});

test("requires one shared social image unless a derivative contract is declared", () => {
  const input = fixture({
    sample: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
      twitterImageToken: TOKENS.imageAlternate,
    }),
  });
  const result = validateContextCanvasHeadRoutes(input);
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_SOCIAL_IMAGE_MISMATCH"),
    true,
  );
});

test("requires meaningful social text and a complete image-detail declaration", () => {
  const sample = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.sampleId,
    extraHead: '<meta property="og:image:type" content="image/webp">',
  }).replace('content="Sample description."', 'content=""');
  const result = validateContextCanvasHeadRoutes(fixture({ sample }));
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.equal(codes.has("HEAD_METADATA_EMPTY"), true);
  assert.equal(codes.has("HEAD_METADATA_MISSING"), true);
});

test("inventories URL strings inside JSON-LD arrays with their owning object", () => {
  const citation = "https://example.org/research";
  const nestedReference = "https://example.org/implementation";
  const input = fixture({
    sample: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
      extraJson: `, "citation": ["${citation}"], "hasPart": [{
        "@type": "CreativeWork",
        "name": "Implementation reference",
        "sameAs": ["${nestedReference}"]
      }]`,
    }),
  });
  const result = validateContextCanvasHeadRoutes(input);
  assert.equal(result.accepted, true);
  const record = result.records.find(({ effective }) => effective === citation);
  assert.deepEqual(
    {
      property: record?.property,
      objectType: record?.objectType,
      objectName: record?.objectName,
    },
    {
      property: "citation",
      objectType: "Article",
      objectName: "Sample",
    },
  );
  const nestedRecord = result.records.find(
    ({ effective }) => effective === nestedReference,
  );
  assert.deepEqual(
    {
      property: nestedRecord?.property,
      objectType: nestedRecord?.objectType,
      objectName: nestedRecord?.objectName,
    },
    {
      property: "sameAs",
      objectType: "CreativeWork",
      objectName: "Implementation reference",
    },
  );
});

test("bounds JSON-LD traversal depth and node population with finite diagnostics", () => {
  const root = () => ({
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": token(TOKENS.sampleId),
    url: token(TOKENS.sample),
    headline: "Sample",
    dateModified: "2026-10-27",
    author: { "@type": "Person", name: "Example Author" },
    publisher: { "@type": "Organization", name: "Driftframe Studios" },
  });
  const base = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.sampleId,
  });
  const deep = root();
  let cursor = deep;
  for (let index = 0; index < 130; index += 1) {
    cursor.hasPart = {};
    cursor = cursor.hasPart;
  }
  const broad = root();
  broad.hasPart = Array.from(
    { length: 8200 },
    (_value, index) => ({ name: `Part ${index}` }),
  );

  for (const [document, limit] of [
    [deep, "depth"],
    [broad, "node_count"],
  ]) {
    const result = inspectContextCanvasHeadDocument({
      sourcePath: `${CONTEXT_CANVAS_SOURCE_ROOT}/sample.html`,
      html: withJsonLd(base, document),
      authority: routeAuthority(),
    });
    const findings = result.diagnostics.filter(
      ({ code }) => code === "HEAD_JSONLD_TRAVERSAL_LIMIT",
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].observed.limit, limit);
  }
});

test("rejects non-HTTPS and relative values in recognized JSON-LD URL relationships", () => {
  const input = fixture({
    sample: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
      extraJson: ', "citation": "http://example.org/research", "sameAs": "./relative-route"',
    }),
  });
  const result = validateContextCanvasHeadRoutes(input);
  const findings = result.diagnostics.filter(
    ({ code }) => code === "HEAD_ROUTE_URL_SHAPE",
  );
  assert.equal(result.accepted, false);
  assert.deepEqual(
    findings.map(({ locator }) => locator).sort(),
    ["/jsonld/0/citation", "/jsonld/0/sameAs"],
  );
});

test("requires meaningful Article author and publisher relationship entries", () => {
  const cases = [
    {
      label: "empty objects",
      author: {},
      publisher: [{}],
    },
    {
      label: "empty arrays",
      author: [],
      publisher: [],
    },
    {
      label: "partial named relationships",
      author: { name: "Example Author" },
      publisher: { "@type": "Organization" },
    },
  ];
  for (const selected of cases) {
    const source = page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
    }).replace(
      '"author": {"@type": "Person", "name": "Example Author"},',
      `"author": ${JSON.stringify(selected.author)},`,
    ).replace(
      '"publisher": {"@type": "Organization", "name": "Driftframe Studios"}',
      `"publisher": ${JSON.stringify(selected.publisher)}`,
    );
    const result = validateContextCanvasHeadRoutes(fixture({ sample: source }));
    const codes = new Set(result.diagnostics.map(({ code }) => code));
    assert.equal(codes.has("HEAD_JSONLD_AUTHOR_MISSING"), true, selected.label);
    assert.equal(codes.has("HEAD_JSONLD_PUBLISHER_MISSING"), true, selected.label);
  }
});

test("accepts identified and typed, named Article relationships", () => {
  const source = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.sampleId,
  }).replace(
    '"author": {"@type": "Person", "name": "Example Author"},',
    '"author": [{"@id": "https://example.org/author"}],',
  );
  const result = validateContextCanvasHeadRoutes(fixture({ sample: source }));
  assert.equal(result.accepted, true, JSON.stringify(result.diagnostics, null, 2));
});

test("reports duplicate canonical identity across indexed pages", () => {
  const source = page({
    title: "Sample",
    pageToken: TOKENS.sample,
    idToken: TOKENS.sampleId,
  })
    .replaceAll(token(TOKENS.sample), token(TOKENS.home))
    .replaceAll(token(TOKENS.sampleId), token(TOKENS.homeId));
  const result = validateContextCanvasHeadRoutes(fixture({ sample: source }));
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_CANONICAL_DUPLICATE_ROUTE"),
    true,
  );
});

test("aggregates independent page, JSON-LD, carrier, and sitemap findings", () => {
  const rejected = new Map([[TOKENS.image, new Set(["open_graph_image"])]]);
  const input = fixture({
    home: page({
      title: "About",
      pageToken: TOKENS.home,
      idToken: TOKENS.homeId,
      type: "WebPage",
      malformedJson: true,
      omit: new Set(["twitter:image:alt"]),
      extraHead: `<link rel="canonical" href="${token(TOKENS.home)}">`,
    }),
    sample: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
      extraHead: '<meta property="og:url" content="https://vik.guru/collaboration/wrong/">',
    }),
    sitemap: `<?xml version="1.0"?><urlset>
      <url><loc>${token(TOKENS.home)}</loc></url>
      <url><loc>https://vik.guru/unowned.html</loc></url>
    </urlset>`,
  });
  input.authority = routeAuthority({ reject: rejected });
  const result = validateContextCanvasHeadRoutes(input);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.equal(result.accepted, false);
  assert.equal(codes.has("HEAD_METADATA_DUPLICATE"), true);
  assert.equal(codes.has("HEAD_METADATA_MISSING"), true);
  assert.equal(codes.has("HEAD_JSONLD_PARSE"), true);
  assert.equal(codes.has("HEAD_JSONLD_IDENTITY_MISMATCH"), true);
  assert.equal(codes.has("PUBLIC_ROUTE_CARRIER_REJECTED"), true);
  assert.equal(codes.has("HEAD_SITEMAP_ROUTE_MISSING"), true);
  assert.equal(codes.has("HEAD_SITEMAP_ROUTE_EXTRA"), true);
  assert.equal(contextCanvasHeadRouteExitCode(result), 1);

  const tuples = result.diagnostics.map(({ source, locator, code }) =>
    `${source}\u0000${locator}\u0000${code}`);
  assert.deepEqual(tuples, [...tuples].sort((left, right) =>
    Buffer.compare(Buffer.from(left), Buffer.from(right))));
  const machine = JSON.parse(
    formatContextCanvasHeadRouteDiagnostics(result, { format: "json" }),
  );
  assert.equal(machine.accepted, false);
  assert.equal(machine.diagnostics.length, result.diagnostics.length);
  assert.match(formatContextCanvasHeadRouteDiagnostics(result), /HEAD_JSONLD_PARSE/u);
});

test("classifies a new URL-bearing JSON-LD property for explicit review", () => {
  const result = inspectContextCanvasHeadDocument({
    sourcePath: `${CONTEXT_CANVAS_SOURCE_ROOT}/sample.html`,
    html: page({
      title: "Sample",
      pageToken: TOKENS.sample,
      idToken: TOKENS.sampleId,
      extraJson: ', "novelReceiver": "https://example.org/receiver"',
    }),
    authority: routeAuthority(),
  });
  assert.equal(
    result.diagnostics.some(({ code }) => code === "HEAD_JSONLD_URL_PROPERTY_REVIEW"),
    true,
  );
  assert.equal(
    result.records.some(({ property }) => property === "novelReceiver"),
    true,
  );
});

test("reports each standing boundary independently", () => {
  const input = fixture({
    sitemap: `<?xml version="1.0"?><urlset>
      <url><loc>${token(TOKENS.home)}</loc></url>
      <url><loc>${token(TOKENS.sample)}</loc></url>
      <url><loc>https://vik.guru/404.html</loc></url>
      <url><loc>https://vik.guru/exemplar-index-landing.html</loc></url>
    </urlset>`,
  });
  input.documents.set(CONTEXT_CANVAS_404_PATH, "<html><head></head></html>");
  input.documents.delete(CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH);
  input.primaryManifest.files.push({
    source_path: CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH,
    projected_path: "retained/exemplar-index-landing.html",
    media_type: "text/html",
  });
  const result = validateContextCanvasHeadRoutes(input);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  assert.equal(codes.has("HEAD_STANDING_NOINDEX_MISSING"), true);
  assert.equal(codes.has("HEAD_STANDING_DOCUMENT_MISSING"), true);
  assert.equal(codes.has("HEAD_EXEMPLAR_MANIFEST_STANDING"), true);
  assert.equal(codes.has("HEAD_404_SITEMAP_STANDING"), true);
  assert.equal(codes.has("HEAD_EXEMPLAR_SITEMAP_STANDING"), true);
});
