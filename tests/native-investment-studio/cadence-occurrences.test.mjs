import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCadenceOccurrenceIndex } from '../../collaboration/native-investment-studio/cadence-occurrences.mjs';

test('membership keeps interleaved identities, same-cell sessions and unplaced work in supplied order', () => {
  const rows = [
    { workId: 'review', occurrenceIndex: 2, periodId: 'p2', subdivision: 1, funding: 'allocated', active: true },
    { workId: 'followup', occurrenceIndex: 0, periodId: 'p2', subdivision: 1, funding: 'additional', active: true },
    { workId: 'review', occurrenceIndex: 0, periodId: 'p2', subdivision: 1, funding: 'additional', active: true },
    { workId: 'review', occurrenceIndex: 1, periodId: 'p2', subdivision: 1, funding: 'additional', active: false },
    { workId: 'review', occurrenceIndex: 3, periodId: null, subdivision: null, funding: 'allocated', active: true },
    { workId: 'followup', occurrenceIndex: 1, periodId: 'p1', subdivision: 2, funding: 'allocated', active: true },
  ];
  let visits = 0;
  const index = createCadenceOccurrenceIndex({ *[Symbol.iterator]() { for (const row of rows) { visits++; yield row; } } });
  const identities = members => members.map(row => `${row.workId}:${row.occurrenceIndex}`);
  assert.deepEqual(identities(index.forWork('review')), ['review:2', 'review:0', 'review:1', 'review:3']);
  assert.deepEqual(identities(index.forPeriod('p2')), ['review:2', 'followup:0', 'review:0', 'review:1']);
  assert.deepEqual(identities(index.forPeriod('p1', 2)), ['followup:1']);
  assert.deepEqual(index.forCell('review', 'p2', 1).map(row => [row.occurrenceIndex, row.funding, row.active]),
    [[2, 'allocated', true], [0, 'additional', true], [1, 'additional', false]]);
  assert.deepEqual(identities(index.forPeriod(null)), ['review:3']);
  assert.deepEqual(index.forCell('review', 'p1', 2), []);
  assert.deepEqual(index.forWork('empty'), []);
  assert.deepEqual(index.forPeriod('p3'), []);
  assert.deepEqual(index.forPeriod('p2', 2), []);
  assert.equal(visits, 6, 'queries use prepared membership rather than revisit the occurrence input');
  assert.strictEqual(index.forCell('review', 'p2', 1)[0], rows[0]);
  assert.ok(Object.isFrozen(index));
  assert.throws(() => index.forPeriod('p2').pop(), TypeError);
  assert.throws(() => index.forWork('empty').push(rows[0]), TypeError);
});
