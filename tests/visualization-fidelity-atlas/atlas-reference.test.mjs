import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { aggregateLabels, buildReference, DATA_PATH, escapeMarkup, parseLabels, renderSvg, renderTable, replaceSection } from '../../tools/build-atlas-reference.mjs';

test('published source retains independently specified monthly counts and all records', async () => {
  const text = await readFile(new URL(`../../${DATA_PATH}`, import.meta.url), 'utf8');
  const records = parseLabels(text);
  const before = JSON.stringify(records);
  const groups = aggregateLabels(records);
  assert.equal(records.length, 1567);
  assert.deepEqual(groups.map(group => [group.period, group.tested, group.failed, group.firstDay, group.lastDay]), [
    ['2008-07', 63, 14, 19, 31], ['2008-08', 555, 51, 1, 31], ['2008-09', 590, 17, 1, 30], ['2008-10', 359, 22, 1, 17],
  ]);
  assert.equal(groups.reduce((sum, group) => sum + group.failed, 0), 104);
  assert.deepEqual(groups.map(group => group.ratePer100.toFixed(1)), ['22.2', '9.2', '2.9', '6.1']);
  assert.equal(JSON.stringify(records), before);
});

for (const record of ['', '0 "19/07/2008 11:55:00"', '1 "31/04/2008 11:55:00"', '1 "29/02/2007 11:55:00"', '1 "19/13/2008 11:55:00"', '1 "00/07/2008 11:55:00"', '1 "19/07/2008 24:00:00"', '1 "19/07/2008 11:60:00"', '1 "19/07/2008 11:55:60"', '1 "19/07/0000 11:55:00"']) {
  test(`source admission identifies malformed record ${JSON.stringify(record)}`, () => assert.throws(() => parseLabels(record), /Invalid/u));
}
test('civil timestamps and CRLF preserve source meaning', () => {
  const records = parseLabels('1 "29/02/2008 23:59:59"\r\n-1 "01/03/2008 00:00:00"\r\n');
  assert.equal(records[0].timestamp, '2008-02-29T23:59:59');
  assert.deepEqual(records.map(record => record.failed), [true, false]);
});
test('source admission bounds type and size', () => {
  for (const input of [null, [], ' '.repeat(1_000_001)]) assert.throws(() => parseLabels(input), TypeError);
});
test('markup escaping retains literal text safely', () => assert.equal(escapeMarkup('<&"\'>'), '&lt;&amp;&quot;&#39;&gt;'));
test('the composition admits its declared scale and row count', () => {
  for (const groups of [[], Array(4).fill({ ratePer100: NaN }), Array(4).fill({ ratePer100: 26 })]) assert.throws(() => renderSvg(groups), /four finite rates/u);
});
test('table maintains native relationships and neutral supplemental labels', () => {
  const groups = aggregateLabels(parseLabels('1 "19/07/2008 11:55:00"'));
  const table = renderTable(groups);
  assert.equal((table.match(/scope="col"/gu) ?? []).length, 4);
  assert.match(table, /scope="row" data-label="Observation window"/u);
  assert.match(table, /data-label="Failed tests per 100 recorded tests">100.0/u);
});
test('section replacement preserves surrounding source and rejects ambiguous ownership', () => {
  assert.equal(replaceSection('before<section aria-labelledby="exemplar-title">old</section>after', 'new'), 'beforenewafter');
  for (const page of ['<section>other</section>', '<section aria-labelledby="exemplar-title">', '<section aria-labelledby="exemplar-title"></section><section aria-labelledby="exemplar-title"></section>']) assert.throws(() => replaceSection(page, 'new'), /one Atlas reference/u);
});
test('committed figure, data and page are the exact reviewed derivation', async () => {
  assert.deepEqual(await buildReference({ check: true }), { records: 1567, failures: 104, windows: 4, outputs: 3 });
});
