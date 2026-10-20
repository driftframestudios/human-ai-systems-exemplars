import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { FRAMEWORK_CONTRACTS } from '../../visual-fidelity-contracts/labs/lifecycle-lab/framework-contracts.js';
import { RUNTIME_RECEIPT } from '../../visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-model.js';
import { PLATFORM_ADAPTER_RECEIPTS } from '../../visual-fidelity-contracts/labs/lifecycle-lab/platform-adapters.js';
import { SCENARIOS } from '../../visual-fidelity-contracts/labs/lifecycle-lab/scenario-data.js';

const lab = new URL('../../visual-fidelity-contracts/labs/lifecycle-lab/', import.meta.url);
const browserProbe = new URL('../../visual-fidelity-contracts/probes/browser/README.md', import.meta.url);
const frameworkProbe = new URL('../../visual-fidelity-contracts/probes/frameworks/README.md', import.meta.url);

async function source(name) {
  return readFile(new URL(name, lab), 'utf8');
}

test('source HTML keeps the complete reading available before enhancement', async () => {
  const [html, sandbox] = await Promise.all([source('index.html'), source('sandbox-specimen.html')]);
  assert.match(html, /<noscript>/u);
  assert.match(html, /data-static-reading/u);
  assert.equal((html.match(/<details/gu) || []).length, 8);
  assert.match(html, /<dialog /u);
  assert.match(html, /<form method="dialog">/u);
  assert.match(html, /<output class="status" data-status role="status" aria-live="polite" aria-atomic="true">/u);
  assert.match(html, /<iframe src="sandbox-specimen\.html" sandbox/u);
  assert.match(html, /Content-Security-Policy/u);
  assert.match(html, /<label for="lifecycle-scenario">Lifecycle scenario<\/label>\s*<select id="lifecycle-scenario"/u);
  assert.match(html, /data-retirement-recovery role="status" hidden/u);
  assert.doesNotMatch(html, /<script(?! type="module" src="lifecycle-lab\.js")/u);
  assert.match(sandbox, /default-src 'none'/u);
  assert.doesNotMatch(sandbox, /<script\b/iu);
});

test('CSS names cascade, containment, overflow, and alternate-media owners', async () => {
  const css = await source('styles.css');
  for (const token of ['@layer reset, tokens, base, components, states, media', 'container: lifecycle-lab / inline-size',
    '@container lifecycle-lab', '@media (forced-colors: active)', '@media print',
    '@media (prefers-reduced-motion: no-preference)', '@media (prefers-color-scheme: dark)', 'overflow-x: auto']) {
    assert.ok(css.includes(token), `CSS retains ${token}`);
  }
  assert.match(css, /background-position: right \.75rem center/u);
  assert.match(css, /select:dir\(rtl\) \{ background-position: left \.75rem center; \}/u);
  assert.match(css, /select \{ appearance: auto;[^}]*background-image: none;/u);
});

test('the enhancement declares explicit cancellation, history, focus, and page release paths', async () => {
  const [sourceText, model, adapters] = await Promise.all([
    source('lifecycle-lab.js'), source('lifecycle-model.js'), source('platform-adapters.js'),
  ]);
  for (const token of ['new AbortController()', "addEventListener('popstate'", "addEventListener('pagehide'",
    'dialogInvoker?.focus()', 'controller.recordDialogFocus', 'host.history.pushState', 'lifetime.abort()', 'controller.destroy()',
    "controller.own('infrastructure'", 'recordRetirementFailure', 'exposeRetirementReceipt', 'retryRetirement',
    'projectedRetirementStatus', 'retirementLedger', "standing: 'inactive'", 'activeOwnerId']) {
    assert.ok(sourceText.includes(token), `enhancement retains ${token}`);
  }
  for (const token of ['ownerGeneration', 'requests.delete', 'cancelPendingRequests', 'await runReplacement',
    'createImmutableExternalStoreAdapter', 'createRevisionCacheAdapter', 'serverContractVersion']) {
    assert.ok(model.includes(token), `model retains ${token}`);
  }
  for (const token of ['createSerializedCommitQueue', 'ObserverNotificationError', 'admittedRevision']) {
    assert.ok(adapters.includes(token), `platform adapters retain ${token}`);
  }
});

test('script-independent scenario, framework, and receipt prose stays aligned with the executable sources', async () => {
  const html = await source('index.html');
  for (const scenario of SCENARIOS) {
    assert.ok(html.includes(`data-scenario-id="${scenario.id}"`), `static reading includes ${scenario.id}`);
    for (const value of [scenario.label, scenario.question, scenario.oracle, scenario.owner,
      scenario.release, scenario.preservedWork, scenario.reentry]) {
      assert.ok(html.includes(value), `${scenario.id} keeps “${value}”`);
    }
  }
  for (const contract of FRAMEWORK_CONTRACTS) {
    assert.ok(html.includes(`data-framework-id="${contract.id}"`), `framework table includes ${contract.id}`);
    for (const value of [contract.family, contract.platformMechanism, contract.localEvidence, contract.transferQuestion]) {
      assert.ok(html.includes(value), `${contract.id} keeps “${value}”`);
    }
  }
  for (const receipt of PLATFORM_ADAPTER_RECEIPTS) {
    assert.ok(html.includes(`${receipt.id}@${receipt.version}`), `static receipt includes ${receipt.id}`);
  }
  assert.ok(html.includes(RUNTIME_RECEIPT.labVersion));
  assert.ok(html.includes(RUNTIME_RECEIPT.sourceDate));
  assert.ok(html.includes(RUNTIME_RECEIPT.preservedWorkAndReentry));
});

test('browser and framework probe sets carry questions, faults, receipts, and evidence standing', async () => {
  const [browser, framework] = await Promise.all([readFile(browserProbe, 'utf8'), readFile(frameworkProbe, 'utf8')]);
  for (const id of ['VF-B1', 'VF-B2', 'VF-B3', 'VF-B4', 'VF-B5']) assert.ok(browser.includes(id));
  for (const id of ['VF-F1', 'VF-F2', 'VF-F3', 'VF-F4']) assert.ok(framework.includes(id));
  assert.equal((browser.match(/\*\*Controlled fault:\*\*/gu) || []).length, 5);
  assert.equal((browser.match(/\*\*Receipt:\*\*/gu) || []).length, 5);
  assert.equal((framework.match(/\*\*Transfer receipt:\*\*/gu) || []).length, 4);
  assert.match(framework, /gains runtime standing when its named adapter runs these probes/u);
});

test('public lab and probe sources stay free of private workspace locators and secret-shaped values', async () => {
  const values = await Promise.all([
    source('README.md'), source('index.html'), source('lifecycle-lab.js'), source('lifecycle-model.js'),
    source('scenario-data.js'), source('framework-contracts.js'), source('platform-adapters.js'),
    source('framework-adapters/react-19.2.0.mjs'),
    readFile(browserProbe, 'utf8'), readFile(frameworkProbe, 'utf8'),
  ]);
  const joined = values.join('\n');
  assert.doesNotMatch(joined, /notion\.so|notion\.site|\/Users\/|\.codex\/|api[_-]?token|BEGIN (?:RSA|OPENSSH) PRIVATE KEY/iu);
});
