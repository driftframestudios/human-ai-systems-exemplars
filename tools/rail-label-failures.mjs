import './node-runtime-admission.mjs';
const SOURCE_RELATIONSHIP_PATTERN = /^(Current|Preview) · /u;
const RAIL_MODES = new Set(["missing", "standard", "source"]);
const MINIMUM_VISIBLE_RATIO = 0.99;

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
    key: "pointerBridge",
    visible: true,
    clipping: true,
    sourceRelationship: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" does not remain visible across the pointer bridge.`,
    clippingFailure: ({ label, targetKind, visiblePercent }) =>
      `Rail ${targetKind} "${label}" is clipped across the pointer bridge: ${visiblePercent}% visible.`,
    sourceRelationshipFailure: ({ label }) =>
      `Source rail readout "${label}" does not retain its Current or Preview relationship across the pointer bridge.`
  }),
  Object.freeze({
    key: "readoutHover",
    visible: true,
    clipping: true,
    sourceRelationship: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" does not remain visible when the pointer enters it.`,
    clippingFailure: ({ label, targetKind, visiblePercent }) =>
      `Rail ${targetKind} "${label}" is clipped while hovered: ${visiblePercent}% visible.`,
    sourceRelationshipFailure: ({ label }) =>
      `Source rail readout "${label}" does not retain its Current or Preview relationship while hovered.`
  }),
  Object.freeze({
    key: "escapeDismissal",
    visible: false,
    escapeComposes: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" remains visible after Escape dismissal.`,
    escapeCompositionFailure: ({ label }) =>
      `Rail Escape dismissal for "${label}" does not reach the window without preventing its default.`
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
    requiresLinkFocus: true,
    sourceRelationship: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail tick "${label}" does not reveal a visible ${targetKind} on keyboard focus.`,
    clippingFailure: ({ label, targetKind, visiblePercent }) =>
      `Rail ${targetKind} "${label}" is clipped on keyboard focus: ${visiblePercent}% visible.`,
    sourceRelationshipFailure: ({ label }) =>
      `Source rail readout "${label}" does not identify its Current or Preview relationship on keyboard focus.`
  }),
  Object.freeze({
    key: "focusEscapeDismissal",
    visible: false,
    escapeComposes: true,
    requiresLinkFocus: true,
    visibilityFailure: ({ label, targetKind }) =>
      `Rail ${targetKind} "${label}" remains visible after focused Escape dismissal.`,
    escapeCompositionFailure: ({ label }) =>
      `Focused rail Escape dismissal for "${label}" does not reach the window without preventing its default.`,
    linkFocusFailure: ({ label }) =>
      `Rail tick "${label}" loses keyboard focus when Escape dismisses its readout.`
  }),
  Object.freeze({
    key: "pointerDepartureWithFocus",
    visible: true,
    requiresLinkFocus: true,
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
      if (!Number.isFinite(observation.paintedClippedRatio)) {
        incomplete.push(`${expectation.key}.paintedClippedRatio`);
      }
    }
    if (
      expectation.visible ||
      (reveal.railMode === "source" && expectation.sourceRelationship)
    ) {
      if (typeof observation.targetText !== "string") {
        incomplete.push(`${expectation.key}.targetText`);
      }
    }
    if (expectation.requiresLinkFocus && typeof observation.linkFocused !== "boolean") {
      incomplete.push(`${expectation.key}.linkFocused`);
    }
    if (expectation.escapeComposes) {
      if (typeof observation.escapeReachedWindow !== "boolean") {
        incomplete.push(`${expectation.key}.escapeReachedWindow`);
      }
      if (typeof observation.escapeDefaultPrevented !== "boolean") {
        incomplete.push(`${expectation.key}.escapeDefaultPrevented`);
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
  if (railReveal.count && !railReveal.testedCount) {
    failures.push("Rail label check found links but exercised no interaction targets.");
  }
  if (railReveal.testedCount !== railReveal.results.length) {
    failures.push(
      `Rail label check reports ${railReveal.testedCount} exercised targets but returned ${railReveal.results.length} observations.`
    );
  }
  if (railReveal.coverage === "all" && railReveal.testedCount !== railReveal.count) {
    failures.push(
      `Rail label check requested complete coverage but exercised ${railReveal.testedCount} of ${railReveal.count} links.`
    );
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
    if (!reveal.targetOutsideList) {
      failures.push(`Rail ${reveal.targetKind} "${label}" remains inside the scrollable rail list.`);
    }
    if (!reveal.linkVisible) failures.push(`Rail tick "${label}" is not visibly rendered.`);
    const slugPrefix = label.replace(/…$/u, "").trim();
    if (!slugPrefix || !reveal.expectedAccessibleName?.startsWith(slugPrefix)) {
      failures.push(`Rail tick "${label}" does not preserve its visible slug in the destination label.`);
    }
    if (!reveal.expectedAccessibleName || reveal.accessibleName !== reveal.expectedAccessibleName) {
      failures.push(
        `Rail tick "${label}" accessible name does not match its complete destination label ` +
        `"${reveal.expectedAccessibleName || "missing"}".`
      );
    }
    if (reveal.railMode === "source" && reveal.states?.hover?.targetText === "") {
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
      if (expectation.requiresLinkFocus && !observation.linkFocused) {
        failures.push(
          expectation.linkFocusFailure
            ? expectation.linkFocusFailure({ label })
            : `Rail tick "${label}" does not retain keyboard focus during ${expectation.key}.`
        );
      }
      if (
        expectation.escapeComposes &&
        (!observation.escapeReachedWindow || observation.escapeDefaultPrevented)
      ) {
        failures.push(expectation.escapeCompositionFailure({ label }));
      }
      if (
        expectation.clipping &&
        observation.targetRect &&
        observation.targetRect.width > 0 &&
        observation.clippedRatio < MINIMUM_VISIBLE_RATIO
      ) {
        failures.push(expectation.clippingFailure({
          label,
          targetKind: reveal.targetKind,
          visiblePercent: (observation.clippedRatio * 100).toFixed(0)
        }));
      }
      if (
        expectation.clipping &&
        Number.isFinite(observation.paintedClippedRatio) &&
        observation.paintedClippedRatio < MINIMUM_VISIBLE_RATIO
      ) {
        failures.push(
          `Rail ${reveal.targetKind} "${label}" paint is clipped during ${expectation.key}: ` +
          `${(observation.paintedClippedRatio * 100).toFixed(0)}% visible.`
        );
      }
      if (expectation.visible) {
        const sourceTextIsExact = reveal.railMode === "source" && SOURCE_RELATIONSHIP_PATTERN.test(observation.targetText)
          ? observation.targetText === `Current · ${label}` || observation.targetText === `Preview · ${label}`
          : true;
        const standardTextIsExact = reveal.railMode === "standard"
          ? observation.targetText === label
          : true;
        if (!sourceTextIsExact || !standardTextIsExact) {
          if (reveal.railMode === "standard" && expectation.key === "hover" && observation.targetText === "") {
            failures.push(`Rail tick "${label}" has no way-finding slug text.`);
          } else {
            failures.push(
              `Rail ${reveal.targetKind} "${label}" exposes unexpected text during ${expectation.key}: ` +
              `"${observation.targetText}".`
            );
          }
        }
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
    if (!reveal.states.focus.focusIndicator?.visible) {
      failures.push(`Rail tick "${label}" has no visible outline on keyboard focus.`);
    }
    if (
      Number.isFinite(reveal.states.focus.focusIndicator?.visibleRatio) &&
      reveal.states.focus.focusIndicator.visibleRatio < MINIMUM_VISIBLE_RATIO
    ) {
      failures.push(
        `Rail tick "${label}" focus outline is clipped: ` +
        `${(reveal.states.focus.focusIndicator.visibleRatio * 100).toFixed(0)}% visible.`
      );
    }
  }

  return failures;
}
