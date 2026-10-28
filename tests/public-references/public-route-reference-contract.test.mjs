import '../../tools/node-runtime-admission.mjs';

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

import {
  DEFAULT_PUBLIC_ROUTE_REFERENCE_AUTHORITY_PATHS,
  DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH,
  PublicRouteReferenceContractError,
  assertPublicRouteReferenceCarrier,
  isPublicRouteReferenceDestinationAuthority,
  loadPublicRouteReferenceBinding,
  parsePublicRouteReferenceBinding,
} from '../../tools/public-route-reference-contract.mjs';
import { schemaCompanionRoutes } from '../../tools/schema-publication.mjs';

const repositoryRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const contextCanvasRoot = join(
  repositoryRoot,
  'context-canvas-project-surface/context-canvas',
);
const tokenPattern = /\{\{(PUBLIC_URL_(?:PAGE|ASSET|IFRAME|SCHEMA|SKILL)_[A-Z0-9_]+)\}\}/gu;

async function sourceTokens() {
  const names = (await readdir(contextCanvasRoot))
    .filter((name) => name.endsWith('.html') || name === 'sitemap.xml')
    .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  const tokens = new Set();
  for (const name of names) {
    const source = await readFile(join(contextCanvasRoot, name), 'utf8');
    for (const match of source.matchAll(tokenPattern)) tokens.add(match[1]);
  }
  return [...tokens].sort((left, right) =>
    Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

async function authorityBytes() {
  const paths = DEFAULT_PUBLIC_ROUTE_REFERENCE_AUTHORITY_PATHS;
  const [
    primaryManifestBytes,
    productionConfigBytes,
    canvasIframeManifestBytes,
    coreIframeManifestBytes,
    schemaPublicationManifestBytes,
    schemaCompanionSelectionBytes,
    skillPublicationSelectionBytes,
  ] = await Promise.all([
    readFile(paths.primaryManifest),
    readFile(paths.productionConfig),
    readFile(paths.canvasIframeManifest),
    readFile(paths.coreIframeManifest),
    readFile(paths.schemaPublicationManifest),
    readFile(paths.schemaCompanionSelection),
    readFile(paths.skillPublicationSelection),
  ]);
  return {
    primaryManifestBytes,
    productionConfigBytes,
    canvasIframeManifestBytes,
    coreIframeManifestBytes,
    schemaPublicationManifestBytes,
    schemaCompanionSelectionBytes,
    skillPublicationSelectionBytes,
  };
}

test('binds schema companion routes to the tracked source selection', async () => {
  const tracked = JSON.parse(await readFile(
    DEFAULT_PUBLIC_ROUTE_REFERENCE_AUTHORITY_PATHS.schemaCompanionSelection,
    'utf8',
  ));
  const selected = tracked.routes.map(({ source, receiver_path: receiverPath }) => ({
    source,
    receiverPath,
  }));
  const compare = (left, right) => Buffer.compare(
    Buffer.from(`${left.source}\u0000${left.receiverPath}`),
    Buffer.from(`${right.source}\u0000${right.receiverPath}`),
  );
  assert.deepEqual(selected, [...schemaCompanionRoutes].sort(compare));
});

test('keeps the route-binding schema executable and aligned with tracked data', async () => {
  const schema = JSON.parse(await readFile(
    new URL(
      '../../deployment/public-references/context-canvas-route-bindings.schema.json',
      import.meta.url,
    ),
    'utf8',
  ));
  const binding = JSON.parse(await readFile(
    DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH,
    'utf8',
  ));
  const validate = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: false,
  }).compile(schema);
  assert.equal(validate(binding), true, JSON.stringify(validate.errors, null, 2));

  const invalidCarrier = structuredClone(binding);
  invalidCarrier.bindings.find(({ token }) =>
    token === 'PUBLIC_URL_SKILL_CATALOG').allowed_carriers = ['body'];
  assert.equal(validate(invalidCarrier), false);

  const invalidClass = structuredClone(binding);
  invalidClass.bindings.find(({ token }) =>
    token === 'PUBLIC_URL_PAGE_ABOUT').token = 'PUBLIC_URL_ASSET_ABOUT';
  assert.equal(validate(invalidClass), false);

  const invalidCatalogOwner = structuredClone(binding);
  invalidCatalogOwner.bindings.find(({ token }) =>
    token === 'PUBLIC_URL_SKILL_CATALOG').owner = {
    type: 'schemas_worker_publication',
    public_path: '/skills/',
    content_type: 'text/html',
  };
  assert.equal(validate(invalidCatalogOwner), false);

  const invalidExpectedUrls = [
    'https://vik.guru/path//child',
    'https://vik.guru/path with space',
    'https://vik.guru/path?mode=review',
    'https://vik.guru/a/../child',
    'https://vik.guru/a/%2e%2e/child',
    'https://vik.guru/path#',
    'https://vik.guru/path\\child',
    'https://vik.guru/path%2',
    'https://vik.guru/café',
  ];
  for (const expectedUrl of invalidExpectedUrls) {
    const invalidExpectedUrl = structuredClone(binding);
    invalidExpectedUrl.bindings.find(({ token }) =>
      token === 'PUBLIC_URL_PAGE_ABOUT').expected_url = expectedUrl;
    assert.equal(validate(invalidExpectedUrl), false, expectedUrl);
  }
});

function bytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function duplicateTopLevelProbe(value) {
  const source = Buffer.from(value).toString('utf8');
  return Buffer.from(source.replace(
    '{',
    '{\n  "duplicate_probe": "discarded",\n  "duplicate_probe": "selected",',
  ));
}

test('rejects duplicate members in the binding and every owner-authority input', async (t) => {
  const bindingBytes = await readFile(DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH);
  const bindingSource = bindingBytes.toString('utf8');
  const duplicatedOwner = bindingSource.replace(
    '        "type": "primary_route_manifest",',
    '        "type": "discarded",\n        "type": "primary_route_manifest",',
  );
  assert.notEqual(duplicatedOwner, bindingSource);
  const authorities = await authorityBytes();
  const expectDuplicate = (selectedBinding, selectedAuthorities, expectedFile) => {
    assert.throws(
      () => parsePublicRouteReferenceBinding(selectedBinding, selectedAuthorities),
      (error) => {
        assert.equal(error instanceof PublicRouteReferenceContractError, true);
        assert.equal(
          error.diagnostics.some(({ code, file }) =>
            code === 'PUBLIC_ROUTE_BINDING_DUPLICATE_JSON_MEMBER' &&
            file === expectedFile),
          true,
        );
        return true;
      },
    );
  };

  await t.test('binding owner', () => expectDuplicate(
    Buffer.from(duplicatedOwner),
    authorities,
    'deployment/public-references/context-canvas-route-bindings.v1.json',
  ));

  const cases = [
    ['primaryManifestBytes', 'deployment/cpanel/primary-route-manifest.json'],
    ['productionConfigBytes', 'deployment/cpanel/production-projection.config.json'],
    ['canvasIframeManifestBytes', 'iframe-route-families/canvas/public-iframe-route-manifest-v1.json'],
    ['coreIframeManifestBytes', 'core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json'],
    ['schemaPublicationManifestBytes', 'cloudflare/schemas-worker/public/publication-manifest.json'],
    ['schemaCompanionSelectionBytes', 'deployment/public-references/schema-companion-selection.v1.json'],
    ['skillPublicationSelectionBytes', '.agents/skills/publication-selection.json'],
  ];
  for (const [key, expectedFile] of cases) {
    await t.test(key, () => expectDuplicate(
      bindingBytes,
      { ...authorities, [key]: duplicateTopLevelProbe(authorities[key]) },
      expectedFile,
    ));
  }
});

test('loads the complete source inventory as an immutable destination authority', async () => {
  const requiredKeys = await sourceTokens();
  const result = await loadPublicRouteReferenceBinding({ requiredKeys });

  assert.equal(requiredKeys.length, 166);
  assert.equal(result.destinations.size, requiredKeys.length);
  assert.equal(isPublicRouteReferenceDestinationAuthority(result.destinations), true);
  assert.equal(result.destinations.set, undefined);
  assert.throws(() => {
    result.routes[0].url = 'https://vik.guru/unreviewed';
  }, TypeError);
  assert.deepEqual(result.receipt.authorityCounts, {
    page: 85,
    asset: 39,
    iframe: 6,
    schema: 2,
    skill: 34,
  });
  assert.equal(result.receipt.bindingCount, 166);
  assert.deepEqual(Object.keys(result.receipt.sourceDigests), [
    'binding',
    'primary_manifest',
    'production_config',
    'canvas_iframe_manifest',
    'core_iframe_manifest',
    'schema_publication_manifest',
    'schema_companion_selection',
    'skill_publication_selection',
  ]);
  for (const digest of Object.values(result.receipt.sourceDigests)) {
    assert.match(digest, /^[a-f0-9]{64}$/u);
  }
});

test('derives page, fragment, asset, iframe, schema, and skill destinations from their owners', async () => {
  const result = await loadPublicRouteReferenceBinding({
    requiredKeys: await sourceTokens(),
  });

  const expected = new Map([
    ['PUBLIC_URL_PAGE_ABOUT', 'https://vik.guru/'],
    ['PUBLIC_URL_PAGE_ABOUT_ABOUT', 'https://vik.guru/#about'],
    ['PUBLIC_URL_PAGE_EHR_THREE_FRONT_DOORS_ARTICLE', 'https://vik.guru/ehr-three-front-doors.html#article'],
    ['PUBLIC_URL_ASSET_PORTRAIT_OF_VVK_TECHNOLOGY_LEADER', 'https://vik.guru/portrait-of-vvk-technology-leader.jpg'],
    ['PUBLIC_URL_ASSET_VISUALIZATION_FIDELITY_CLEAN_EXEMPLAR', 'https://vik.guru/img/plot/visualization_fidelity_clean_exemplar.svg'],
    ['PUBLIC_URL_IFRAME_CORE_ARCHITECTURES', 'https://iframes.vik.guru/v1/core/'],
    ['PUBLIC_URL_IFRAME_INVESTMENT_STUDIO_CHAPTERS', 'https://iframes.vik.guru/v1/canvas/investment-studio-chapters/'],
    ['PUBLIC_URL_SCHEMA_CONTEXT_CANVAS_CONTEXT', 'https://schemas.vik.guru/context-canvas/1.0.0/context-canvas.context.jsonld'],
    ['PUBLIC_URL_SKILL_CATALOG', 'https://schemas.vik.guru/skills/'],
    ['PUBLIC_URL_SKILL_COLLABORATION_SKILLS_README', 'https://schemas.vik.guru/collaboration-skills/0.1.0/README.md'],
    ['PUBLIC_URL_SKILL_PORTABLE_SKILL_EXAMPLE', 'https://schemas.vik.guru/collaboration-skills/0.1.0/examples/portable-skill.example.json'],
    ['PUBLIC_URL_SKILL_RETIRED_PROJECTION_EXAMPLE', 'https://schemas.vik.guru/collaboration-skills/0.1.0/examples/retired-projection.example.json'],
    ['PUBLIC_URL_SKILL_COLLABORATION_ACCOUNT_EXAMPLE', 'https://schemas.vik.guru/collaboration-skills/0.1.0/examples/collaboration-account.example.json'],
    ['PUBLIC_URL_SKILL_SOURCE_AUTHORITY_MAPPING', 'https://schemas.vik.guru/skills/source-authority-mapping/'],
  ]);
  for (const [token, destination] of expected) {
    assert.equal(result.destinations.get(token), destination, token);
  }
});

test('keeps carrier policy attached to the branded authority', async () => {
  const { destinations } = await loadPublicRouteReferenceBinding({
    requiredKeys: await sourceTokens(),
  });

  assert.equal(
    assertPublicRouteReferenceCarrier(
      destinations,
      'PUBLIC_URL_PAGE_ABOUT',
      'canonical',
      'context-canvas/index.html',
    ),
    'https://vik.guru/',
  );
  assert.equal(
    assertPublicRouteReferenceCarrier(
      destinations,
      'PUBLIC_URL_ASSET_PORTRAIT_OF_VVK_TECHNOLOGY_LEADER',
      'open_graph_image',
      'context-canvas/index.html',
    ),
    'https://vik.guru/portrait-of-vvk-technology-leader.jpg',
  );
  for (const [authority, token, carrier] of [
    [destinations, 'PUBLIC_URL_ASSET_PORTRAIT_OF_VVK_TECHNOLOGY_LEADER', 'canonical'],
    [Object.freeze({}), 'PUBLIC_URL_PAGE_ABOUT', 'canonical'],
    [destinations, 'PUBLIC_URL_PAGE_UNKNOWN', 'jsonld'],
  ]) {
    assert.throws(
      () => assertPublicRouteReferenceCarrier(authority, token, carrier, 'test carrier'),
      (error) => {
        assert.equal(error instanceof PublicRouteReferenceContractError, true);
        assert.equal(error.diagnostics[0].code, 'PUBLIC_ROUTE_CARRIER_MISMATCH');
        return true;
      },
    );
  }
});

test('aggregates independent owner, expected-route, and coverage diagnostics', async () => {
  const bindingBytes = await readFile(DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH);
  const document = JSON.parse(bindingBytes);
  const about = document.bindings.find(({ token }) => token === 'PUBLIC_URL_PAGE_ABOUT');
  const iframe = document.bindings.find(({ token }) =>
    token === 'PUBLIC_URL_IFRAME_REGISTRY_GOAL_FIDELITY');
  const companion = document.bindings.find(({ token }) =>
    token === 'PUBLIC_URL_SKILL_COLLABORATION_SKILLS_README');
  about.expected_url = 'https://vik.guru/about.html';
  iframe.owner.route_id = 'missing-route';
  companion.owner.source = 'schemas/collaboration-skills/0.1.0/missing.md';
  const requiredKeys = [...await sourceTokens(), 'PUBLIC_URL_PAGE_MISSING'];
  const authorities = await authorityBytes();

  assert.throws(
    () => parsePublicRouteReferenceBinding(bytes(document), {
      ...authorities,
      requiredKeys,
    }),
    (error) => {
      assert.equal(error instanceof PublicRouteReferenceContractError, true);
      const codes = new Set(error.diagnostics.map(({ code }) => code));
      assert.equal(codes.has('PUBLIC_ROUTE_EXPECTED_URL_MISMATCH'), true);
      assert.equal(codes.has('PUBLIC_ROUTE_OWNER_MISSING'), true);
      assert.equal(codes.has('PUBLIC_ROUTE_BINDING_COVERAGE'), true);
      assert.equal(error.diagnostics.length >= 4, true);
      assert.equal(Object.isFrozen(error.diagnostics), true);
      return true;
    },
  );
});

test('rejects owner media drift and token classes that disagree with their binding class', async () => {
  const bindingBytes = await readFile(DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH);
  const authorities = await authorityBytes();
  const cases = [
    (document) => {
      document.bindings.find(({ token }) =>
        token === 'PUBLIC_URL_ASSET_PORTRAIT_OF_VVK_TECHNOLOGY_LEADER').owner.media_type = 'image/png';
    },
    (document) => {
      const row = document.bindings.find(({ token }) => token === 'PUBLIC_URL_PAGE_ABOUT');
      row.authority_class = 'asset';
      row.role = 'primary_asset';
      row.owner.media_type = 'text/html';
    },
  ];

  for (const mutate of cases) {
    const document = JSON.parse(bindingBytes);
    mutate(document);
    assert.throws(
      () => parsePublicRouteReferenceBinding(bytes(document), authorities),
      (error) => {
        assert.equal(error instanceof PublicRouteReferenceContractError, true);
        const codes = new Set(error.diagnostics.map(({ code }) => code));
        assert.equal(
          codes.has('PUBLIC_ROUTE_AUTHORITY_CLASS_MISMATCH') ||
          codes.has('PUBLIC_ROUTE_BINDING_SHAPE'),
          true,
        );
        return true;
      },
    );
  }
});
