import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyExpectedIframeRefusals,
  formatVisualRequestFailure,
} from "../../tools/context-canvas-visual-observation-contract.mjs";

const loopbackOrigin = "http://127.0.0.1:43127";
const approvedOrigin = "https://vik.guru";
const coreUrl = "https://iframes.vik.guru/v1/core/poda/";
const canvasUrl = "https://iframes.vik.guru/v1/canvas/open-lesson-field/";
const consoleRefusal =
  `Framing 'https://iframes.vik.guru/' violates the following Content Security Policy ` +
  `directive: "frame-ancestors https://vik.guru". The request has been blocked.\n`;

function requestFailure(url, overrides = {}) {
  return {
    method: "GET",
    url,
    resourceType: "document",
    navigationRequest: true,
    errorText: "net::ERR_BLOCKED_BY_RESPONSE",
    ...overrides,
  };
}

function classify({
  parentOrigin = loopbackOrigin,
  iframeSources = [coreUrl],
  consoleErrors = [consoleRefusal],
  details = [requestFailure(coreUrl)],
  requestFailures = details.map(formatVisualRequestFailure),
} = {}) {
  return classifyExpectedIframeRefusals({
    parentOrigin,
    iframeSources,
    consoleErrors,
    requestFailures,
    requestFailureDetails: details,
  });
}

test("classifies one exact Chromium refusal pair from the visual runner's loopback parent", () => {
  const result = classify();

  assert.equal(result.expectedRefusals.length, 1);
  assert.equal(result.expectedRefusals[0].url, coreUrl);
  assert.deepEqual(result.remainingConsoleErrors, []);
  assert.deepEqual(result.remainingRequestFailures, []);
  assert.deepEqual(result.policyObservations, []);
});

test("matches multi-iframe refusals by URL multiset rather than DOM and request order", () => {
  const details = [requestFailure(canvasUrl), requestFailure(coreUrl)];
  const requestFailures = details.map(formatVisualRequestFailure);
  const result = classify({
    iframeSources: [coreUrl, canvasUrl],
    consoleErrors: [consoleRefusal, consoleRefusal],
    details,
    requestFailures,
  });

  assert.deepEqual(
    result.expectedRefusals.map(({ url, requestFailure }) => [url, requestFailure]),
    [
      [canvasUrl, requestFailures[0]],
      [coreUrl, requestFailures[1]],
    ],
  );
  assert.deepEqual(result.policyObservations, []);
});

test("keeps a missing or unpaired refusal visible", () => {
  const missing = classify({
    iframeSources: [coreUrl, canvasUrl],
    details: [requestFailure(coreUrl)],
  });
  assert.equal(missing.expectedRefusals.length, 1);
  assert.equal(missing.policyObservations.length, 1);
  assert.match(missing.policyObservations[0], /2 iframe\(s\).*1 confirmed refusal pair/u);

  const unpairedRequest = classify({ consoleErrors: [] });
  assert.deepEqual(unpairedRequest.expectedRefusals, []);
  assert.equal(unpairedRequest.remainingRequestFailures.length, 1);
  assert.equal(unpairedRequest.policyObservations.length, 1);

  const unpairedConsole = classify({ details: [], requestFailures: [] });
  assert.deepEqual(unpairedConsole.expectedRefusals, []);
  assert.equal(unpairedConsole.remainingConsoleErrors.length, 1);
  assert.equal(unpairedConsole.policyObservations.length, 1);
});

test("never suppresses duplicate, wrong-host, malformed-route, or unrelated request failures", () => {
  const wrongHost = requestFailure("https://cdn.vik.guru/v1/core/poda/");
  const duplicate = requestFailure(coreUrl);
  const details = [requestFailure(coreUrl), duplicate, wrongHost];
  const result = classify({
    details,
    requestFailures: details.map(formatVisualRequestFailure),
  });
  assert.equal(result.expectedRefusals.length, 1);
  assert.deepEqual(result.remainingRequestFailures, [
    formatVisualRequestFailure(duplicate),
    formatVisualRequestFailure(wrongHost),
  ]);

  for (const url of [
    "https://iframes.vik.guru/v1/core/poda/?preview=1",
    "https://iframes.vik.guru/v1/other/poda/",
  ]) {
    const invalid = requestFailure(url);
    const invalidResult = classify({
      iframeSources: [url],
      details: [invalid],
      requestFailures: [formatVisualRequestFailure(invalid)],
    });
    assert.deepEqual(invalidResult.expectedRefusals, []);
    assert.deepEqual(invalidResult.remainingRequestFailures, [formatVisualRequestFailure(invalid)]);
    assert.deepEqual(invalidResult.remainingConsoleErrors, [consoleRefusal]);
  }
});

test("does not apply the loopback refusal classification to the approved parent", () => {
  const result = classify({ parentOrigin: approvedOrigin });

  assert.deepEqual(result.expectedRefusals, []);
  assert.equal(result.remainingRequestFailures.length, 1);
  assert.equal(result.remainingConsoleErrors.length, 1);
  assert.deepEqual(result.policyObservations, []);
});

test("requires the Chromium blocked-response cause and aligned structured messages", () => {
  const aborted = requestFailure(coreUrl, { errorText: "net::ERR_ABORTED" });
  const wrongCause = classify({
    details: [aborted],
    requestFailures: [formatVisualRequestFailure(aborted)],
  });
  assert.deepEqual(wrongCause.expectedRefusals, []);
  assert.equal(wrongCause.remainingRequestFailures.length, 1);
  assert.equal(wrongCause.remainingConsoleErrors.length, 1);

  const misaligned = classify({ requestFailures: [] });
  assert.deepEqual(misaligned.expectedRefusals, []);
  assert.equal(misaligned.remainingConsoleErrors.length, 1);
  assert.equal(misaligned.policyObservations.length, 1);
});
