import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../../visual-fidelity-contracts/labs/data-view-lab/', import.meta.url);
const html = await readFile(new URL('index.html', ROOT), 'utf8');
const controller = await readFile(new URL('src/controller.js', ROOT), 'utf8');
const renderer = await readFile(new URL('src/render.js', ROOT), 'utf8');
const semantics = await readFile(new URL('src/semantics.js', ROOT), 'utf8');
const css = await readFile(new URL('src/styles/lab.css', ROOT), 'utf8');
const readme = await readFile(new URL('README.md', ROOT), 'utf8');
const standalone = await readFile(new URL('standalone/index.html', ROOT), 'utf8');
const current = JSON.parse(await readFile(new URL('fixtures/valid/current.json', ROOT), 'utf8'));

test('data-view page carries decision controls, live status, exact-value twin, and reading fallback', () => {
  assert.match(html, /<label for="data-decision-need">Decision need<\/label>/u);
  assert.match(html, /class="control-field">\s*<label for="data-decision-need">[\s\S]*?<select id="data-decision-need"/u);
  assert.match(html, /role="status"[^>]+aria-live="polite"/u);
  assert.match(html, /data-data-svg/u);
  assert.match(html, /data-data-table/u);
  assert.match(html, /data-data-machine-twin/u);
  assert.match(html, /data-data-authorization/u);
  assert.match(html, /data-data-ownership/u);
  assert.match(html, /<noscript>[\s\S]*Reading representation/u);
  assert.match(standalone, /Compare weekly case values and see what each value means/u);
  assert.match(standalone, /href="\.\.\/">Run the interactive lab<\/a>/u);
  assert.match(standalone, /href="\.\.\/README\.md">Read the source guide<\/a>/u);
  assert.match(html, /Content-Security-Policy/u);
  assert.match(standalone, /Content-Security-Policy/u);
});

test('data-view renderer builds text, table, and SVG nodes through safe DOM construction', () => {
  assert.match(renderer, /document\.createElementNS\(SVG_NS/u);
  assert.match(renderer, /document\.createElement\(/u);
  assert.match(renderer, /\.textContent =/u);
  assert.doesNotMatch(renderer, /innerHTML|insertAdjacentHTML|document\.write/u);
  assert.match(renderer, /aria-labelledby/u);
  assert.match(renderer, /marker-end/u);
  assert.match(renderer, /url\(#\$\{prefix\}-arrow\)/u);
  assert.match(renderer, /SVG_INSTANCE_PREFIXES/u);
  assert.match(renderer, /safeRecordToken/u);
  assert.ok(renderer.indexOf("'data-layer': 'connectors'") < renderer.indexOf("'data-layer': 'marks'"));
  assert.ok(renderer.indexOf("'data-layer': 'marks'") < renderer.indexOf("'data-layer': 'selection'"));
  assert.match(renderer, /clipPath/u);
  assert.match(renderer, /data-zero-baseline/u);
  assert.match(renderer, /data-standing-mark/u);
  assert.match(renderer, /data-selected-record-id/u);
  assert.doesNotMatch(semantics, /maximumFractionDigits|toFixed/u);
});

test('data-view controller cancels superseded requests and releases listener ownership', () => {
  assert.match(controller, /const ACTIVE_DATA_VIEW_LABS = new WeakMap\(\)/u);
  assert.match(controller, /const incumbent = ACTIVE_DATA_VIEW_LABS\.get\(root\)/u);
  assert.match(controller, /incumbent\?\.destroy\(REPLACEMENT_RELEASE\)/u);
  assert.match(controller, /ACTIVE_DATA_VIEW_LABS\.set\(root, api\)/u);
  assert.match(controller, /requestController\?\.abort\(\)/u);
  assert.match(controller, /new browser\.AbortController\(\)/u);
  assert.match(controller, /listenerOwner\?\.abort\(\)/u);
  assert.match(controller, /if \(state\.ownership\.standing === 'released'\) return JSON\.parse/u);
  assert.match(controller, /ownerGeneration/u);
  assert.match(controller, /addEventListener\('toggle'/u);
  assert.match(controller, /addEventListener\?\.\('pagehide'/u);
  assert.match(controller, /startupOwner\.abort\(\)/u);
  assert.ok(controller.indexOf('bindListeners();\n    present();') < controller.indexOf('incumbent?.destroy(REPLACEMENT_RELEASE)'));
  assert.match(controller, /if \(incumbent\) renderDataViewLab\(root, incumbent\.snapshot\(\)\)/u);
  assert.match(controller, /listenerOwner\?\.abort\(\);\s*listenerOwner = null;\s*const recoveryFailures/u);
});

test('data-view layout bounds dense views locally and retains narrow labels', () => {
  assert.match(css, /\.plot-scroller \{[^}]*overflow: auto/su);
  assert.match(css, /\.table-scroller \{[^}]*overflow: auto/su);
  assert.match(css, /\.table-scroller table \{ min-width: 44rem; \}/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /@media \(forced-colors: active\)/u);
  assert.match(css, /@media print/u);
  assert.match(css, /background-position: right 12px center/u);
  assert.match(css, /\.controls select:dir\(rtl\) \{ background-position: left 12px center; \}/u);
  assert.match(css, /padding-inline-end: 44px/u);
  assert.match(css, /\.controls select \{ appearance: auto;[^}]*background-image: none;/u);
});

test('documentation records every renderer boundary implemented by the model', () => {
  for (const boundary of ['0–80', '81–500', '0–48', '49–500', '0–120', '121–500', '0–12', '13–80']) {
    assert.match(readme, new RegExp(boundary, 'u'));
  }
});

test('standalone reading artifact carries every accepted record and its hosting boundary', () => {
  for (const record of current.records) assert.match(standalone, new RegExp(`data-record-id="${record.id}"`, 'u'));
  for (const relationship of current.relationships) assert.match(standalone, new RegExp(`data-relationship-id="${relationship.id}"`, 'u'));
  assert.equal((standalone.match(/data-record-id=/gu) ?? []).length, current.records.length);
  assert.equal((standalone.match(/data-relationship-id=/gu) ?? []).length, current.relationships.length);
  assert.match(standalone, /visual-fidelity-data-view-lab/u);
  assert.match(standalone, /Position x\/y/u);
  assert.match(standalone, /response-level frame policy and an iframe sandbox/u);
  assert.match(readme, /bundled synthetic fixtures and focused checks establish/u);
});
