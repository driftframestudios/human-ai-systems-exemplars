import assert from "node:assert/strict";
import path from "node:path";

const commitEvents = Object.freeze({
  alignment: "input", context: "input", frv: "input", impact: "input",
  jobs: "blur", recovery: "blur",
});

export function coreCommitEvent(familyId) {
  assert(Object.hasOwn(commitEvents, familyId), "Known Core edit commit event");
  return commitEvents[familyId];
}

export async function commitCoreEdit(frame, family, value) {
  const event = coreCommitEvent(family.id);
  const input = frame.locator(family.edit).first();
  await input.fill(value);
  if (event === "blur") await input.blur();
  // A committed edit may replace the inspector or job card.
  return frame.locator(family.edit).first();
}

function screenshotKey(root, screenshot) {
  if (!screenshot || typeof screenshot.file !== "string" || !path.isAbsolute(screenshot.file)
      || typeof screenshot.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(screenshot.sha256)) return null;
  const key = path.relative(path.resolve(root), screenshot.file);
  if (!key || key === ".." || key.startsWith(".." + path.sep) || path.isAbsolute(key)) return null;
  return key;
}

export function bindScreenshot(record, screenshot, root) {
  const key = screenshotKey(root, screenshot);
  assert(key, "Screenshot has a repository-local path and SHA-256 digest");
  assert(Array.isArray(record.result.screenshots), "Screenshot declarations are explicit");
  assert(!record.result.screenshots.some(item => item.file === screenshot.file), "Screenshot declaration is unique");
  assert(!Object.hasOwn(record.dependencies, key) || record.dependencies[key] === screenshot.sha256,
    "Screenshot binding preserves an existing dependency identity");
  record.dependencies[key] = screenshot.sha256;
  record.result.screenshots.push({ file: screenshot.file, sha256: screenshot.sha256 });
}

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);

export async function validateRecordArtifacts(record, plannedCase, root, snapshot) {
  if (!isRecord(record) || !isRecord(record.result) || !isRecord(plannedCase)
      || !isRecord(plannedCase.family)) return false;
  const { id, family, mode, width, variant } = plannedCase;
  if (typeof id !== "string" || !id || typeof family.id !== "string" || !family.id
      || !["core", "repair", "control"].includes(family.kind)
      || !["screen", "static", "forced", "text200", "print"].includes(mode)
      || !Number.isSafeInteger(width) || width <= 0
      || !["source", "projection", "package", "parent"].includes(variant)) return false;
  const result = record.result;
  const fields = ["id", "family", "kind", "mode", "width", "variant", "standing", "screenshots"];
  if (!fields.every(field => Object.hasOwn(result, field))
      || record.id !== id || result.id !== id || result.family !== family.id
      || result.kind !== family.kind || result.mode !== mode || result.width !== width
      || result.variant !== variant || !["pass", "review"].includes(result.standing)
      || !isRecord(record.dependencies)) return false;
  const requiredInputs = [
    family.source,
    ...(variant === "projection" ? [family.projection] : []),
    ...(variant === "parent" ? [family.parent] : []),
  ];
  if (requiredInputs.some(key => typeof key !== "string" || !key
      || !Object.hasOwn(record.dependencies, key)
      || typeof record.dependencies[key] !== "string"
      || !/^[a-f0-9]{64}$/u.test(record.dependencies[key]))) return false;
  const screenshots = result.screenshots;
  // Required evidence comes from the trusted plan, never from cached metadata.
  const expected = mode === "screen" && width === 390 ? 1 : 0;
  if (!Array.isArray(screenshots) || screenshots.length !== expected) return false;
  const seen = new Set();
  for (const screenshot of screenshots) {
    const key = screenshotKey(root, screenshot);
    if (!key || seen.has(key) || !Object.hasOwn(record.dependencies, key)
        || record.dependencies[key] !== screenshot.sha256) return false;
    seen.add(key);
  }
  // Re-read image bytes as well as source bytes, even after a warm snapshot.
  return snapshot.agrees(record.dependencies, true);
}
