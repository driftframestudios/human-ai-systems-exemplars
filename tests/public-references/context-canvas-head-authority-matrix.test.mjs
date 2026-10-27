import '../../tools/node-runtime-admission.mjs';

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';

import {
  CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID,
  DEFAULT_CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_PATH,
  buildContextCanvasHeadAuthorityMatrix,
  compareContextCanvasHeadAuthorityMatrix,
  createContextCanvasHeadAuthority,
  runContextCanvasHeadRouteCheck,
} from '../../tools/check-context-canvas-head-routes.mjs';

test('composes Registry citation authority with carrier-aware repository routes', () => {
  const routeToken = 'PUBLIC_URL_PAGE_ABOUT';
  const registryToken = 'PUBLIC_URL_REGISTRY_SAMPLE';
  const routeReference = {
    routes: [{
      token: routeToken,
      url: 'https://vik.guru/',
      authorityClass: 'page',
      allowedCarriers: ['canonical', 'jsonld'],
      owner: { type: 'primary_route_manifest', source_path: 'index.html' },
    }],
    destinations: {
      get(token) {
        return token === routeToken ? 'https://vik.guru/' : undefined;
      },
      assertTokenCarrier(token, carrier) {
        assert.equal(token, routeToken);
        assert.equal(carrier, 'canonical');
        return 'https://vik.guru/';
      },
    },
  };
  const registryReference = {
    routes: [{
      token: registryToken,
      url: 'https://kindlight.systems/sample',
      atlasRecordKey: 'sample',
    }],
    destinations: new Map([[registryToken, 'https://kindlight.systems/sample']]),
  };
  const authority = createContextCanvasHeadAuthority({
    routeReference,
    registryReference,
  });

  assert.equal(authority.resolveToken(routeToken), 'https://vik.guru/');
  assert.equal(
    authority.resolveToken(registryToken),
    'https://kindlight.systems/sample',
  );
  assert.equal(
    authority.assertTokenCarrier(routeToken, 'canonical', 'index.html'),
    'https://vik.guru/',
  );
  assert.equal(
    authority.assertTokenCarrier(registryToken, 'jsonld', 'index.html'),
    'https://kindlight.systems/sample',
  );
  assert.throws(
    () => authority.assertTokenCarrier(registryToken, 'canonical', 'index.html'),
    (error) => error.diagnostics?.[0]?.code === 'HEAD_REGISTRY_CARRIER_MISMATCH',
  );
  assert.equal(
    authority.assertResolvedCarrier('https://vik.guru/', 'canonical', 'index.html'),
    'https://vik.guru/',
  );
  assert.equal(
    authority.assertResolvedCarrier(
      'https://kindlight.systems/sample',
      'jsonld',
      'index.html',
    ),
    'https://kindlight.systems/sample',
  );
  assert.throws(
    () => authority.assertResolvedCarrier(
      'https://kindlight.systems/sample',
      'canonical',
      'index.html',
    ),
    (error) =>
      error.diagnostics?.[0]?.code === 'HEAD_ROUTE_LITERAL_CARRIER_MISMATCH',
  );
  assert.throws(
    () => authority.assertResolvedCarrier(
      'https://vik.guru/collaboration/wrong/',
      'canonical',
      'index.html',
    ),
    (error) => error.diagnostics?.[0]?.code === 'HEAD_ROUTE_LITERAL_UNOWNED',
  );
});

test('binds page identity carriers to their manifest-selected source', () => {
  const aboutToken = 'PUBLIC_URL_PAGE_ABOUT';
  const systemsToken = 'PUBLIC_URL_PAGE_AI_SYSTEMS';
  const routes = [
    {
      token: aboutToken,
      url: 'https://vik.guru/',
      authorityClass: 'page',
      allowedCarriers: ['canonical', 'jsonld', 'open_graph_url', 'sitemap'],
      owner: {
        type: 'primary_route_manifest',
        source_path: 'context-canvas-project-surface/context-canvas/index.html',
      },
    },
    {
      token: systemsToken,
      url: 'https://vik.guru/ai-systems.html',
      authorityClass: 'page',
      allowedCarriers: ['canonical', 'jsonld', 'open_graph_url', 'sitemap'],
      owner: {
        type: 'primary_route_manifest',
        source_path: 'context-canvas-project-surface/context-canvas/ai-systems.html',
      },
    },
  ];
  const destinations = new Map(routes.map((route) => [route.token, route.url]));
  const routeReference = {
    routes,
    destinations: {
      get(token) {
        return destinations.get(token);
      },
      assertTokenCarrier(token, carrier) {
        const route = routes.find((candidate) => candidate.token === token);
        assert.ok(route?.allowedCarriers.includes(carrier));
        return route.url;
      },
    },
  };
  const registryReference = {
    routes: [],
    destinations: new Map(),
  };
  const authority = createContextCanvasHeadAuthority({
    routeReference,
    registryReference,
  });
  const aboutSource =
    'context-canvas-project-surface/context-canvas/index.html';
  const systemsSource =
    'context-canvas-project-surface/context-canvas/ai-systems.html';

  for (const carrier of ['canonical', 'open_graph_url']) {
    assert.throws(
      () => authority.assertTokenCarrier(systemsToken, carrier, aboutSource),
      (error) =>
        error.diagnostics?.[0]?.code ===
          'HEAD_PAGE_IDENTITY_SOURCE_MISMATCH' &&
        error.diagnostics[0].expected === systemsSource,
    );
    assert.throws(
      () => authority.assertResolvedCarrier(
        'https://vik.guru/ai-systems.html',
        carrier,
        aboutSource,
      ),
      (error) =>
        error.diagnostics?.[0]?.code ===
          'HEAD_PAGE_IDENTITY_SOURCE_MISMATCH',
    );
  }

  assert.equal(
    authority.assertTokenCarrier(systemsToken, 'canonical', systemsSource),
    'https://vik.guru/ai-systems.html',
  );
  assert.equal(
    authority.assertTokenCarrier(systemsToken, 'jsonld', aboutSource),
    'https://vik.guru/ai-systems.html',
  );
  assert.equal(
    authority.assertTokenCarrier(
      systemsToken,
      'sitemap',
      'context-canvas-project-surface/context-canvas/sitemap.xml',
    ),
    'https://vik.guru/ai-systems.html',
  );
});

test('builds a deterministic occurrence matrix and reports tracked drift once', () => {
  const validation = {
    accepted: true,
    pageCount: 1,
    records: [{
      source: 'context-canvas-project-surface/context-canvas/index.html',
      locator: "/head/link[@rel='canonical']/@href",
      carrier: 'canonical',
      property: 'canonical',
      objectType: 'HTML document',
      objectName: 'About',
      raw: '{{PUBLIC_URL_PAGE_ABOUT}}',
      effective: 'https://vik.guru/',
      token: 'PUBLIC_URL_PAGE_ABOUT',
      relationship_role: 'primary_retrieval',
    }],
  };
  const routeReference = {
    routes: [{
      token: 'PUBLIC_URL_PAGE_ABOUT',
      authorityClass: 'page',
      role: 'primary_retrieval',
      owner: {
        type: 'primary_route_manifest',
        source_path: 'context-canvas-project-surface/context-canvas/index.html',
      },
    }],
    receipt: { sourceDigests: { binding: 'a'.repeat(64) } },
  };
  const registryReference = {
    routes: [],
    receipt: { bindingSha256: 'b'.repeat(64) },
  };
  const expected = buildContextCanvasHeadAuthorityMatrix({
    validation,
    routeReference,
    registryReference,
  });
  assert.equal(expected.id, CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID);
  assert.equal(expected.entries.length, 1);
  assert.equal(expected.entries[0].object_type, 'HTML document');
  assert.equal(expected.entries[0].object_name, 'About');
  assert.equal(expected.entries[0].follow_up_issue, '#609');
  assert.deepEqual(compareContextCanvasHeadAuthorityMatrix({
    expected,
    tracked: structuredClone(expected),
  }), []);

  const tracked = structuredClone(expected);
  tracked.entries[0].relationship_role = 'jsonld';
  const diagnostics = compareContextCanvasHeadAuthorityMatrix({ expected, tracked });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, 'HEAD_AUTHORITY_MATRIX_DRIFT');
});

test('rejects duplicate object members in the tracked authority matrix', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'context-canvas-head-matrix-'));
  try {
    const source = await readFile(
      DEFAULT_CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_PATH,
      'utf8',
    );
    const duplicated = source.replace(
      '  "version": "1",',
      '  "version": "discarded",\n  "version": "1",',
    );
    assert.notEqual(duplicated, source);
    const matrixPath = join(directory, 'matrix.json');
    await writeFile(matrixPath, duplicated, 'utf8');

    const result = await runContextCanvasHeadRouteCheck({ matrixPath });
    assert.equal(result.accepted, false);
    assert.equal(
      result.diagnostics.some(({ code }) =>
        code === 'HEAD_AUTHORITY_MATRIX_DUPLICATE_JSON_MEMBER'),
      true,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('accepts the repository inventory and validates its tracked matrix schema', async () => {
  const result = await runContextCanvasHeadRouteCheck();
  assert.equal(result.accepted, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.validation.pageCount, 40);
  assert.equal(result.matrix.entries.length, result.validation.recordCount);
  assert.equal(result.matrix.counts.entries, result.matrix.entries.length);
  assert.deepEqual(
    [...new Set(result.matrix.entries.map(({ follow_up_issue: issue }) => issue))].sort(),
    ['#609', '#610', '#611', '#612', '#613', '#614'],
  );
  assert.equal(
    result.matrix.counts.registry +
      result.matrix.counts.repository_routes +
      result.matrix.counts.reviewed_literals,
    result.matrix.counts.entries,
  );
  const contextNamespace = result.matrix.entries.find(
    ({ effective_url: route }) =>
      route === "https://schemas.vik.guru/context-canvas/1.0.0/context-canvas.context.jsonld#",
  );
  assert.equal(contextNamespace?.authority_class, "schema_vocabulary");
  assert.equal(contextNamespace?.authority_role, "stable_schema_vocabulary");
  assert.equal(contextNamespace?.follow_up_issue, "#611");

  const schema = JSON.parse(await readFile(
    new URL(
      '../../deployment/public-references/context-canvas-head-authority-matrix.schema.json',
      import.meta.url,
    ),
    'utf8',
  ));
  const validate = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: false,
  }).compile(schema);
  assert.equal(validate(result.matrix), true, JSON.stringify(validate.errors, null, 2));
});
