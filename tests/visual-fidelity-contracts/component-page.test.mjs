import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../../visual-fidelity-contracts/labs/component-lab/', import.meta.url);
const html = await readFile(new URL('index.html', ROOT), 'utf8');
const controller = await readFile(new URL('src/controller.js', ROOT), 'utf8');
const renderer = await readFile(new URL('src/render.js', ROOT), 'utf8');
const css = await readFile(new URL('src/styles/lab.css', ROOT), 'utf8');
const standalone = await readFile(new URL('standalone/index.html', ROOT), 'utf8');
const fixture = JSON.parse(await readFile(new URL('fixtures/valid/catalog.json', ROOT), 'utf8'));

test('component page preserves native labels, live status, dialog, and JavaScript-disabled meaning', () => {
  assert.match(html, /data-component-lab data-component-js-state="reading"/u);
  assert.match(html, /<form data-component-form action="\.\/standalone\/" method="get" novalidate>/u);
  assert.match(html, /<label for="component-email">Receipt email<\/label>/u);
  assert.match(html, /<label for="component-quantity">Quantity<\/label>/u);
  assert.match(html, /class="form-field">\s*<label for="component-email">[\s\S]*?<input id="component-email"/u);
  assert.match(html, /class="form-field">\s*<label for="component-authorization">[\s\S]*?<select id="component-authorization"/u);
  assert.match(html, /role="status"[^>]+aria-live="polite"/u);
  assert.match(html, /<dialog\b[^>]*data-component-dialog/u);
  assert.match(html, /<noscript>[\s\S]*Reading representation/u);
  assert.match(html, /data-component-machine-twin/u);
  assert.match(standalone, /Review the catalog and see how an order becomes accepted/u);
  assert.match(standalone, /href="\.\.\/">Run the interactive lab<\/a>/u);
  assert.match(standalone, /href="\.\.\/README\.md">Read the source guide<\/a>/u);
  assert.match(html, /Content-Security-Policy/u);
  assert.match(html, /href="\.\/standalone\/"/u);
  assert.match(html, /data-component-payment/u);
  assert.match(html, /data-component-order/u);
  assert.match(html, /data-component-action="reload" disabled/u);
  assert.match(html, /name="catalog-item" value="field-notebook" checked disabled/u);
  assert.match(html, /id="component-email"[^>]+disabled/u);
  assert.match(html, /id="component-authorization" disabled/u);
  assert.match(html, /data-component-submit disabled/u);
});

test('component controller owns request, listener, timer, dialog, and idempotent release paths', () => {
  assert.match(controller, /const ACTIVE_COMPONENT_LABS = new WeakMap\(\)/u);
  assert.match(controller, /const incumbent = ACTIVE_COMPONENT_LABS\.get\(root\)/u);
  assert.match(controller, /createComponentSuccessorState\(initialFixture, incumbent\.snapshot\(\)\)/u);
  assert.match(controller, /incumbent\?\.destroy\(REPLACEMENT_RELEASE\)/u);
  assert.match(controller, /ACTIVE_COMPONENT_LABS\.set\(root, api\)/u);
  assert.match(controller, /new browser\.AbortController\(\)/u);
  assert.match(controller, /requestController\?\.abort\(\)/u);
  assert.match(controller, /listenerOwner\?\.abort\(\)/u);
  assert.match(controller, /browser\.clearTimeout\(reconcileTimer\)/u);
  assert.match(controller, /if \(state\.ownership\.standing === 'released'\) return JSON\.parse/u);
  assert.match(controller, /ownerGeneration/u);
  assert.match(controller, /bindListeners\(\)/u);
  assert.match(controller, /dialog\.showModal\(\)/u);
  assert.match(controller, /dialogInvoker\?\.isConnected/u);
  assert.match(controller, /destination\?\.focus\(\{ preventScroll: true \}\)/u);
  assert.ok(controller.indexOf('bindListeners();\n    present();') < controller.indexOf('incumbent?.destroy(REPLACEMENT_RELEASE)'));
  assert.match(controller, /if \(incumbent\) renderComponentLab\(root, incumbent\.snapshot\(\)\)/u);
  assert.match(controller, /listenerOwner\?\.abort\(\);\s*listenerOwner = null;\s*const recoveryFailures/u);
});

test('component same-root transfer admits semantic continuity before local work', () => {
  assert.match(controller, /createComponentSuccessorState\(initialFixture, incumbent\.snapshot\(\)\)/u);
  assert.ok(controller.indexOf('createComponentSuccessorState(initialFixture, incumbent.snapshot())')
    < controller.indexOf('renderComponentLab(root.cloneNode(true), admittedState)'));
});

test('component renderer uses safe node construction for untrusted fixture text', () => {
  assert.match(renderer, /document\.createElement\(/u);
  assert.match(renderer, /\.textContent =/u);
  assert.doesNotMatch(renderer, /innerHTML|insertAdjacentHTML|document\.write/u);
  assert.match(renderer, /querySelector\('#component-email'\)\.value = state\.draft\.email/u);
  assert.match(renderer, /querySelector\('#component-quantity'\)\.value = state\.draft\.quantity/u);
});

test('component CSS carries bounded responsive and focus behavior', () => {
  assert.match(css, /@media \(max-width: 48rem\)/u);
  assert.match(css, /:focus-visible/u);
  assert.match(css, /\.drawer::backdrop/u);
  assert.match(css, /prefers-reduced-motion/u);
  assert.match(css, /forced-colors: active/u);
  assert.match(css, /@media print/u);
  assert.match(css, /padding-inline-end: 44px/u);
  assert.match(css, /background-position: right 12px center/u);
  assert.match(css, /\.panel--intent select:dir\(rtl\) \{ background-position: left 12px center; \}/u);
  assert.match(css, /\.panel--intent form \{[^}]*grid-template-columns: minmax\(0, 1fr\);/u);
  assert.match(css, /\.panel \{[^}]*padding: clamp\(16px, 3vw, 2rem\);/u);
  assert.match(css, /\.panel--intent input, \.panel--intent select \{[^}]*min-width: 0;[^}]*min-inline-size: 0;[^}]*max-width: 100%;[^}]*max-inline-size: 100%;/u);
  assert.match(css, /\.panel--intent select \{[^}]*display: block;[^}]*inline-size: 100%;[^}]*contain: inline-size;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/u);
  assert.match(css, /\.price-row \{[^}]*flex-wrap: wrap;/u);
  assert.match(css, /\.live-status, \.status-banner \{[^}]*overflow-wrap: anywhere;/u);
  assert.match(css, /\.panel--intent select \{ appearance: auto;[^}]*background-image: none;/u);
  assert.match(css, /\[data-component-js-state="enhanced"\] \[data-component-submit\]:disabled/u);
});

test('component standalone reading artifact retains accepted fixture identity and values', () => {
  assert.match(standalone, new RegExp(`data-fixture-id="${fixture.componentLabId}"`, 'u'));
  assert.match(standalone, new RegExp(`data-fixture-revision="${fixture.revision}"`, 'u'));
  for (const item of fixture.catalog) {
    assert.match(standalone, new RegExp(item.label, 'u'));
    assert.match(standalone, new RegExp(`\\$${(item.unitPriceCents / 100).toFixed(2).replace('.', '\\.')} · ${item.stock} available`, 'u'));
  }
  assert.match(standalone, /Content-Security-Policy/u);
  assert.match(standalone, /uses static HTML and CSS/u);
  assert.match(standalone, /Receiving environments/u);
});
