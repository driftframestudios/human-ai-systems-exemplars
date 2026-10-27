import './node-runtime-admission.mjs';
/** Source-owned data and executable dependencies for the two material checks. */
export const corePlanningInputs = Object.freeze([
  "tools/node-runtime-admission.mjs", "tools/check-node-runtime.mjs",
  "tools/core-planning-instrument-contract.mjs", "tools/core-architecture-browser-helper.mjs",
  "tools/attribution-contract.mjs", "attribution.yml", "tools/observation-checkpoint.mjs",
  "tools/evidence-inputs.mjs", "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
  "package-lock.json",
]);

export const conditioningSource = "context-canvas-project-surface/context-canvas/conditioning-field.html";
export const conditioningInputs = Object.freeze([
  "tools/node-runtime-admission.mjs", "tools/check-node-runtime.mjs",
  conditioningSource, "tests/tables/conditioning.browser.mjs", "tools/core-architecture-browser-helper.mjs",
  "tools/attribution-contract.mjs", "attribution.yml", "tools/observation-checkpoint.mjs",
  "tools/evidence-inputs.mjs", "tools/evidence-campaign.mjs",
  "context-canvas-project-surface/context-canvas/visitor-boundary-contract.js",
  "context-canvas-project-surface/context-canvas/canvas-shell.css",
  "context-canvas-project-surface/context-canvas/canvas-shell.js", "package-lock.json",
]);
