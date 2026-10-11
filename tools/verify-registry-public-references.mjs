import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  DEFAULT_REGISTRY_REFERENCE_BINDING_PATH,
  parseRegistryReferenceBinding,
} from "./registry-reference-contract.mjs";

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAXIMUM_RESPONSE_BYTES = 5 * 1024 * 1024;

export class RegistryRouteVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RegistryRouteVerificationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new RegistryRouteVerificationError(code, message);
}

function positiveInteger(value, label, maximum) {
  const selected = Number(value);
  if (!Number.isSafeInteger(selected) || selected < 1 || selected > maximum) {
    fail("argument", `${label} uses an integer from 1 through ${maximum}.`);
  }
  return selected;
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

function normalizeTitle(value) {
  return decodeCharacterReferences(value)
    .replace(/<[^>]*>/g, " ")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

async function readBoundedBody(response, maximumBytes = MAXIMUM_RESPONSE_BYTES) {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > maximumBytes
  ) {
    fail("response_size", `Response declares more than ${maximumBytes} bytes.`);
  }

  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel();
        fail("response_size", `Response exceeds ${maximumBytes} bytes.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  );
}

function selectedRows(document) {
  const byUrl = new Map();
  for (const binding of document.bindings) {
    const current = byUrl.get(binding.url) ?? {
      url: binding.url,
      expectedTitles: new Set(),
      tokens: [],
    };
    current.expectedTitles.add(binding.expected_public_title);
    current.tokens.push(binding.token);
    byUrl.set(binding.url, current);
  }
  return [...byUrl.values()]
    .map((row) => ({
      ...row,
      expectedTitles: [...row.expectedTitles].sort(),
      tokens: row.tokens.sort(),
    }))
    .sort((left, right) => Buffer.compare(Buffer.from(left.url), Buffer.from(right.url)));
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
    fail("request", `${row.url} request failed: ${error.message}`);
  }

  if (response.status >= 300 && response.status < 400) {
    fail("redirect", `${row.url} returned HTTP ${response.status}; redirects stay outside this verifier.`);
  }
  if (response.status !== 200) {
    fail("status", `${row.url} returned HTTP ${response.status}.`);
  }
  if (response.url !== row.url) {
    fail("redirect", `${row.url} resolved to ${response.url}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^text\/html(?:\s*;|$)/i.test(contentType)) {
    fail("content_type", `${row.url} returned ${contentType || "no content type"}.`);
  }

  let body;
  try {
    body = await readBoundedBody(response, maximumResponseBytes);
  } catch (error) {
    if (error instanceof RegistryRouteVerificationError) throw error;
    fail("response_body", `${row.url} returned an unreadable UTF-8 body.`);
  }
  const titleMatch = body.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title\s*>/i);
  if (titleMatch === null) {
    fail("identity", `${row.url} returned HTML without a document title.`);
  }
  const observedTitle = normalizeTitle(titleMatch[1]);
  const expected = row.expectedTitles.map(normalizeTitle);
  if (!expected.some((title) => observedTitle.includes(title))) {
    fail(
      "identity",
      `${row.url} returned a document title that does not contain ${row.expectedTitles.join(" or ")}.`,
    );
  }

  return Object.freeze({
    url: row.url,
    status: response.status,
    contentType,
    observedTitle: decodeCharacterReferences(titleMatch[1]).replace(/\s+/g, " ").trim(),
    expectedTitles: row.expectedTitles,
    tokens: row.tokens,
  });
}

async function runPool(rows, concurrency, operation) {
  const results = new Array(rows.length);
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await operation(rows[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
  );
  return results;
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
  const bytes = await readFile(bindingPath);
  const parsed = parseRegistryReferenceBinding(bytes);
  const document = JSON.parse(bytes.toString("utf8"));
  const rows = selectedRows(document);
  const routes = await runPool(rows, selectedConcurrency, (row) =>
    verifyOne(row, {
      fetchImpl,
      timeoutMs: selectedTimeout,
      maximumResponseBytes: selectedMaximum,
    }),
  );
  return Object.freeze({
    bindingSha256: parsed.receipt.bindingSha256,
    bindingCount: parsed.receipt.bindingCount,
    routeCount: routes.length,
    routes: Object.freeze(routes),
  });
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.name}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
