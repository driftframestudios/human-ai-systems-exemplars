import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { coreFamilies } from "./cases.mjs";
import { bindScreenshot, commitCoreEdit, coreCommitEvent, validateRecordArtifacts } from "./contracts.mjs";
import { inputSnapshot, publishCampaign, publishScreenshot } from "../../../tools/evidence-campaign.mjs";
import { digest, openCheckpoints, publishObservation } from "../../../tools/observation-checkpoint.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const sources = new Map(await Promise.all(coreFamilies.map(async family =>
  [family.id, await fs.readFile(path.join(root, family.source), "utf8")])));
const browserSource = await fs.readFile(new URL("./browser.mjs", import.meta.url), "utf8");
const literal = 'Ren\u00e9e " <probe> N\u00b7m Pa\u00b7s 0 \u00b5g/L';

test("browser wiring commits both edits and validates artifacts before reuse and publication", () => {
  assert.match(browserSource, /await commitCoreEdit\(frame, family, literal\)/u);
  assert.match(browserSource, /await commitCoreEdit\(frame, family, before\)/u);
  assert.match(browserSource, /cached && await validateRecordArtifacts\(cached, item, root, snapshot\)/u);
  assert.match(browserSource, /bindScreenshot\(record, await publishScreenshot/u);
  assert.match(browserSource, /assert\(await validateRecordArtifacts\(record, item, root, snapshot\)/u);
  assert.match(browserSource, /const plannedCases = new Map\(cases\.map\(item => \[item\.id, item\]\)\)/u);
  assert.match(browserSource, /publishCampaign[^\n]+validateRecordArtifacts\(record, plannedCases\.get\(record\.id\), root, snapshot\)/u);
  assert.match(browserSource, /const definitionFiles[^\n]+"tests\/tables\/core-followthrough\/contracts\.mjs"/u);
});

for (const family of coreFamilies) {
  test(family.id + ": commit event, rerendered input and restoration agree", async () => {
    const event = ["jobs", "recovery"].includes(family.id) ? "blur" : "input";
    let node = { value: "Original" };
    let model = "Original";
    const commits = [];
    const frame = {
      locator(selector) {
        assert.equal(selector, family.edit);
        return { first() {
          const current = node;
          return {
            async fill(value) {
              assert.equal(current, node, "fill uses the current input");
              current.value = value;
              if (event === "input") commit("input");
              else assert.equal(model, commits.length ? literal : "Original", "fill alone has not committed");
            },
            async blur() {
              assert.equal(current, node, "blur targets the edited input");
              commit("blur");
            },
            async inputValue() {
              assert.equal(current, node, "read reacquires the rerendered input");
              return current.value;
            },
          };
        } };
      },
    };
    function commit(type) {
      commits.push(type);
      model = node.value;
      node = { value: model };
    }
    const edited = await commitCoreEdit(frame, family, literal);
    assert.equal(await edited.inputValue(), literal);
    assert.equal(model, literal);
    const restored = await commitCoreEdit(frame, family, "Original");
    assert.equal(await restored.inputValue(), "Original");
    assert.equal(model, "Original");
    assert.deepEqual(commits, [event, event]);
    assert.equal(coreCommitEvent(family.id), event);
  });
}

test("unclassified Core commit events are rejected", () => {
  assert.throws(() => coreCommitEvent("unknown"), /Known Core/u);
});

test("JTBD source commits its label on blur before rerendering", () => {
  assert.match(sources.get("jobs"), /const eventName = el\.tagName === 'SELECT' \|\| el\.type === 'number' \? 'change' : 'blur';/u);
  assert.match(sources.get("jobs"), /el\.addEventListener\(eventName, \(\) => \{ updateJobField\(el\.dataset\.jobId, el\.dataset\.field, el\.value\); renderAll\(\); \}\)/u);
});

test("Recovery source commits inspector fields on blur", () => {
  assert.match(sources.get("recovery"), /els\.inspector\.querySelectorAll\('input, textarea, select'\)[\s\S]*?el\.addEventListener\('blur', update\)/u);
});

function namedFunction(source, name) {
  const start = source.indexOf("  function " + name + "(");
  assert.notEqual(start, -1);
  const end = source.indexOf("\n  function ", start + 1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

for (const expanded of [true, false]) {
  test("Alignment name input updates identity and preserves focus with " + (expanded ? "open" : "closed") + " table disclosure", () => {
    const source = sources.get("alignment");
    const handler = source.match(/bind\(ids\.name,'input', (e => \{[^\n]+\})\);/u)?.[1];
    assert(handler);
    const input = { value: literal, selectionStart: 2, selectionEnd: 7 };
    const opt = { id: "option-1", name: "Original" };
    const nameNode = { textContent: "Original" };
    const reveal = { hidden: !expanded };
    const button = { ariaExpanded: String(expanded) };
    const identityCode = { textContent: opt.id };
    const row = {
      dataset: { recordId: opt.id, label: "Alignment Worksheet option: Original" },
      querySelector(selector) {
        assert.equal(selector, "th[scope=row] strong");
        return nameNode;
      },
      reveal, button, identityCode,
    };
    const other = {
      dataset: { recordId: "option-2", label: "Alignment Worksheet option: Other" },
      querySelector() { assert.fail("another option must remain untouched"); },
    };
    let exports = 0;
    const document = {
      activeElement: input,
      querySelectorAll(selector) {
        assert.equal(selector, "#tableMount tbody tr[data-record-id]");
        return [row, other];
      },
      getElementById() { assert.fail("name-only projection must not replace table contents"); },
    };
    const context = vm.createContext({
      opt, input, document,
      renderOptions() {}, renderSvg() {}, renderExports() { exports++; },
      renderTable() { assert.fail("renaming must retain existing disclosure nodes"); },
      renderOptionInspector() { assert.fail("name input inspector must not be replaced"); },
      renderAll() { assert.fail("live name input must not trigger a full rerender"); },
    });
    vm.runInContext(namedFunction(source, "refreshOptionTableName") + "\nvar handler = " + handler + ";", context);
    for (const value of [literal, "Original"]) {
      input.value = value;
      vm.runInContext("handler({ target: input });", context);
      assert.equal(opt.name, value);
      assert.equal(nameNode.textContent, value, "markup-shaped text remains a text-node value");
      assert.equal(row.dataset.label, "Alignment Worksheet option: " + value);
      assert.equal(row.dataset.recordId, "option-1");
      assert.equal(row.identityCode, identityCode);
      assert.equal(identityCode.textContent, "option-1");
      assert.equal(row.reveal, reveal);
      assert.equal(reveal.hidden, !expanded);
      assert.equal(row.button, button);
      assert.equal(button.ariaExpanded, String(expanded));
      assert.equal(other.dataset.label, "Alignment Worksheet option: Other");
      assert.equal(document.activeElement, input);
      assert.deepEqual([input.selectionStart, input.selectionEnd], [2, 7]);
    }
    assert.equal(exports, 2);
  });
}

function declarationRules(css, media = []) {
  const rules = [];
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open < 0) break;
    const selector = css.slice(cursor, open).trim();
    let close = open + 1;
    let depth = 1;
    for (; close < css.length && depth; close++) {
      if (css[close] === "{") depth++;
      else if (css[close] === "}") depth--;
    }
    assert.equal(depth, 0, "balanced CSS rule fixture");
    const body = css.slice(open + 1, close - 1);
    if (selector.startsWith("@media")) rules.push(...declarationRules(body, [...media, selector.slice(6).trim()]));
    else if (body.includes("{")) rules.push(...declarationRules(body, media));
    else rules.push({ selector, body, media });
    cursor = close;
  }
  return rules;
}

function scopedFloors(html, selector) {
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)].map(match => match[1]).join("\n")
    .replace(/\/\*[\s\S]*?\*\//gu, "");
  const floors = declarationRules(css).filter(rule => rule.selector.includes(selector) && /min-width:\s*\d+ch/u.test(rule.body));
  for (const rule of floors) assert(rule.media.includes("screen"), selector + ": new column floor is screen-only");
  return floors.map(rule => Number(rule.body.match(/min-width:\s*(\d+)ch/u)[1]));
}

for (const [family, selector, values] of [
  ["impact", "#traceTable", [20, 28, 24]],
  ["context", "#idRegistryTable", [12, 28, 26, 20]],
  ["frv", "#tableEquivalent", [16, 24]],
  ["jobs", "#identity-registry", [12, 28, 26]],
]) {
  test(family + ": column floors are screen-only, with an unscoped regression canary", () => {
    assert.deepEqual(scopedFloors(sources.get(family), selector), values);
    assert.throws(() => scopedFloors("<style>" + selector + " td { min-width: 12ch; }</style>", selector), /screen-only/u);
  });
}

async function imageFixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "core-followthrough-images-"));
  const directory = await fs.realpath(temporary);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "source.html"), "source fixture");
  const plannedCase = {
    id: "alignment-source-390-screen",
    family: { id: "alignment", kind: "core", source: "source.html" },
    mode: "screen", width: 390, variant: "source",
  };
  const record = {
    id: plannedCase.id, signature: "focused-image-fixture",
    dependencies: { "source.html": digest("source fixture") },
    result: {
      id: plannedCase.id, family: "alignment", kind: "core",
      standing: "pass", mode: "screen", width: 390, variant: "source", screenshots: [],
    },
  };
  const screenshot = await publishScreenshot(directory, Buffer.from("immutable screenshot byte fixture"));
  bindScreenshot(record, screenshot, directory);
  const snapshot = inputSnapshot(directory);
  const validate = (candidate, expected = plannedCase) => validateRecordArtifacts(candidate, expected, directory, snapshot);
  const store = await openCheckpoints(path.join(directory, "checkpoints"));
  await publishObservation(store, record, async () => {});
  return { directory, plannedCase, record, screenshot, snapshot, validate, store };
}

test("screenshot path and digest bind valid checkpoint reuse and campaign publication", async t => {
  const fixture = await imageFixture(t);
  const { directory, record, screenshot, snapshot, store, validate } = fixture;
  assert.equal(record.dependencies[path.relative(directory, screenshot.file)], screenshot.sha256);
  const saved = await store.readRecord(record.id, record.signature, dependencies => snapshot.agrees(dependencies));
  assert(saved);
  assert.equal(await validate(saved), true);
  await publishCampaign(directory, [record.id], [saved], validate, { fixture: true });
});

for (const mode of ["missing", "changed"]) {
  test(mode + " screenshot bytes reject warm-cache reuse and final publication", async t => {
    const { directory, record, screenshot, snapshot, store, validate } = await imageFixture(t);
    assert.equal(await snapshot.agrees(record.dependencies), true);
    if (mode === "missing") await fs.rm(screenshot.file);
    else await fs.writeFile(screenshot.file, "altered image bytes");
    const cached = await store.readRecord(record.id, record.signature, dependencies => snapshot.agrees(dependencies));
    assert(cached, "warm input cache alone is insufficient");
    assert.equal(await validate(cached), false);
    await assert.rejects(publishCampaign(directory, [record.id], [cached], validate), /Inputs and artifacts agree/u);
  });
}

test("a screenshot omitted from dependencies rejects otherwise valid source bytes", async t => {
  const { directory, record, screenshot, snapshot, validate } = await imageFixture(t);
  delete record.dependencies[path.relative(directory, screenshot.file)];
  assert.equal(await snapshot.agrees(record.dependencies, true), true);
  assert.equal(await validate(record), false);
  await assert.rejects(publishCampaign(directory, [record.id], [record], validate), /Inputs and artifacts agree/u);
});

test("a required screenshot cannot disappear from the declaration", async t => {
  const { record, snapshot, validate } = await imageFixture(t);
  record.result.screenshots = [];
  assert.equal(await snapshot.agrees(record.dependencies, true), true);
  assert.equal(await validate(record), false);
});

test("a declared screenshot digest must agree with its dependency", async t => {
  const { record, validate } = await imageFixture(t);
  record.result.screenshots[0].sha256 = "0".repeat(64);
  assert.equal(await validate(record), false);
});

test("planned cases without screenshots retain explicit empty declarations", async t => {
  const { directory, plannedCase, record, screenshot, validate } = await imageFixture(t);
  delete record.dependencies[path.relative(directory, screenshot.file)];
  record.result.screenshots = [];
  for (const mode of ["print", "static", "forced", "text200", "screen"]) {
    const width = ["print", "screen"].includes(mode) ? 1280 : 390;
    const id = "alignment-source-" + width + "-" + mode;
    const expected = { ...plannedCase, id, mode, width };
    const candidate = structuredClone(record);
    candidate.id = id;
    Object.assign(candidate.result, { id, mode, width });
    assert.equal(await validate(candidate, expected), true);
  }
});


async function assertRejectedAtReuseAndPublication(fixture, candidate) {
  const { directory, plannedCase, record, snapshot, store, validate } = fixture;
  await store.write(record.id, record.signature, candidate.dependencies, candidate.result);
  const cached = await store.readRecord(record.id, record.signature, dependencies => snapshot.agrees(dependencies));
  assert(!cached || !await validate(cached), "The trusted plan rejects malformed checkpoint reuse");
  await assert.rejects(publishCampaign(directory, [plannedCase.id], [candidate], candidate => validate(candidate)));
}

const metadataMismatches = [
  ["missing mode", result => { delete result.mode; }, true],
  ["missing width", result => { delete result.width; }, true],
  ["string 390 width", result => { result.width = "390"; }, true],
  ["null width", result => { result.width = null; }, true],
  ["different numeric width", result => { result.width = 1280; }, true],
  ["substituted print mode", result => { result.mode = "print"; }, true],
  ["unknown mode", result => { result.mode = "unclassified"; }, true],
  ["missing family", result => { delete result.family; }],
  ["different family", result => { result.family = "context"; }],
  ["missing kind", result => { delete result.kind; }],
  ["different kind", result => { result.kind = "repair"; }],
  ["missing variant", result => { delete result.variant; }],
  ["different variant", result => { result.variant = "projection"; }],
  ["missing result identity", result => { delete result.id; }],
  ["different result identity", result => { result.id = "context-source-390-screen"; }],
  ["missing standing", result => { delete result.standing; }],
  ["invalid standing", result => { result.standing = "complete"; }],
];
for (const [label, mutate, omitScreenshot = false] of metadataMismatches) {
  test(label + " rejects checkpoint reuse and publication against the trusted case", async t => {
    const fixture = await imageFixture(t);
    const candidate = structuredClone(fixture.record);
    mutate(candidate.result);
    if (omitScreenshot) {
      candidate.result.screenshots = [];
      delete candidate.dependencies[path.relative(fixture.directory, fixture.screenshot.file)];
      await fs.rm(fixture.screenshot.file);
    }
    await assertRejectedAtReuseAndPublication(fixture, candidate);
  });
}

test("result and trusted plan require explicit object shapes", async t => {
  const fixture = await imageFixture(t);
  for (const result of [null, [], "pass"]) {
    await assertRejectedAtReuseAndPublication(fixture, { ...fixture.record, result });
  }
  for (const plannedCase of [undefined, null, [], {}, { ...fixture.plannedCase, width: "390" }]) {
    const validate = candidate => validateRecordArtifacts(candidate, plannedCase, fixture.directory, fixture.snapshot);
    assert.equal(await validate(fixture.record), false);
    await assert.rejects(publishCampaign(fixture.directory, [fixture.record.id], [fixture.record], validate));
  }
});

test("the trusted source dependency cannot disappear behind a valid screenshot", async t => {
  const fixture = await imageFixture(t);
  const candidate = structuredClone(fixture.record);
  delete candidate.dependencies["source.html"];
  assert.equal(await fixture.snapshot.agrees(candidate.dependencies, true), true);
  await assertRejectedAtReuseAndPublication(fixture, candidate);
});

test("changed source bytes reject warm-cache reuse and publication", async t => {
  const fixture = await imageFixture(t);
  assert.equal(await fixture.snapshot.agrees(fixture.record.dependencies), true);
  await fs.writeFile(path.join(fixture.directory, "source.html"), "changed source fixture");
  await assertRejectedAtReuseAndPublication(fixture, fixture.record);
});

test("screenshot declarations cannot bind paths outside their repository root", async t => {
  const { directory, record, screenshot, validate } = await imageFixture(t);
  const outside = { ...screenshot, file: path.join(directory, "..", "outside.png") };
  assert.throws(() => bindScreenshot(record, outside, directory), /repository-local/u);
  record.result.screenshots = [outside];
  assert.equal(await validate(record), false);
});
