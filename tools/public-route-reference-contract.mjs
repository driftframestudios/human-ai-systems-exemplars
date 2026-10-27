import './node-runtime-admission.mjs';

import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export const PUBLIC_ROUTE_REFERENCE_CONTRACT_ID =
  'context-canvas.public-route-reference-bindings.v1';
export const PUBLIC_ROUTE_REFERENCE_CONTRACT_VERSION = '1';
export const PUBLIC_ROUTE_REFERENCE_SCHEMA =
  './context-canvas-route-bindings.schema.json';
export const DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH = join(
  repositoryRoot,
  'deployment/public-references/context-canvas-route-bindings.v1.json',
);

export const DEFAULT_PUBLIC_ROUTE_REFERENCE_AUTHORITY_PATHS = Object.freeze({
  primaryManifest: join(
    repositoryRoot,
    'deployment/cpanel/primary-route-manifest.json',
  ),
  productionConfig: join(
    repositoryRoot,
    'deployment/cpanel/production-projection.config.json',
  ),
  canvasIframeManifest: join(
    repositoryRoot,
    'iframe-route-families/canvas/public-iframe-route-manifest-v1.json',
  ),
  coreIframeManifest: join(
    repositoryRoot,
    'core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json',
  ),
  schemaPublicationManifest: join(
    repositoryRoot,
    'cloudflare/schemas-worker/public/publication-manifest.json',
  ),
  schemaCompanionSelection: join(
    repositoryRoot,
    'deployment/public-references/schema-companion-selection.v1.json',
  ),
  skillPublicationSelection: join(
    repositoryRoot,
    '.agents/skills/publication-selection.json',
  ),
});

const MAXIMUM_INPUT_BYTES = 4 * 1024 * 1024;
const MAXIMUM_JSON_DEPTH = 128;
const TOKEN_PATTERN = /^PUBLIC_URL_(?:PAGE|ASSET|IFRAME|SCHEMA|SKILL)_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;
const AUTHORITY_CLASSES = new Set(['page', 'asset', 'iframe', 'schema', 'skill']);
const TOKEN_PREFIX_BY_AUTHORITY_CLASS = Object.freeze({
  page: 'PUBLIC_URL_PAGE_',
  asset: 'PUBLIC_URL_ASSET_',
  iframe: 'PUBLIC_URL_IFRAME_',
  schema: 'PUBLIC_URL_SCHEMA_',
  skill: 'PUBLIC_URL_SKILL_',
});
const ROLES = new Set([
  'primary_retrieval',
  'primary_asset',
  'hosted_instrument',
  'schema_retrieval',
  'skill_catalog',
  'skill_retrieval',
]);
const ALLOWED_CARRIERS = new Set([
  'anchor',
  'canonical',
  'iframe_full_view',
  'iframe_source',
  'jsonld',
  'open_graph_image',
  'open_graph_url',
  'sitemap',
  'twitter_image',
]);
const TOP_LEVEL_KEYS = Object.freeze([
  '$schema',
  'id',
  'version',
  'public_roots',
  'bindings',
]);
const PUBLIC_ROOT_KEYS = Object.freeze(['primary', 'iframe', 'schema']);
const BINDING_KEYS = Object.freeze([
  'token',
  'authority_class',
  'role',
  'owner',
  'fragment',
  'expected_url',
  'allowed_carriers',
  'selection_basis',
]);
const SCHEMA_COMPANION_SELECTION_KEYS = Object.freeze(['id', 'version', 'routes']);
const SCHEMA_COMPANION_ROUTE_KEYS = Object.freeze(['source', 'receiver_path']);
const destinationAuthorities = new WeakSet();
const destinationAuthorityRoutes = new WeakMap();

export class PublicRouteReferenceContractError extends Error {
  constructor(diagnostics) {
    const selected = Array.isArray(diagnostics) ? diagnostics : [];
    const counts = new Map();
    for (const diagnostic of selected) {
      counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1);
    }
    const summary = [...counts]
      .map(([code, count]) => `${code} (${count})`)
      .join(', ');
    super(
      `Public route-reference authority found ${selected.length} contract ` +
      `error${selected.length === 1 ? '' : 's'}${summary ? `: ${summary}` : '.'}`,
    );
    this.name = 'PublicRouteReferenceContractError';
    this.code = 'PUBLIC_ROUTE_REFERENCE_CONTRACT';
    this.diagnostics = Object.freeze(selected.map((item) => Object.freeze({ ...item })));
  }
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort(compareUtf8);
  const selected = [...expected].sort(compareUtf8);
  return actual.length === selected.length &&
    actual.every((key, index) => key === selected[index]);
}

function text(value, maximum = 2048) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !CONTROL_PATTERN.test(value);
}

/**
 * Inspect already-parseable JSON text for duplicate object members while
 * bounding recursive descent. JSON.parse intentionally keeps the final value
 * for a repeated member; authority inputs instead preserve one reviewable
 * meaning for every member name.
 */
export function assertUniqueJsonObjectMembers(source) {
  let cursor = 0;

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function skipWhitespace() {
    while (/\s/u.test(source[cursor] ?? '')) cursor += 1;
  }

  function parseString() {
    const start = cursor;
    cursor += 1;
    while (cursor < source.length) {
      if (source[cursor] === '\\') {
        cursor += 2;
        continue;
      }
      if (source[cursor] === '"') {
        cursor += 1;
        return JSON.parse(source.slice(start, cursor));
      }
      cursor += 1;
    }
    fail('JSON_SHAPE', 'JSON authority input uses readable string members.');
  }

  function parsePrimitive() {
    while (cursor < source.length && !/[\s,\]}]/u.test(source[cursor])) {
      cursor += 1;
    }
  }

  function parseArray(depth) {
    cursor += 1;
    skipWhitespace();
    if (source[cursor] === ']') {
      cursor += 1;
      return;
    }
    while (cursor < source.length) {
      parseValue(depth + 1);
      skipWhitespace();
      if (source[cursor] === ']') {
        cursor += 1;
        return;
      }
      cursor += 1;
      skipWhitespace();
    }
  }

  function parseObject(depth) {
    cursor += 1;
    skipWhitespace();
    const keys = new Set();
    if (source[cursor] === '}') {
      cursor += 1;
      return;
    }
    while (cursor < source.length) {
      const key = parseString();
      if (keys.has(key)) {
        fail('JSON_DUPLICATE_MEMBER', 'JSON authority input uses unique object members.');
      }
      keys.add(key);
      skipWhitespace();
      cursor += 1;
      skipWhitespace();
      parseValue(depth + 1);
      skipWhitespace();
      if (source[cursor] === '}') {
        cursor += 1;
        return;
      }
      cursor += 1;
      skipWhitespace();
    }
  }

  function parseValue(depth) {
    if (depth > MAXIMUM_JSON_DEPTH) {
      fail(
        'JSON_NESTING_DEPTH',
        `JSON authority input uses at most ${MAXIMUM_JSON_DEPTH} nested levels.`,
      );
    }
    skipWhitespace();
    if (source[cursor] === '{') parseObject(depth);
    else if (source[cursor] === '[') parseArray(depth);
    else if (source[cursor] === '"') parseString();
    else parsePrimitive();
  }

  parseValue(0);
}

function normalizedHttpsUrl(value, expectedOrigin) {
  if (!text(value) || /[{}\\]/u.test(value)) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.origin !== expectedOrigin ||
    url.username !== '' ||
    url.password !== '' ||
    url.port !== '' ||
    url.search !== '' ||
    url.href !== value ||
    url.pathname.includes('//')
  ) return null;
  return value;
}

function diagnostic({
  code,
  file,
  token = null,
  authorityClass = null,
  owner = null,
  observed = null,
  expected = null,
  remediation,
}) {
  return {
    code,
    severity: 'error',
    file,
    token,
    authority_class: authorityClass,
    owner,
    observed,
    expected,
    remediation,
  };
}

function decodeJson(bytes, file, diagnostics) {
  let buffer;
  if (Buffer.isBuffer(bytes) || bytes instanceof Uint8Array) {
    buffer = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    buffer = Buffer.from(bytes, 'utf8');
  } else {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: typeof bytes,
      expected: 'UTF-8 bytes or text',
      remediation: 'Supply the tracked JSON bytes for this authority input.',
    }));
    return { buffer: Buffer.alloc(0), document: null };
  }
  if (buffer.length === 0 || buffer.length > MAXIMUM_INPUT_BYTES) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: `${buffer.length} bytes`,
      expected: `1 to ${MAXIMUM_INPUT_BYTES} bytes`,
      remediation: 'Keep the authority input bounded and reviewable.',
    }));
    return { buffer, document: null };
  }
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: 'invalid UTF-8',
      expected: 'valid UTF-8 JSON',
      remediation: 'Encode the authority input as UTF-8 JSON.',
    }));
    return { buffer, document: null };
  }
  let document;
  try {
    document = JSON.parse(source);
  } catch {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: 'unreadable JSON',
      expected: 'one JSON document',
      remediation: 'Repair the JSON syntax before materialization.',
    }));
    return { buffer, document: null };
  }
  try {
    assertUniqueJsonObjectMembers(source);
  } catch (error) {
    diagnostics.push(diagnostic({
      code: error?.code === 'JSON_DUPLICATE_MEMBER'
        ? 'PUBLIC_ROUTE_BINDING_DUPLICATE_JSON_MEMBER'
        : error?.code === 'JSON_NESTING_DEPTH'
          ? 'PUBLIC_ROUTE_BINDING_JSON_DEPTH'
          : 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: error?.code ?? 'unsupported JSON authority input',
      expected: error?.code === 'JSON_NESTING_DEPTH'
        ? `at most ${MAXIMUM_JSON_DEPTH} nested JSON levels`
        : 'unique object members in bounded JSON',
      remediation: error?.code === 'JSON_NESTING_DEPTH'
        ? 'Reduce authority-input nesting while preserving its reviewed structure.'
        : 'Keep one reviewed value for each object member.',
    }));
    return { buffer, document: null };
  }
  return { buffer, document };
}

function ownerShape(binding, label, diagnostics, file) {
  const owner = binding.owner;
  const fail = (expected) => diagnostics.push(diagnostic({
    code: 'PUBLIC_ROUTE_BINDING_SHAPE',
    file,
    token: binding.token ?? null,
    authorityClass: binding.authority_class ?? null,
    owner: isPlainObject(owner) ? owner : null,
    observed: owner,
    expected,
    remediation: `Give ${label}.owner the selector required by its authority class.`,
  }));
  if (!isPlainObject(owner)) {
    fail('one owner selector object');
    return null;
  }
  if (binding.authority_class === 'page' || binding.authority_class === 'asset') {
    const keys = binding.authority_class === 'asset'
      ? ['type', 'source_path', 'media_type']
      : ['type', 'source_path'];
    if (
      !exactKeys(owner, keys) ||
      owner.type !== 'primary_route_manifest' ||
      !text(owner.source_path) ||
      (binding.authority_class === 'asset' && !text(owner.media_type))
    ) {
      fail(`{type: primary_route_manifest, source_path${binding.authority_class === 'asset' ? ', media_type' : ''}}`);
      return null;
    }
  } else if (binding.authority_class === 'iframe') {
    if (
      !exactKeys(owner, ['type', 'family', 'route_id']) ||
      owner.type !== 'iframe_route_manifest' ||
      !['canvas', 'core'].includes(owner.family) ||
      !text(owner.route_id)
    ) {
      fail('{type: iframe_route_manifest, family, route_id}');
      return null;
    }
  } else if (binding.authority_class === 'schema') {
    if (
      !exactKeys(owner, ['type', 'public_path', 'content_type']) ||
      owner.type !== 'schemas_worker_publication' ||
      !text(owner.public_path) ||
      !owner.public_path.startsWith('/') ||
      !text(owner.content_type)
    ) {
      fail('{type: schemas_worker_publication, public_path, content_type}');
      return null;
    }
  } else if (binding.authority_class === 'skill') {
    const selectionOwner = exactKeys(owner, ['type', 'skill_name']) &&
      owner.type === 'skill_publication_selection' &&
      (owner.skill_name === null || text(owner.skill_name));
    const workerOwner = exactKeys(owner, ['type', 'public_path', 'content_type']) &&
      owner.type === 'schemas_worker_publication' &&
      text(owner.public_path) &&
      owner.public_path.startsWith('/') &&
      text(owner.content_type);
    const companionOwner = exactKeys(owner, ['type', 'source', 'receiver_path', 'content_type']) &&
      owner.type === 'schema_companion_route' &&
      text(owner.source) &&
      text(owner.receiver_path) &&
      !owner.receiver_path.startsWith('/') &&
      text(owner.content_type);
    if (!selectionOwner && !workerOwner && !companionOwner) {
      fail('{type: skill_publication_selection, skill_name}, {type: schemas_worker_publication, public_path, content_type}, or {type: schema_companion_route, source, receiver_path, content_type}');
      return null;
    }
  }
  return owner;
}

function validateBinding(binding, index, file, diagnostics) {
  const label = `bindings[${index}]`;
  if (!exactKeys(binding, BINDING_KEYS)) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      observed: isPlainObject(binding) ? Object.keys(binding).sort(compareUtf8) : binding,
      expected: [...BINDING_KEYS].sort(compareUtf8),
      remediation: `${label} carries the exact reviewed binding fields.`,
    }));
    return null;
  }
  const token = typeof binding.token === 'string' && TOKEN_PATTERN.test(binding.token)
    ? binding.token
    : null;
  const authorityClass = AUTHORITY_CLASSES.has(binding.authority_class)
    ? binding.authority_class
    : null;
  const owner = authorityClass === null
    ? null
    : ownerShape(binding, label, diagnostics, file);
  const carriers = Array.isArray(binding.allowed_carriers) &&
    binding.allowed_carriers.length > 0 &&
    binding.allowed_carriers.every((carrier) => ALLOWED_CARRIERS.has(carrier)) &&
    new Set(binding.allowed_carriers).size === binding.allowed_carriers.length
    ? [...binding.allowed_carriers]
    : null;
  const fragment = binding.fragment === null ||
    (typeof binding.fragment === 'string' && /^[A-Za-z][A-Za-z0-9._~-]*$/u.test(binding.fragment))
    ? binding.fragment
    : undefined;
  const roleMatches = authorityClass === 'page'
    ? binding.role === 'primary_retrieval'
    : authorityClass === 'asset'
      ? binding.role === 'primary_asset'
      : authorityClass === 'iframe'
        ? binding.role === 'hosted_instrument'
        : authorityClass === 'schema'
          ? binding.role === 'schema_retrieval'
          : owner?.type === 'skill_publication_selection' && owner.skill_name === null
            ? binding.role === 'skill_catalog'
            : binding.role === 'skill_retrieval';
  const valid = token !== null &&
    authorityClass !== null &&
    token.startsWith(TOKEN_PREFIX_BY_AUTHORITY_CLASS[authorityClass]) &&
    ROLES.has(binding.role) &&
    roleMatches &&
    owner !== null &&
    fragment !== undefined &&
    text(binding.expected_url) &&
    carriers !== null &&
    text(binding.selection_basis, 1024);
  if (!valid) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file,
      token: token ?? binding.token ?? null,
      authorityClass: authorityClass ?? binding.authority_class ?? null,
      owner,
      observed: binding,
      expected: 'one typed, trimmed, complete route binding',
      remediation: `${label} uses the documented token, role, fragment, carrier, and selection forms.`,
    }));
    return null;
  }
  return Object.freeze({
    token,
    authorityClass,
    role: binding.role,
    owner: Object.freeze({ ...owner }),
    fragment,
    expectedUrl: binding.expected_url,
    allowedCarriers: Object.freeze(carriers),
    selectionBasis: binding.selection_basis,
  });
}

function validateSchemaCompanionSelection(decoded, file, diagnostics) {
  const document = decoded.document;
  if (
    !exactKeys(document, SCHEMA_COMPANION_SELECTION_KEYS) ||
    document?.id !== 'schemas-worker.schema-companion-selection.v1' ||
    document?.version !== '1' ||
    !Array.isArray(document?.routes) ||
    document.routes.length === 0
  ) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_SCHEMA_COMPANION_SELECTION',
      file,
      observed: document,
      expected: 'schemas-worker.schema-companion-selection.v1 version 1',
      remediation: 'Use one tracked, versioned selection of schema companion source and receiver paths.',
    }));
    return [];
  }
  const routes = [];
  const identities = new Set();
  const receivers = new Set();
  let previous = null;
  for (const [index, route] of document.routes.entries()) {
    const source = route?.source;
    const receiverPath = route?.receiver_path;
    const segmentsAreSafe = (value) =>
      text(value) &&
      !value.startsWith('/') &&
      !value.includes('\\') &&
      value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
    const identity = `${source ?? ''}\u0000${receiverPath ?? ''}`;
    if (
      !exactKeys(route, SCHEMA_COMPANION_ROUTE_KEYS) ||
      !segmentsAreSafe(source) ||
      !segmentsAreSafe(receiverPath) ||
      identities.has(identity) ||
      receivers.has(receiverPath) ||
      (previous !== null && compareUtf8(previous, identity) >= 0)
    ) {
      diagnostics.push(diagnostic({
        code: 'PUBLIC_ROUTE_SCHEMA_COMPANION_SELECTION',
        file,
        observed: route,
        expected: 'one unique route in ascending UTF-8 source and receiver order',
        remediation: `Repair routes[${index}] in the tracked schema companion selection.`,
      }));
      continue;
    }
    identities.add(identity);
    receivers.add(receiverPath);
    previous = identity;
    routes.push(Object.freeze({ source, receiverPath }));
  }
  return Object.freeze(routes);
}

function derivePrimary(binding, primaryManifest, productionConfig, file, diagnostics) {
  const publicationBase = productionConfig?.publication?.base_url;
  const selected = Array.isArray(primaryManifest?.files)
    ? primaryManifest.files.filter((entry) => entry?.source_path === binding.owner.source_path)
    : [];
  if (selected.length !== 1 || typeof publicationBase !== 'string') {
    diagnostics.push(diagnostic({
      code: selected.length > 1
        ? 'PUBLIC_ROUTE_OWNER_AMBIGUOUS'
        : 'PUBLIC_ROUTE_OWNER_MISSING',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: `${selected.length} matching primary routes`,
      expected: 'one primary-manifest route and one publication base URL',
      remediation: 'Align the binding selector with the primary route manifest and production publication configuration.',
    }));
    return null;
  }
  const route = selected[0];
  if (
    (binding.authorityClass === 'page' && route.media_type !== 'text/html') ||
    (binding.authorityClass === 'asset' && route.media_type !== binding.owner.media_type)
  ) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_AUTHORITY_CLASS_MISMATCH',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: route.media_type,
      expected: binding.authorityClass === 'page' ? 'text/html' : binding.owner.media_type,
      remediation: 'Select a primary route whose media type matches the declared authority class.',
    }));
    return null;
  }
  // The primary manifest projects the source index as index.html, while the
  // production configuration declares the origin root as its public identity.
  // Keeping this exception here makes canonical identity an authority decision
  // instead of asking authored pages to infer server index behavior.
  const projectedPath = binding.authorityClass === 'page' && route.projected_path === 'index.html'
    ? './'
    : route.projected_path;
  const url = new URL(projectedPath, publicationBase);
  if (binding.fragment !== null) url.hash = binding.fragment;
  return url.href;
}

function deriveIframe(binding, iframeManifests, file, diagnostics) {
  const manifest = iframeManifests?.[binding.owner.family];
  const selected = Array.isArray(manifest?.routes)
    ? manifest.routes.filter((route) => route?.id === binding.owner.route_id)
    : [];
  if (selected.length !== 1 || manifest?.host !== 'iframes.vik.guru') {
    diagnostics.push(diagnostic({
      code: selected.length > 1
        ? 'PUBLIC_ROUTE_OWNER_AMBIGUOUS'
        : 'PUBLIC_ROUTE_OWNER_MISSING',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: `${selected.length} matching iframe routes`,
      expected: 'one route on the iframes.vik.guru manifest',
      remediation: 'Align the binding route ID and family with the accepted iframe manifest.',
    }));
    return null;
  }
  const route = selected[0];
  if (route.activation_standing !== 'eligible' || typeof route.public_alias !== 'string') {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_AUTHORITY_CLASS_MISMATCH',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: route.activation_standing ?? null,
      expected: 'eligible',
      remediation: 'Select a publication-eligible iframe route with one public alias.',
    }));
    return null;
  }
  const url = new URL(route.public_alias, `https://${manifest.host}`);
  if (binding.fragment !== null) url.hash = binding.fragment;
  return url.href;
}

function deriveSchema(binding, schemaPublicationManifest, file, diagnostics) {
  const resource = schemaPublicationManifest?.resources?.[binding.owner.public_path];
  if (!isPlainObject(resource)) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_OWNER_MISSING',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: null,
      expected: binding.owner.public_path,
      remediation: 'Publish the selected Worker resource before admitting its route binding.',
    }));
    return null;
  }
  const contentType = String(resource.contentType ?? '').split(';')[0].trim();
  if (contentType !== binding.owner.content_type) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_SCHEMA_ROLE_MISMATCH',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: contentType,
      expected: binding.owner.content_type,
      remediation: 'Align the binding with the Worker resource media type.',
    }));
    return null;
  }
  const url = new URL(binding.owner.public_path, 'https://schemas.vik.guru');
  if (binding.fragment !== null) url.hash = binding.fragment;
  return url.href;
}

function deriveSkill(binding, skillPublicationSelection, file, diagnostics) {
  const base = skillPublicationSelection?.projectionBase;
  if (base !== 'https://schemas.vik.guru/skills/') {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_OWNER_MISSING',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: base ?? null,
      expected: 'https://schemas.vik.guru/skills/',
      remediation: 'Align the binding with the accepted public skill projection base.',
    }));
    return null;
  }
  let url = base;
  if (binding.owner.skill_name !== null) {
    const selected = Array.isArray(skillPublicationSelection.skills)
      ? skillPublicationSelection.skills.filter((skill) =>
          skill?.name === binding.owner.skill_name &&
          skill?.publicationStanding === 'public_ready' &&
          skill?.sourceAvailability === 'included')
      : [];
    if (selected.length !== 1) {
      diagnostics.push(diagnostic({
        code: selected.length > 1
          ? 'PUBLIC_ROUTE_OWNER_AMBIGUOUS'
          : 'PUBLIC_ROUTE_OWNER_MISSING',
        file,
        token: binding.token,
        authorityClass: binding.authorityClass,
        owner: binding.owner,
        observed: `${selected.length} public-ready skill selections`,
        expected: 'one included, public-ready skill selection',
        remediation: 'Select one admitted public skill or retain the catalog-root binding.',
      }));
      return null;
    }
    url = new URL(`${binding.owner.skill_name}/`, base).href;
  }
  if (binding.fragment !== null) {
    const parsed = new URL(url);
    parsed.hash = binding.fragment;
    url = parsed.href;
  }
  return url;
}

function deriveSchemaCompanion(binding, companionRoutes, file, diagnostics) {
  const selected = Array.isArray(companionRoutes)
    ? companionRoutes.filter((route) =>
        route?.source === binding.owner.source &&
        route?.receiverPath === binding.owner.receiver_path)
    : [];
  if (selected.length !== 1) {
    diagnostics.push(diagnostic({
      code: selected.length > 1
        ? 'PUBLIC_ROUTE_OWNER_AMBIGUOUS'
        : 'PUBLIC_ROUTE_OWNER_MISSING',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: `${selected.length} matching companion routes`,
      expected: 'one selected schema companion route',
      remediation: 'Select the source and receiver path recorded in the tracked schema companion selection.',
    }));
    return null;
  }
  const expectedContentType = binding.owner.receiver_path.endsWith('.md')
    ? 'text/markdown'
    : binding.owner.receiver_path.endsWith('.jsonld')
      ? 'application/ld+json'
      : binding.owner.receiver_path.endsWith('.json')
        ? 'application/json'
        : null;
  if (expectedContentType !== binding.owner.content_type) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_SCHEMA_ROLE_MISMATCH',
      file,
      token: binding.token,
      authorityClass: binding.authorityClass,
      owner: binding.owner,
      observed: binding.owner.content_type,
      expected: expectedContentType,
      remediation: 'Align the companion binding with the receiver format selected for publication.',
    }));
    return null;
  }
  const url = new URL(binding.owner.receiver_path, 'https://schemas.vik.guru/');
  if (binding.fragment !== null) url.hash = binding.fragment;
  return url.href;
}

function deriveUrl(binding, authorities, file, diagnostics) {
  if (binding.authorityClass === 'page' || binding.authorityClass === 'asset') {
    return derivePrimary(
      binding,
      authorities.primaryManifest,
      authorities.productionConfig,
      file,
      diagnostics,
    );
  }
  if (binding.authorityClass === 'iframe') {
    return deriveIframe(binding, authorities.iframeManifests, file, diagnostics);
  }
  if (binding.authorityClass === 'schema') {
    return deriveSchema(binding, authorities.schemaPublicationManifest, file, diagnostics);
  }
  if (binding.owner.type === 'schemas_worker_publication') {
    return deriveSchema(binding, authorities.schemaPublicationManifest, file, diagnostics);
  }
  if (binding.owner.type === 'schema_companion_route') {
    return deriveSchemaCompanion(binding, authorities.schemaCompanionRoutes, file, diagnostics);
  }
  return deriveSkill(binding, authorities.skillPublicationSelection, file, diagnostics);
}

function createDestinationAuthority(routes) {
  const destinations = new Map(routes.map(({ token, url }) => [token, url]));
  const routeIndex = new Map(routes.map((route) => [route.token, route]));
  const authority = Object.freeze({
    get size() {
      return destinations.size;
    },
    get(token) {
      return destinations.get(token);
    },
    resolveToken(token) {
      return destinations.get(token);
    },
    assertTokenCarrier(token, carrier, source) {
      return assertPublicRouteReferenceCarrier(authority, token, carrier, source);
    },
    has(token) {
      return destinations.has(token);
    },
    entries() {
      return destinations.entries();
    },
    keys() {
      return destinations.keys();
    },
    values() {
      return destinations.values();
    },
    [Symbol.iterator]() {
      return destinations[Symbol.iterator]();
    },
  });
  destinationAuthorities.add(authority);
  destinationAuthorityRoutes.set(authority, routeIndex);
  return authority;
}

export function isPublicRouteReferenceDestinationAuthority(value) {
  return value !== null &&
    typeof value === 'object' &&
    destinationAuthorities.has(value);
}

/**
 * Admit one token only for a carrier declared by its reviewed binding. The
 * private route index keeps carrier policy attached to the branded authority
 * while callers receive the exact URL needed for materialization.
 */
export function assertPublicRouteReferenceCarrier(
  authority,
  token,
  carrier,
  file = 'public-reference carrier',
) {
  const routes = destinationAuthorityRoutes.get(authority);
  const route = routes?.get(token);
  if (route === undefined || !route.allowedCarriers.includes(carrier)) {
    throw new PublicRouteReferenceContractError([
      diagnostic({
        code: 'PUBLIC_ROUTE_CARRIER_MISMATCH',
        file,
        token: typeof token === 'string' ? token : null,
        authorityClass: route?.authorityClass ?? null,
        owner: route?.owner ?? null,
        observed: carrier,
        expected: route?.allowedCarriers ?? [],
        remediation: route === undefined
          ? 'Use a token from the branded public-route authority.'
          : 'Place the token in one of the carriers declared by its reviewed binding.',
      }),
    ]);
  }
  return route.url;
}

function normalizeRequiredKeys(requiredKeys, file, diagnostics) {
  if (requiredKeys === undefined) return null;
  if (!Array.isArray(requiredKeys) && !(requiredKeys instanceof Set)) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_COVERAGE',
      file,
      observed: typeof requiredKeys,
      expected: 'an array or Set of public-route tokens',
      remediation: 'Supply the discovered typed route tokens as an array or Set.',
    }));
    return [];
  }
  const values = [...requiredKeys];
  if (
    values.some((value) => typeof value !== 'string' || !TOKEN_PATTERN.test(value)) ||
    new Set(values).size !== values.length
  ) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_COVERAGE',
      file,
      observed: values,
      expected: 'unique PUBLIC_URL_PAGE/ASSET/IFRAME/SCHEMA/SKILL tokens',
      remediation: 'Pass each discovered typed route token once.',
    }));
  }
  return values.sort(compareUtf8);
}

/**
 * Parse one reviewed route binding and verify each expected URL against the
 * manifest that owns its receiving class. The binding remains a reviewable
 * assertion; owner manifests continue to determine the derived destinations.
 */
export function parsePublicRouteReferenceBinding(
  bindingBytes,
  {
    requiredKeys,
    primaryManifestBytes,
    productionConfigBytes,
    canvasIframeManifestBytes,
    coreIframeManifestBytes,
    schemaPublicationManifestBytes,
    schemaCompanionSelectionBytes,
    skillPublicationSelectionBytes,
    bindingPath = 'deployment/public-references/context-canvas-route-bindings.v1.json',
  } = {},
) {
  const diagnostics = [];
  const decodedBinding = decodeJson(bindingBytes, bindingPath, diagnostics);
  const inputs = {
    primaryManifest: decodeJson(
      primaryManifestBytes,
      'deployment/cpanel/primary-route-manifest.json',
      diagnostics,
    ),
    productionConfig: decodeJson(
      productionConfigBytes,
      'deployment/cpanel/production-projection.config.json',
      diagnostics,
    ),
    canvasIframeManifest: decodeJson(
      canvasIframeManifestBytes,
      'iframe-route-families/canvas/public-iframe-route-manifest-v1.json',
      diagnostics,
    ),
    coreIframeManifest: decodeJson(
      coreIframeManifestBytes,
      'core-architectures-chimeric-prototype-current-pack-v0.1/public-iframe-route-manifest-v1.json',
      diagnostics,
    ),
    schemaPublicationManifest: decodeJson(
      schemaPublicationManifestBytes,
      'cloudflare/schemas-worker/public/publication-manifest.json',
      diagnostics,
    ),
    schemaCompanionSelection: decodeJson(
      schemaCompanionSelectionBytes,
      'deployment/public-references/schema-companion-selection.v1.json',
      diagnostics,
    ),
    skillPublicationSelection: decodeJson(
      skillPublicationSelectionBytes,
      '.agents/skills/publication-selection.json',
      diagnostics,
    ),
  };
  const schemaCompanionRoutes = validateSchemaCompanionSelection(
    inputs.schemaCompanionSelection,
    'deployment/public-references/schema-companion-selection.v1.json',
    diagnostics,
  );
  const document = decodedBinding.document;
  if (
    !exactKeys(document, TOP_LEVEL_KEYS) ||
    document?.$schema !== PUBLIC_ROUTE_REFERENCE_SCHEMA ||
    document?.id !== PUBLIC_ROUTE_REFERENCE_CONTRACT_ID ||
    document?.version !== PUBLIC_ROUTE_REFERENCE_CONTRACT_VERSION ||
    !exactKeys(document?.public_roots, PUBLIC_ROOT_KEYS) ||
    document?.public_roots?.primary !== 'https://vik.guru/' ||
    document?.public_roots?.iframe !== 'https://iframes.vik.guru/' ||
    document?.public_roots?.schema !== 'https://schemas.vik.guru/' ||
    !Array.isArray(document?.bindings) ||
    document.bindings.length === 0
  ) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_SHAPE',
      file: bindingPath,
      observed: document,
      expected: `${PUBLIC_ROUTE_REFERENCE_CONTRACT_ID} version ${PUBLIC_ROUTE_REFERENCE_CONTRACT_VERSION}`,
      remediation: 'Use the reviewed route-binding schema and three accepted public roots.',
    }));
  }
  const admitted = Array.isArray(document?.bindings)
    ? document.bindings
        .map((binding, index) => validateBinding(binding, index, bindingPath, diagnostics))
        .filter(Boolean)
    : [];
  const tokens = admitted.map((binding) => binding.token);
  const sortedTokens = [...tokens].sort(compareUtf8);
  if (tokens.some((token, index) => token !== sortedTokens[index])) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_ORDER',
      file: bindingPath,
      observed: tokens,
      expected: sortedTokens,
      remediation: 'Order bindings by ascending UTF-8 token.',
    }));
  }
  const repeated = sortedTokens.filter((token, index) => token === sortedTokens[index - 1]);
  if (repeated.length > 0) {
    diagnostics.push(diagnostic({
      code: 'PUBLIC_ROUTE_BINDING_DUPLICATE_TOKEN',
      file: bindingPath,
      observed: [...new Set(repeated)],
      expected: 'one binding per token',
      remediation: 'Select one owner and relationship role for each token.',
    }));
  }
  const required = normalizeRequiredKeys(requiredKeys, bindingPath, diagnostics);
  if (required !== null) {
    const admittedSet = new Set(sortedTokens);
    const requiredSet = new Set(required);
    const missing = required.filter((token) => !admittedSet.has(token));
    const unexpected = sortedTokens.filter((token) => !requiredSet.has(token));
    if (missing.length > 0 || unexpected.length > 0) {
      diagnostics.push(diagnostic({
        code: 'PUBLIC_ROUTE_BINDING_COVERAGE',
        file: bindingPath,
        observed: { missing, unexpected },
        expected: 'exact discovered-token coverage',
        remediation: 'Reconcile authored tokens and the tracked binding in the same change.',
      }));
    }
  }
  const authorities = {
    primaryManifest: inputs.primaryManifest.document,
    productionConfig: inputs.productionConfig.document,
    iframeManifests: {
      canvas: inputs.canvasIframeManifest.document,
      core: inputs.coreIframeManifest.document,
    },
    schemaPublicationManifest: inputs.schemaPublicationManifest.document,
    schemaCompanionRoutes,
    skillPublicationSelection: inputs.skillPublicationSelection.document,
  };
  const routes = [];
  for (const binding of admitted) {
    const derived = deriveUrl(binding, authorities, bindingPath, diagnostics);
    const origin = binding.authorityClass === 'page' || binding.authorityClass === 'asset'
      ? 'https://vik.guru'
      : binding.authorityClass === 'iframe'
        ? 'https://iframes.vik.guru'
        : 'https://schemas.vik.guru';
    const normalizedExpected = normalizedHttpsUrl(binding.expectedUrl, origin);
    if (normalizedExpected === null || derived !== binding.expectedUrl) {
      diagnostics.push(diagnostic({
        code: 'PUBLIC_ROUTE_EXPECTED_URL_MISMATCH',
        file: bindingPath,
        token: binding.token,
        authorityClass: binding.authorityClass,
        owner: binding.owner,
        observed: binding.expectedUrl,
        expected: derived,
        remediation: 'Review the owner manifest and update the binding assertion with its exact derived route.',
      }));
      continue;
    }
    routes.push(Object.freeze({
      token: binding.token,
      authorityClass: binding.authorityClass,
      role: binding.role,
      owner: binding.owner,
      fragment: binding.fragment,
      url: derived,
      allowedCarriers: binding.allowedCarriers,
    }));
  }
  if (diagnostics.length > 0) {
    throw new PublicRouteReferenceContractError(diagnostics);
  }
  const destinations = createDestinationAuthority(routes);
  const sourceDigests = Object.freeze({
    binding: sha256(decodedBinding.buffer),
    primary_manifest: sha256(inputs.primaryManifest.buffer),
    production_config: sha256(inputs.productionConfig.buffer),
    canvas_iframe_manifest: sha256(inputs.canvasIframeManifest.buffer),
    core_iframe_manifest: sha256(inputs.coreIframeManifest.buffer),
    schema_publication_manifest: sha256(inputs.schemaPublicationManifest.buffer),
    schema_companion_selection: sha256(inputs.schemaCompanionSelection.buffer),
    skill_publication_selection: sha256(inputs.skillPublicationSelection.buffer),
  });
  const receipt = Object.freeze({
    id: PUBLIC_ROUTE_REFERENCE_CONTRACT_ID,
    version: PUBLIC_ROUTE_REFERENCE_CONTRACT_VERSION,
    bindingCount: routes.length,
    authorityCounts: Object.freeze(Object.fromEntries(
      [...AUTHORITY_CLASSES]
        .map((authorityClass) => [
          authorityClass,
          routes.filter((route) => route.authorityClass === authorityClass).length,
        ]),
    )),
    sourceDigests,
  });
  return Object.freeze({
    destinations,
    routes: Object.freeze(routes),
    receipt,
  });
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

export async function loadPublicRouteReferenceBinding({
  path = DEFAULT_PUBLIC_ROUTE_REFERENCE_BINDING_PATH,
  authorityPaths = DEFAULT_PUBLIC_ROUTE_REFERENCE_AUTHORITY_PATHS,
  requiredKeys,
} = {}) {
  const [
    bindingBytes,
    primaryManifestBytes,
    productionConfigBytes,
    canvasIframeManifestBytes,
    coreIframeManifestBytes,
    schemaPublicationManifestBytes,
    schemaCompanionSelectionBytes,
    skillPublicationSelectionBytes,
  ] = await Promise.all([
    readBoundedFile(path, 'Public route binding'),
    readBoundedFile(authorityPaths.primaryManifest, 'Primary route manifest'),
    readBoundedFile(authorityPaths.productionConfig, 'Production projection configuration'),
    readBoundedFile(authorityPaths.canvasIframeManifest, 'Canvas iframe route manifest'),
    readBoundedFile(authorityPaths.coreIframeManifest, 'Core iframe route manifest'),
    readBoundedFile(authorityPaths.schemaPublicationManifest, 'Schemas Worker publication manifest'),
    readBoundedFile(authorityPaths.schemaCompanionSelection, 'Schema companion selection'),
    readBoundedFile(authorityPaths.skillPublicationSelection, 'Skill publication selection'),
  ]);
  return parsePublicRouteReferenceBinding(bindingBytes, {
    requiredKeys,
    bindingPath: path,
    primaryManifestBytes,
    productionConfigBytes,
    canvasIframeManifestBytes,
    coreIframeManifestBytes,
    schemaPublicationManifestBytes,
    schemaCompanionSelectionBytes,
    skillPublicationSelectionBytes,
  });
}
