/** Shared native-table projection for the Atlas gallery and its public extract.
 * O(c + r*c + text bytes) time/output space; at most 400 rows and 12 columns.
 * Inputs retain ownership. Captions and native headers carry the relationships.
 */
export function escapeGalleryText(value) {
  return String(value).replace(/[&<>"']/gu, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

/** JSON embedded in HTML remains inert, including literal closing-script text. */
export function galleryJsonText(value) {
  return JSON.stringify(value).replace(/[<\u2028\u2029]/gu,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1000;
}

/** Plain supplemental labels retain the same literal subject as native text. */
export function renderGalleryTable({ caption, columns, rows }) {
  if (!validText(caption) || !Array.isArray(columns) || columns.length < 2 ||
      columns.length > 12 || !columns.every(validText) || !Array.isArray(rows) ||
      rows.length < 1 || rows.length > 400) {
    throw new TypeError('A gallery table requires a caption, 2-12 headers and 1-400 records.');
  }
  const body = rows.map(row => {
    if (!row || !validText(row.label) || !Array.isArray(row.values) ||
        row.values.length !== columns.length - 1 || !row.values.every(value =>
          validText(value) || (typeof value === 'number' && Number.isFinite(value)))) {
      throw new TypeError('Each gallery record requires a row name and one finite value or named state per field.');
    }
    return `<tr data-label="${escapeGalleryText(`${caption}: ${row.label}`)}"><th scope="row" data-label="${escapeGalleryText(columns[0])}">${escapeGalleryText(row.label)}</th>${row.values.map((value, index) => `<td${typeof value === 'number' ? ' class="table-number"' : ''} data-label="${escapeGalleryText(columns[index + 1])}">${escapeGalleryText(value)}</td>`).join('')}</tr>`;
  }).join('\n');
  return `<table class="table--reading table--comfortable" data-label="${escapeGalleryText(caption)}"><caption>${escapeGalleryText(caption)}</caption><thead><tr data-label="${escapeGalleryText(`${caption}: column headings`)}">${columns.map(column => `<th scope="col" data-label="${escapeGalleryText(column)}">${escapeGalleryText(column)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}
