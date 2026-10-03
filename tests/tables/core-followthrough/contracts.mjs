import assert from "node:assert/strict";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

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

export function printPDFOptions(spec) {
  const margin = spec.marginInches + "in";
  return { format: spec.paper, landscape: spec.orientation === "landscape",
    printBackground: true, preferCSSPageSize: spec.preferCSSPageSize,
    margin: { top: margin, bottom: margin, left: margin, right: margin } };
}

function printPageGeometryMatches(observed, spec) {
  return observed && Number.isSafeInteger(observed.pageCount) && observed.pageCount > 0
    && Array.isArray(observed.pages) && observed.pages.length === observed.pageCount
    && observed.pages.every((page, index) => {
      if (!page || page.number !== index + 1 || !Number.isFinite(page.widthPoints)
          || !Number.isFinite(page.heightPoints) || !Number.isInteger(page.rotation)
          || page.rotation % 90 !== 0) return false;
      const rotated = Math.abs(page.rotation % 180) === 90;
      const width = rotated ? page.heightPoints : page.widthPoints;
      const height = rotated ? page.widthPoints : page.heightPoints;
      return Math.abs(width - spec.pageWidthPoints) <= 0.1
        && Math.abs(height - spec.pageHeightPoints) <= 0.1;
    });
}

export function bindPrintPDF(record, pdf, root) {
  const key = screenshotKey(root, pdf);
  assert(key && key.endsWith(".pdf"), "Print PDF has a repository-local digest-bound path");
  assert(record.result.print, "Print observation precedes its artifact");
  assert(!Object.hasOwn(record.dependencies, key) || record.dependencies[key] === pdf.sha256);
  record.dependencies[key] = pdf.sha256;
  record.result.print.pdf = { file: pdf.file, sha256: pdf.sha256 };
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
    ...(family.inputs ?? []),
    ...(variant === "projection" ? [family.projection] : []),
    ...(variant === "parent" ? [family.parent] : []),
  ];
  if (requiredInputs.some(key => typeof key !== "string" || !key
      || !Object.hasOwn(record.dependencies, key)
      || typeof record.dependencies[key] !== "string"
      || !/^[a-f0-9]{64}$/u.test(record.dependencies[key]))) return false;
  const screenshots = result.screenshots;
  // Required evidence comes from the trusted plan, never from cached metadata.
  const expected = (mode === "screen" && width === 390) || plannedCase.print ? 1 : 0;
  if (!Array.isArray(screenshots) || screenshots.length !== expected) return false;
  const seen = new Set();
  for (const screenshot of screenshots) {
    const key = screenshotKey(root, screenshot);
    if (!key || seen.has(key) || !Object.hasOwn(record.dependencies, key)
        || record.dependencies[key] !== screenshot.sha256) return false;
    seen.add(key);
  }
  if (plannedCase.print) {
    const printed = result.print;
    const spec = plannedCase.print;
    if (!isRecord(printed)
        || !["paper", "orientation", "marginInches", "contentWidth", "contentHeight",
          "pageWidthPoints", "pageHeightPoints", "preferCSSPageSize"].every(field => printed[field] === spec[field])
        || !isRecord(printed.geometry) || printed.geometry.viewport !== spec.contentWidth
        || !isDeepStrictEqual(printed.pdfOptions, printPDFOptions(spec))
        || !printPageGeometryMatches(printed.pageGeometry, spec)) return false;
    const key = screenshotKey(root, printed.pdf);
    if (!key || !key.endsWith(".pdf") || !Object.hasOwn(record.dependencies, key)
        || record.dependencies[key] !== printed.pdf.sha256) return false;
  }
  // Re-read image/PDF bytes as well as source bytes, even after a warm snapshot.
  return snapshot.agrees(record.dependencies, true);
}
