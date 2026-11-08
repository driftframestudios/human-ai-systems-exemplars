import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

// Observe the browser's real keyed movement without replacing its animation.
export async function participantMovement(page, list) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const motion = value => page.evaluate(async choice => {
    const { mountStudioMotion } = await import('/collaboration/native-investment-studio/motion.mjs');
    mountStudioMotion(document.querySelector('[data-native-coordination]')).set(choice);
  }, value);
  await motion('full');
  const initial = await list.evaluate(element => {
    const rows = [...element.children], identity = row => row.querySelector('input').dataset.sessionPerson
      ?? row.querySelector('input').dataset.assemblyMember;
    element.movementProbe = { rows, calls: [], animations: [] };
    for (const row of rows) {
      row.originalAnimate = row.animate;
      row.animate = function (...args) {
        const animation = this.originalAnimate(...args);
        element.movementProbe.calls.push(identity(this));
        element.movementProbe.animations.push(animation);
        return animation;
      };
    }
    const included = rows.filter(row => row.querySelector('input').checked)
      .sort((a, b) => Number(a.querySelector('.native-coordination__member-status').textContent.split('·').at(-1))
        - Number(b.querySelector('.native-coordination__member-status').textContent.split('·').at(-1))).map(identity);
    return { order: rows.map(identity), included };
  });
  assert.ok(initial.included.length >= 2, 'the populated receiver can demonstrate an explicit move');
  const row = list.locator('li').filter({ has: list.page().locator(`input[data-session-person="${initial.included[0]}"],input[data-assembly-member="${initial.included[0]}"]`) });
  const checkbox = row.locator('input');
  await row.getByRole('button', { name: /^Move down:/u }).focus();
  await page.keyboard.press('Enter');
  await expect(checkbox).toBeFocused();
  const moved = await list.evaluate(async element => {
    await Promise.all(element.movementProbe.animations.map(animation => animation.finished));
    return { order: [...element.children].map(row => row.querySelector('input').dataset.sessionPerson ?? row.querySelector('input').dataset.assemblyMember),
      calls: element.movementProbe.calls, retained: element.movementProbe.rows.every(row => row.parentElement === element) };
  });
  const selected = new Set(initial.included), movedIds = [...initial.included];
  [movedIds[0], movedIds[1]] = [movedIds[1], movedIds[0]];
  let position = 0;
  const expected = initial.order.map(id => selected.has(id) ? movedIds[position++] : id);
  assert.deepEqual(moved.order, expected, 'the same person cards occupy their new positions');
  assert.equal(moved.retained, true, 'reordering preserves the mounted participant controls');
  const changedPositions = initial.order.filter((id, index) => expected[index] !== id);
  assert.ok(changedPositions.length >= 2 && changedPositions.every(id => moved.calls.includes(id)),
    'every card changing position receives the shared browser animation');

  await motion('off');
  await list.evaluate(element => { element.movementProbe.calls = []; });
  await row.getByRole('button', { name: /^Move up:/u }).click();
  await expect(checkbox).toBeFocused();
  position = 0;
  const restored = initial.order.map(id => selected.has(id) ? initial.included[position++] : id);
  assert.deepEqual(await list.evaluate(element => [...element.children].map(row => row.querySelector('input').dataset.sessionPerson ?? row.querySelector('input').dataset.assemblyMember)), restored);
  assert.deepEqual(await list.evaluate(element => element.movementProbe.calls), [], 'Off settles the same reorder without animation');
  const geometry = () => list.evaluate(element => {
    const origin = element.getBoundingClientRect();
    return [...element.children].map(row => {
      const box = row.getBoundingClientRect();
      return [box.x - origin.x, box.y - origin.y, box.width, box.height].map(value => Math.round(value * 1000) / 1000);
    });
  });
  const before = await geometry(), last = list.locator(`input[data-session-person="${initial.included.at(-1)}"],input[data-assembly-member="${initial.included.at(-1)}"]`);
  await last.uncheck(); await expect(last).toBeFocused();
  assert.deepEqual(await geometry(), before, 'inclusion retains every neighboring card slot');
  await last.check();
  assert.deepEqual(await geometry(), before);
  await list.evaluate(element => {
    for (const row of element.movementProbe.rows) { row.animate = row.originalAnimate; delete row.originalAnimate; }
    delete element.movementProbe;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}
