import assert from "node:assert/strict";
import test from "node:test";

import { collectRailRevealFailures } from "../../tools/rail-label-failures.mjs";

function observation(targetVisible, targetText = "Current · Section") {
  return {
    targetVisible,
    targetText,
    targetRect: { width: 120 },
    clippedRatio: 1
  };
}

function sourceReveal() {
  const states = {
    hover: observation(true),
    pointerDeparture: observation(false),
    focus: observation(true),
    pointerDepartureWithFocus: observation(true),
    focusDeparture: observation(false)
  };
  return {
    index: 0,
    railMode: "source",
    targetKind: "readout",
    slug: "Section",
    linkVisible: true,
    states
  };
}

function sourceRailReveal() {
  return {
    count: 1,
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
      railReveal.resting = null;
      railReveal.results = [];
    },
    failure: "Rail label check requested, but no page-section-rail links were found."
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
      reveal.targetKind = "label";
      reveal.states.hover.targetText = "";
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
    'Rail tick "Section" should provide complete interaction observations; required: hover, pointerDeparture, focus, pointerDepartureWithFocus, focusDeparture.'
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
  reveal.targetKind = "label";
  reveal.states.hover.targetText = "Section";
  reveal.states.focus.targetText = "Section";

  assert.deepEqual(collectRailRevealFailures(railReveal), []);
});
