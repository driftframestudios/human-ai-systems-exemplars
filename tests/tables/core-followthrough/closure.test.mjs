import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { planCases } from "./cases.mjs";
import { bindScreenshot, bindPrintPDF, printPDFOptions, validateRecordArtifacts } from "./contracts.mjs";
import { traverseRightmost, tableStateCoverage, comparativeCaption, comparativeColumns, comparativeGroups,
  validateComparative, atlasSamples, validateAtlas, axTableSubtree, validateAX, validateHiringAX, printFits, publishPrintPDF, inspectPrintPDF } from "./closure.mjs";
import { digest } from "../../../tools/observation-checkpoint.mjs";
import { inputSnapshot, publishScreenshot, publishCampaign } from "../../../tools/evidence-campaign.mjs";

const helperSource = await fs.readFile(new URL("./closure.mjs", import.meta.url), "utf8");
const browserSource = await fs.readFile(new URL("./browser.mjs", import.meta.url), "utf8");

const renewalIds = ["hiring-source-960-print", "a3-source-304-screen", "a3-source-390-screen"];

test("bounded renewal selects exactly three trusted cases in canonical order", () => {
  const full = planCases({ combined: true });
  assert.deepEqual(planCases({ combined: true, caseIds: [...renewalIds].reverse() }),
    full.filter(item => renewalIds.includes(item.id)));
  assert.equal(planCases({ combined: true, caseId: renewalIds[0] }).length, 1);
  assert.equal(planCases({ combined: true }).length, 93, "legacy full plan stays available");
});
for (const [name, options, message] of [
  ["unknown", { caseIds: [renewalIds[0], "missing"] }, /Unknown case/u],
  ["duplicate", { caseIds: [renewalIds[0], renewalIds[0]] }, /Duplicate/u],
  ["from-case conflict", { caseIds: renewalIds, fromCaseId: renewalIds[0] }, /mutually exclusive/u],
  ["over three", { caseIds: [...renewalIds, "a3-source-1280-screen"] }, /one to three/u],
  ["empty explicit list", { caseIds: [] }, /one to three/u],
  ["singular and plural conflict", { caseId: renewalIds[0], caseIds: renewalIds }, /not both/u],
]) test("bounded renewal rejects " + name, () => {
  assert.throws(() => planCases({ combined: true, ...options }), message);
});

function selectedByCLI(args) {
  const selection = browserSource.slice(browserSource.indexOf("const args ="),
    browserSource.indexOf("const plannedCases ="));
  return vm.runInNewContext(selection + "\ncases", {
    process: { argv: ["node", "browser.mjs", ...args] }, assert, planCases,
  });
}
test("actual CLI consumes repeated --case flags without falling back to a broad plan", () => {
  const cases = selectedByCLI(["--combined", ...renewalIds.flatMap(id => ["--case", id]), "--plan"]);
  assert.deepEqual(cases.map(item => item.id), renewalIds);
  assert.match(browserSource, /if \(args\.includes\("--plan"\)\)/u);
});
for (const [name, args, message] of [
  ["unknown", ["--case", "missing"], /Unknown/u],
  ["duplicate", ["--case", renewalIds[0], "--case", renewalIds[0]], /Duplicate/u],
  ["from-case conflict", ["--case", renewalIds[0], "--from-case", renewalIds[1]], /mutually exclusive/u],
  ["over three", [...renewalIds, "a3-source-1280-screen"].flatMap(id => ["--case", id]), /one to three/u],
  ["missing value", ["--case"], /needs a value/u],
]) test("actual CLI rejects " + name + " before browser setup", () => {
  assert.throws(() => selectedByCLI(["--combined", ...args]), message);
});
test("A3 304 and 390 use the same reach helper without widening other narrow cases", () => {
  const condition = browserSource.match(/const keyboard = ([^\n]+?) \? await observeLocalReach/u)[1];
  const enabled = (id, width, mode = "screen", nativeOnly = false) =>
    vm.runInNewContext(condition, { family: { id }, width, mode, nativeOnly });
  assert.equal(enabled("a3", 304), true);
  assert.equal(enabled("a3", 390), true);
  assert.equal(enabled("a3", 1280), false);
  assert.equal(enabled("hiring", 304), false);
  assert.equal(enabled("hiring", 390), true);
  assert.equal(enabled("a3", 304, "print"), false);
  assert.equal(enabled("a3", 390, "screen", true), false);
});

function observeIdentifierFixture(literal, rawFragments) {
  const native = [{ rows: [{ fields: [{ value: literal }] }] }];
  const measuredTables = [{ fragments: rawFragments }];
  const before = JSON.stringify({ native, measuredTables });
  const start = browserSource.indexOf("        const fragments =");
  const stop = browserSource.indexOf("        const reasons = [];", start);
  const result = vm.runInNewContext(browserSource.slice(start, stop)
    + "\n({ fragments, wordFragments, numericFragments, observerLimitations })",
    { family: { id: "a3" }, native, measuredTables, nativeOnly: false, assert });
  assert.equal(JSON.stringify({ native, measuredTables }), before, "literal and raw evidence are unchanged");
  return result;
}
test("NIST identifier counterexample retains raw numeric flags and an explicit limitation", () => {
  const result = observeIdentifierFixture("NIST SP 800-207 Zero Trust Architecture",
    [{ kind: "numeric", token: "-207", lines: 2 }, { kind: "numeric", token: "42", lines: 2 }]);
  assert.equal(result.numericFragments, 2, "neither known nor unrelated numeric flags are waived");
  assert.equal(result.fragments.length, 2);
  assert.equal(result.observerLimitations[0].literal, "NIST SP 800-207 Zero Trust Architecture");
  assert.equal(result.observerLimitations[0].rawNumericSuffixFlags, 1);
  assert.match(result.observerLimitations[0].limitation, /does not excuse other numeric fragments/u);
  assert.match(browserSource, /if \(wordFragments \|\| numericFragments\) reasons\.push\("fragmentation-review"\)/u);
  assert.match(browserSource, /interactions, observerLimitations, errors/u);
});
test("altering the standards identifier cannot remove its preservation obligation", () => {
  assert.throws(() => observeIdentifierFixture("NIST SP 800207 Zero Trust Architecture", []),
    /complete standards identifier/u);
});
test("an unfragmented preserved standards identifier does not invent an observer flag", () => {
  const result = observeIdentifierFixture("NIST SP 800-207 Zero Trust Architecture", []);
  assert.equal(result.numericFragments, 0);
  assert.equal(result.observerLimitations.length, 0);
});

test("closure preserves the original 88 cases plus three reviewed additions and two Strategy states", () => {
  const cases = planCases({ combined: true });
  assert.equal(cases.length, 93);
  assert.equal(new Set(cases.map(item => item.id)).size, 93);
  assert.equal(cases.filter(item => !item.family.inspection && !item.family.state && !item.print).length, 88);
  assert.deepEqual(cases.filter(item => item.family.inspection || item.family.state || item.print).map(item => item.id).sort(),
    ["atlas-source-390-screen", "comparative-source-390-screen", "hiring-source-960-print",
      "strategy-canonical-source-390-static", "strategy-context-source-1280-print"]);
  const printed = cases.find(item => item.print);
  assert.equal(printed.width, (11 - printed.print.marginInches * 2) * 96);
  assert.deepEqual(printed.print, { paper: "Letter", orientation: "landscape", marginInches: 0.5,
    pageWidthPoints: 792, pageHeightPoints: 612, preferCSSPageSize: true, contentWidth: 960, contentHeight: 720 });
  assert(cases.filter(item => item.mode === "print" && item !== printed)
    .every(item => item.width === 1280 && !item.print), "other print cases retain their original contract");
});

test("browser wiring uses genuine input, explicit carrier/state accounting and no near-end positioning", () => {
  assert.match(browserSource, /await observeLocalReach\(page, frame, tables\)/u);
  assert.match(browserSource, /await observeCarrier\(page, frame, carrierFrame\)/u);
  assert.match(browserSource, /tableStateCoverage\(initial, tables\)/u);
  assert.match(browserSource, /"tests\/tables\/core-followthrough\/closure\.mjs"/u);
  assert.match(helperSource, /await page\.keyboard\.press\("ArrowRight"\)/u);
  assert.match(helperSource, /await page\.mouse\.wheel\(/u);
  assert.deepEqual([...helperSource.matchAll(/element\.scrollLeft\s*=(?!=)[^;]+;/gu)].map(match => match[0]),
    ["element.scrollLeft = 0;"]);
  assert.doesNotMatch(browserSource, /scrollLeft\s*=/u);
});

function reachFixture(overrides = {}) {
  const state = { left: 0, max: 240, clientWidth: 80, focused: true, documentX: 0, outerX: 0, lastVisible: false, ...overrides };
  return { state, read: async () => ({ ...state, edgeSamples: [
    { cell: 0, leftVisible: state.left >= 160, rightVisible: state.lastVisible },
  ] }), advance: async () => {
    state.left = Math.min(state.max, state.left + 40);
    state.lastVisible = state.left === state.max;
  } };
}

for (const method of ["keyboard", "pointer"]) test(method + " traverses the full range through repeated input", async () => {
  const fixture = reachFixture();
  const result = await traverseRightmost(fixture.read, fixture.advance, method);
  assert.equal(result.standing, "pass");
  assert.equal(result.inputSteps, 6);
  assert.equal(result.start.left, 0);
  assert.equal(result.end.left, 240);
});

for (const method of ["keyboard", "pointer"]) {
  test(method + " reaches both edges of an overwide column at separate journey positions", async () => {
    const fixture = reachFixture({ max: 280 });
    const read = async () => ({ ...await fixture.read(), edgeSamples: [{
      cell: 0,
      // A 240px column at [120, 360] is three times this fixture's 80px viewport.
      leftVisible: fixture.state.left >= 40 && fixture.state.left <= 120,
      rightVisible: fixture.state.left === 280,
    }] });
    const result = await traverseRightmost(read, fixture.advance, method);
    assert.equal(result.standing, "pass");
    assert.equal(result.start.edgeSamples[0].leftVisible, false);
    assert.equal(result.end.edgeSamples[0].leftVisible, false);
    assert.deepEqual(result.edgeCoverage, [{
      cell: 0, leftAt: { scrollLeft: 40, inputSteps: 1 }, rightAt: { scrollLeft: 280, inputSteps: 7 },
    }]);
  });

  test(method + " rejects a left edge outside the accessible scroll extent despite a reachable right edge", async () => {
    const fixture = reachFixture();
    const read = async () => ({ ...await fixture.read(), edgeSamples: [
      { cell: 0, leftVisible: fixture.state.left >= 160, rightVisible: fixture.state.lastVisible },
      // A second row's last cell is clipped beyond the leftmost reachable extent.
      { cell: 1, leftVisible: false, rightVisible: fixture.state.lastVisible },
    ] });
    const result = await traverseRightmost(read, fixture.advance, method);
    assert.equal(result.standing, "review");
    assert.equal(result.end.left, fixture.state.max);
    assert.equal(result.edgeCoverage[0].leftAt.scrollLeft, 160);
    assert.equal(result.edgeCoverage[1].leftAt, null);
    assert.equal(result.edgeCoverage[1].rightAt.scrollLeft, 240);
  });
}

for (const method of ["keyboard", "pointer"]) {
  for (const remaining of [1, 2]) {
    test(method + " continues with " + remaining + "px remaining until missing edges are observed", async () => {
      const fixture = reachFixture({ max: 244 });
      let advances = 0;
      const advance = async () => {
        fixture.state.left = ++advances === 1 ? fixture.state.max - remaining : fixture.state.max;
        fixture.state.lastVisible = advances === 2;
      };
      const result = await traverseRightmost(fixture.read, advance, method);
      assert.equal(result.standing, "pass");
      assert.equal(result.inputSteps, 2, "near-end position alone cannot finish the first input");
      assert.equal(advances, 2);
      assert.equal(result.end.left, 244);
      assert.deepEqual(result.edgeCoverage, [{
        cell: 0, leftAt: { scrollLeft: 244 - remaining, inputSteps: 1 },
        rightAt: { scrollLeft: 244, inputSteps: 2 },
      }]);
    });
  }

  test(method + " incomplete edges at the true end stop on observed lack of progress", async () => {
    const fixture = reachFixture({ max: 244 });
    let advances = 0;
    const advance = async () => {
      fixture.state.left = ++advances === 1 ? 242 : 244;
      fixture.state.lastVisible = false;
    };
    const result = await traverseRightmost(fixture.read, advance, method);
    assert.equal(result.standing, "review");
    assert.equal(result.reason, "input did not advance the local scroll");
    assert.equal(result.inputSteps, 3, "the end is not inferred before attempting further input");
    assert.equal(result.end.left, 244);
    assert.equal(result.edgeCoverage[0].rightAt, null);
  });

  test(method + " near-end progress remains subject to the bounded input budget", async () => {
    const fixture = reachFixture({ max: 244 });
    let advances = 0;
    const result = await traverseRightmost(fixture.read, async () => {
      fixture.state.left = ++advances === 1 ? 242 : 244;
      fixture.state.lastVisible = advances === 2;
    }, method, 1);
    assert.equal(result.standing, "review");
    assert.equal(result.reason, "bounded input budget exhausted");
    assert.equal(result.inputSteps, 1);
    assert.equal(advances, 1);
    assert.equal(result.edgeCoverage[0].rightAt, null);
  });

  test(method + " observed edges can complete before unrelated trailing scroll space", async () => {
    const fixture = reachFixture();
    const result = await traverseRightmost(fixture.read, async () => {
      await fixture.advance();
      fixture.state.lastVisible = fixture.state.left >= 200;
    }, method);
    assert.equal(result.standing, "pass");
    assert.equal(result.inputSteps, 5);
    assert.equal(result.end.left, 200);
    assert.equal(result.end.max, 240);
    assert.equal(result.edgeCoverage[0].rightAt.scrollLeft, 200);
  });
}

test("near-end starts cannot masquerade as end-to-end reach", async () => {
  const fixture = reachFixture({ left: 216 });
  const result = await traverseRightmost(fixture.read, fixture.advance, "keyboard");
  assert.equal(result.standing, "review");
  assert.equal(result.inputSteps, 0);
});
test("no overflow is explicitly inapplicable rather than a traversal pass", async () => {
  const fixture = reachFixture({ max: 0 });
  assert.equal((await traverseRightmost(fixture.read, fixture.advance, "keyboard")).standing, "not-applicable");
});
test("stalled input cannot pass", async () => {
  const fixture = reachFixture();
  assert.equal((await traverseRightmost(fixture.read, async () => {}, "pointer")).standing, "review");
});
for (const key of ["focused", "documentX", "outerX"]) test(key + " regression retains a review disposition", async () => {
  const fixture = reachFixture();
  const result = await traverseRightmost(fixture.read, async () => {
    await fixture.advance();
    fixture.state[key] = key === "focused" ? false : 20;
  }, "keyboard");
  assert.equal(result.standing, "review");
});
test("rightmost clipping remains a review even at maximum scroll", async () => {
  const fixture = reachFixture();
  const result = await traverseRightmost(fixture.read, async () => {
    await fixture.advance(); fixture.state.lastVisible = false;
  }, "pointer");
  assert.equal(result.standing, "review");
});
test("input budget exhaustion is explicit", async () => {
  const fixture = reachFixture();
  const result = await traverseRightmost(fixture.read, fixture.advance, "keyboard", 2);
  assert.equal(result.standing, "review");
  assert.equal(result.inputSteps, 2);
});

test("each initially hidden table retains an individual coverage disposition", () => {
  const initial = [true, false, false, true].map((visible, tableIndex) => ({ tableIndex, caption: "Table " + tableIndex, visible }));
  const expanded = [true, true, false, false].map((visible, tableIndex) => ({ tableIndex, visible }));
  assert.deepEqual(tableStateCoverage(initial, expanded).map(item => item.disposition),
    ["initially-visible", "opened-native-disclosure", "unobserved-hidden-state", "unobserved-hidden-state"]);
});

function ref(id, text) { return { id, text, unique: true, inTable: true, tag: "TH" }; }
function comparativeFixture() {
  const prefix = "comparative-populations-";
  return {
    caption: comparativeCaption,
    columns: comparativeColumns.map(([id, text]) => ({ id: prefix + id, text, scope: "col", label: text })),
    rows: comparativeGroups.flatMap(group => group.populations.map((population, index) => ({
      label: comparativeCaption + ": " + group.label + ": " + population,
      cells: [
        ...(index === 0 ? [{ tag: "TH", id: prefix + group.id, scope: "rowgroup", rowSpan: 3, text: group.native,
          label: "Case vocabulary", headers: [prefix + "case"], refs: [ref(prefix + "case", "Case vocabulary")] }] : []),
        ...comparativeColumns.slice(1).map(([id, text], column) => ({
          tag: "TD", text: column === 0 ? population : "literal consequence", label: group.label + ": " + text,
          headers: [prefix + group.id, prefix + id], refs: [ref(prefix + group.id, group.native), ref(prefix + id, text)],
        })),
      ],
    }))),
  };
}
test("independent grouped expectations admit all nine populations and continuation rows", () => validateComparative(comparativeFixture()));
for (const kind of ["group", "label", "duplicate", "span"]) test("grouped " + kind + " corruption is rejected independently", () => {
  const table = comparativeFixture();
  const cell = table.rows[1].cells[0];
  if (kind === "group") { cell.headers[0] = "comparative-populations-fmi"; cell.refs[0] = ref(cell.headers[0], comparativeGroups[2].native); }
  if (kind === "label") cell.label = "Self-consistent but wrong group: Population";
  if (kind === "duplicate") cell.refs[0].unique = false;
  if (kind === "span") table.rows[0].cells[0].rowSpan = 2;
  assert.throws(() => validateComparative(table));
});

function atlasFixture(sample) {
  const ids = sample.columns.map((_, index) => "atlas-source-column-" + index);
  const label = index => index ? sample.columns[index] + " (" + sample.unit + ")" : sample.columns[index];
  return { name: "Source data for " + sample.title + "; unit: " + sample.unit, atlasIds: ids,
    columns: sample.columns.map((text, index) => ({ id: ids[index], text, scope: "col", label: label(index) })),
    rows: Array.from({ length: 4 }, () => ({ cells: sample.first.map((text, index) => ({
      text, tag: "TD", label: label(index), headers: [ids[index]], refs: [ref(ids[index], sample.columns[index])],
    })) })),
  };
}
test("Atlas six-column and four-column contracts preserve native data-cell identity and units", () => {
  for (const sample of atlasSamples) validateAtlas(atlasFixture(sample), sample);
});
test("Atlas replacement rejects stale sixth/fifth header IDs", () => {
  const table = atlasFixture(atlasSamples[1]); table.atlasIds.push("atlas-source-column-4", "atlas-source-column-5");
  assert.throws(() => validateAtlas(table, atlasSamples[1]));
});
test("Atlas missing native scope is not repaired by matching labels", () => {
  const table = atlasFixture(atlasSamples[0]); table.columns[0].scope = null;
  assert.throws(() => validateAtlas(table, atlasSamples[0]));
});
test("Atlas unit label corruption fails the independent source contract", () => {
  const table = atlasFixture(atlasSamples[1]); table.rows[0].cells[1].label = "estimate (days)";
  assert.throws(() => validateAtlas(table, atlasSamples[1]));
});

test("AX traversal retains exposed descendants through ignored grouping nodes", () => {
  const nodes = [
    { nodeId: "table", backendDOMNodeId: 99, role: { value: "table" }, name: { value: "Source table" }, childIds: ["ignored"] },
    { nodeId: "ignored", ignored: true, childIds: ["row"] },
    { nodeId: "row", role: { value: "row" }, childIds: ["column", "cell"] },
    { nodeId: "column", role: { value: "columnheader" }, name: { value: "Value" } },
    { nodeId: "cell", role: { value: "cell" }, name: { value: "0" } },
  ];
  const ax = axTableSubtree(nodes, 99);
  validateAX(ax, { name: "Source table", columns: ["Value"], rowHeaders: [], cells: ["0"], rows: 1 });
  assert.throws(() => validateAX(ax, { name: "Source table", columns: ["Value"], rowHeaders: ["invented"], cells: ["0"], rows: 1 }));
});
test("AX table omission cannot pass on DOM labels alone", () => {
  assert.throws(() => axTableSubtree([], 99));
});

const hiringPrintSpec = planCases({ combined: true, caseId: "hiring-source-960-print" })[0].print;

function printGeometry(overrides = {}) {
  return { headers: Array(8).fill("field"), viewport: 960, left: 0, right: 940, tableWidth: 940,
    ownerWidth: 940, overflowX: "visible", tableMinWidth: "0px", cellMinWidths: ["0px", "0px"], ...overrides };
}
test("hiring print fit rejects retained screen floors, clipping, portrait width and local overflow", () => {
  assert(printFits(printGeometry(), hiringPrintSpec));
  for (const bad of [{ tableMinWidth: "1536px" }, { cellMinWidths: ["160px"] }, { right: 970 },
    { overflowX: "auto" }, { viewport: 720 }, { viewport: 1280 }, { headers: Array(7).fill("field") }])
    assert.equal(printFits(printGeometry(bad), hiringPrintSpec), false);
});

test("hiring PDF options honor CSS page size with matching Letter landscape fallback and margins", () => {
  assert.deepEqual(printPDFOptions(hiringPrintSpec), { format: "Letter", landscape: true,
    printBackground: true, preferCSSPageSize: true,
    margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" } });
  assert.match(browserSource, /page\.pdf\(result\.print\.pdfOptions\)/u);
  assert.match(browserSource, /result\.print\.pageGeometry = await inspectPrintPDF\(pdf\.file\)/u);
  assert(browserSource.indexOf("await inspectPrintPDF(pdf.file)") < browserSource.indexOf("assert(await validateRecordArtifacts"));
});

function physicalPDF(pageSizes) {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count " + pageSizes.length + " /Kids [" + pageSizes.map((_, index) => (index + 3) + " 0 R").join(" ") + "] >>",
    ...pageSizes.map(([width, height]) => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + width + " " + height + "] /Resources << >> >>")];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
  }
  const xref = Buffer.byteLength(body);
  body += "xref\n0 " + offsets.length + "\n0000000000 65535 f \n";
  body += offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("");
  body += "trailer\n<< /Size " + offsets.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(body);
}

async function printFixture(t, pageSizes = [[792, 612]], expectedValid = true) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "core-followthrough-print-"));
  const directory = await fs.realpath(temporary);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "source.html"), "print source fixture");
  const original = planCases({ combined: true, caseId: "hiring-source-960-print" })[0];
  const planned = { ...original, family: { ...original.family, source: "source.html" } };
  const record = { id: planned.id, signature: "print-contract-fixture", dependencies: { "source.html": digest("print source fixture") },
    result: { id: planned.id, family: "hiring", kind: "repair", mode: "print", width: 960, variant: "source",
      standing: "pass", screenshots: [], print: { ...planned.print, geometry: printGeometry(),
        pdfOptions: printPDFOptions(planned.print) } } };
  const screenshot = await publishScreenshot(directory, Buffer.from("print screenshot fixture"));
  bindScreenshot(record, screenshot, directory);
  const pdf = await publishPrintPDF(directory, physicalPDF(pageSizes));
  bindPrintPDF(record, pdf, directory);
  record.result.print.pageGeometry = await inspectPrintPDF(pdf.file);
  const snapshot = inputSnapshot(directory);
  const validate = candidate => validateRecordArtifacts(candidate, planned, directory, snapshot);
  assert.equal(await validate(record), expectedValid);
  return { directory, planned, record, pdf, screenshot, validate };
}
test("physical print receipt observes all saved PDF pages rather than viewport width", async t => {
  const fixture = await printFixture(t, [[792, 612], [792, 612]]);
  assert.deepEqual(fixture.record.result.print.pageGeometry, { pageCount: 2, pages: [
    { number: 1, widthPoints: 792, heightPoints: 612, rotation: 0 },
    { number: 2, widthPoints: 792, heightPoints: 612, rotation: 0 },
  ] });
});
for (const [name, sizes] of [
  ["portrait", [[612, 792]]], ["wrong-paper", [[842, 595]]],
  ["later-portrait-page", [[792, 612], [612, 792]]],
]) test("actual " + name + " PDF cannot publish a landscape receipt", async t => {
  const fixture = await printFixture(t, sizes, false);
  await assert.rejects(publishCampaign(fixture.directory, [fixture.record.id], [fixture.record], fixture.validate));
});
for (const kind of ["portrait-plan", "css-page-size-disabled", "wrong-margin", "portrait-viewport",
  "missing-page-geometry", "omitted-page", "wrong-page-size"]) {
  test("print receipt rejects " + kind + " against its trusted plan", async t => {
    const fixture = await printFixture(t);
    const printed = fixture.record.result.print;
    if (kind === "portrait-plan") printed.orientation = "portrait";
    if (kind === "css-page-size-disabled") printed.pdfOptions.preferCSSPageSize = false;
    if (kind === "wrong-margin") printed.pdfOptions.margin.left = "0in";
    if (kind === "portrait-viewport") printed.geometry.viewport = 720;
    if (kind === "missing-page-geometry") delete printed.pageGeometry;
    if (kind === "omitted-page") printed.pageGeometry.pages = [];
    if (kind === "wrong-page-size") printed.pageGeometry.pages[0].widthPoints = 612;
    assert.equal(await fixture.validate(fixture.record), false);
    await assert.rejects(publishCampaign(fixture.directory, [fixture.record.id], [fixture.record], fixture.validate));
  });
}
test("affected continuation retains the first 64 observations and replaces only hiring print identity", () => {
  const full = planCases({ combined: true });
  const suffix = planCases({ combined: true, fromCaseId: "hiring-source-304-screen" });
  assert.equal(suffix.length, 29);
  assert.deepEqual(suffix, full.slice(64));
  assert(suffix.some(item => item.id === "hiring-source-960-print"));
  assert(!full.some(item => item.id === "hiring-source-720-print"));
});
test("fitting print PDF and screenshot are both source-bound publication dependencies", async t => {
  const fixture = await printFixture(t);
  await publishCampaign(fixture.directory, [fixture.record.id], [fixture.record], fixture.validate);
});
for (const kind of ["missing-pdf", "changed-pdf", "omitted-pdf-dependency", "omitted-screenshot"]) {
  test("print " + kind + " rejects publication after a warm validation", async t => {
    const fixture = await printFixture(t);
    if (kind === "missing-pdf") await fs.rm(fixture.pdf.file);
    if (kind === "changed-pdf") await fs.writeFile(fixture.pdf.file, "%PDF-1.7\nchanged bytes");
    if (kind === "omitted-pdf-dependency") delete fixture.record.dependencies[path.relative(fixture.directory, fixture.pdf.file)];
    if (kind === "omitted-screenshot") fixture.record.result.screenshots = [];
    assert.equal(await fixture.validate(fixture.record), false);
    await assert.rejects(publishCampaign(fixture.directory, [fixture.record.id], [fixture.record], fixture.validate));
  });
}


test("continuation selects exactly the 27 unfinished cases without migrating the completed prefix", () => {
  const full = planCases({ combined: true });
  const continuation = planCases({ combined: true, fromCaseId: "hiring-source-390-screen" });
  assert.equal(continuation.length, 27);
  assert.deepEqual(continuation, full.slice(66));
  assert.equal(continuation.at(-1).id, "a3-source-1280-screen");
  assert.match(browserSource, /fromCaseId: option\("--from-case", null\)/u);
});
test("continuation rejects an unknown or unavailable starting case", () => {
  assert.throws(() => planCases({ combined: true, fromCaseId: "missing" }), /Unknown starting case/u);
  assert.throws(() => planCases({ fromCaseId: "hiring-source-390-screen" }), /Unknown starting case/u);
});
test("single-case and continuation selections cannot silently override each other", () => {
  assert.throws(() => planCases({ combined: true, caseId: "hiring-source-390-screen",
    fromCaseId: "hiring-source-390-screen" }), /mutually exclusive/u);
});

function hiringAXFixture(state, domPainted = false, axPainted = domPainted) {
  const headings = state === "runtime"
    ? ["Source field + text", "Standing", "Term + relation", "Artifact reference",
      "Reader effect", "Review owner", "Correction", "Audit relevance"]
    : ["Scenario + source field", "Standing", "Term + ontology relation", "Artifact reference",
      "Reader effect", "Review owner", "Correction state", "Audit relevance"];
  const table = { caption: "Relationship fields", columns: headings.map(text => ({
    text: domPainted ? text.toUpperCase() : text,
  })), rows: [{ cells: [
    { tag: "TH", text: "resume.experience[0] Source text" },
    ...["Normalized", "Design systems", "urn:example:record", "Reader effect",
      "Review owner", "Reviewable", "Audit relevance"].map(text => ({ tag: "TD", text })),
  ] }] };
  const ax = { name: table.caption, nodes: [
    ...headings.map(name => ({ role: "columnheader", name: axPainted ? name.toUpperCase() : name })),
    { role: "rowheader", name: table.rows[0].cells[0].text },
    ...table.rows[0].cells.slice(1).map(cell => ({ role: "cell", name: cell.text })),
    { role: "row", name: "" }, { role: "row", name: "" },
  ] };
  return { table, ax };
}
for (const state of ["runtime", "static"]) for (const painted of [false, true]) {
  test("hiring " + state + " accepts its own " + (painted ? "uppercase painted" : "source") + " headings", () => {
    const { table, ax } = hiringAXFixture(state, painted);
    const before = JSON.stringify({ table, ax });
    validateHiringAX(table, ax, state);
    assert.equal(JSON.stringify({ table, ax }), before, "comparison preserves the literal observation");
  });
}
for (const domPainted of [false, true]) test("hiring DOM/AX casing differences preserve runtime field identity: " + domPainted, () => {
  const { table, ax } = hiringAXFixture("runtime", domPainted, !domPainted);
  validateHiringAX(table, ax);
});
for (const state of ["runtime", "static"]) test("hiring " + state + " cannot substitute the other state's headings", () => {
  const { table, ax } = hiringAXFixture(state === "runtime" ? "static" : "runtime", true);
  assert.throws(() => validateHiringAX(table, ax, state));
});
test("hiring self-consistent but wrong DOM and AX wording is not a labels-as-oracle pass", () => {
  const { table, ax } = hiringAXFixture("runtime", true);
  table.columns[2].text = ax.nodes[2].name = "TERM AND RELATION";
  assert.throws(() => validateHiringAX(table, ax));
});
test("hiring correct DOM headings do not excuse stale static AX headings", () => {
  const { table } = hiringAXFixture("runtime", true);
  const { ax } = hiringAXFixture("static", true);
  assert.throws(() => validateHiringAX(table, ax));
});
test("hiring all eight DOM headings remain required", () => {
  const { table, ax } = hiringAXFixture("runtime", true);
  table.columns.pop();
  assert.throws(() => validateHiringAX(table, ax));
});
test("hiring header casing tolerance does not alter literal body/code names", () => {
  const { table, ax } = hiringAXFixture("runtime", true);
  ax.nodes.find(node => node.role === "rowheader").name = "RESUME.EXPERIENCE[0] SOURCE TEXT";
  assert.throws(() => validateHiringAX(table, ax));
});
test("hiring header casing tolerance does not alter the table name", () => {
  const { table, ax } = hiringAXFixture("runtime", true);
  ax.name = ax.name.toUpperCase();
  assert.throws(() => validateHiringAX(table, ax));
});
test("hiring unknown state is not silently treated as runtime", () => {
  const { table, ax } = hiringAXFixture("runtime");
  assert.throws(() => validateHiringAX(table, ax, "other"), /runtime or static/u);
});
