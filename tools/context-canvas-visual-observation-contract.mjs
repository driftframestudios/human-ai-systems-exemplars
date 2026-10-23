import './node-runtime-admission.mjs';
const IFRAME_ORIGIN = "https://iframes.vik.guru";
const APPROVED_PARENT_ORIGIN = "https://vik.guru";
const BLOCKED_BY_RESPONSE = "net::ERR_BLOCKED_BY_RESPONSE";

const expectedConsoleMessage = new RegExp(
  String.raw`^Framing 'https:\/\/iframes\.vik\.guru\/' violates the following Content Security Policy directive: "frame-ancestors https:\/\/vik\.guru"\. The request has been blocked\.\s*$`,
  "u",
);

function parsedUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isVisualRunnerLoopback(value) {
  const url = parsedUrl(value);
  return url?.protocol === "http:" && url.hostname === "127.0.0.1";
}

function iframeUrl(value) {
  const url = parsedUrl(value);
  if (
    url?.origin !== IFRAME_ORIGIN ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !/^\/v1\/(?:core|canvas)\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/$/u.test(url.pathname)
  ) {
    return null;
  }
  return url.href;
}

function passthrough(consoleErrors, requestFailures, policyObservations = []) {
  return {
    expectedRefusals: [],
    remainingConsoleErrors: [...consoleErrors],
    remainingRequestFailures: [...requestFailures],
    policyObservations,
  };
}

export function formatVisualRequestFailure(failure) {
  return `${failure.method} ${failure.url} — ${failure.errorText || "failed"}`;
}

export function classifyExpectedIframeRefusals({
  parentOrigin,
  iframeSources = [],
  consoleErrors = [],
  requestFailures = [],
  requestFailureDetails = [],
} = {}) {
  if (!isVisualRunnerLoopback(parentOrigin)) {
    return passthrough(consoleErrors, requestFailures);
  }

  const expectedUrls = iframeSources.map(iframeUrl).filter(Boolean);
  if (expectedUrls.length === 0) {
    return passthrough(consoleErrors, requestFailures);
  }

  if (requestFailures.length !== requestFailureDetails.length) {
    return passthrough(consoleErrors, requestFailures, [
      `hosted iframe refusal contract incomplete: ${expectedUrls.length} iframe(s), ` +
        `${requestFailureDetails.length} structured request failure(s), and ` +
        `${requestFailures.length} recorded request failure message(s)`,
    ]);
  }

  const availableByUrl = new Map();
  for (const url of expectedUrls) {
    availableByUrl.set(url, (availableByUrl.get(url) ?? 0) + 1);
  }
  const matchingFailures = [];
  for (const [index, failure] of requestFailureDetails.entries()) {
    const url = iframeUrl(failure.url);
    if (
      url &&
      failure.method === "GET" &&
      failure.resourceType === "document" &&
      failure.navigationRequest === true &&
      failure.errorText === BLOCKED_BY_RESPONSE &&
      (availableByUrl.get(url) ?? 0) > 0
    ) {
      matchingFailures.push({ index, url });
      availableByUrl.set(url, availableByUrl.get(url) - 1);
    }
  }

  const matchingConsoleIndexes = [];
  for (const [index, message] of consoleErrors.entries()) {
    if (expectedConsoleMessage.test(message)) matchingConsoleIndexes.push(index);
  }

  const pairCount = Math.min(matchingFailures.length, matchingConsoleIndexes.length);
  const pairedFailures = matchingFailures.slice(0, pairCount);
  const pairedConsoleIndexes = matchingConsoleIndexes.slice(0, pairCount);
  const complete =
    pairCount === expectedUrls.length &&
    matchingFailures.length === expectedUrls.length &&
    matchingConsoleIndexes.length === expectedUrls.length;
  const failureIndexes = new Set(pairedFailures.map(({ index }) => index));
  const consoleIndexes = new Set(pairedConsoleIndexes);
  return {
    expectedRefusals: pairedFailures.map(({ index: failureIndex, url }, index) => ({
      url,
      requestFailure: requestFailures[failureIndex],
      consoleError: consoleErrors[pairedConsoleIndexes[index]],
      policy: `frame-ancestors ${APPROVED_PARENT_ORIGIN}`,
    })),
    remainingConsoleErrors: consoleErrors.filter((_, index) => !consoleIndexes.has(index)),
    remainingRequestFailures: requestFailures.filter((_, index) => !failureIndexes.has(index)),
    policyObservations: complete
      ? []
      : [
          `hosted iframe refusal contract incomplete: ${expectedUrls.length} iframe(s), ` +
            `${matchingFailures.length} matching blocked document request(s), ` +
            `${matchingConsoleIndexes.length} matching frame-ancestors console refusal(s), and ` +
            `${pairCount} confirmed refusal pair(s)`,
        ],
  };
}
