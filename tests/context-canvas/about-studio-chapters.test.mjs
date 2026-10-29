import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { readStudioChapterInputs, createStudioChapterProjection, assertStudioChapterProjection, studioChaptersPath } from '../../tools/materialize-about-studio-chapters.mjs';

test('Studio chapter projection preserves the complete source and nested report document', async () => {
  const inputs = await readStudioChapterInputs();
  const projected = createStudioChapterProjection(inputs);
  const about = await readFile(resolve(import.meta.dirname, '../..', 'context-canvas-project-surface/context-canvas/index.html'), 'utf8');
  assert.equal(projected.replace(/<style data-about-studio-chapters>\n[\s\S]*?\n<\/style>\n/u, '')
    .replace(/<script data-about-studio-chapters>\n[\s\S]*?\n<\/script>\n/u, '')
    .replace(/<!-- embedded-content-fit:start -->[\s\S]*?<!-- embedded-content-fit:end -->\n/u, ''), inputs.source,
  'removing the three added presentation blocks recovers every byte of the original instrument');
  assert.ok(inputs.source.includes('</body></html>\''), 'the original report generator carries its own body closer');
  assert.match(inputs.source, /<dt>Important now<\/dt>/u);
  assert.doesNotMatch(inputs.source, /Load-bearing now/u);
  assert.doesNotMatch(inputs.source, /Onward readings and source links continue/u);
  assert.match(inputs.source,
    /Plan the people, work, disruption, and learning an initiative actually asks for\. Complex, important initiatives are often cross-functional resource requests\.<\/p>/u);
  assert.match(about,
    /Six working chapters · coordination, plan, people, work and recovery, change modeling, and comparison · six starting plans/u);
  assert.match(about, /One Comparison entry opens the People chapter/u);
  assert.doesNotMatch(about, /One Comparison entry opens the second chapter/u);
  assert.equal(projected.match(/^<script data-about-studio-chapters>$/gmu).length, 1);
  assert.equal(projected.match(/^<style data-about-studio-chapters>$/gmu).length, 1);
  assert.equal(await readFile(resolve(import.meta.dirname, '../..', studioChaptersPath), 'utf8'), projected);
});

test('Studio derivation rejects stale output and unsafe or ambiguous inputs', async () => {
  const inputs = await readStudioChapterInputs();
  const projected = createStudioChapterProjection(inputs);
  assert.doesNotThrow(() => assertStudioChapterProjection(projected, inputs));
  assert.throws(() => assertStudioChapterProjection(projected.replace('id="horizon"', 'id="stale-horizon"'), inputs), /stale/u);
  for (const [key, value, reason] of [
    ['source', inputs.source + '\n</body>\n', /one line-owned/u],
    ['source', projected, /original full Studio/u],
    ['styles', 'section { color: red } </style>', /inline-safe CSS/u],
    ['adapter', 'document.body.textContent = "</script>";', /inline-safe JavaScript/u],
  ]) assert.throws(() => createStudioChapterProjection({ ...inputs, [key]: value }), reason);
});
