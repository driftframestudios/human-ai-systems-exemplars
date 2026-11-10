import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';

// Check painted labels and separate targets, rather than accepting a clickable
// center while a neighboring key covers part of the same button.
export async function assertReelFit(reel, width) {
  await reel.scrollIntoViewIfNeeded();
  const observation = await reel.evaluate(element => {
    const bounds = rect => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
    return {
      label: element.querySelector('legend').textContent,
      controls: [...element.querySelectorAll('.native-reel__choice,.native-reel__hub')].map(control => {
        const rect = control.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(control);
        return { label: control.getAttribute('aria-label') || control.textContent, rect: bounds(rect),
          text: [...range.getClientRects()].map(bounds),
          reachable: control.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)) };
      }),
    };
  });
  for (const [index, control] of observation.controls.entries()) {
    const { rect, label } = control, context = `${width}px ${observation.label}: ${label}`;
    assert.ok(rect.left >= -.5 && rect.right <= width + .5, `${context} stays inside the viewport`);
    assert.ok(rect.width >= 24 && rect.height >= 24 && control.reachable, `${context} keeps a reachable target`);
    for (const text of control.text) assert.ok(text.left >= rect.left + 1 && text.right <= rect.right - 1
      && text.top >= rect.top + 1 && text.bottom <= rect.bottom - 1, `${context} keeps its complete label inside the key`);
    for (const other of observation.controls.slice(index + 1)) {
      const gap = Math.max(other.rect.left - rect.right, rect.left - other.rect.right,
        other.rect.top - rect.bottom, rect.top - other.rect.bottom);
      assert.ok(gap >= 4, `${context} keeps a visible gap from ${other.label}`);
    }
  }
  return observation.controls.map(({ label, rect }) => ({ label, width: rect.width, height: rect.height }));
}
