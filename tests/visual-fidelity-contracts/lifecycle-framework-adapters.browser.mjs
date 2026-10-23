import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { build } from 'esbuild';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const adapterPath = path.join(
  repositoryRoot,
  'visual-fidelity-contracts/labs/lifecycle-lab/framework-adapters/react-19.2.0.mjs'
);

async function bundledAdapter() {
  const result = await build({
    entryPoints: [adapterPath],
    bundle: true,
    format: 'iife',
    globalName: 'VisualFidelityReactAdapter',
    platform: 'browser',
    write: false,
    logLevel: 'silent'
  });
  return result.outputFiles[0].text;
}

test('React 19.2 browser adapters exercise supported DOM lifecycle behavior', async () => {
  const [reactPackage, reactDomPackage, adapterSource, script] = await Promise.all([
    readFile(path.join(repositoryRoot, 'node_modules/react/package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(repositoryRoot, 'node_modules/react-dom/package.json'), 'utf8').then(JSON.parse),
    readFile(adapterPath, 'utf8'),
    bundledAdapter()
  ]);
  assert.equal(reactPackage.version, '19.2.0');
  assert.equal(reactDomPackage.version, '19.2.0');
  assert.match(adapterSource, /react-dom\/client/u);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setContent('<main><div id="strict"></div><div id="store"></div></main>');
    await page.addScriptTag({ content: script });

    const receipts = await page.evaluate(async () => ({
      strict: await VisualFidelityReactAdapter.exerciseStrictModeEffectReplay(document.querySelector('#strict')),
      store: await VisualFidelityReactAdapter.exerciseExternalStoreCoherence(document.querySelector('#store'))
    }));

    assert.equal(receipts.strict.runtime, 'react@19.2.0');
    assert.equal(receipts.strict.renderer, 'react-dom@19.2.0');
    assert.deepEqual(receipts.strict.afterMount, { setups: 2, cleanups: 1, activeResources: 1 });
    assert.deepEqual(receipts.strict.afterUnmount, { setups: 2, cleanups: 2, activeResources: 0 });
    assert.deepEqual(receipts.strict.events, [
      'setup:1:active:1',
      'cleanup:1:active:0',
      'setup:2:active:1',
      'cleanup:2:active:0'
    ]);

    assert.equal(receipts.store.runtime, 'react@19.2.0');
    assert.equal(receipts.store.renderer, 'react-dom@19.2.0');
    assert.equal(receipts.store.visibleText, '2:accepted:2');
    assert.deepEqual(receipts.store.snapshots, [
      { revision: 1, label: 'ready', count: 1 },
      { revision: 2, label: 'accepted', count: 2 }
    ]);
    assert.equal(receipts.store.subscriptions, 1);
    assert.equal(receipts.store.releases, 1);
    assert.equal(receipts.store.activeSubscriptions, 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
