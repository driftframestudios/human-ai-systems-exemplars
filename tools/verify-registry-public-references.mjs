import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';

import {
  DEFAULT_REGISTRY_REFERENCE_BINDING_PATH,
  RegistryReferenceContractError,
  loadRegistryReferenceBinding,
} from "./registry-reference-contract.mjs";

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAXIMUM_RESPONSE_BYTES = 5 * 1024 * 1024;
const TITLE_SEPARATORS = Object.freeze([" · ", " | ", " — "]);
const SITE_TITLE_SUFFIXES = Object.freeze([
  "registry",
  "kindlight",
  "kindlight systems",
  "enterprise human-ai practitioner registry",
]);
const ownedRouteErrors = new WeakSet();

export class RegistryRouteVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RegistryRouteVerificationError";
    this.code = code;
  }
}

export class RegistryRouteAggregateVerificationError extends RegistryRouteVerificationError {
  constructor(failures, result) {
    const shown = failures
      .slice(0, 8)
      .map(({ url, code }) => `${url} [${code}]`)
      .join(", ");
    const remainder = failures.length > 8
      ? `; ${failures.length - 8} additional route failures are available in error.failures`
      : "";
    super(
      "route_failures",
      `${failures.length} Registry route verification ${failures.length === 1 ? "failure" : "failures"}: ${shown}${remainder}.`,
    );
    this.name = "RegistryRouteAggregateVerificationError";
    this.failures = failures;
    this.result = result;
    Object.freeze(this);
  }
}

function fail(code, message) {
  const error = new RegistryRouteVerificationError(code, message);
  ownedRouteErrors.add(error);
  throw error;
}

function positiveInteger(value, label, maximum) {
  const selected = Number(value);
  if (!Number.isSafeInteger(selected) || selected < 1 || selected > maximum) {
    fail("argument", `${label} uses an integer from 1 through ${maximum}.`);
  }
  return selected;
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function decodeCharacterReferences(value) {
  const decodeCodePoint = (source, digits, radix) => {
    const codePoint = Number.parseInt(digits, radix);
    if (
      !Number.isSafeInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return source;
    }
    return String.fromCodePoint(codePoint);
  };
  return value
    .replace(/&#(\d+);/g, (source, digits) =>
      decodeCodePoint(source, digits, 10),
    )
    .replace(/&#x([a-f0-9]+);/gi, (source, digits) =>
      decodeCodePoint(source, digits, 16),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function displayTitle(value) {
  return decodeCharacterReferences(value)
    .replace(/<[^>]*>/g, " ")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value) {
  return displayTitle(value).toLocaleLowerCase("en-US");
}

function titleMatchesSiteGrammar(observedTitle, expectedTitle) {
  const observed = normalizeTitle(observedTitle);
  const expected = normalizeTitle(expectedTitle);
  if (observed === expected) return true;
  return SITE_TITLE_SUFFIXES.some((suffix) =>
    TITLE_SEPARATORS.some((separator) =>
      observed === `${expected}${separator}${suffix}`,
    ),
  );
}

async function cancelResponseBody(response) {
  if (response?.body === null || response?.body === undefined) return;
  try {
    await response.body.cancel();
  } catch {
    // Cancellation is cleanup; the original finite failure remains authoritative.
  }
}

async function failAfterCancellation(response, code, message) {
  await cancelResponseBody(response);
  fail(code, message);
}

async function readBoundedBody(response, maximumBytes = MAXIMUM_RESPONSE_BYTES) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && /^\d+$/.test(declaredLength)) {
    let exceedsMaximum = false;
    try {
      exceedsMaximum = BigInt(declaredLength) > BigInt(maximumBytes);
    } catch {
      exceedsMaximum = true;
    }
    if (exceedsMaximum) {
      await cancelResponseBody(response);
      fail("response_size", `Response declares more than ${maximumBytes} bytes.`);
    }
  }

  if (response.body === null) return "";
  const reader = response.body.getReader();
  const bytes = Buffer.allocUnsafe(maximumBytes);
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await reader.cancel().catch(() => {});
        fail("response_body", "Response body uses byte chunks.");
      }
      if (value.byteLength > maximumBytes - received) {
        await reader.cancel().catch(() => {});
        fail("response_size", `Response exceeds ${maximumBytes} bytes.`);
      }
      Buffer.from(value.buffer, value.byteOffset, value.byteLength).copy(bytes, received);
      received += value.byteLength;
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(
    bytes.subarray(0, received),
  );
}

function selectedRows(routes) {
  const byUrl = new Map();
  for (const route of routes) {
    const current = byUrl.get(route.url) ?? {
      url: route.url,
      expectedTitles: new Set(),
      tokens: [],
    };
    current.expectedTitles.add(route.publicTitle);
    current.tokens.push(route.token);
    byUrl.set(route.url, current);
  }
  return [...byUrl.values()]
    .map((row) => Object.freeze({
      url: row.url,
      expectedTitles: Object.freeze([...row.expectedTitles].sort(compareUtf8)),
      tokens: Object.freeze(row.tokens.sort(compareUtf8)),
    }))
    .sort((left, right) => compareUtf8(left.url, right.url));
}

function requestFailureCode(error) {
  const name = typeof error?.name === "string" ? error.name.toLowerCase() : "";
  return name === "aborterror" || name === "timeouterror"
    ? "request_timeout"
    : "request_transport";
}

async function verifyOne(row, { fetchImpl, timeoutMs, maximumResponseBytes }) {
  let response;
  try {
    response = await fetchImpl(row.url, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        "user-agent": "registry-public-reference-verifier/1",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const code = requestFailureCode(error);
    fail(code, `${row.url} request failed (${code === "request_timeout" ? "timeout" : "transport"}).`);
  }

  if (response.status >= 300 && response.status < 400) {
    await failAfterCancellation(
      response,
      "redirect",
      `${row.url} returned HTTP ${response.status}; the route must resolve directly.`,
    );
  }
  if (response.status !== 200) {
    await failAfterCancellation(
      response,
      "status",
      `${row.url} returned HTTP ${response.status}.`,
    );
  }
  if (response.url !== row.url) {
    await failAfterCancellation(
      response,
      "redirect",
      `${row.url} returned a different final route.`,
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^text\/html(?:\s*;|$)/i.test(contentType)) {
    await failAfterCancellation(
      response,
      "content_type",
      `${row.url} returned a non-HTML content type.`,
    );
  }

  let body;
  try {
    body = await readBoundedBody(response, maximumResponseBytes);
  } catch (error) {
    if (ownedRouteErrors.has(error)) throw error;
    await cancelResponseBody(response);
    fail("response_body", `${row.url} returned an unreadable UTF-8 body.`);
  }
  const titleMatch = body.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title\s*>/i);
  if (titleMatch === null) {
    fail("identity", `${row.url} returned HTML without a document title.`);
  }
  const observedTitle = displayTitle(titleMatch[1]);
  if (!row.expectedTitles.some((title) => titleMatchesSiteGrammar(observedTitle, title))) {
    fail(
      "identity",
      `${row.url} returned a document title outside the exact Registry title grammar.`,
    );
  }

  return Object.freeze({
    url: row.url,
    status: response.status,
    contentType: "text/html",
    observedTitle,
    expectedTitles: row.expectedTitles,
    tokens: row.tokens,
  });
}

function finiteRouteFailure(row, error) {
  if (ownedRouteErrors.has(error)) {
    return Object.freeze({
      url: row.url,
      tokens: row.tokens,
      code: error.code,
      message: error.message,
    });
  }
  return Object.freeze({
    url: row.url,
    tokens: row.tokens,
    code: "internal",
    message: `${row.url} verification encountered an unexpected failure.`,
  });
}

async function runPool(rows, concurrency, operation) {
  const outcomes = new Array(rows.length);
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      try {
        outcomes[index] = Object.freeze({
          ok: true,
          route: await operation(rows[index]),
        });
      } catch (error) {
        outcomes[index] = Object.freeze({
          ok: false,
          failure: finiteRouteFailure(rows[index], error),
        });
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
  );
  return outcomes;
}

async function loadValidatedBinding(bindingPath) {
  try {
    return await loadRegistryReferenceBinding({ path: bindingPath });
  } catch (error) {
    if (error instanceof RegistryReferenceContractError) {
      if (error.code === "binding_read") {
        fail("binding_read", "Registry binding input could not be read.");
      }
      fail(
        "binding_contract",
        `Registry binding failed contract validation (${error.code}).`,
      );
    }
    fail("binding_read", "Registry binding input could not be read.");
  }
}

export async function verifyRegistryPublicReferences({
  bindingPath = DEFAULT_REGISTRY_REFERENCE_BINDING_PATH,
  fetchImpl = globalThis.fetch,
  concurrency = DEFAULT_CONCURRENCY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maximumResponseBytes = MAXIMUM_RESPONSE_BYTES,
} = {}) {
  if (typeof fetchImpl !== "function") {
    fail("fetch", "A fetch-compatible function is required.");
  }
  const selectedConcurrency = positiveInteger(concurrency, "concurrency", 16);
  const selectedTimeout = positiveInteger(timeoutMs, "timeoutMs", 120_000);
  const selectedMaximum = positiveInteger(
    maximumResponseBytes,
    "maximumResponseBytes",
    20 * 1024 * 1024,
  );
  const parsed = await loadValidatedBinding(bindingPath);
  const rows = selectedRows(parsed.routes);
  const outcomes = await runPool(rows, selectedConcurrency, (row) =>
    verifyOne(row, {
      fetchImpl,
      timeoutMs: selectedTimeout,
      maximumResponseBytes: selectedMaximum,
    }),
  );
  const routes = Object.freeze(
    outcomes.filter(({ ok }) => ok).map(({ route }) => route),
  );
  const failures = Object.freeze(
    outcomes.filter(({ ok }) => !ok).map(({ failure }) => failure),
  );
  const result = Object.freeze({
    bindingSha256: parsed.receipt.bindingSha256,
    bindingCount: parsed.receipt.bindingCount,
    routeCount: rows.length,
    verifiedRouteCount: routes.length,
    routes,
    failures,
  });
  if (failures.length > 0) {
    throw new RegistryRouteAggregateVerificationError(failures, result);
  }
  return result;
}

function parseArguments(argv) {
  const options = {};
  const supported = new Map([
    ["--binding", "bindingPath"],
    ["--concurrency", "concurrency"],
    ["--timeout-ms", "timeoutMs"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const key = supported.get(argument);
    if (key === undefined) fail("argument", `Unknown argument: ${argument}`);
    if (Object.hasOwn(options, key)) {
      fail("argument", `${argument} may be provided once.`);
    }
    if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
      fail("argument", `${argument} requires a value.`);
    }
    options[key] = argv[index + 1];
    index += 1;
  }
  return options;
}

async function main() {
  const result = await verifyRegistryPublicReferences(parseArguments(process.argv.slice(2)));
  process.stdout.write(
    `${JSON.stringify(
      {
        binding_sha256: result.bindingSha256,
        bindings: result.bindingCount,
        distinct_routes: result.routeCount,
        routes: result.routes,
      },
      null,
      2,
    )}\n`,
  );
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof RegistryRouteAggregateVerificationError) {
      process.stderr.write(`${JSON.stringify({
        name: error.name,
        code: error.code,
        message: error.message,
        binding_sha256: error.result.bindingSha256,
        bindings: error.result.bindingCount,
        distinct_routes: error.result.routeCount,
        verified_routes: error.result.verifiedRouteCount,
        failures: error.failures,
      }, null, 2)}\n`);
    } else if (error instanceof RegistryRouteVerificationError) {
      process.stderr.write(`${error.name}: ${error.message}\n`);
    } else {
      process.stderr.write("RegistryRouteVerificationError: verification encountered an unexpected failure.\n");
    }
    process.exitCode = 1;
  });
}
