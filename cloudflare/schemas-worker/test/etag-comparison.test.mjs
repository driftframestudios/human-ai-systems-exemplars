import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import test from "node:test";
import { weakETagMatches } from "./http-validators.mjs";

test("conditional validators follow the RFC weak-comparison examples", () => {
  for (const [left, right, expected] of [
    ['W/"1"', 'W/"1"', true],
    ['W/"1"', 'W/"2"', false],
    ['W/"1"', '"1"', true],
    ['"1"', 'W/"1"', true],
    ['"1"', '"1"', true],
    ['"a"', '"A"', false],
    ['""', 'W/""', true],
    ['"\u00e9"', 'W/"\u00e9"', true],
    ['"a\\b"', 'W/"a\\b"', true],
    ['"a\\b"', '"ab"', false],
  ]) assert.equal(weakETagMatches(left, right), expected, `${left} / ${right}`);
});

test("missing and malformed validators remain distinct from valid entity tags", () => {
  for (const value of [null, undefined, 1, {}, "", "*", "tag", 'w/"tag"', 'W/tag', ' "tag"', '"tag" ', '"tag"\n', '"tag"\r\n', '"ta g"', '"ta\tg"', '"ta\u007fg"', '"ta\u0100g"', '"ta"g"', '"tag", "other"']) {
    assert.equal(weakETagMatches(value, value), false);
    assert.equal(weakETagMatches(value, '"tag"'), false);
    assert.equal(weakETagMatches('"tag"', value), false);
  }
});
