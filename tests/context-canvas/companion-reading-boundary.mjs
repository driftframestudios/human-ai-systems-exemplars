import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';

// Shared by companion suites that protect the same frame/heading/rail boundary.
// Content distribution, code recovery, and list sequence retain their own tests.
export async function observeCompanionBoundary(page, ids) {
  return page.evaluate(ids => {
    const paint = (box, shadowText) => {
      let left = box.left, right = box.right;
      const shadows = shadowText.replace(/[a-z-]+\([^)]*\)/gi, '').split(',');
      for (const shadow of shadows) {
        if (shadow.includes('inset')) continue;
        const [dx = 0, , blur = 0, spread = 0] = shadow.match(/-?[\d.]+px/g)?.map(parseFloat) || [];
        const reserve = 1.5 * blur + spread;
        left = Math.min(left, box.left + dx - reserve);
        right = Math.max(right, box.right + dx + reserve);
      }
      return { left, right };
    };
    const markers = [...document.querySelectorAll('.page-section-rail__link')].flatMap(link => {
      const box = link.getBoundingClientRect(), style = getComputedStyle(link), marker = getComputedStyle(link, '::before');
      if (!box.width || style.visibility === 'hidden' || marker.content === 'none') return [];
      const width = parseFloat(marker.width) + (marker.boxSizing === 'border-box' ? 0 : parseFloat(marker.borderLeftWidth) + parseFloat(marker.borderRightWidth));
      const left = style.justifyContent === 'center' ? box.left + (box.width - width) / 2 : box.left;
      return [paint({ left, right: left + width }, marker.boxShadow)];
    });
    const rail = markers.length ? { left: Math.min(...markers.map(r => r.left)), right: Math.max(...markers.map(r => r.right)) } : null;
    return ids.map(id => {
      const heading = document.getElementById(id), panel = heading.closest('aside'), frame = panel.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(heading);
      const fragments = [...range.getClientRects()].filter(r => r.width && r.height).map(r => ({ left: r.left, right: r.right }));
      return { id, left: frame.left, right: frame.right, paint: paint(frame, getComputedStyle(panel).boxShadow), rail,
        viewport: document.documentElement.clientWidth, fragments };
    });
  }, ids);
}

export function assertCompanionBoundary(items) {
  for (const item of items) {
    const label = `${item.id} at ${item.viewport}px`;
    assert.ok(item.paint.left >= -1 && item.paint.right <= item.viewport + 1, `${label}: frame and shadow fit the visitor field`);
    if (item.rail) assert.ok(item.paint.right <= item.rail.left - 1 || item.paint.left >= item.rail.right + 1, `${label}: frame clears the selected rail marker paint`);
    assert.ok(item.fragments.length && item.fragments.every(r => r.left >= item.left - 1 && r.right <= item.right + 1), `${label}: complete heading fragments fit the frame`);
  }
}
