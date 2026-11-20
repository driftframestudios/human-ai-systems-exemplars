import './node-runtime-admission.mjs';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const DEFAULT_EXTERNAL_REFERENCE_BINDING_PATH = fileURLToPath(
  new URL('../deployment/public-references/context-canvas-external-bindings.v1.json', import.meta.url),
);
const CONTRACT_ID = 'context-canvas.external-public-reference-bindings.v1';
const TOKEN = /^PUBLIC_URL_EXTERNAL_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const CARRIERS = new Set(['anchor', 'license', 'video_source', 'video_poster']);
// Bound reviewed selectors to the public document or demonstration that owns them.
const publicSelectors = new Map([
  ['kindlight.ai/', ['?scene=plate', '?section=cohort', '?section=profile', '?section=qc', '?section=specimens']],
  ['fhir.epic.com/Specifications', ['?api=10304']],
  ['support.google.com/googleplay/android-developer/answer/12053285', ['?hl=en']],
  ['www.ncei.noaa.gov/access/metadata/landing-page/bin/iso', ['?id=gov.noaa.ncdc%3AC00861']],
  ['fetch.spec.whatwg.org/', ['#http-new-header-syntax']],
  ['html.spec.whatwg.org/multipage/dom.html', ['#embedding-custom-non-visible-data-with-the-data-*-attributes']],
  ['w3c.github.io/webappsec-csp/', ['#directive-frame-ancestors']],
  ['tc39.es/ecma262/', ['#sec-number.max_safe_integer', '#sec-bigint-tostring', '#sec-json.stringify']],
]);
const authorities = new WeakSet();

export class ExternalReferenceContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExternalReferenceContractError';
    this.code = 'PUBLIC_REFERENCE_EXTERNAL_BINDING';
  }
}

function requireShape(value, keys, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) {
    throw new ExternalReferenceContractError(`${label} uses the declared binding fields.`);
  }
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 ||
      value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new ExternalReferenceContractError(`${label} uses bounded single-line text.`);
  }
}

export function parseExternalReferenceBinding(bytes, { requiredKeys } = {}) {
  const source = Buffer.from(bytes);
  if (source.length > 1024 * 1024) {
    throw new ExternalReferenceContractError('The external binding exceeds its source-size boundary.');
  }
  let input;
  try { input = JSON.parse(source.toString('utf8')); } catch {
    throw new ExternalReferenceContractError('The external binding uses readable JSON.');
  }
  requireShape(input, ['$schema', 'id', 'version', 'bindings'], 'External reference');
  if (input.id !== CONTRACT_ID || input.version !== '1' ||
      input.$schema !== './context-canvas-external-bindings.schema.json' || !Array.isArray(input.bindings)) {
    throw new ExternalReferenceContractError('The external binding uses its declared version and schema.');
  }
  const byToken = new Map();
  const selectedUrls = new Set();
  const routes = input.bindings.map((binding) => {
    requireShape(binding, ['token', 'url', 'allowed_carriers', 'selection_basis'], 'External route');
    for (const key of ['token', 'url', 'selection_basis']) requireText(binding[key], key);
    if (!TOKEN.test(binding.token) || byToken.has(binding.token)) {
      throw new ExternalReferenceContractError('Each external route uses one unique semantic token.');
    }
    let url;
    try { url = new URL(binding.url); } catch {
      throw new ExternalReferenceContractError(`${binding.token} needs an absolute HTTPS destination.`);
    }
    const selector = url.href.slice((url.origin + url.pathname).length);
    const acceptedSelectors = publicSelectors.get(url.hostname + url.pathname);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        (selector && !acceptedSelectors?.includes(selector)) || url.href !== binding.url ||
        /(?:^|\.)(?:notion\.so|notion\.site|notion\.com)$/i.test(url.hostname)) {
      throw new ExternalReferenceContractError(`${binding.token} needs a normalized public HTTPS destination with a reviewed selector when present.`);
    }
    if (selectedUrls.has(url.href)) {
      throw new ExternalReferenceContractError('Reuse the existing semantic token for this external destination.');
    }
    selectedUrls.add(url.href);
    if (!Array.isArray(binding.allowed_carriers) || binding.allowed_carriers.length === 0 ||
        new Set(binding.allowed_carriers).size !== binding.allowed_carriers.length ||
        binding.allowed_carriers.some((carrier) => !CARRIERS.has(carrier))) {
      throw new ExternalReferenceContractError(`${binding.token} names its supported carriers.`);
    }
    const route = Object.freeze({ token: binding.token, url: binding.url,
      allowedCarriers: Object.freeze([...binding.allowed_carriers]),
      selectionBasis: binding.selection_basis });
    byToken.set(route.token, route);
    return route;
  });
  if (requiredKeys !== undefined) {
    const required = [...requiredKeys];
    if (required.length !== byToken.size || new Set(required).size !== required.length ||
        required.some((key) => !byToken.has(key))) {
      throw new ExternalReferenceContractError('The external binding covers the authored semantic tokens exactly.');
    }
  }
  const destinations = Object.freeze({
    get size() { return byToken.size; },
    get: (key) => byToken.get(key)?.url,
    has: (key) => byToken.has(key),
    entries: () => routes.map(({ token, url }) => [token, url])[Symbol.iterator](),
    assertTokenCarrier(token, carrier, sourcePath) {
      const route = byToken.get(token);
      if (!route?.allowedCarriers.includes(carrier)) {
        throw new ExternalReferenceContractError(`${token} is not selected for ${carrier} in ${sourcePath}.`);
      }
      return route.url;
    },
  });
  authorities.add(destinations);
  return Object.freeze({ routes: Object.freeze(routes), destinations, receipt: Object.freeze({
    id: CONTRACT_ID, version: '1', bindingSha256: createHash('sha256').update(source).digest('hex'),
    bindingCount: routes.length,
  }) });
}

export function isExternalReferenceDestinationAuthority(value) {
  return value !== null && typeof value === 'object' && authorities.has(value);
}

export async function loadExternalReferenceBinding({
  path = DEFAULT_EXTERNAL_REFERENCE_BINDING_PATH, requiredKeys,
} = {}) {
  return parseExternalReferenceBinding(await readFile(path), { requiredKeys });
}
