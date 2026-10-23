import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { galleryJsonText, renderGalleryTable } from '../../context-canvas-project-surface/context-canvas/atlas-gallery-table.js';

const fixture = () => ({ caption: 'Observed records', columns: ['Group', 'Records', 'Rate per 100'], rows: [
  { label: 'Present', values: [4, 0] }, { label: 'Empty', values: [0, 'Unavailable: empty population'] },
] });

test('native headers, zero and named absence survive the table projection', () => {
  const input = fixture();
  const before = structuredClone(input);
  const html = renderGalleryTable(input);
  assert.deepEqual(input, before);
  assert.equal((html.match(/scope="col"/gu) || []).length, 3);
  assert.equal((html.match(/scope="row"/gu) || []).length, 2);
  assert.match(html, /data-label="Observed records: Empty"/u);
  assert.match(html, /data-label="Rate per 100">0<\/td>/u);
  assert.match(html, /Unavailable: empty population/u);
});

for (const [name, mutate] of [
  ['missing values', input => { input.rows[0].values.pop(); }],
  ['empty rows', input => { input.rows = []; }],
  ['nonfinite value', input => { input.rows[0].values[0] = Infinity; }],
  ['unnamed state', input => { input.rows[0].values[0] = ''; }],
  ['oversized rows', input => { input.rows = Array(401).fill(input.rows[0]); }],
]) test(`table rejects ${name} explicitly`, () => {
  const input = fixture(); mutate(input);
  assert.throws(() => renderGalleryTable(input), TypeError);
});

test('literal markup and closing-script text retain their data meaning', () => {
  const input = fixture(); input.rows[0].label = '<script>"A&B"</script>';
  const html = renderGalleryTable(input);
  assert.ok(html.includes('&lt;script&gt;&quot;A&amp;B&quot;&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  const value = { text: '</script><script>alert(1)</script>\u2028' };
  const encoded = galleryJsonText(value);
  assert.ok(!encoded.includes('<'));
  assert.deepEqual(JSON.parse(encoded), value);
});
