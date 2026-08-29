const SOURCE_RELATIONSHIP_PATTERN = /^(Current|Preview) · /u;
const RAIL_MODES = new Set(["missing", "standard", "source"]);

const RAIL_STATE_EXPECTATIONS = Object.freeze([
  Object.freeze({
    key: "hover",
    visible: true,
    clipping: true,
    sourceRelationship: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail tick "${label}" does not reveal a visible ${targetKind} on hover.`,
    clippingFailure: ({ label, targetKind, visiblePercent }) =>
      `Rail ${targetKind} "${label}" is clipped on hover: ${visiblePercent}% visible.`,
    sourceRelationshipFailure: ({ label }) =>
      `Source rail readout "${label}" does not identify its Current or Preview relationship on hover.`
  }),
  Object.freeze({
    key: "pointerDeparture",
    visible: false,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" remains visible after pointer departure without rail focus.`
  }),
  Object.freeze({
    key: "focus",
    visible: true,
    clipping: true,
    sourceRelationship: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail tick "${label}" does not reveal a visible ${targetKind} on keyboard focus.`,
    clippingFailure: ({ label, targetKind, visiblePercent }) =>
      `Rail ${targetKind} "${label}" is clipped on keyboard focus: ${visiblePercent}% visible.`,
    sourceRelationshipFailure: ({ label }) =>
      `Source rail readout "${label}" does not identify its Current or Preview relationship on keyboard focus.`
  }),
  Object.freeze({
    key: "pointerDepartureWithFocus",
    visible: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" disappears when the pointer leaves while keyboard focus remains.`
  }),
  Object.freeze({
    key: "focusDeparture",
    visible: false,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" remains visible after rail focus departs.`
  })
]);

function incompleteObservationParts(reveal) {
  const incomplete = [];

  if (!RAIL_MODES.has(reveal.railMode)) {
    incomplete.push('railMode ("missing", "standard", or "source")');
  }

  for (const expectation of RAIL_STATE_EXPECTATIONS) {
    const observation = reveal.states?.[expectation.key];
    if (!observation || typeof observation !== "object") {
      incomplete.push(expectation.key);
      continue;
    }
    if (typeof observation.targetVisible !== "boolean") {
      incomplete.push(`${expectation.key}.targetVisible`);
    }
    if (expectation.clipping) {
      const usableRect = observation.targetRect === null || (
        typeof observation.targetRect === "object" &&
        Number.isFinite(observation.targetRect.width)
      );
      if (!("targetRect" in observation) || !usableRect) {
        incomplete.push(`${expectation.key}.targetRect`);
      }
      if (!Number.isFinite(observation.clippedRatio)) {
        incomplete.push(`${expectation.key}.clippedRatio`);
      }
    }
    if (
      expectation.key === "hover" ||
      (reveal.railMode === "source" && expectation.sourceRelationship)
    ) {
      if (typeof observation.targetText !== "string") {
        incomplete.push(`${expectation.key}.targetText`);
      }
    }
  }

  return incomplete;
}

export function collectRailRevealFailures(railReveal) {
  const failures = [];

  if (!railReveal.count) {
    failures.push("Rail label check requested, but no page-section-rail links were found.");
  }
  if (railReveal.resting?.targetVisible) {
    failures.push(`Rail ${railReveal.resting.targetKind} is visible before pointer or keyboard inspection.`);
  }

  for (const reveal of railReveal.results) {
    const label = reveal.slug || `rail link ${reveal.index + 1}`;
    if (reveal.railMode === "missing") {
      failures.push("Rail label check requested, but the page-section-rail was not found.");
      continue;
    }
    if (!reveal.linkVisible) failures.push(`Rail tick "${label}" is not visibly rendered.`);
    if (reveal.states?.hover?.targetText === "") {
      failures.push(`Rail tick "${label}" has no way-finding slug text.`);
    }

    const incomplete = incompleteObservationParts(reveal);
    if (incomplete.length) {
      failures.push(
        `Rail tick "${label}" should provide complete interaction observations; required: ${incomplete.join(", ")}.`
      );
      continue;
    }

    for (const expectation of RAIL_STATE_EXPECTATIONS) {
      const observation = reveal.states[expectation.key];
      if (observation.targetVisible !== expectation.visible) {
        failures.push(expectation.visibilityFailure({ label, targetKind: reveal.targetKind }));
      }
      if (
        expectation.clipping &&
        observation.targetRect &&
        observation.targetRect.width > 0 &&
        observation.clippedRatio < 0.92
      ) {
        failures.push(expectation.clippingFailure({
          label,
          targetKind: reveal.targetKind,
          visiblePercent: (observation.clippedRatio * 100).toFixed(0)
        }));
      }
    }

    if (reveal.railMode === "source") {
      for (const expectation of RAIL_STATE_EXPECTATIONS) {
        if (!expectation.sourceRelationship) continue;
        const observation = reveal.states[expectation.key];
        if (!SOURCE_RELATIONSHIP_PATTERN.test(observation.targetText)) {
          failures.push(expectation.sourceRelationshipFailure({ label }));
        }
      }
    }
  }

  return failures;
}
