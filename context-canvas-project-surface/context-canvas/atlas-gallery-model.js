/** Browser-safe gallery contracts. No DOM, network, filesystem, or shared mutable state. */
export const GALLERY_POPULATIONS = Object.freeze(['all', 'L', 'M', 'H']);
export const GALLERY_VIEWS = Object.freeze(['rate', 'count', 'reconciliation', 'conditions']);
export const DEFAULT_GALLERY_STATE = Object.freeze({ population: 'all', view: 'rate', cell: 0 });
export const GALLERY_CELL_COUNT = 100;
export const SPEED_EDGES = Object.freeze(Array.from({ length: 11 }, (_, i) => 1000 + 200 * i));
export const TORQUE_EDGES = Object.freeze(Array.from({ length: 11 }, (_, i) => 10 * i));
export const CONDITIONS_RATE_BANDS = Object.freeze([
  { upper: 0, label: '0', color: '#d4e3f5' },
  { upper: 5, label: '>0-5', color: '#b8cef4' },
  { upper: 10, label: '>5-10', color: '#8caff0' },
  { upper: 20, label: '>10-20', color: '#5b88e6' },
  { upper: 50, label: '>20-50', color: '#2855f3' },
  { upper: 100, label: '>50-100', color: '#1d3557' },
].map(Object.freeze));

const MAX_RECORDS = 10_000;
const AGREEMENT_KEYS = Object.freeze(['neither', 'modeOnly', 'labelOnly', 'both']);
const OUTSIDE_KEYS = Object.freeze(['speedBelow', 'speedAbove', 'torqueBelow', 'torqueAbove']);
const BAD_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF\uFFFE\uFFFF]/u;

function own(object, keys, label) {
  if (object === null || typeof object !== 'object' || Array.isArray(object)
      || keys.some(key => !Object.hasOwn(object, key))) {
    throw new TypeError(`${label} requires its own ${keys.join(', ')} fields.`);
  }
}

function count(value, label, maximum = MAX_RECORDS) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${label} must be a bounded nonnegative integer.`);
  }
}

function boundedText(value, label, maximum = 240) {
  if (typeof value !== 'string' || !value.length || value.length > maximum || BAD_XML.test(value)) {
    throw new TypeError(`${label} must be bounded XML-compatible text.`);
  }
}

function rateContract(records, failures, rate, availability, label) {
  count(records, `${label} records`);
  count(failures, `${label} failures`, records);
  const expected = records ? 100 * failures / records : null;
  if (rate !== expected || availability !== (records ? 'available' : 'unavailable')) {
    throw new TypeError(`${label} must retain its exact rate and availability.`);
  }
}

/** O(1), returning detached immutable state; every view preserves the selected cell. */
export function validateGalleryState(state) {
  own(state, ['population', 'view', 'cell'], 'Gallery state');
  if (Reflect.ownKeys(state).length !== 3 || !GALLERY_POPULATIONS.includes(state.population)
      || !GALLERY_VIEWS.includes(state.view) || !Number.isInteger(state.cell)
      || state.cell < 0 || state.cell >= GALLERY_CELL_COUNT) {
    throw new TypeError('Invalid gallery population, view, or cell.');
  }
  return Object.freeze({ population: state.population, view: state.view, cell: state.cell });
}

/** O(4). A document-wide domain is computed before any population selection. */
export function createGalleryScales(populations) {
  if (!Array.isArray(populations) || populations.length !== 4) throw new TypeError('Expected four populations.');
  let rateMaximum = 0;
  let countMaximum = 0;
  for (let i = 0; i < 4; i += 1) {
    const p = populations[i];
    own(p, ['type', 'records', 'machineFailure', 'machineFailurePer100', 'availability'], 'Population');
    if (p.type !== GALLERY_POPULATIONS[i]) throw new TypeError('Population order must be all, L, M, H.');
    rateContract(p.records, p.machineFailure, p.machineFailurePer100, p.availability, 'Population');
    if (i > 0) {
      rateMaximum = Math.max(rateMaximum, p.machineFailurePer100 ?? 0);
      countMaximum = Math.max(countMaximum, p.machineFailure);
    }
  }
  return {
    rateMax: Math.max(5, 5 * Math.ceil(rateMaximum / 5)),
    countMax: Math.max(5, 50 * Math.ceil(countMaximum / 50)),
    conditionsRateMax: 100,
  };
}

/** O(4 * 100), constant bounded auxiliary space. This checks meaning, not source authenticity. */
export function validateGalleryDocument(document) {
  own(document, ['id', 'version', 'timeBasis', 'populations', 'bins', 'scales', 'heatmaps'], 'Gallery document');
  if (document.id !== 'atlas-ai4i-gallery.v1' || document.version !== 1) throw new TypeError('Unknown gallery document.');
  boundedText(document.timeBasis, 'Time basis');
  const scales = createGalleryScales(document.populations);
  own(document.scales, ['rateMax', 'countMax', 'conditionsRateMax'], 'Gallery scales');
  for (const key of Object.keys(scales)) {
    if (document.scales[key] !== scales[key]) throw new TypeError('Gallery scales must retain the document-wide domain.');
  }
  own(document.bins, ['speedEdges', 'torqueEdges'], 'Gallery bins');
  for (const [key, edges] of [['speedEdges', SPEED_EDGES], ['torqueEdges', TORQUE_EDGES]]) {
    if (!Array.isArray(document.bins[key]) || document.bins[key].length !== 11) throw new TypeError('Invalid bin edges.');
    for (let i = 0; i < 11; i += 1) {
      if (document.bins[key][i] !== edges[i]) throw new TypeError('Gallery bin edges are fixed.');
    }
  }
  own(document.heatmaps, GALLERY_POPULATIONS, 'Heatmaps');
  for (const [populationIndex, type] of GALLERY_POPULATIONS.entries()) {
    const p = document.populations[populationIndex];
    own(p, ['anyModeFlag', 'disagreements', 'agreement'], 'Population summary');
    own(p.agreement, AGREEMENT_KEYS, 'Label reconciliation');
    for (const key of AGREEMENT_KEYS) count(p.agreement[key], `Agreement ${key}`, p.records);
    if (AGREEMENT_KEYS.reduce((sum, key) => sum + p.agreement[key], 0) !== p.records
        || p.machineFailure !== p.agreement.labelOnly + p.agreement.both
        || p.anyModeFlag !== p.agreement.modeOnly + p.agreement.both
        || p.disagreements !== p.agreement.modeOnly + p.agreement.labelOnly) {
      throw new TypeError('Reconciliation must partition the selected records without relabeling them.');
    }
    const heatmap = document.heatmaps[type];
    own(heatmap, ['cells', 'outOfRange'], 'Heatmap');
    if (!Array.isArray(heatmap.cells) || heatmap.cells.length !== GALLERY_CELL_COUNT) throw new TypeError('A heatmap requires 100 cells.');
    let records = 0;
    let failures = 0;
    for (let index = 0; index < GALLERY_CELL_COUNT; index += 1) {
      const cell = heatmap.cells[index];
      own(cell, ['speedIndex', 'torqueIndex', 'speedLower', 'speedUpper', 'torqueLower', 'torqueUpper',
        'records', 'failures', 'ratePer100', 'availability'], 'Heatmap cell');
      const speedIndex = index % 10;
      const torqueIndex = Math.floor(index / 10);
      if (cell.speedIndex !== speedIndex || cell.torqueIndex !== torqueIndex
          || cell.speedLower !== SPEED_EDGES[speedIndex] || cell.speedUpper !== SPEED_EDGES[speedIndex + 1]
          || cell.torqueLower !== TORQUE_EDGES[torqueIndex] || cell.torqueUpper !== TORQUE_EDGES[torqueIndex + 1]) {
        throw new TypeError('Heatmap cell identity and bounds must match its fixed position.');
      }
      rateContract(cell.records, cell.failures, cell.ratePer100, cell.availability, 'Heatmap cell');
      records += cell.records;
      failures += cell.failures;
    }
    const outside = heatmap.outOfRange;
    own(outside, ['records', 'failures', 'ratePer100', 'availability', ...OUTSIDE_KEYS], 'Out-of-range summary');
    rateContract(outside.records, outside.failures, outside.ratePer100, outside.availability, 'Out-of-range summary');
    for (const key of OUTSIDE_KEYS) count(outside[key], key, outside.records);
    const reasonCount = OUTSIDE_KEYS.reduce((sum, key) => sum + outside[key], 0);
    if (reasonCount < outside.records || reasonCount > 2 * outside.records
        || records + outside.records !== p.records || failures + outside.failures !== p.machineFailure) {
      throw new TypeError('Heatmap support and out-of-range records must reconcile to their population.');
    }
  }
  const [all, ...types] = document.populations;
  for (const key of ['records', 'machineFailure', 'anyModeFlag', 'disagreements']) {
    if (all[key] !== types.reduce((sum, p) => sum + p[key], 0)) throw new TypeError('Product populations must reconcile to all records.');
  }
  for (let i = 0; i < GALLERY_CELL_COUNT; i += 1) {
    for (const key of ['records', 'failures']) {
      if (document.heatmaps.all.cells[i][key] !== GALLERY_POPULATIONS.slice(1).reduce(
        (sum, type) => sum + document.heatmaps[type].cells[i][key], 0)) throw new TypeError('Product cells must reconcile to all records.');
    }
  }
  for (const key of ['records', 'failures', ...OUTSIDE_KEYS]) {
    if (document.heatmaps.all.outOfRange[key] !== GALLERY_POPULATIONS.slice(1).reduce(
      (sum, type) => sum + document.heatmaps[type].outOfRange[key], 0)) throw new TypeError('Out-of-range populations must reconcile.');
  }
  if (Object.hasOwn(document, 'source')) {
    own(document.source, ['title', 'doi', 'sha256', 'license', 'sourceType'], 'Source');
    boundedText(document.source.title, 'Source title', 120);
    boundedText(document.source.doi, 'Source DOI', 120);
    boundedText(document.source.license, 'Source license', 40);
    if (document.source.sourceType !== 'published-generated-records'
        || typeof document.source.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(document.source.sha256)) {
      throw new TypeError('Released source metadata requires its declared standing and digest.');
    }
  }
  return document;
}

function contextFor(document, state) {
  const accepted = validateGalleryState(state);
  validateGalleryDocument(document);
  return { document, state: accepted, population: document.populations[GALLERY_POPULATIONS.indexOf(accepted.population)] };
}

function populationName(type) { return type === 'all' ? 'All product types' : `Product type ${type}`; }
function available(value) { return value === null ? 'Unavailable' : value; }
function availabilityText(value) { return value === 'available' ? 'Available' : 'No records'; }
function rateText(value) { return value === null ? 'Unavailable' : value.toFixed(1); }
function selectedProducts({ document, state }) {
  return state.population === 'all' ? document.populations.slice(1) : [document.populations[GALLERY_POPULATIONS.indexOf(state.population)]];
}
function cellLabel(cell) {
  return `Speed [${cell.speedLower}, ${cell.speedUpper}${cell.speedIndex === 9 ? ']' : ')'} rpm; `
    + `torque [${cell.torqueLower}, ${cell.torqueUpper}${cell.torqueIndex === 9 ? ']' : ')'} Nm`;
}

/** O(4 * 100 + output length); columns[0] names the row header, values cover subsequent columns. */
export function getGalleryRows(document, state = DEFAULT_GALLERY_STATE) {
  const context = contextFor(document, state);
  const { population, state: selected } = context;
  const name = populationName(selected.population);
  if (selected.view === 'rate' || selected.view === 'count') {
    return {
      caption: `${selected.view === 'rate' ? 'Machine-failure frequency' : 'Machine-failure label counts'} by product type: ${name}; ${population.records} selected records. Rates are per 100 records.`,
      columns: ['Product type', 'Recorded rows', 'Machine-failure labels', 'Machine-failure labels per 100 records', 'Availability'],
      rows: selectedProducts(context).map(p => ({ label: populationName(p.type), values: [
        p.records, p.machineFailure, available(p.machineFailurePer100), availabilityText(p.availability),
      ] })),
    };
  }
  if (selected.view === 'reconciliation') {
    return {
      caption: `Published Machine failure labels and the union of mode flags: ${name}; ${population.records} records, ${population.disagreements} disagreements. Each record appears once.`,
      columns: ['Label / mode relationship', 'Machine-failure label', 'At least one mode flag', 'Records', 'Records per 100 selected records', 'Availability'],
      rows: [
        ['neither', 'Neither label nor mode flag', 0, 'No'],
        ['modeOnly', 'Mode flag only', 0, 'Yes'],
        ['labelOnly', 'Machine-failure label only', 1, 'No'],
        ['both', 'Both label and mode flag', 1, 'Yes'],
      ].map(([key, label, target, flag]) => ({ label, values: [target, flag, population.agreement[key],
        population.records ? 100 * population.agreement[key] / population.records : 'Unavailable',
        availabilityText(population.availability)] })),
    };
  }
  const heatmap = document.heatmaps[selected.population];
  const outside = heatmap.outOfRange;
  return {
    caption: `Machine-failure labels by speed and torque: ${name}. ${population.records - outside.records} records in 100 cells; `
      + `${outside.records} out-of-range records, including ${outside.failures} failure labels. `
      + `Bins include their lower edge; only the final bins include their upper edge. `
      + `Out-of-range reasons may overlap: speed below ${outside.speedBelow}, speed above ${outside.speedAbove}, torque below ${outside.torqueBelow}, torque above ${outside.torqueAbove}.`,
    columns: ['Speed / torque bin', 'Recorded rows', 'Machine-failure labels', 'Machine-failure labels per 100 records', 'Availability'],
    rows: heatmap.cells.map(cell => ({ label: cellLabel(cell), values: [
      cell.records, cell.failures, available(cell.ratePer100), availabilityText(cell.availability),
    ] })),
  };
}

/** O(text length). All dynamic SVG text and descriptive attributes pass this boundary. */
export function escapeGalleryText(value) {
  const text = String(value);
  if (BAD_XML.test(text)) throw new TypeError('SVG text contains an invalid XML character.');
  return text.replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function text(x, y, value, attributes = '') {
  return `<text x="${x}" y="${y}" ${attributes}>${escapeGalleryText(value)}</text>`;
}
function rateColor(rate) { return CONDITIONS_RATE_BANDS.find(band => rate <= band.upper).color; }

function renderComparison(context, prefix) {
  const { document, state } = context;
  const maximum = state.view === 'rate' ? document.scales.rateMax : document.scales.countMax;
  const products = selectedProducts(context);
  const marks = [
    text(40, 198, 'PRODUCT TYPE', 'class="small" font-weight="bold"'),
    text(220, 198, state.view === 'rate' ? 'RATE PER 100 RECORDS' : 'MACHINE-FAILURE LABELS', 'class="small" font-weight="bold"'),
    text(815, 198, 'RATE / 100', 'class="small" font-weight="bold" text-anchor="end"'),
    text(970, 198, 'LABELS', 'class="small" font-weight="bold" text-anchor="end"'),
    text(1150, 198, 'RECORDS', 'class="small" font-weight="bold" text-anchor="end"'),
  ];
  for (let i = 0; i <= 5; i += 1) {
    const x = 220 + i * 92;
    marks.push(`<line class="rule" x1="${x}" x2="${x}" y1="226" y2="548"/>`,
      text(x, 580, maximum * i / 5, 'class="small" text-anchor="middle"'));
  }
  products.forEach((p, index) => {
    const y = products.length === 1 ? 378 : 284 + index * 106;
    const value = state.view === 'rate' ? p.machineFailurePer100 : p.machineFailure;
    marks.push(`<g id="${prefix}-product-${p.type}" aria-label="${escapeGalleryText(`${populationName(p.type)}: ${p.machineFailure} labels among ${p.records} records; rate ${rateText(p.machineFailurePer100)} per 100`)}">`,
      text(40, y, `Type ${p.type}`, 'class="label" font-weight="bold"'));
    if (p.records) marks.push(`<rect x="220" y="${y - 24}" width="${(460 * value / maximum).toFixed(3)}" height="34" fill="#2855f3"/>`);
    else marks.push(text(230, y, 'No records', 'class="label"'));
    marks.push(text(815, y, rateText(p.machineFailurePer100), 'class="number" text-anchor="end"'),
      text(970, y, p.machineFailure, 'class="number" text-anchor="end"'),
      text(1150, y, p.records, 'class="number" text-anchor="end"'), '</g>');
  });
  marks.push(text(40, 622, 'The scale stays fixed across product selections. Counts preserve the denominator behind each rate.', 'class="body"'));
  return `<g id="${prefix}-product-comparison" data-scale-max="${maximum}">${marks.join('\n')}</g>`;
}

function renderReconciliation({ population }, prefix) {
  const parts = [
    text(680, 193, 'AT LEAST ONE OF THE FIVE MODE FLAGS', 'class="small" text-anchor="middle" font-weight="bold"'),
    text(507, 226, 'NO', 'class="label" text-anchor="middle" font-weight="bold"'),
    text(842, 226, 'YES', 'class="label" text-anchor="middle" font-weight="bold"'),
    text(310, 314, 'Machine failure 0', 'class="label" text-anchor="end"'),
    text(310, 469, 'Machine failure 1', 'class="label" text-anchor="end"'),
  ];
  for (const [key, column, row] of [['neither', 0, 0], ['modeOnly', 1, 0], ['labelOnly', 0, 1], ['both', 1, 1]]) {
    const x = 350 + column * 335;
    const y = 246 + row * 155;
    const n = population.agreement[key];
    const inverse = population.records > 0 && (key === 'modeOnly' || key === 'labelOnly');
    const colorClass = inverse ? ' inverse' : '';
    const label = `Machine failure ${row}; ${column ? 'at least one mode flag' : 'no mode flag'}; ${n} records`;
    parts.push(`<g id="${prefix}-agreement-${key}" aria-label="${escapeGalleryText(label)}">`,
      `<rect x="${x}" y="${y}" width="315" height="136" fill="${inverse ? '#2855f3' : '#d4e3f5'}"/>`,
      text(x + 157, y + 54, n, `class="big${colorClass}" text-anchor="middle"`),
      text(x + 157, y + 83, 'records', `class="body${colorClass}" text-anchor="middle"`),
      text(x + 157, y + 113, population.records ? `${(100 * n / population.records).toFixed(1)} per 100 selected` : 'Unavailable: no selected records',
        `class="small${colorClass}" text-anchor="middle"`), '</g>');
  }
  parts.push(text(40, 593, `Disagreement: ${population.disagreements} records (mode flag only plus machine-failure label only).`, 'class="body"'),
    text(40, 625, 'Mode memberships can overlap. The four cells above count each selected record exactly once.', 'class="body"'));
  return `<g id="${prefix}-label-reconciliation">${parts.join('\n')}</g>`;
}

function renderConditions({ document, population, state }, prefix) {
  const heatmap = document.heatmaps[state.population];
  const selected = heatmap.cells[state.cell];
  const parts = [text(40, 180, 'Torque (Nm)', 'class="body"'),
    text(775, 191, 'SELECTED CONDITIONS', 'class="small" font-weight="bold"')];
  for (let i = 0; i <= 10; i += 1) {
    parts.push(text(150 + 55 * i, 558, SPEED_EDGES[i], 'class="tick" text-anchor="middle"'),
      text(134, 540 - i * 34, TORQUE_EDGES[i], 'class="tick" text-anchor="end"'));
  }
  heatmap.cells.forEach((cell, index) => {
    const x = 150 + cell.speedIndex * 55;
    const y = 195 + (9 - cell.torqueIndex) * 34;
    const empty = cell.availability === 'unavailable';
    const inverse = !empty && cell.ratePer100 > 20;
    const label = `${cellLabel(cell)}; ${cell.records} records; ${cell.failures} failure labels; rate ${rateText(cell.ratePer100)} per 100`;
    parts.push(`<g id="${prefix}-speed-${cell.speedIndex}-torque-${cell.torqueIndex}" aria-label="${escapeGalleryText(label)}">`,
      `<rect x="${x}" y="${y}" width="55" height="34" fill="${empty ? '#fffcf5' : rateColor(cell.ratePer100)}" stroke="#ffffff" stroke-width="1"/>`,
      text(x + 27.5, y + 22, empty ? '--' : rateText(cell.ratePer100), `class="cell${inverse ? ' inverse' : ''}" text-anchor="middle"`));
    if (index === state.cell) parts.push(`<rect data-selection-outline="outer" x="${x + 2}" y="${y + 2}" width="51" height="30" fill="none" stroke="#1d3557" stroke-width="4"/><rect data-selection-outline="inner" x="${x + 2}" y="${y + 2}" width="51" height="30" fill="none" stroke="#fffcf5" stroke-width="2"/>`);
    parts.push('</g>');
  });
  parts.push(text(150, 587, 'Rotational speed (rpm)', 'class="body"'),
    text(775, 230, `Speed [${selected.speedLower}, ${selected.speedUpper}${selected.speedIndex === 9 ? ']' : ')'} rpm`, 'class="label"'),
    text(775, 260, `Torque [${selected.torqueLower}, ${selected.torqueUpper}${selected.torqueIndex === 9 ? ']' : ')'} Nm`, 'class="label"'),
    text(775, 290, 'Lower edges included; final upper edges included.', 'class="tick"'),
    text(775, 325, `${selected.records} records in this cell`, 'class="label" font-weight="bold"'),
    text(775, 359, `Machine-failure labels: ${selected.failures}`, 'class="body"'),
    text(775, 393, `Rate per 100: ${rateText(selected.ratePer100)}`, 'class="body"'),
    text(775, 426, `Availability: ${availabilityText(selected.availability)}`, 'class="body"'),
    text(775, 461, 'Read every rate with its record count.', 'class="small"'),
    text(775, 489, 'Small cells provide limited descriptive support.', 'class="small"'),
    text(775, 523, `Outside bins: ${heatmap.outOfRange.records} records; ${heatmap.outOfRange.failures} labels`, 'class="small"'),
    text(775, 551, `${population.records - heatmap.outOfRange.records} of ${population.records} selected records are in the grid.`, 'class="tick"'),
    text(150, 609, 'CELL COLOR: MACHINE-FAILURE LABELS PER 100 RECORDS', 'class="tick" font-weight="bold"'));
  CONDITIONS_RATE_BANDS.forEach((band, i) => {
    const x = 150 + i * 105;
    parts.push(`<rect x="${x}" y="620" width="18" height="14" fill="${band.color}"/>`, text(x + 23, 632, band.label, 'class="tick"'));
  });
  parts.push(`<rect x="820" y="620" width="18" height="14" fill="#fffcf5" stroke="#1d3557"/>`,
    text(845, 632, '-- = no records', 'class="tick"'));
  return `<g id="${prefix}-speed-torque-conditions" data-rate-domain="0 100">${parts.join('\n')}</g>`;
}

/** O(4 * 100 + rendered marks + text length); at most 100 marks, with no layout reads or mutations. */
export function renderGallerySvg(document, state = DEFAULT_GALLERY_STATE, idPrefix = 'atlas-gallery') {
  if (typeof idPrefix !== 'string' || idPrefix.length > 80 || !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(idPrefix)) {
    throw new TypeError('SVG ID prefix must be a bounded identifier beginning with a letter.');
  }
  const context = contextFor(document, state);
  const { population, state: selected } = context;
  const title = {
    rate: 'Machine-failure frequency by product type',
    count: 'Machine-failure label counts by product type',
    reconciliation: 'Published labels and mode flags can differ',
    conditions: 'Failure-label rates across operating conditions',
  }[selected.view];
  const source = Object.hasOwn(document, 'source') ? document.source : null;
  const sourceLine = source ? `${source.title} | Published generated records | ${source.license}` : 'Supplied fixture records | No verified-release digest';
  const sourceReference = source ? `Source: ${source.doi}` : 'Source standing: supplied records for this comparison; release identity is unspecified.';
  const description = `${populationName(selected.population)}: ${population.records} records, ${population.machineFailure} Machine failure labels, `
    + `${population.anyModeFlag} records with any mode flag, ${population.disagreements} label/flag disagreements. `
    + `Rates use the published Machine failure field. ${document.timeBasis}. `
    + (selected.view === 'conditions' ? `${cellLabel(document.heatmaps[selected.population].cells[selected.cell])} is selected. The 100-row companion retains support and exact values. ` : '')
    + (source ? `Source type: ${source.sourceType}; DOI ${source.doi}; license ${source.license}; verified-input SHA-256 ${source.sha256}.` : 'No verified-file digest is attached.');
  const body = selected.view === 'conditions' ? renderConditions(context, idPrefix)
    : selected.view === 'reconciliation' ? renderReconciliation(context, idPrefix) : renderComparison(context, idPrefix);
  return `<svg xmlns="http://www.w3.org/2000/svg" id="${idPrefix}-figure" viewBox="0 0 1200 760" width="1200" height="760" role="img" aria-labelledby="${idPrefix}-title ${idPrefix}-description">
<title id="${idPrefix}-title">${escapeGalleryText(title)}: ${escapeGalleryText(populationName(selected.population))}</title>
<desc id="${idPrefix}-description">${escapeGalleryText(description)}</desc>
<style>
#${idPrefix}-figure text{font-family:Verdana,sans-serif;fill:#1d3557}
#${idPrefix}-figure .small{font-size:14px}#${idPrefix}-figure .body{font-size:16px}
#${idPrefix}-figure .label{font-size:19px}#${idPrefix}-figure .number{font-size:25px;font-variant-numeric:tabular-nums}
#${idPrefix}-figure .big{font-size:38px;font-weight:bold}#${idPrefix}-figure .tick{font-size:13px}
#${idPrefix}-figure .cell{font-size:14px;font-variant-numeric:tabular-nums}#${idPrefix}-figure .inverse{fill:#fffcf5}
#${idPrefix}-figure .rule{stroke:#d4e3f5;stroke-width:1}
</style>
<rect width="1200" height="760" fill="#fffcf5"/>
<g id="${idPrefix}-reading-context">
${text(40, 35, source ? 'AI4I 2020 / PUBLISHED GENERATED RECORDS' : 'AI4I GALLERY / SUPPLIED FIXTURE RECORDS', 'class="small" font-weight="bold"')}
${text(40, 79, title, 'font-size="30" font-weight="bold"')}
${text(40, 113, `${populationName(selected.population)} | ${population.records} records | ${population.machineFailure} machine-failure labels`, 'class="label"')}
${text(40, 144, 'Descriptive comparison. Product type is a source quality variant; record identifiers are not timestamps.', 'class="small"')}
</g>
${body}
<g id="${idPrefix}-source-context">
<line class="rule" x1="40" x2="1160" y1="654" y2="654"/>
${text(40, 680, sourceLine, 'class="small"')}
${text(40, 707, sourceReference, 'class="small"')}
${text(40, 735, document.timeBasis, 'class="tick"')}
</g>
</svg>
`;
}
