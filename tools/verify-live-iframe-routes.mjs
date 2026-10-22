import './node-runtime-admission.mjs';
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIMEType } from "node:util";

import { createAggregatePackagePlan } from "./package-v1-iframe-routes.mjs";

const toolPath = fileURLToPath(import.meta.url);
const productionBaseUrl = "https://iframes.vik.guru/v1/";
const strategySchemaPath =
  "core/strategy-canvas/strategy-canvas-system-v0.2/strategy-canvas.schema.json";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function mediaType(value) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
}

function hasUnambiguousUtf8Charset(value) {
  if (!value) return false;
  try {
    const parsed = new MIMEType(value);
    return parsed.params.get("charset")?.trim().toLowerCase() === "utf-8";
  } catch {
    return false;
  }
}

export function expectedMediaTypeForPath(relativePath) {
  if (relativePath === strategySchemaPath) return "application/schema+json";
  if (relativePath.endsWith(".html")) return "text/html";
  if (relativePath.endsWith(".svg")) return "image/svg+xml";
  if (relativePath.endsWith(".json")) return "application/json";
  throw new Error(`No live iframe media-type contract for ${relativePath}.`);
}

export function hasExactFrameAncestors(csp, origins) {
  if (!csp) return false;
  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => /^frame-ancestors(?:\s|$)/i.test(part));
  if (!directive) return false;
  const sources = directive.split(/\s+/).slice(1);
  return sources.length === origins.length && sources.every((source, index) => source === origins[index]);
}

function requiresRevalidation(cacheControl) {
  if (!cacheControl) return false;
  const directives = new Set(
    cacheControl
      .toLowerCase()
      .split(",")
      .map((part) => part.trim()),
  );
  return (
    directives.has("no-cache") ||
    (directives.has("max-age=0") && directives.has("must-revalidate"))
  );
}

function policyObservation(relativePath, headers) {
  const html = relativePath.endsWith(".html");
  const contentType = headers.get("content-type");
  return {
    html,
    htmlCharsetUtf8: !html || hasUnambiguousUtf8Charset(contentType),
    nosniff: headers.get("x-content-type-options")?.trim().toLowerCase() === "nosniff",
    noReferrer: headers.get("referrer-policy")?.trim().toLowerCase() === "no-referrer",
    approvedFrameAncestor:
      !html ||
      hasExactFrameAncestors(headers.get("content-security-policy"), ["https://vik.guru"]),
    xFrameOptionsAbsent: !html || headers.get("x-frame-options") === null,
    revalidates: requiresRevalidation(headers.get("cache-control")),
    corsAbsent: headers.get("access-control-allow-origin") === null,
  };
}

function summarizePolicy(files) {
  const fields = [
    "htmlCharsetUtf8",
    "nosniff",
    "noReferrer",
    "approvedFrameAncestor",
    "xFrameOptionsAbsent",
    "revalidates",
    "corsAbsent",
  ];
  const summary = {};
  for (const field of fields) {
    const applicable = files.filter((file) =>
      ["htmlCharsetUtf8", "approvedFrameAncestor", "xFrameOptionsAbsent"].includes(field)
        ? file.policy.html
        : true,
    );
    summary[field] = {
      passed: applicable.filter((file) => file.policy[field]).length,
      total: applicable.length,
    };
  }
  return summary;
}

function policySummaryPass(summary) {
  return Object.values(summary).every(({ passed, total }) => passed === total);
}

function boundedConcurrency(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 8) {
    throw new Error("Live iframe verification concurrency must be an integer from 1 through 8.");
  }
  return value;
}

function assertPackageEntry(relativePath, bytes) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    relativePath.startsWith("/") ||
    !/^[A-Za-z0-9._/-]+$/.test(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.includes("?") ||
    relativePath.includes("#") ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.split("/").some((component) => component === "..")
  ) {
    throw new Error(`Live iframe package path must stay relative and normalized: ${relativePath}.`);
  }
  if (!Buffer.isBuffer(bytes)) {
    throw new Error(`Live iframe package entry must contain Buffer bytes: ${relativePath}.`);
  }
}

function publicRequestPath(relativePath) {
  return relativePath.endsWith("/index.html")
    ? relativePath.slice(0, -"index.html".length)
    : relativePath;
}

function publicRequestUrl(relativePath, baseUrl) {
  const requestUrl = new URL(publicRequestPath(relativePath), baseUrl);
  const receiver = new URL(baseUrl);
  if (
    requestUrl.origin !== receiver.origin ||
    requestUrl.username !== "" ||
    requestUrl.password !== "" ||
    !requestUrl.pathname.startsWith(receiver.pathname) ||
    requestUrl.search !== "" ||
    requestUrl.hash !== ""
  ) {
    throw new Error(`Live iframe package path escaped ${baseUrl}: ${relativePath}.`);
  }
  return requestUrl;
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The status and headers remain sufficient when an unused body cannot be cancelled.
  }
}

async function readBoundedBody(response, expectedLength) {
  if (response.status !== 200) {
    await cancelBody(response);
    return { bytes: null, tooLarge: false, skipped: true };
  }

  const declaredLength = response.headers.get("content-length");
  if (/^\d+$/.test(declaredLength ?? "") && Number(declaredLength) > expectedLength) {
    await cancelBody(response);
    return { bytes: null, tooLarge: true, skipped: false };
  }

  if (!response.body) {
    return { bytes: Buffer.alloc(0), tooLarge: false, skipped: false };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      length += chunk.byteLength;
      if (length > expectedLength) {
        await reader.cancel();
        return { bytes: null, tooLarge: true, skipped: false };
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }
  return { bytes: Buffer.concat(chunks, length), tooLarge: false, skipped: false };
}

export async function verifyLiveIframeRoutes({
  plan,
  fetchImplementation = globalThis.fetch,
  baseUrl = productionBaseUrl,
  concurrency = 6,
  requirePolicy = false,
  timeoutMs = 15_000,
} = {}) {
  if (!plan || !(plan.outputFiles instanceof Map) || plan.outputFiles.size < 1) {
    throw new Error("Live iframe verification requires a non-empty aggregate package plan.");
  }
  if (typeof fetchImplementation !== "function") {
    throw new Error("Live iframe verification requires a fetch implementation.");
  }
  if (baseUrl !== productionBaseUrl) {
    throw new Error(`Live iframe verification is fixed to ${productionBaseUrl}.`);
  }
  boundedConcurrency(concurrency);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("Live iframe verification timeout must be a positive integer.");
  }

  const entries = [...plan.outputFiles.entries()];
  for (const entry of entries) assertPackageEntry(...entry);
  entries.sort(([left], [right]) => left.localeCompare(right));
  const files = new Array(entries.length);
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor;
      cursor += 1;
      const [relativePath, expectedBytes] = entries[index];
      const requestPath = publicRequestPath(relativePath);
      const requestUrl = publicRequestUrl(relativePath, baseUrl);
      const expectedMediaType = expectedMediaTypeForPath(relativePath);
      const expectedSha256 = sha256(expectedBytes);
      let response;
      try {
        response = await fetchImplementation(requestUrl, {
          headers: {
            "accept-encoding": "identity",
            "user-agent": "human-ai-systems-exemplars-live-verifier/1",
          },
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        files[index] = {
          path: relativePath,
          requestPath,
          status: null,
          expectedBytes: expectedBytes.byteLength,
          observedBytes: null,
          expectedSha256,
          observedSha256: null,
          expectedMediaType,
          observedMediaType: null,
          exactBytes: false,
          bodyTooLarge: false,
          mediaTypeMatches: false,
          requestError: true,
          policy: {
            html: relativePath.endsWith(".html"),
            htmlCharsetUtf8: false,
            nosniff: false,
            noReferrer: false,
            approvedFrameAncestor: false,
            xFrameOptionsAbsent: false,
            revalidates: false,
            corsAbsent: false,
          },
        };
        continue;
      }

      let body;
      try {
        body = await readBoundedBody(response, expectedBytes.byteLength);
      } catch {
        files[index] = {
          path: relativePath,
          requestPath,
          status: response.status,
          expectedBytes: expectedBytes.byteLength,
          observedBytes: null,
          expectedSha256,
          observedSha256: null,
          expectedMediaType,
          observedMediaType: mediaType(response.headers.get("content-type")),
          exactBytes: false,
          bodyTooLarge: false,
          mediaTypeMatches: false,
          requestError: true,
          policy: policyObservation(relativePath, response.headers),
        };
        continue;
      }
      const observedBytes = body.bytes;
      const observedMediaType = mediaType(response.headers.get("content-type"));
      files[index] = {
        path: relativePath,
        requestPath,
        status: response.status,
        expectedBytes: expectedBytes.byteLength,
        observedBytes: observedBytes?.byteLength ?? null,
        expectedSha256,
        observedSha256: observedBytes ? sha256(observedBytes) : null,
        expectedMediaType,
        observedMediaType,
        exactBytes: observedBytes ? expectedBytes.equals(observedBytes) : false,
        bodyTooLarge: body.tooLarge,
        mediaTypeMatches: observedMediaType === expectedMediaType,
        requestError: false,
        policy: policyObservation(relativePath, response.headers),
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));

  const statusPass = files.filter((file) => file.status === 200).length;
  const exactBytes = files.filter((file) => file.status === 200 && file.exactBytes).length;
  const mediaTypes = files.filter((file) => file.status === 200 && file.mediaTypeMatches).length;
  const requestErrors = files.filter((file) => file.requestError).length;
  const policy = summarizePolicy(files);
  const deliveryPass =
    requestErrors === 0 &&
    statusPass === files.length &&
    exactBytes === files.length &&
    mediaTypes === files.length;
  const policyPass = policySummaryPass(policy);
  const disposition = !deliveryPass ? "blocker" : policyPass ? "pass" : "friction";

  return {
    baseUrl,
    disposition,
    requirePolicy,
    ok: deliveryPass && (!requirePolicy || policyPass),
    deliveryPass,
    policyPass,
    counts: {
      declared: files.length,
      status200: statusPass,
      exactBytes,
      mediaTypes,
      requestErrors,
    },
    policy,
    mismatches: files.filter(
      (file) => file.requestError || file.status !== 200 || !file.exactBytes || !file.mediaTypeMatches,
    ),
  };
}

function ratio({ passed, total }) {
  return `${passed}/${total}`;
}

export function formatLiveIframeSummary(result) {
  const lines = [
    `Live iframe route verification: ${result.disposition.toUpperCase()}`,
    `Delivery: ${result.counts.exactBytes}/${result.counts.declared} exact bytes; ` +
      `${result.counts.status200}/${result.counts.declared} HTTP 200; ` +
      `${result.counts.mediaTypes}/${result.counts.declared} media types`,
    `Policy: charset ${ratio(result.policy.htmlCharsetUtf8)}; ` +
      `nosniff ${ratio(result.policy.nosniff)}; ` +
      `referrer ${ratio(result.policy.noReferrer)}; ` +
      `frame ancestry ${ratio(result.policy.approvedFrameAncestor)}; ` +
      `XFO absent ${ratio(result.policy.xFrameOptionsAbsent)}; ` +
      `revalidation ${ratio(result.policy.revalidates)}; ` +
      `CORS absent ${ratio(result.policy.corsAbsent)}`,
  ];
  for (const mismatch of result.mismatches) {
    const observations = [];
    if (mismatch.requestError) observations.push("request failed");
    else if (mismatch.status !== 200) observations.push(`HTTP ${mismatch.status}`);
    if (!mismatch.exactBytes) {
      observations.push(
        `bytes ${mismatch.bodyTooLarge ? `>${mismatch.expectedBytes}` : (mismatch.observedBytes ?? "unavailable")}` +
        `/${mismatch.expectedBytes}; ` +
        `SHA-256 ${mismatch.observedSha256 ?? "unavailable"}/${mismatch.expectedSha256}`,
      );
    }
    if (!mismatch.mediaTypeMatches) {
      observations.push(
        `media ${mismatch.observedMediaType ?? "unavailable"}/${mismatch.expectedMediaType}`,
      );
    }
    lines.push(`- ${mismatch.path}: ${observations.join("; ")}`);
  }
  return `${lines.join("\n")}\n`;
}

function parseArguments(argv) {
  const options = { json: false, requirePolicy: false };
  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (argument === "--require-policy") options.requirePolicy = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown live iframe verification argument: ${argument}.`);
  }
  return options;
}

function usage() {
  return [
    "Usage: node tools/verify-live-iframe-routes.mjs [--json] [--require-policy]",
    "",
    "Compares the in-memory aggregate package with https://iframes.vik.guru/v1/.",
    "Delivery mismatches fail by default. --require-policy also fails on the #102 header contract.",
    "",
  ].join("\n");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  const plan = await createAggregatePackagePlan();
  const result = await verifyLiveIframeRoutes({
    plan,
    requirePolicy: options.requirePolicy,
  });
  process.stdout.write(
    options.json ? `${JSON.stringify(result, null, 2)}\n` : formatLiveIframeSummary(result),
  );
  if (!result.ok) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === toolPath) {
  main().catch((error) => {
    process.stderr.write(`Live iframe route verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
