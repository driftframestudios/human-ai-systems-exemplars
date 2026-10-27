import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import test from "node:test";

import { collectRailRevealFailures } from "../../tools/rail-label-failures.mjs";

function observation(targetVisible, targetText = "Current · Section") {
  return {
    escapeDefaultPrevented: false,
    escapeReachedWindow: true,
    linkFocused: true,
    targetVisible,
    targetText,
    targetRect: { width: 120 },
    clippedRatio: 1,
    paintedClippedRatio: 1,
    focusIndicator: { visible: true, visibleRatio: 1 }
  };
}

function sourceReveal() {
  const states = {
    hover: observation(true),
    pointerBridge: observation(true),
    readoutHover: observation(true),
    escapeDismissal: observation(false),
    pointerDeparture: observation(false),
    focus: observation(true),
    focusEscapeDismissal: observation(false),
    pointerDepartureWithFocus: observation(true),
    focusDeparture: observation(false)
  };
  return {
    index: 0,
    railMode: "source",
    targetKind: "readout",
    slug: "Section",
    accessibleName: "Section",
    expectedAccessibleName: "Section",
    targetOutsideList: true,
    linkVisible: true,
    states
  };
}

function sourceRailReveal() {
  return {
    count: 1,
    testedCount: 1,
    coverage: "all",
    resting: {
      targetKind: "readout",
      targetVisible: false
    },
    results: [sourceReveal()]
  };
}

const singleFailureScenarios = [
  {
    name: "missing rail links",
    mutate(railReveal) {
      railReveal.count = 0;
      railReveal.testedCount = 0;
      railReveal.resting = null;
      railReveal.results = [];
    },
    failure: "Rail label check requested, but no page-section-rail links were found."
  },
  {
    name: "readout without a durable pointer bridge",
    mutate(railReveal) {
      railReveal.results[0].states.pointerBridge.targetVisible = false;
    },
    failure: 'Rail readout "Section" does not remain visible across the pointer bridge.'
  },
  {
    name: "readout that cannot be hovered",
    mutate(railReveal) {
      railReveal.results[0].states.readoutHover.targetVisible = false;
    },
    failure: 'Rail readout "Section" does not remain visible when the pointer enters it.'
  },
  {
    name: "readout that remains after Escape",
    mutate(railReveal) {
      railReveal.results[0].states.escapeDismissal.targetVisible = true;
    },
    failure: 'Rail readout "Section" remains visible after Escape dismissal.'
  },
  {
    name: "focused readout that remains after Escape",
    mutate(railReveal) {
      railReveal.results[0].states.focusEscapeDismissal.targetVisible = true;
    },
    failure: 'Rail readout "Section" remains visible after focused Escape dismissal.'
  },
  {
    name: "focused Escape that moves link focus",
    mutate(railReveal) {
      railReveal.results[0].states.focusEscapeDismissal.linkFocused = false;
    },
    failure: 'Rail tick "Section" loses keyboard focus when Escape dismisses its readout.'
  },
  {
    name: "Escape dismissal that consumes the key",
    mutate(railReveal) {
      railReveal.results[0].states.escapeDismissal.escapeDefaultPrevented = true;
    },
    failure: 'Rail Escape dismissal for "Section" does not reach the window without preventing its default.'
  },
  {
    name: "visible resting readout",
    mutate(railReveal) {
      railReveal.resting.targetVisible = true;
    },
    failure: "Rail readout is visible before pointer or keyboard inspection."
  },
  {
    name: "missing rail structure",
    mutate(railReveal) {
      const reveal = railReveal.results[0];
      reveal.railMode = "missing";
      reveal.targetKind = null;
      reveal.linkVisible = false;
      reveal.states = null;
    },
    failure: "Rail label check requested, but the page-section-rail was not found."
  },
  {
    name: "invisible rail link",
    mutate(railReveal) {
      railReveal.results[0].linkVisible = false;
    },
    failure: 'Rail tick "Section" is not visibly rendered.'
  },
  {
    name: "missing way-finding text",
    mutate(railReveal) {
      const reveal = railReveal.results[0];
      reveal.railMode = "standard";
      reveal.targetKind = "readout";
      reveal.states.hover.targetText = "";
      reveal.states.pointerBridge.targetText = "Section";
      reveal.states.readoutHover.targetText = "Section";
      reveal.states.focus.targetText = "Section";
      reveal.states.pointerDepartureWithFocus.targetText = "Section";
    },
    failure: 'Rail tick "Section" has no way-finding slug text.'
  },
  {
    name: "invisible hover readout",
    mutate(railReveal) {
      railReveal.results[0].states.hover.targetVisible = false;
    },
    failure: 'Rail tick "Section" does not reveal a visible readout on hover.'
  },
  {
    name: "clipped hover readout",
    mutate(railReveal) {
      railReveal.results[0].states.hover.clippedRatio = 0.5;
    },
    failure: 'Rail readout "Section" is clipped on hover: 50% visible.'
  },
  {
    name: "visible readout after pointer departure",
    mutate(railReveal) {
      railReveal.results[0].states.pointerDeparture.targetVisible = true;
    },
    failure: 'Rail readout "Section" remains visible after pointer departure without rail focus.'
  },
  {
    name: "invisible keyboard-focus readout",
    mutate(railReveal) {
      railReveal.results[0].states.focus.targetVisible = false;
    },
    failure: 'Rail tick "Section" does not reveal a visible readout on keyboard focus.'
  },
  {
    name: "clipped keyboard-focus readout",
    mutate(railReveal) {
      railReveal.results[0].states.focus.clippedRatio = 0.4;
    },
    failure: 'Rail readout "Section" is clipped on keyboard focus: 40% visible.'
  },
  {
    name: "invisible focused readout after pointer departure",
    mutate(railReveal) {
      railReveal.results[0].states.pointerDepartureWithFocus.targetVisible = false;
    },
    failure: 'Rail readout "Section" disappears when the pointer leaves while keyboard focus remains.'
  },
  {
    name: "visible readout after focus departure",
    mutate(railReveal) {
      railReveal.results[0].states.focusDeparture.targetVisible = true;
    },
    failure: 'Rail readout "Section" remains visible after rail focus departs.'
  },
  {
    name: "hover readout without its source relationship",
    mutate(railReveal) {
      railReveal.results[0].states.hover.targetText = "Section";
    },
    failure: 'Source rail readout "Section" does not identify its Current or Preview relationship on hover.'
  },
  {
    name: "focus readout without its source relationship",
    mutate(railReveal) {
      railReveal.results[0].states.focus.targetText = "Section";
    },
    failure: 'Source rail readout "Section" does not identify its Current or Preview relationship on keyboard focus.'
  }
];

for (const scenario of singleFailureScenarios) {
  test(`rail diagnostics detect ${scenario.name}`, () => {
    const railReveal = sourceRailReveal();
    scenario.mutate(railReveal);
    assert.deepEqual(collectRailRevealFailures(railReveal), [scenario.failure]);
  });
}

test("rail diagnostics preserve additive failure order", () => {
  const railReveal = sourceRailReveal();
  const reveal = railReveal.results[0];
  reveal.linkVisible = false;
  reveal.states.hover.targetText = "";
  reveal.states.hover.targetVisible = false;
  reveal.states.hover.clippedRatio = 0.5;
  reveal.states.pointerDeparture.targetVisible = true;
  reveal.states.focus.targetVisible = false;
  reveal.states.focus.clippedRatio = 0.4;
  reveal.states.focus.targetText = "Section";
  reveal.states.pointerDepartureWithFocus.targetVisible = false;
  reveal.states.focusDeparture.targetVisible = true;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" is not visibly rendered.',
    'Rail tick "Section" has no way-finding slug text.',
    'Rail tick "Section" does not reveal a visible readout on hover.',
    'Rail readout "Section" is clipped on hover: 50% visible.',
    'Rail readout "Section" remains visible after pointer departure without rail focus.',
    'Rail tick "Section" does not reveal a visible readout on keyboard focus.',
    'Rail readout "Section" is clipped on keyboard focus: 40% visible.',
    'Rail readout "Section" disappears when the pointer leaves while keyboard focus remains.',
    'Rail readout "Section" remains visible after rail focus departs.',
    'Source rail readout "Section" does not identify its Current or Preview relationship on hover.',
    'Source rail readout "Section" does not identify its Current or Preview relationship on keyboard focus.'
  ]);
});

test("rail diagnostics name an absent interaction state as an incomplete observation", () => {
  const railReveal = sourceRailReveal();
  delete railReveal.results[0].states.focus;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: focus.'
  ]);
});

test("rail diagnostics name an absent required field as an incomplete observation", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states.pointerDeparture.targetVisible = undefined;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: pointerDeparture.targetVisible.'
  ]);
});

test("rail diagnostics require a finite clipping observation", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states.hover.clippedRatio = Number.NaN;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: hover.clippedRatio.'
  ]);
});

test("source rail diagnostics require focus relationship text", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states.focus.targetText = undefined;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: focus.targetText.'
  ]);
});

test("rail diagnostics name an absent state collection as an incomplete observation", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states = null;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: hover, pointerBridge, readoutHover, escapeDismissal, pointerDeparture, focus, focusEscapeDismissal, pointerDepartureWithFocus, focusDeparture.'
  ]);
});

test("rail diagnostics name an unrecognized rail mode as an incomplete observation", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].railMode = undefined;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" should provide complete interaction observations; required: railMode ("missing", "standard", or "source").'
  ]);
});

test("standard rails use the same interaction expectations without source relationship text", () => {
  const railReveal = sourceRailReveal();
  const reveal = railReveal.results[0];
  reveal.railMode = "standard";
  reveal.targetKind = "readout";
  reveal.states.hover.targetText = "Section";
  reveal.states.pointerBridge.targetText = "Section";
  reveal.states.readoutHover.targetText = "Section";
  reveal.states.focus.targetText = "Section";
  reveal.states.pointerDepartureWithFocus.targetText = "Section";

  assert.deepEqual(collectRailRevealFailures(railReveal), []);
});

test("rail diagnostics reject a readout that remains inside the scroll list", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].targetOutsideList = false;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail readout "Section" remains inside the scrollable rail list.'
  ]);
});

test("rail diagnostics reject vacuous sampled coverage", () => {
  const railReveal = sourceRailReveal();
  railReveal.testedCount = 0;
  railReveal.coverage = "sampled";
  railReveal.results = [];

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    "Rail label check found links but exercised no interaction targets."
  ]);
});

test("rail diagnostics reject incomplete full coverage", () => {
  const railReveal = sourceRailReveal();
  railReveal.count = 2;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    "Rail label check requested complete coverage but exercised 1 of 2 links."
  ]);
});

test("rail diagnostics require the visible slug to match the accessible name", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].accessibleName = "Different section";

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" accessible name does not match its complete destination label "Section".'
  ]);
});

test("rail diagnostics reject a truncated accessible name that matches only the slug", () => {
  const railReveal = sourceRailReveal();
  const reveal = railReveal.results[0];
  reveal.slug = "This deliberately truncated section title…";
  reveal.accessibleName = "This deliberately truncated section title…";
  reveal.expectedAccessibleName = "This deliberately truncated section title with a complete ending";
  for (const state of ["hover", "pointerBridge", "readoutHover", "focus", "pointerDepartureWithFocus"]) {
    reveal.states[state].targetText = `Current · ${reveal.slug}`;
  }

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "This deliberately truncated section title…" accessible name does not match its complete destination label "This deliberately truncated section title with a complete ending".'
  ]);
});

test("rail diagnostics require exact ordinary readout text", () => {
  const railReveal = sourceRailReveal();
  const reveal = railReveal.results[0];
  reveal.railMode = "standard";
  reveal.states.hover.targetText = "Section plus stale text";
  reveal.states.pointerBridge.targetText = "Section";
  reveal.states.readoutHover.targetText = "Section";
  reveal.states.focus.targetText = "Section";
  reveal.states.pointerDepartureWithFocus.targetText = "Section";

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail readout "Section" exposes unexpected text during hover: "Section plus stale text".'
  ]);
});

test("rail diagnostics reject blank ordinary focus text", () => {
  const railReveal = sourceRailReveal();
  const reveal = railReveal.results[0];
  reveal.railMode = "standard";
  reveal.states.hover.targetText = "Section";
  reveal.states.pointerBridge.targetText = "Section";
  reveal.states.readoutHover.targetText = "Section";
  reveal.states.focus.targetText = "";
  reveal.states.pointerDepartureWithFocus.targetText = "Section";

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail readout "Section" exposes unexpected text during focus: "".'
  ]);
});

test("rail diagnostics account for readout paint clipping", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states.hover.paintedClippedRatio = 0.98;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail readout "Section" paint is clipped during hover: 98% visible.'
  ]);
});

test("rail diagnostics require a keyboard focus outline", () => {
  const railReveal = sourceRailReveal();
  railReveal.results[0].states.focus.focusIndicator.visible = false;

  assert.deepEqual(collectRailRevealFailures(railReveal), [
    'Rail tick "Section" has no visible outline on keyboard focus.'
  ]);
});
