/*
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Selected geometry: Lucide 1.63.0, commit
2ca268e74888d3506b3319fb8f94aaaaf70ceca9.
The adjacent vendor/lucide/ directory retains source and complete notices.
*/

const SVG_NS = 'http://www.w3.org/2000/svg';
const GEOMETRY = new Map([
  ['coordination', [
    ['rect', { x: '16', y: '16', width: '6', height: '6', rx: '1' }],
    ['rect', { x: '2', y: '16', width: '6', height: '6', rx: '1' }],
    ['rect', { x: '9', y: '2', width: '6', height: '6', rx: '1' }],
    ['path', { d: 'M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3' }],
    ['path', { d: 'M12 12V8' }],
  ]],
  ['people', [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['path', { d: 'M16 3.128a4 4 0 0 1 0 7.744' }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['circle', { cx: '9', cy: '7', r: '4' }],
  ]],
]);
export const STUDIO_ICON_NAMES = Object.freeze([...GEOMETRY.keys()]);
const SVG_ATTRIBUTES = Object.freeze({
  width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round',
  'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
  class: 'native-studio__icon',
});

// Each call owns a fresh decorative SVG. Control text supplies its accessible
// name; this finite factory accepts an icon key rather than caller markup.
export function createStudioIcon(document, name) {
  const shapes = GEOMETRY.get(name);
  if (!shapes) throw new RangeError('Choose a supported native Studio icon.');
  if (typeof document?.createElementNS !== 'function') throw new TypeError('Supply an SVG-capable document.');
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [attribute, value] of Object.entries(SVG_ATTRIBUTES)) svg.setAttribute(attribute, value);
  for (const [tag, attributes] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [attribute, value] of Object.entries(attributes)) shape.setAttribute(attribute, value);
    svg.append(shape);
  }
  return svg;
}
