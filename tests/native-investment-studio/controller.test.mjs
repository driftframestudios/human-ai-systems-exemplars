import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';
import { startStaticServer as startVisualCheckServer } from '../../tools/visual-check.mjs';
import { startStaticServer as startVisualReferenceServer } from '../../tools/context-canvas-visual-reference.mjs';

const root = new URL('../../', import.meta.url);
const about = await readFile(new URL('context-canvas-project-surface/context-canvas/index.html', root), 'utf8');
const modulePaths = ['config', 'contract', 'state', 'draft', 'display', 'icons', 'person-draft', 'shell', 'team-controller', 'controller']
  .map(name => `collaboration/native-investment-studio/${name}.mjs`);

test('native About coordination has one module receiver and retains both legacy Studio routes', () => {
  assert.equal((about.match(/\bdata-native-coordination(?:\s|>)/gu) ?? []).length, 1);
  assert.match(about, /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="\.\.\/\.\.\/collaboration\/native-investment-studio\/controller\.mjs")[^>]*>/u);
  const fields = ['hoursPerSession', 'minutesPerSession', 'occurrences'];
  const nativePanel = about.slice(about.indexOf('<div class="native-coordination"'), about.indexOf('</section>', about.indexOf('<div class="native-coordination"')));
  assert.match(nativePanel, /<details\b[^>]*data-native-configure>\s*<summary>Session settings<\/summary>/u,
    'the native session disclosure remains the entry and return control');
  assert.doesNotMatch(nativePanel, /data-action="edit"/u, 'the live editor opens directly through its receiver');
  assert.equal((nativePanel.slice(0, nativePanel.indexOf('<section class="native-team"')).match(/<input\b/gu) ?? []).length, fields.length, 'the receiver exposes three independent quantities');
  for (const field of fields) {
    const input = about.match(new RegExp(`<input\\b(?=[^>]*\\bname="${field}")[^>]*>`, 'u'))?.[0];
    assert.ok(input, `${field} has its own input`);
    assert.match(input, /\btype="text"/u, 'raw lexical drafts reach the adapter');
    assert.match(input, /\binputmode="numeric"/u);
    const id = input.match(/\bid="([^"]+)"/u)?.[1];
    assert.ok(id && about.includes(`for="${id}"`), `${field} retains a native label relationship`);
    if (field !== 'occurrences') assert.match(input, /\baria-describedby="[^"]*\bnative-duration-label\b[^"]*"/u,
      `${field} refers to the shared duration explanation`);
  }
  assert.match(nativePanel, /role="group" aria-labelledby="native-duration-label"/u, 'the named duration group owns the combined readout and explanation');
  assert.match(nativePanel, /<output\b[^>]*for="native-hours native-minutes"[^>]*aria-live="off"[^>]*>/u);
  for (const part of ['hours', 'minutes']) {
    assert.equal((nativePanel.match(new RegExp(`data-native-duration-${part}`, 'gu')) ?? []).length, 1, `${part} has one combined readout receiver`);
    assert.match(nativePanel, new RegExp(`data-native-duration-${part}>\\d{2}</strong><span>${part}</span>`, 'u'), `${part} retains a visible unit label`);
  }
  assert.match(nativePanel, /<output\b[^>]*data-native-preview-total[^>]*aria-live="off"[^>]*>/u, 'the draft amount updates independently of the explicit-action live region');
  assert.match(about, /<iframe\b[^>]*data-about-content-fit="studio-chapters"[^>]*>/u);
  assert.match(about, /href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html"/u);
});

for (const [owner, start] of [
  ['shared browser helper', startStaticServer],
  ['focused visual check', startVisualCheckServer],
  ['Context Canvas visual reference', startVisualReferenceServer],
]) test(`${owner} serves every native module with JavaScript media and exact source bytes`, async () => {
  const server = await start(fileURLToPath(root));
  try {
    for (const path of modulePaths) {
      const response = await fetch(`${server.origin}/${path}`);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /^text\/javascript(?:;|$)/u, path);
      assert.equal(await response.text(), await readFile(new URL(path, root), 'utf8'), path);
    }
  } finally { await server.close(); }
});
