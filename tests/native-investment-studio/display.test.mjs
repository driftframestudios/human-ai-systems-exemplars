import assert from 'node:assert/strict';
import { test } from 'node:test';
import { money, wholeMoney } from '../../collaboration/native-investment-studio/display.mjs';

test('compact monetary readings round displayed dollars while exact fields retain cents', () => {
  assert.equal(wholeMoney(12_550n), '$126');
  assert.equal(money(12_550), '$125.50');
  assert.equal(wholeMoney(null), 'Rate needed');
  assert.equal(wholeMoney(0), '$0');
});
