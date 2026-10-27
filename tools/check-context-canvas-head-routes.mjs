import './node-runtime-admission.mjs';

import { createHash, randomUUID } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDirectExecution } from './check-node-runtime.mjs';
import {
  CONTEXT_CANVAS_404_PATH,
  CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH,
  CONTEXT_CANVAS_SOURCE_ROOT,
  formatContextCanvasHeadRouteDiagnostics,
  validateContextCanvasHeadRoutes,
} from './context-canvas-head-route-validator.mjs';
import {
  assertUniqueJsonObjectMembers,
  loadPublicRouteReferenceBinding,
} from './public-route-reference-contract.mjs';
import {
  loadRegistryReferenceBinding,
} from './registry-reference-contract.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export const CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID =
  'context-canvas.head-authority-matrix.v1';
export const CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_VERSION = '1';
export const DEFAULT_CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_PATH = join(
  repositoryRoot,
  'deployment/public-references/context-canvas-head-authority-matrix.v1.json',
);
export const DEFAULT_CONTEXT_CANVAS_PRIMARY_MANIFEST_PATH = join(
  repositoryRoot,
  'deployment/cpanel/primary-route-manifest.json',
);
export const DEFAULT_CONTEXT_CANVAS_SITEMAP_PATH = join(
  repositoryRoot,
  CONTEXT_CANVAS_SOURCE_ROOT,
  'sitemap.xml',
);

const MATRIX_SCHEMA_REFERENCE = './context-canvas-head-authority-matrix.schema.json';
const MAXIMUM_INPUT_BYTES = 8 * 1024 * 1024;
const REGISTRY_TOKEN = /^PUBLIC_URL_REGISTRY_[A-Z0-9_]+$/u;
const PUBLIC_TOKEN_OCCURRENCE = /\{\{(PUBLIC_URL_(?:REGISTRY|IFRAME|PAGE|ASSET|SCHEMA|SKILL)_[A-Z0-9_]+)\}\}/gu;
const GOVERNED_PUBLIC_HOSTS = new Set([
  'vik.guru',
  'iframes.vik.guru',
  'kindlight.systems',
  'schemas.vik.guru',
]);
const PAGE_IDENTITY_CARRIERS = new Set([
  'canonical',
  'open_graph_url',
]);
const REVIEWED_LITERAL_DESTINATIONS = new Map([
  ['https://kindlight.systems/', new Set(['jsonld'])],
  [
    'https://schemas.vik.guru/context-canvas/1.0.0/context-canvas.context.jsonld#',
    new Set(['jsonld']),
  ],
]);
const IDENTITY_COMPLETENESS_SOURCES = new Set([
  'conditioning-field.html',
  'ehr-discrete-genomic-result.html',
  'ehr-interface-engine-replatform.html',
  'ehr-pgx-alert-failure.html',
  'ehr-three-front-doors.html',
  'ehr-two-charts-one-result.html',
]);
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function diagnostic({
  code,
  source,
  locator = '',
  observed = null,
  expected = null,
  remediation,
}) {
  return {
    code,
    severity: 'error',
    source,
    locator,
    observed,
    expected,
    remediation,
  };
}

function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    compareUtf8(left.source ?? '', right.source ?? '') ||
    compareUtf8(left.locator ?? '', right.locator ?? '') ||
    compareUtf8(left.code ?? '', right.code ?? ''));
}

function destination(value, token) {
  if (value?.destinations?.get instanceof Function) {
    return value.destinations.get(token);
  }
  if (value?.get instanceof Function) return value.get(token);
  return undefined;
}

function assertPageIdentitySource(route, carrier, source) {
  if (
    route?.authorityClass !== 'page' ||
    route.owner?.type !== 'primary_route_manifest' ||
    !PAGE_IDENTITY_CARRIERS.has(carrier) ||
    route.owner.source_path === source
  ) return;

  const error = new Error('Page identity carriers belong to their manifest-selected source.');
  error.diagnostics = [{
    code: 'HEAD_PAGE_IDENTITY_SOURCE_MISMATCH',
    authority_class: 'page',
    owner: route.owner,
    observed: {
      token: route.token,
      carrier,
      source,
    },
    expected: route.owner.source_path,
    remediation:
      `Use ${route.token} for the canonical and Open Graph identity of ` +
      `${route.owner.source_path}.`,
  }];
  throw error;
}

/**
 * Join the Registry and repository-route contracts at the validator boundary.
 * Each source keeps its own policy: Registry references enter JSON-LD as
 * citations, while repository routes retain their binding-specific carriers.
 */
export function createContextCanvasHeadAuthority({
  routeReference,
  registryReference = null,
}) {
  if (routeReference === null || routeReference === undefined) {
    throw new TypeError('Context Canvas head authority requires the public-route reference.');
  }
  const selectedRegistryReference = registryReference ?? {
    routes: [],
    destinations: new Map(),
  };
  const routeByDestination = new Map();
  const routeByToken = new Map();
  for (const route of routeReference.routes ?? []) {
    const selected = routeByDestination.get(route.url) ?? [];
    selected.push(route);
    routeByDestination.set(route.url, selected);
    routeByToken.set(route.token, route);
  }
  const registryByDestination = new Map();
  for (const route of selectedRegistryReference.routes ?? []) {
    const selected = registryByDestination.get(route.url) ?? [];
    selected.push(route);
    registryByDestination.set(route.url, selected);
  }
  return Object.freeze({
    resolveToken(token) {
      return REGISTRY_TOKEN.test(token)
        ? destination(selectedRegistryReference, token)
        : destination(routeReference, token);
    },
    assertTokenCarrier(token, carrier, source) {
      if (REGISTRY_TOKEN.test(token)) {
        if (
          carrier !== 'jsonld' ||
          destination(selectedRegistryReference, token) === undefined
        ) {
          const error = new Error('Registry head references use reviewed JSON-LD carriers.');
          error.diagnostics = [{
            code: 'HEAD_REGISTRY_CARRIER_MISMATCH',
            authority_class: 'registry',
            owner: 'registry_atlas_binding',
            observed: carrier,
            expected: ['jsonld'],
            remediation: `Place ${token} in a reviewed JSON-LD relationship in ${source}.`,
          }];
          throw error;
        }
        return destination(selectedRegistryReference, token);
      }
      const authority = routeReference.destinations ?? routeReference;
      if (!(authority?.assertTokenCarrier instanceof Function)) {
        throw new TypeError('Public-route reference exposes its carrier policy.');
      }
      const selectedDestination = authority.assertTokenCarrier(token, carrier, source);
      assertPageIdentitySource(routeByToken.get(token), carrier, source);
      return selectedDestination;
    },
    assertResolvedCarrier(value, carrier, source) {
      const publicRoute = routeByDestination.get(value) ?? [];
      const carrierRoutes = publicRoute.filter((route) =>
        route.allowedCarriers.includes(carrier));
      if (carrierRoutes.length > 0) {
        for (const route of carrierRoutes) {
          assertPageIdentitySource(route, carrier, source);
        }
        return value;
      }
      const registryRoute = registryByDestination.get(value) ?? [];
      if (carrier === 'jsonld' && registryRoute.length > 0) return value;
      if (REVIEWED_LITERAL_DESTINATIONS.get(value)?.has(carrier)) return value;
      let hostname;
      try {
        hostname = new URL(value).hostname;
      } catch {
        return value;
      }
      if (!GOVERNED_PUBLIC_HOSTS.has(hostname)) return value;
      const error = new Error('Owned public literals resolve through tracked route authority.');
      error.diagnostics = [{
        code: publicRoute.length > 0 || registryRoute.length > 0
          ? 'HEAD_ROUTE_LITERAL_CARRIER_MISMATCH'
          : 'HEAD_ROUTE_LITERAL_UNOWNED',
        authority_class: publicRoute[0]?.authorityClass ?? (
          registryRoute.length > 0 ? 'registry' : 'owned_public_route'
        ),
        owner: publicRoute[0]?.owner ?? (
          registryRoute.length > 0 ? 'registry_atlas_binding' : hostname
        ),
        observed: { value, carrier },
        expected: publicRoute.length > 0
          ? publicRoute.flatMap((route) => route.allowedCarriers)
          : registryRoute.length > 0
            ? ['jsonld']
            : 'one exact destination from the tracked public authorities',
        remediation: `Materialize the reviewed semantic route for ${source}.`,
      }];
      throw error;
    },
  });
}

function routeIndexes(routeReference, registryReference) {
  return {
    route: new Map((routeReference.routes ?? []).map((item) => [item.token, item])),
    registry: new Map((registryReference.routes ?? []).map((item) => [item.token, item])),
  };
}

function classifyLiteral(record) {
  const url = new URL(record.effective);
  if (
    record.relationship_role === 'vocabulary' ||
    url.hostname === 'schema.org' ||
    url.hostname === 'www.schema.org'
  ) {
    return {
      authorityClass: 'external_vocabulary',
      authorityRole: 'structured_data_vocabulary',
    };
  }
  if (
    url.hostname === 'schemas.vik.guru' &&
    (url.hash.length > 0 || record.effective.endsWith('#'))
  ) {
    return {
      authorityClass: 'schema_vocabulary',
      authorityRole: 'stable_schema_vocabulary',
    };
  }
  return {
    authorityClass: 'external_reference',
    authorityRole: 'cited_public_reference',
  };
}

function authorityOwner({ route, registry, literal, record }) {
  if (route !== null) {
    const owner = route.owner;
    if (owner.type === 'primary_route_manifest') {
      return `${owner.type}:${owner.source_path}`;
    }
    if (owner.type === 'iframe_route_manifest') {
      return `${owner.type}:${owner.family}:${owner.route_id}`;
    }
    if (owner.type === 'schemas_worker_publication') {
      return `${owner.type}:${owner.public_path}`;
    }
    if (owner.type === 'schema_companion_route') {
      return `${owner.type}:${owner.receiver_path}`;
    }
    return `${owner.type}:${owner.skill_name ?? 'catalog'}`;
  }
  if (registry !== null) {
    return `registry_atlas_binding:${registry.atlasRecordKey}`;
  }
  const hostname = new URL(record.effective).hostname;
  if (literal.authorityClass === 'schema_vocabulary') {
    return `schemas_worker_vocabulary_identity:${new URL(record.effective).pathname}`;
  }
  if (literal.authorityClass === 'external_vocabulary') {
    return `public_vocabulary:${hostname}`;
  }
  return `external_owner:${hostname}`;
}

function followUpIssue({ record, route, registry, literal }) {
  if (
    record.carrier === 'open_graph_image' ||
    record.carrier === 'twitter_image'
  ) return '#613';
  if (route?.authorityClass === 'iframe') return '#610';
  if (
    route?.authorityClass === 'schema' ||
    route?.authorityClass === 'skill' ||
    literal?.authorityClass === 'schema_vocabulary'
  ) return '#611';
  const basename = record.source.split('/').at(-1);
  if (
    IDENTITY_COMPLETENESS_SOURCES.has(basename) &&
    record.carrier === 'jsonld' &&
    ['@id', 'url'].includes(record.property)
  ) return '#612';
  if (
    route?.authorityClass === 'page' ||
    route?.authorityClass === 'asset' ||
    ['canonical', 'open_graph_url', 'sitemap'].includes(record.carrier)
  ) return '#609';
  if (registry !== null) return '#614';
  return '#614';
}

function matrixEntry(record, indexes) {
  const route = record.token === null ? null : indexes.route.get(record.token) ?? null;
  const registry = record.token === null
    ? null
    : indexes.registry.get(record.token) ?? null;
  const literal = route === null && registry === null ? classifyLiteral(record) : null;
  return {
    source_path: record.source,
    locator: record.locator,
    carrier: record.carrier,
    property: record.property,
    object_type: record.objectType,
    object_name: record.objectName,
    source_value: record.raw,
    token: record.token,
    effective_url: record.effective,
    authority_class:
      route?.authorityClass ?? (registry === null ? literal.authorityClass : 'registry'),
    authority_role:
      route?.role ?? (registry === null ? literal.authorityRole : 'registry_reference'),
    relationship_role: record.relationship_role,
    authority_owner: authorityOwner({ route, registry, literal, record }),
    confidence:
      route === null
        ? (registry === null ? 'reviewed_literal' : 'registry_atlas_derived')
        : 'manifest_derived',
    review_status: 'accepted',
    follow_up_issue: followUpIssue({ record, route, registry, literal }),
  };
}

function compareMatrixEntries(left, right) {
  return compareUtf8(left.source_path, right.source_path) ||
    compareUtf8(left.locator, right.locator) ||
    compareUtf8(left.carrier, right.carrier) ||
    compareUtf8(left.source_value, right.source_value);
}

export function buildContextCanvasHeadAuthorityMatrix({
  validation,
  routeReference,
  registryReference,
}) {
  if (validation?.accepted !== true) {
    throw new Error('Head-route validation must pass before the authority matrix is formed.');
  }
  const indexes = routeIndexes(routeReference, registryReference);
  const entries = validation.records
    .map((record) => matrixEntry(record, indexes))
    .sort(compareMatrixEntries);
  const counts = {
    entries: entries.length,
    pages: validation.pageCount,
    registry: entries.filter(({ authority_class: value }) => value === 'registry').length,
    repository_routes: entries.filter(({ confidence }) =>
      confidence === 'manifest_derived').length,
    reviewed_literals: entries.filter(({ confidence }) =>
      confidence === 'reviewed_literal').length,
  };
  return {
    $schema: MATRIX_SCHEMA_REFERENCE,
    id: CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID,
    version: CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_VERSION,
    scope: {
      source_root: CONTEXT_CANVAS_SOURCE_ROOT,
      primary_manifest: 'deployment/cpanel/primary-route-manifest.json',
      sitemap: `${CONTEXT_CANVAS_SOURCE_ROOT}/sitemap.xml`,
      indexed_page_count: validation.pageCount,
    },
    authority_receipts: {
      public_route_binding_sha256: routeReference.receipt.sourceDigests.binding,
      registry_binding_sha256: registryReference.receipt.bindingSha256,
      occurrence_sha256: sha256(Buffer.from(JSON.stringify(entries))),
    },
    counts,
    entries,
  };
}

function validateTrackedMatrixShape(matrix, source) {
  const findings = [];
  if (
    matrix === null ||
    typeof matrix !== 'object' ||
    Array.isArray(matrix) ||
    matrix.$schema !== MATRIX_SCHEMA_REFERENCE ||
    matrix.id !== CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID ||
    matrix.version !== CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_VERSION ||
    !Array.isArray(matrix.entries)
  ) {
    findings.push(diagnostic({
      code: 'HEAD_AUTHORITY_MATRIX_SHAPE',
      source,
      observed: matrix,
      expected: `${CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID} version ${CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_VERSION}`,
      remediation: 'Form the tracked matrix from the accepted head-route inventory.',
    }));
  }
  return findings;
}

export function compareContextCanvasHeadAuthorityMatrix({
  expected,
  tracked,
  source = 'deployment/public-references/context-canvas-head-authority-matrix.v1.json',
}) {
  const diagnostics = validateTrackedMatrixShape(tracked, source);
  if (diagnostics.length === 0 && stableJson(expected) !== stableJson(tracked)) {
    diagnostics.push(diagnostic({
      code: 'HEAD_AUTHORITY_MATRIX_DRIFT',
      source,
      observed: tracked.authority_receipts ?? null,
      expected: expected.authority_receipts,
      remediation: 'Review the changed relationships, then regenerate the tracked matrix with --write-matrix.',
    }));
  }
  return sortDiagnostics(diagnostics);
}

async function readBoundedFile(path, label) {
  let handle;
  try {
    handle = await open(path, 'r');
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size <= 0n || before.size > BigInt(MAXIMUM_INPUT_BYTES)) {
      throw new Error(`${label} uses one bounded regular file.`);
    }
    const bytes = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (
      offset !== bytes.length ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs
    ) {
      throw new Error(`${label} remains stable while it is read.`);
    }
    return bytes;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function writeAtomic(path, bytes) {
  const temporaryPath = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    const handle = await open(temporaryPath, 'wx', 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

function discoverPublicTokens(sources) {
  const tokens = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(PUBLIC_TOKEN_OCCURRENCE)) tokens.add(match[1]);
  }
  return [...tokens].sort(compareUtf8);
}

async function decodeJsonFile(path, label) {
  const bytes = await readBoundedFile(path, label);
  const source = bytes.toString('utf8');
  const document = JSON.parse(source);
  assertUniqueJsonObjectMembers(source);
  return document;
}

export async function runContextCanvasHeadRouteCheck({
  root = repositoryRoot,
  matrixPath = DEFAULT_CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_PATH,
  writeMatrix = false,
} = {}) {
  const primaryManifestPath = resolve(root, 'deployment/cpanel/primary-route-manifest.json');
  const primaryManifest = await decodeJsonFile(primaryManifestPath, 'Primary route manifest');
  const indexedSources = (primaryManifest.files ?? [])
    .filter((entry) =>
      typeof entry?.source_path === 'string' &&
      entry.source_path.startsWith(`${CONTEXT_CANVAS_SOURCE_ROOT}/`) &&
      entry.media_type === 'text/html' &&
      entry.projected_path?.endsWith('.html') &&
      !entry.projected_path.includes('/') &&
      entry.projected_path !== '404.html')
    .map((entry) => entry.source_path)
    .sort(compareUtf8);
  const allDocumentPaths = [
    ...indexedSources,
    CONTEXT_CANVAS_404_PATH,
    CONTEXT_CANVAS_RETAINED_EXEMPLAR_PATH,
  ];
  const documentPairs = await Promise.all(allDocumentPaths.map(async (path) => [
    path,
    (await readBoundedFile(resolve(root, path), path)).toString('utf8'),
  ]));
  const documents = new Map(documentPairs);
  const sitemapSource = (
    await readBoundedFile(resolve(root, CONTEXT_CANVAS_SOURCE_ROOT, 'sitemap.xml'), 'Context Canvas sitemap')
  ).toString('utf8');
  const tokens = discoverPublicTokens([
    ...documents.values(),
    sitemapSource,
  ]);
  const registryKeys = tokens.filter((token) => REGISTRY_TOKEN.test(token));
  const routeKeys = tokens.filter((token) => !REGISTRY_TOKEN.test(token));
  const [routeReference, registryReference] = await Promise.all([
    loadPublicRouteReferenceBinding({ requiredKeys: routeKeys }),
    loadRegistryReferenceBinding({ requiredKeys: registryKeys }),
  ]);
  const authority = createContextCanvasHeadAuthority({
    routeReference,
    registryReference,
  });
  const validation = validateContextCanvasHeadRoutes({
    primaryManifest,
    documents,
    sitemapSource,
    authority,
  });
  if (!validation.accepted) {
    return {
      accepted: false,
      validation,
      matrix: null,
      diagnostics: validation.diagnostics,
      wroteMatrix: false,
    };
  }
  const matrix = buildContextCanvasHeadAuthorityMatrix({
    validation,
    routeReference,
    registryReference,
  });
  if (writeMatrix) {
    await writeAtomic(matrixPath, Buffer.from(stableJson(matrix)));
    return {
      accepted: true,
      validation,
      matrix,
      diagnostics: [],
      wroteMatrix: true,
    };
  }
  let tracked;
  const diagnostics = [];
  try {
    tracked = await decodeJsonFile(matrixPath, 'Context Canvas head-authority matrix');
  } catch (error) {
    diagnostics.push(diagnostic({
      code: error?.code === 'JSON_DUPLICATE_MEMBER'
        ? 'HEAD_AUTHORITY_MATRIX_DUPLICATE_JSON_MEMBER'
        : error?.code === 'JSON_NESTING_DEPTH'
          ? 'HEAD_AUTHORITY_MATRIX_JSON_DEPTH'
          : 'HEAD_AUTHORITY_MATRIX_READ',
      source: matrixPath,
      observed: error.code ?? error.message,
      expected: 'one parseable tracked authority matrix',
      remediation: error?.code === 'JSON_DUPLICATE_MEMBER'
        ? 'Keep one reviewed value for each matrix object member.'
        : 'Review the accepted inventory, then form the matrix with --write-matrix.',
    }));
  }
  if (tracked !== undefined) {
    diagnostics.push(...compareContextCanvasHeadAuthorityMatrix({
      expected: matrix,
      tracked,
      source: matrixPath,
    }));
  }
  return {
    accepted: diagnostics.length === 0,
    validation,
    matrix,
    diagnostics: sortDiagnostics(diagnostics),
    wroteMatrix: false,
  };
}

export function formatContextCanvasHeadRouteCheck(result, { format = 'human' } = {}) {
  if (format === 'json') {
    return `${JSON.stringify({
      id: CONTEXT_CANVAS_HEAD_AUTHORITY_MATRIX_ID,
      accepted: result.accepted === true,
      wrote_matrix: result.wroteMatrix === true,
      page_count: result.validation?.pageCount ?? 0,
      record_count: result.validation?.recordCount ?? 0,
      matrix_entries: result.matrix?.entries?.length ?? 0,
      diagnostics: result.diagnostics ?? [],
    }, null, 2)}\n`;
  }
  if (result.validation?.accepted === false) {
    return formatContextCanvasHeadRouteDiagnostics(result.validation);
  }
  if ((result.diagnostics?.length ?? 0) > 0) {
    const lines = [
      `Context Canvas head-authority matrix: ${result.diagnostics.length} finding${result.diagnostics.length === 1 ? '' : 's'}`,
    ];
    for (const finding of result.diagnostics) {
      lines.push(`- ${finding.code} · ${finding.source}`, `  ${finding.remediation}`);
    }
    return `${lines.join('\n')}\n`;
  }
  const action = result.wroteMatrix ? 'WROTE' : 'PASS';
  return `Context Canvas head-route authority: ${action} (${result.validation.pageCount} pages; ${result.validation.recordCount} URL carriers; ${result.matrix.entries.length} matrix rows)\n`;
}

function parseArguments(args) {
  if (args.length > 1) throw new Error('Use at most one option.');
  const option = args[0] ?? null;
  if (![null, '--json', '--write-matrix'].includes(option)) {
    throw new Error('Use node tools/check-context-canvas-head-routes.mjs [--json|--write-matrix].');
  }
  return {
    format: option === '--json' ? 'json' : 'human',
    writeMatrix: option === '--write-matrix',
  };
}

if (isDirectExecution(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await runContextCanvasHeadRouteCheck({
      writeMatrix: options.writeMatrix,
    });
    process.stdout.write(formatContextCanvasHeadRouteCheck(result, options));
    process.exitCode = result.accepted ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.code ?? 'HEAD_ROUTE_CHECK_FAILED'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
