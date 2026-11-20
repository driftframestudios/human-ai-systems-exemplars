import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { parseExpressionAt } from 'acorn';

// Read a selected expression from a trusted Studio fixture. The JavaScript
// parser owns its end offset, including nested functions and string literals.
export function expressionAt(source, offset) {
  assert.ok(offset >= 0, 'the source contains the selected expression');
  const expression = parseExpressionAt(source, offset, { ecmaVersion: 'latest' });
  return source.slice(expression.start, expression.end);
}

export function authoredFunction(source, name) {
  return expressionAt(source, source.search(new RegExp('\\bfunction\\s+' + name + '\\s*\\(')));
}

export function authoredLiteral(source, name) {
  const assignment = new RegExp('\\b(?:var|let|const)\\s+' + name + '\\s*=\\s*').exec(source);
  assert.ok(assignment, 'the source declares ' + name);
  const literal = expressionAt(source, assignment.index + assignment[0].length);
  return JSON.parse(JSON.stringify(runInNewContext('(' + literal + ')')));
}
