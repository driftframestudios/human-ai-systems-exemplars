import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';

// Focused chapter cases use the authored About receiver and its styles. The
// complete-page journeys retain the rest of About and its independent owners.
export function createNativeAboutFixture(source, { tail = '', nativeBoot = true } = {}) {
  const opening = '<section class="about-field about-field--studio"';
  const start = source.indexOf(opening), end = source.indexOf('<section class="about-field ', start + opening.length);
  const main = '<main id="main">', prefixEnd = source.indexOf(main) + main.length;
  assert.ok(start > prefixEnd && end > start, 'the final Studio has one bounded About section');
  const studio = source.slice(start, end);
  assert.equal((studio.match(/\bdata-native-coordination(?:\s|>)/gu) ?? []).length, 1, 'the authored Studio contains one native plan owner');
  assert.match(studio, /<details class="about-studio-counterpart">/u, 'the static counterpart begins closed beside the native owner');
  assert.match(studio, /href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html"/u, 'the full Studio retains an onward route');
  const prefix = source.slice(0, prefixEnd).replace(/<script\b[\s\S]*?<\/script>/gu,
    script => nativeBoot && script.includes('collaboration/native-investment-studio/controller.mjs') ? script : '');
  return `${prefix}${studio}${tail}</main></body></html>`;
}
