import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const about = await readFile(new URL('../../context-canvas-project-surface/context-canvas/index.html', import.meta.url), 'utf8');
const teamSection = about.match(/<section\b[^>]*\bdata-native-team-editor\b[\s\S]*?<\/section>/u)?.[0];
const team = teamSection?.match(/<details\b[^>]*\bdata-person-configure\b[\s\S]*?<\/details>/u)?.[0];

test('About gives person settings a separate form with connected labels and field feedback', () => {
  assert.ok(team, 'About carries the Team Assembly receiver');
  assert.equal((team.match(/<form\b/gu) ?? []).length, 1);
  assert.equal((team.match(/<input\b/gu) ?? []).length, 3);
  assert.match(team, /<fieldset\b[^>]*\bdisabled\b[^>]*\baria-label="Person rate and funded time"/u);
  for (const [field, mode] of [['ratePerHour', 'decimal'], ['fundedHours', 'numeric'], ['fundedMinutes', 'numeric']]) {
    const input = team.match(new RegExp(`<input\\b(?=[^>]*\\bname="${field}")[^>]*>`, 'u'))?.[0];
    assert.ok(input, field);
    assert.match(input, /\btype="text"/u, 'the adapter receives unfinished lexical drafts');
    assert.match(input, new RegExp(`\\binputmode="${mode}"`, 'u'));
    const id = input.match(/\bid="([^"]+)"/u)?.[1];
    assert.ok(id && team.includes(`for="${id}"`), `${field} has a native label`);
    const descriptions = input.match(/\baria-describedby="([^"]+)"/u)?.[1].split(/\s+/u);
    assert.ok(descriptions?.length, `${field} has adjacent guidance and feedback`);
    for (const description of descriptions) {
      assert.equal(about.split(`id="${description}"`).length - 1, 1, description);
      assert.ok(team.includes(`id="${description}"`), `${description} belongs to this form`);
    }
    assert.match(team, new RegExp(`id="${id}-error" data-person-error="${field}"`, 'u'));
    for (const step of ['-1', '1']) {
      const button = team.match(new RegExp(`<button\\b(?=[^>]*data-person-field="${field}")(?=[^>]*data-step="${step}")[^>]*>`, 'u'))?.[0];
      assert.ok(button, `${field} carries ${step}`);
      assert.match(button, /\btype="button"/u, 'step controls keep submission with Apply');
      assert.match(button, /\baria-label="[^"]+"/u);
    }
  }
  assert.match(team, /data-person-action="apply"/u);
  assert.match(team, /data-person-action="cancel"/u);
  assert.doesNotMatch(team, /\bdata-action=|\bdata-field=/u,
    'the nested receiver retains separate action and field routes');
});

test('person drafts keep the live total quiet and retain explicit status and full-Studio routes', () => {
  assert.match(team, /<output\b(?=[^>]*data-person-total)(?=[^>]*aria-live="off")[^>]*>/u);
  assert.match(teamSection, /<p\b(?=[^>]*data-person-status)(?=[^>]*role="status")(?=[^>]*aria-live="polite")[^>]*>/u);
  assert.match(team, /Leave blank if unknown\./u, 'a missing rate stays distinguishable from zero');
  assert.match(about, /<iframe\b[^>]*data-about-content-fit="studio-chapters"[^>]*>/u);
  assert.match(about, /href="\.\.\/\.\.\/collaboration\/initiative-costing-calculator\/index.html"/u);
});
