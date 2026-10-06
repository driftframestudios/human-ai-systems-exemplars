import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { digest } from "../../../tools/observation-checkpoint.mjs";

export const comparativeSelector = "table:has(th#comparative-populations-case)";
export const comparativeCaption = "Decisions, changed work, operating load, and signals across nine populations";
export const comparativeColumns = [
  ["case", "Case vocabulary"], ["population", "Population"], ["decision", "Decision carried"],
  ["work", "Changed work"], ["investment", "Investment or operating load"],
  ["responsibility", "Responsibility and useful consequence"],
];
export const comparativeGroups = [
  { id: "humatics", native: "Humatics \u00b7 site and posture", label: "Humatics: site and posture",
    populations: ["Product leadership", "Field engineers, installers, and customer operations", "Platform and data engineering"] },
  { id: "who-to-believe", native: "Who To Believe \u00b7 voice and trust", label: "Who To Believe: voice and trust",
    populations: ["Participants and influencers", "Review, privacy, and safety operations", "Platform, acquiring team, marketing, and executives"] },
  { id: "fmi", native: "FMI \u00b7 partner rule grammar", label: "FMI: partner rule grammar",
    populations: ["Patients and trial candidates", "Data Managers and biopharma partners", "Design, research, engineering, quality, and regulatory readers"] },
];
export const atlasSamples = [
  { id: "ex-support-maturity-heatmap", title: "Where is workflow support strongest by role and dimension?",
    unit: "support maturity score, 0\u201310", columns: ["role", "Provenance", "Consent", "Metadata", "AI boundary", "Audit"],
    first: ["Pathologist", "7", "6", "5", "8", "7"] },
  { id: "ex-exception-interval", title: "What resolution range should remain visible for consent exceptions?",
    unit: "hours", columns: ["queue", "estimate", "lower", "upper"], first: ["Standard review", "18", "12", "27"] },
];
export const hiringColumns = {
  runtime: ["Source field + text", "Standing", "Term + relation",
    "Artifact reference", "Reader effect", "Review owner", "Correction", "Audit relevance"],
  static: ["Scenario + source field", "Standing", "Term + ontology relation",
    "Artifact reference", "Reader effect", "Review owner", "Correction state", "Audit relevance"],
};

// The driver can advance only through the supplied real-input operation.
// Position assignment belongs solely to the browser adapter's left-edge setup.
export async function traverseRightmost(read, advance, method, maxSteps = 256) {
  const start = await read();
  // Each method owns a fresh journey. Different cells cannot supply one another's edges.
  const initialSamples = Array.isArray(start.edgeSamples) ? start.edgeSamples : [];
  const coverage = new Map(initialSamples.map(sample => [sample.cell,
    { cell: sample.cell, leftAt: null, rightAt: null }]));
  const finish = (standing, reason, end, steps) => ({
    method, standing, reason, start, end, inputSteps: steps, edgeCoverage: [...coverage.values()],
  });
  const recordEdges = (state, steps) => {
    const samples = state.edgeSamples;
    if (!Array.isArray(samples) || !samples.length || samples.length !== coverage.size
        || new Set(samples.map(sample => sample.cell)).size !== coverage.size
        || samples.some(sample => !coverage.has(sample.cell))) return false;
    for (const sample of samples) {
      const seen = coverage.get(sample.cell);
      if (sample.leftVisible && seen.leftAt === null) seen.leftAt = { scrollLeft: state.left, inputSteps: steps };
      if (sample.rightVisible && seen.rightAt === null) seen.rightAt = { scrollLeft: state.left, inputSteps: steps };
    }
    return true;
  };
  if (start.max <= 1) return finish("not-applicable", "no horizontal overflow", start, 0);
  if (Math.abs(start.left) > 2) return finish("review", "traversal did not start at the left edge", start, 0);
  if (!recordEdges(start, 0)) return finish("review", "rightmost cell edge samples unavailable", start, 0);
  let previous = start;
  for (let steps = 1; steps <= maxSteps; steps++) {
    await advance(previous);
    const current = await read();
    if (!recordEdges(current, steps))
      return finish("review", "rightmost cell population changed during traversal", current, steps);
    if (Math.abs(current.documentX - start.documentX) > 1 || Math.abs(current.outerX - start.outerX) > 1)
      return finish("review", "document moved instead of remaining a local scroll", current, steps);
    if (method === "keyboard" && !current.focused)
      return finish("review", "scroll owner lost keyboard focus", current, steps);
    const moved = current.left > start.left + 0.25;
    const bothEdges = [...coverage.values()].every(cell => cell.leftAt !== null && cell.rightAt !== null);
    // Observed edges establish reach; a near-end coordinate cannot replace missing coverage.
    if (moved && bothEdges) return finish("pass", null, current, steps);
    if (current.left <= previous.left + 0.25)
      return finish("review", "input did not advance the local scroll", current, steps);
    previous = current;
  }
  return finish("review", "bounded input budget exhausted", previous, maxSteps);
}

export async function observeLocalReach(page, frame, tables) {
  const records = [];
  for (const table of tables.filter(item => item.visible && item.scroll?.overflow)) {
    const handle = await frame.locator("table").nth(table.tableIndex).evaluateHandle(element => {
      let owner = element.parentElement;
      while (owner && !["auto", "scroll"].includes(getComputedStyle(owner).overflowX)) owner = owner.parentElement;
      return owner;
    });
    const owner = handle.asElement();
    try {
      if (!owner || !table.scroll.focusable || !table.scroll.name) {
        records.push({ tableIndex: table.tableIndex, standing: "review", reason: "unnamed or unfocusable scroll owner", methods: [] });
        continue;
      }
      const read = async () => ({
        ...await owner.evaluate((element, tableIndex) => {
          const target = document.querySelectorAll("table")[tableIndex];
          const box = element.getBoundingClientRect();
          const ownerLeft = box.left + element.clientLeft;
          const left = Math.max(0, ownerLeft);
          const right = Math.min(document.documentElement.clientWidth, ownerLeft + element.clientWidth);
          const lastCells = [...target.rows].map((row, rowIndex) => ({ cell: row.lastElementChild, rowIndex }))
            .filter(({ cell }) => cell && cell.getClientRects().length);
          return { left: element.scrollLeft, max: element.scrollWidth - element.clientWidth,
            clientWidth: element.clientWidth, focused: document.activeElement === element,
            documentX: document.scrollingElement.scrollLeft,
            clipLeft: left, clipRight: right,
            edgeSamples: lastCells.map(({ cell, rowIndex }) => {
              const rect = cell.getBoundingClientRect();
              return { cell: rowIndex, left: rect.left, right: rect.right,
                leftVisible: right > left && rect.left >= left - 2 && rect.left <= right + 2,
                rightVisible: right > left && rect.right >= left - 2 && rect.right <= right + 2 };
            }) };
        }, table.tableIndex),
        outerX: await page.evaluate(() => document.scrollingElement.scrollLeft),
      });
      const methods = [];
      for (const method of ["keyboard", "pointer"]) {
        await owner.scrollIntoViewIfNeeded();
        if (method === "pointer") await owner.hover();
        await owner.evaluate((element, keyboard) => {
          element.scrollLeft = 0;
          if (keyboard) element.focus({ preventScroll: true });
        }, method === "keyboard");
        await frame.waitForFunction(element => Math.abs(element.scrollLeft) <= 2, owner);
        methods.push(await traverseRightmost(read, async before => {
          if (method === "keyboard") await page.keyboard.press("ArrowRight");
          else await page.mouse.wheel(Math.min(512, Math.max(40, before.clientWidth * 0.75)), 0);
          try {
            await frame.waitForFunction(({ element, left }) => element.scrollLeft > left + 0.25,
              { element: owner, left: before.left }, { timeout: 1000 });
          } catch (error) {
            if (error.name !== "TimeoutError") throw error;
          }
        }, method));
      }
      records.push({ tableIndex: table.tableIndex, name: table.scroll.name, methods,
        standing: methods.every(method => method.standing === "pass") ? "pass" : "review" });
    } finally { await handle.dispose(); }
  }
  return records;
}

export function tableStateCoverage(initial, expanded) {
  return initial.map(before => {
    const after = expanded.find(table => table.tableIndex === before.tableIndex);
    return { tableIndex: before.tableIndex, caption: before.caption, initiallyVisible: before.visible,
      afterNativeDisclosure: after?.visible ?? false,
      disposition: !after?.visible ? "unobserved-hidden-state" : before.visible ? "initially-visible" : "opened-native-disclosure" };
  });
}

export async function observeCarrier(page, frame, iframe = null) {
  const outerViewport = await page.evaluate(() => ({
    innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
  }));
  const childViewport = await frame.evaluate(() => ({
    innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
  }));
  const boundary = iframe ? await iframe.evaluate(element => {
    const parent = element.parentElement;
    const css = getComputedStyle(parent);
    const box = parent.getBoundingClientRect();
    const frameBox = element.getBoundingClientRect();
    return {
      parentContentBox: { tag: parent.tagName, id: parent.id, classes: parent.className,
        left: box.left, right: box.right, borderWidth: box.width, clientWidth: parent.clientWidth,
        contentWidth: parent.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) },
      iframe: { left: frameBox.left, right: frameBox.right, borderWidth: frameBox.width, clientWidth: element.clientWidth },
    };
  }) : null;
  return { outerViewport, childViewport, parentContentBox: boundary?.parentContentBox ?? null,
    iframe: boundary?.iframe ?? null, boundary: iframe ? "actual-parent-and-iframe" : "standalone" };
}

export async function readSemanticTable(locator) {
  return locator.evaluate(table => {
    const text = element => (element.innerText ?? element.textContent).replace(/\s+/gu, " ").trim();
    const counts = new Map();
    for (const element of document.querySelectorAll("[id]")) counts.set(element.id, (counts.get(element.id) || 0) + 1);
    const cell = element => {
      const headers = (element.getAttribute("headers") || "").split(/\s+/u).filter(Boolean);
      return { tag: element.tagName, text: text(element), id: element.id, scope: element.getAttribute("scope"),
        rowSpan: element.rowSpan, label: element.dataset.label, headers,
        refs: headers.map(id => { const target = document.getElementById(id);
          return { id, unique: counts.get(id) === 1, inTable: !!target && table.contains(target),
            tag: target?.tagName, text: target ? text(target) : null }; }) };
    };
    return { caption: table.caption ? text(table.caption) : null, name: table.getAttribute("aria-label"),
      columns: [...table.querySelectorAll("thead th")].map(cell),
      rows: [...table.tBodies].flatMap(body => [...body.rows]).map(row => ({
        label: row.dataset.label, cells: [...row.cells].map(cell),
      })),
      atlasIds: [...document.querySelectorAll('[id^="atlas-source-column-"]')].map(element => element.id),
    };
  });
}

function resolved(cell, ids, names) {
  assert.deepEqual(cell.headers, ids, "native headers resolve the independent group/column contract");
  assert.deepEqual(cell.refs.map(ref => ref.text), names);
  assert(cell.refs.every(ref => ref.unique && ref.inTable && ref.tag === "TH"));
}

export function validateComparative(table) {
  const prefix = "comparative-populations-";
  assert.equal(table.caption, comparativeCaption);
  assert.deepEqual(table.columns.map(cell => [cell.id, cell.text, cell.scope, cell.label]),
    comparativeColumns.map(([id, text]) => [prefix + id, text, "col", text]));
  assert.equal(table.rows.length, 9);
  for (let index = 0; index < 9; index++) {
    const group = comparativeGroups[Math.floor(index / 3)];
    const row = table.rows[index];
    assert.equal(row.label, comparativeCaption + ": " + group.label + ": " + group.populations[index % 3]);
    if (index % 3 === 0) {
      const header = row.cells[0];
      assert.deepEqual([header.tag, header.id, header.scope, header.rowSpan, header.text, header.label],
        ["TH", prefix + group.id, "rowgroup", 3, group.native, "Case vocabulary"]);
      resolved(header, [prefix + "case"], ["Case vocabulary"]);
    }
    const data = row.cells.filter(cell => cell.tag === "TD");
    assert.equal(row.cells.length, index % 3 === 0 ? 6 : 5);
    assert.equal(data.length, 5);
    assert.equal(data[0].text, group.populations[index % 3]);
    data.forEach((cell, column) => {
      const [id, text] = comparativeColumns[column + 1];
      resolved(cell, [prefix + group.id, prefix + id], [group.native, text]);
      assert.equal(cell.label, group.label + ": " + text);
    });
  }
}

export function validateAtlas(table, sample) {
  const name = "Source data for " + sample.title + "; unit: " + sample.unit;
  assert.equal(table.name, name);
  const ids = sample.columns.map((_, index) => "atlas-source-column-" + index);
  assert.deepEqual(table.atlasIds, ids, "replacement clears stale column IDs");
  assert.deepEqual(table.columns.map(cell => [cell.id, cell.text, cell.scope]),
    sample.columns.map((column, index) => [ids[index], column, "col"]));
  assert.equal(table.rows.length, 4);
  assert.deepEqual(table.rows[0].cells.map(cell => cell.text), sample.first);
  for (const row of table.rows) {
    assert.equal(row.cells.length, sample.columns.length);
    row.cells.forEach((cell, index) => {
      assert.equal(cell.tag, "TD", "Atlas body cells are data, not invented row headers");
      resolved(cell, [ids[index]], [sample.columns[index]]);
      const label = index === 0 ? sample.columns[index] : sample.columns[index] + " (" + sample.unit + ")";
      assert.equal(cell.label, label);
      assert.equal(table.columns[index].label, label);
    });
  }
}

export function axTableSubtree(nodes, backendNodeId) {
  const table = nodes.find(node => node.backendDOMNodeId === backendNodeId);
  assert(table && !table.ignored && table.role?.value === "table", "native table is exposed in Chromium AX");
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  const queue = [table.nodeId], seen = new Set(), exposed = [];
  while (queue.length) {
    const id = queue.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    queue.push(...(node.childIds || []));
    if (!node.ignored) exposed.push({ role: node.role?.value, name: (node.name?.value || "").replace(/\s+/gu, " ").trim() });
  }
  return { name: (table.name?.value || "").replace(/\s+/gu, " ").trim(), nodes: exposed, scope: "Chromium native roles and names; not AT conformance or AX association edges" };
}

export async function observeAX(frame, selector) {
  const session = await frame.page().context().newCDPSession(frame);
  try {
    await session.send("Accessibility.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    assert(nodeId, "AX observation selects the intended table");
    const { node } = await session.send("DOM.describeNode", { nodeId });
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    return axTableSubtree(nodes, node.backendNodeId);
  } finally { await session.detach(); }
}

export function validateAX(ax, { name, columns, rowHeaders, cells, rows }) {
  assert.equal(ax.name, name);
  const names = role => ax.nodes.filter(node => node.role === role).map(node => node.name).sort();
  assert.deepEqual(names("columnheader"), [...columns].sort());
  assert.deepEqual(names("rowheader"), [...rowHeaders].sort());
  assert.deepEqual(names("cell"), [...cells].sort(), "native literal cell names remain exposed");
  assert.equal(names("row").length, rows);
}

export async function observeNativeCase(frame, inspection) {
  if (inspection === "comparative") {
    const table = await readSemanticTable(frame.locator(comparativeSelector));
    validateComparative(table);
    const ax = await observeAX(frame, comparativeSelector);
    validateAX(ax, { name: comparativeCaption, columns: comparativeColumns.map(([, text]) => text),
      rowHeaders: comparativeGroups.map(group => group.native),
      cells: table.rows.flatMap(row => row.cells.filter(cell => cell.tag === "TD").map(cell => cell.text)), rows: 10 });
    return { kind: inspection, table, ax, geometry: "not-observed" };
  }
  const samples = [];
  for (const sample of atlasSamples) {
    await frame.locator('#gallery [data-select-exemplar="' + sample.id + '"]').click();
    await frame.locator('#exemplarDetail[data-selected-exemplar-id="' + sample.id + '"]').waitFor({ state: "visible" });
    const table = await readSemanticTable(frame.locator("#exemplarDetail table"));
    validateAtlas(table, sample);
    const ax = await observeAX(frame, "#exemplarDetail table");
    validateAX(ax, { name: table.name, columns: sample.columns, rowHeaders: [],
      cells: table.rows.flatMap(row => row.cells.map(cell => cell.text)), rows: 5 });
    samples.push({ id: sample.id, table, ax });
  }
  return { kind: inspection, samples, geometry: "not-observed" };
}

export function validateHiringAX(table, ax, state = "runtime") {
  assert(Object.hasOwn(hiringColumns, state), "hiring table state must be runtime or static");
  const columns = hiringColumns[state];
  // The source headings and their CSS-uppercase paint have the same field identity.
  // Keep body text, code paths, captions and the recorded AX names untouched.
  const columnName = text => columns.find(column => text === column || text === column.toUpperCase()) ?? text;
  assert.deepEqual(table.columns.map(cell => columnName(cell.text)), columns,
    "hiring headings match the selected runtime/static source contract");
  const comparableAX = { ...ax, nodes: ax.nodes.map(node => node.role === "columnheader"
    ? { ...node, name: columnName(node.name) } : node) };
  validateAX(comparableAX, { name: table.caption, columns,
    rowHeaders: table.rows.flatMap(row => row.cells.filter(cell => cell.tag === "TH").map(cell => cell.text)),
    cells: table.rows.flatMap(row => row.cells.filter(cell => cell.tag === "TD").map(cell => cell.text)),
    rows: table.rows.length + 1 });
}

export async function observeHiringAX(frame, state = "runtime") {
  const table = await readSemanticTable(frame.locator("table"));
  const ax = await observeAX(frame, "table");
  validateHiringAX(table, ax, state);
  return ax;
}

export async function observeHiringPrint(frame, spec) {
  const geometry = await frame.locator("table").evaluate(table => {
    const owner = table.closest(".table-wrap");
    const css = getComputedStyle(table), box = table.getBoundingClientRect(), parent = owner.getBoundingClientRect();
    return { tableWidth: box.width, ownerWidth: parent.width, left: box.left, right: box.right,
      viewport: document.documentElement.clientWidth, tableMinWidth: css.minWidth,
      overflowX: getComputedStyle(owner).overflowX, headers: [...table.tHead.rows[0].cells].map(cell => cell.textContent.trim()),
      cellMinWidths: [...table.querySelectorAll("th,td")].map(cell => getComputedStyle(cell).minWidth) };
  });
  return { ...spec, geometry, standing: printFits(geometry, spec) ? "pass" : "review" };
}

export function printFits(value, spec) {
  return value.headers.length === 8 && value.viewport === spec.contentWidth && value.left >= -1
    && value.right <= value.viewport + 1 && value.tableWidth <= value.ownerWidth + 2
    && value.overflowX === "visible" && parseFloat(value.tableMinWidth) === 0
    && value.cellMinWidths.every(width => parseFloat(width) === 0);
}

// Read physical page boxes from the saved PDF, independently of the emulated viewport.
export async function inspectPrintPDF(file) {
  const inspect = async last => (await promisify(execFile)("pdfinfo",
    ["-f", "1", "-l", String(last), file], { timeout: 10000, env: { ...process.env, LC_ALL: "C" } })).stdout;
  const first = await inspect(1);
  const pageCount = Number(first.match(/^Pages:\s+(\d+)$/mu)?.[1]);
  assert(Number.isSafeInteger(pageCount) && pageCount > 0, "PDF declares a positive page count");
  const info = pageCount === 1 ? first : await inspect(pageCount);
  const pages = [...info.matchAll(/^Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+) pts/gmu)]
    .map(match => ({ number: Number(match[1]), widthPoints: Number(match[2]),
      heightPoints: Number(match[3]), rotation: null }));
  for (const match of info.matchAll(/^Page\s+(\d+) rot:\s+(-?\d+)$/gmu)) {
    const page = pages.find(item => item.number === Number(match[1]));
    if (page) page.rotation = Number(match[2]);
  }
  assert.equal(pages.length, pageCount, "Physical geometry covers every PDF page");
  assert(pages.every(page => Number.isInteger(page.rotation)), "Every PDF page declares rotation");
  return { pageCount, pages };
}

export async function publishPrintPDF(directory, bytes) {
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", "print artifact is a PDF");
  const sha256 = digest(bytes), file = path.join(directory, "print", sha256 + ".pdf");
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + "." + process.pid + ".tmp";
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx", flush: true });
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
  return { file, sha256 };
}
