import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFormControlLabelRetention,
  assertInvestmentStudioRowLabels,
} from "../../tools/form-control-label-contract.mjs";

function control(overrides = {}) {
  return {
    key: "#control",
    visible: true,
    accessibleText: "Visible label",
    visibleAssociatedLabels: ["Visible label"],
    ...overrides,
  };
}

test("form-control contract protects controls whose widest visible state is responsive", () => {
  assert.throws(
    () => assertFormControlLabelRetention([
      { width: 1280, controls: [control({ visible: false, accessibleText: "" })] },
      { width: 800, controls: [control()] },
      { width: 390, controls: [control({ accessibleText: "" })] },
    ], "fixture"),
    /retains its programmatic label/u,
  );
});

test("form-control contract rejects visible labels that disappear at a narrower width", () => {
  assert.throws(
    () => assertFormControlLabelRetention([
      { width: 1280, controls: [control()] },
      { width: 390, controls: [control({ visibleAssociatedLabels: [] })] },
    ], "fixture"),
    /retains a visible associated label/u,
  );
});

test("investment rows require compact captions in their accessible names", () => {
  const field = (caption) => ({
    caption,
    captionVisible: true,
    accessibleText: caption,
    controlLabelCount: 1,
    labelOwnsControl: true,
  });
  const observed = {
    activityHeaderVisible: false,
    disruptionHeaderVisible: false,
    activities: [{
      fields: ["Use", "Activity", "Tasks", "Effort / task"].map(field),
      orderCaption: "Order",
      orderCaptionVisible: true,
    }],
    disruptions: [{
      fields: ["Use", "Disruption", "Events", "Recovery hrs"].map(field),
      orderCaption: "Order",
      orderCaptionVisible: true,
    }],
  };

  assert.doesNotThrow(() => assertInvestmentStudioRowLabels(observed, 390, "fixture"));
  observed.activities[0].fields[2].accessibleText = "Count for activity";
  assert.throws(
    () => assertInvestmentStudioRowLabels(observed, 390, "fixture"),
    /includes each visible caption in its accessible name/u,
  );
});
