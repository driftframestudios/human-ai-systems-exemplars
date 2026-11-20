import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseScoreTime, formatScoreTime } from '../../collaboration/native-investment-studio/score-time.mjs';

test('elapsed hours and minutes retain exact minute precision across days', () => {
  for (const [text, minutes] of [['11h30m', 690], ['11 h 30 min', 690], ['690 minutes', 690], ['00690', 690], ['25h 1m', 1501], ['0m', 0], ['1 hour', 60]])
    assert.equal(parseScoreTime(text), minutes, text);
  assert.equal(formatScoreTime(825), '13h 45m');
  assert.equal(formatScoreTime(100000000), '1666666h 40m');
  assert.equal(formatScoreTime(0), '0m');
});

test('calendar units, incomplete entries and fractional minutes remain explicit invalid text', () => {
  for (const text of ['', '1h 60m', '1.5h', '-30', '11:30', '1 day', '1 sprint', '1m 2h', '9007199254740992']) {
    assert.equal(parseScoreTime(text), null, text);
  }
  assert.equal(parseScoreTime(' 1h '), 60);
  assert.equal(parseScoreTime('1h 3'), null);
});
