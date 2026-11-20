import { createDataSemanticTwin } from './model.js';
import { dataStatusMessage, recordDescription, STANDING_LABELS, valueText } from './semantics.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STANDING_COLORS = Object.freeze({
  known: '#214bd5', unknown: '#ffffff', absent: '#e5e7eb', stale: '#ff8fa8', estimated: '#efff48', redacted: '#132f58',
});
const SVG_INSTANCE_PREFIXES = new WeakMap();
let svgInstanceSequence = 0;

function element(document, tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) node.setAttribute(name, value);
  return node;
}

function svgElement(document, tagName, attributes = {}, text = null) {
  const node = document.createElementNS(SVG_NS, tagName);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== null) node.textContent = text;
  return node;
}

function renderTable(root, twin) {
  const document = root.ownerDocument;
  const table = element(document, 'table');
  const caption = element(document, 'caption', {
    text: `${twin.scope}. Exact values use ${twin.unit}; denominator: ${twin.denominator}. Page ${twin.page} of ${twin.totalPages}.`,
  });
  const head = element(document, 'thead');
  const headRow = element(document, 'tr');
  for (const label of ['Record', 'Value', 'Standing', 'Group', 'Observed']) headRow.append(element(document, 'th', { text: label, attributes: { scope: 'col' } }));
  head.append(headRow);
  const body = element(document, 'tbody');
  for (const record of twin.records) {
    const row = element(document, 'tr', { attributes: { 'data-record-id': record.id } });
    row.append(
      element(document, 'th', { text: record.label, attributes: { scope: 'row' } }),
      element(document, 'td', { text: valueText(record, twin.unit), attributes: { 'data-label': 'Value', 'data-exact-value': record.value ?? '' } }),
      element(document, 'td', { text: STANDING_LABELS[record.standing], attributes: { 'data-label': 'Standing' } }),
      element(document, 'td', { text: record.group, attributes: { 'data-label': 'Group' } }),
      element(document, 'td', { text: record.observedAt ?? 'Unavailable', attributes: { 'data-label': 'Observed' } }),
    );
    body.append(row);
  }
  table.append(caption, head, body);
  root.querySelector('[data-data-table]').replaceChildren(table);
}

function safeId(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/u.test(value)) throw new TypeError('SVG identifiers require lowercase kebab case.');
  return value;
}

function safeRecordToken(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{1,47}$/u.test(value)) throw new TypeError('Record identifiers require lowercase kebab case.');
  return value;
}

function svgInstancePrefix(root, identity) {
  if (!SVG_INSTANCE_PREFIXES.has(root)) {
    svgInstanceSequence += 1;
    const base = safeId(identity).slice(0, 48).replace(/-$/u, '');
    SVG_INSTANCE_PREFIXES.set(root, `${base}-view-${svgInstanceSequence}`);
  }
  return SVG_INSTANCE_PREFIXES.get(root);
}

function scale(value, domainStart, domainEnd, rangeStart, rangeEnd) {
  if (!Number.isFinite(value) || domainStart === domainEnd) return (rangeStart + rangeEnd) / 2;
  const proportion = (value - domainStart) / (domainEnd - domainStart);
  return rangeStart + proportion * (rangeEnd - rangeStart);
}

function appendRecordLabel(document, group, record, twin, x, labelY, valueY) {
  group.append(
    svgElement(document, 'text', { x, y: labelY, fill: '#132f58', 'font-size': 12, 'text-anchor': 'middle' }, record.label),
    svgElement(document, 'text', { x, y: valueY, fill: '#34527b', 'font-size': 11, 'text-anchor': 'middle' }, valueText(record, twin.unit)),
    svgElement(document, 'title', {}, recordDescription(record, twin)),
  );
}

function renderSvg(root, twin) {
  const document = root.ownerDocument;
  const prefix = svgInstancePrefix(root, twin.identity);
  const width = twin.renderer === 'spatial' ? 960 : Math.max(840, twin.records.length * 112 + 140);
  const height = 460;
  const svg = svgElement(document, 'svg', {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: 'img',
    'aria-labelledby': `${prefix}-title ${prefix}-description`,
    'data-renderer': twin.renderer,
    'data-svg-instance': prefix,
  });
  svg.append(
    svgElement(document, 'title', { id: `${prefix}-title` }, `${twin.scope} ${twin.renderer} view`),
    svgElement(document, 'desc', { id: `${prefix}-description` }, `${twin.records.length} visible records from page ${twin.page} of ${twin.totalPages}. Exact values use ${twin.unit}; denominator: ${twin.denominator}.`),
  );

  const defs = svgElement(document, 'defs');
  const marker = svgElement(document, 'marker', {
    id: `${prefix}-arrow`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse',
  });
  marker.append(svgElement(document, 'path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#132f58' }));
  const clipPath = svgElement(document, 'clipPath', { id: `${prefix}-plot-clip` });
  clipPath.append(svgElement(document, 'rect', { x: 24, y: 88, width: width - 48, height: 318 }));
  defs.append(marker, clipPath);
  svg.append(defs);
  svg.append(svgElement(document, 'rect', { x: 1, y: 1, width: width - 2, height: height - 2, rx: 12, fill: '#fffaf0', stroke: '#173e72', 'stroke-width': 2 }));
  svg.append(svgElement(document, 'text', { x: 32, y: 42, fill: '#132f58', 'font-size': 18, 'font-weight': 700 }, `${twin.decisionNeed} · ${twin.dataStanding}`));
  svg.append(svgElement(document, 'text', { x: 32, y: 68, fill: '#34527b', 'font-size': 13 }, `${twin.scope} · ${twin.unit} · ${twin.denominator}`));

  if (twin.renderer === 'summary') {
    const record = twin.selectedRecord ?? twin.records[0] ?? null;
    svg.append(
      svgElement(document, 'text', { x: 54, y: 190, fill: '#214bd5', 'font-size': 68, 'font-weight': 800 }, record ? valueText(record, twin.unit) : 'Awaiting data'),
      svgElement(document, 'text', { x: 56, y: 232, fill: '#132f58', 'font-size': 22, 'font-weight': 700 }, record?.label ?? 'Awaiting an accepted record'),
      svgElement(document, 'text', { x: 56, y: 266, fill: '#34527b', 'font-size': 16 }, record ? `Standing: ${STANDING_LABELS[record.standing]}` : 'Standing: absent'),
    );
    root.querySelector('[data-data-svg]').replaceChildren(svg);
    return;
  }

  if (twin.renderer === 'table') {
    const counts = Object.fromEntries(Object.keys(STANDING_LABELS).map(standing => [standing, twin.records.filter(record => record.standing === standing).length]));
    svg.append(
      svgElement(document, 'text', { x: 54, y: 150, fill: '#132f58', 'font-size': 30, 'font-weight': 800 }, 'The exact-value table is the primary view'),
      svgElement(document, 'text', { x: 54, y: 190, fill: '#34527b', 'font-size': 17 }, 'The companion table carries each exact value, standing, group, and observation date.'),
    );
    Object.entries(counts).forEach(([standing, count], index) => {
      svg.append(
        svgElement(document, 'rect', { x: 54 + index * 104, y: 242, width: 88, height: 54, fill: STANDING_COLORS[standing], stroke: '#173e72', 'stroke-width': 2 }),
        svgElement(document, 'text', { x: 98 + index * 104, y: 266, fill: standing === 'redacted' ? '#ffffff' : '#132f58', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle' }, STANDING_LABELS[standing]),
        svgElement(document, 'text', { x: 98 + index * 104, y: 286, fill: standing === 'redacted' ? '#ffffff' : '#132f58', 'font-size': 15, 'text-anchor': 'middle' }, String(count)),
      );
    });
    root.querySelector('[data-data-svg]').replaceChildren(svg);
    return;
  }

  const plot = svgElement(document, 'g', { 'clip-path': `url(#${prefix}-plot-clip)`, 'data-layer': 'plot' });
  const connectors = svgElement(document, 'g', { 'data-layer': 'connectors', 'aria-hidden': 'true' });
  const marks = svgElement(document, 'g', { 'data-layer': 'marks' });
  const selection = svgElement(document, 'g', { 'data-layer': 'selection', 'aria-hidden': 'true' });
  plot.append(connectors, marks, selection);
  svg.append(plot);

  const recordPositions = new Map();
  const selectionBounds = new Map();
  const numericDomain = twin.domains.numeric;
  const numericBaseline = scale(0, numericDomain.minimum, numericDomain.maximum, 340, 120);
  const firstDate = twin.domains.observedAt.first === null ? null : Date.parse(`${twin.domains.observedAt.first}T00:00:00Z`);
  const lastDate = twin.domains.observedAt.last === null ? null : Date.parse(`${twin.domains.observedAt.last}T00:00:00Z`);

  twin.records.forEach((record, index) => {
    let x = 70 + index * 112;
    let y = 190;
    if (twin.renderer === 'timeline' && record.observedAt !== null) {
      x = scale(Date.parse(`${record.observedAt}T00:00:00Z`), firstDate, lastDate, 70, width - 70);
      y = 188;
    }
    if (twin.renderer === 'timeline' && record.observedAt === null) {
      x = 70 + index * 112;
      y = 284;
    }
    if (twin.renderer === 'spatial') {
      x = scale(record.position.x, 0, 100, 70, width - 70);
      y = scale(record.position.y, 0, 100, 118, 330);
    }
    recordPositions.set(record.id, { x, y });
  });

  if (twin.renderer === 'graph') {
    const visibleIds = new Set(twin.records.map(record => record.id));
    const visibleRelationships = twin.relationships.filter(relationship => visibleIds.has(relationship.sourceId) && visibleIds.has(relationship.targetId));
    for (const relationship of visibleRelationships) {
      const source = recordPositions.get(relationship.sourceId);
      const target = recordPositions.get(relationship.targetId);
      const line = svgElement(document, 'line', {
        x1: source.x + 20, y1: source.y, x2: target.x - 20, y2: target.y,
        stroke: '#132f58', 'stroke-width': 2, 'marker-end': `url(#${prefix}-arrow)`,
        'data-relationship-id': relationship.id,
      });
      line.append(svgElement(document, 'title', {}, relationship.label));
      connectors.append(line);
    }
    const continuing = twin.relationships.length - visibleRelationships.length;
    if (continuing > 0) svg.append(svgElement(document, 'text', { x: 32, y: 438, fill: '#34527b', 'font-size': 12 }, `${continuing} relationships continue beyond this page.`));
  }

  if (twin.renderer === 'chart' || twin.renderer === 'svg') {
    connectors.append(svgElement(document, 'line', {
      x1: 32, y1: numericBaseline, x2: width - 32, y2: numericBaseline,
      stroke: '#34527b', 'stroke-width': 2, 'data-zero-baseline': 'true',
    }));
  }

  twin.records.forEach(record => {
    const { x, y } = recordPositions.get(record.id);
    const group = svgElement(document, 'g', {
      id: `${prefix}-record-${safeRecordToken(record.id)}`,
      'data-standing': record.standing,
      'data-record-id': record.id,
      'data-exact-value': record.value ?? '',
    });
    if (twin.renderer === 'timeline') {
      group.append(svgElement(document, 'line', { x1: x, y1: 112, x2: x, y2: y, stroke: '#bfd1df', 'stroke-width': 2 }));
      group.append(svgElement(document, 'circle', { cx: x, cy: y, r: 18, fill: STANDING_COLORS[record.standing], stroke: '#173e72', 'stroke-width': 2 }));
      selectionBounds.set(record.id, { shape: 'circle', cx: x, cy: y, r: 27 });
      appendRecordLabel(document, group, record, twin, x, y + 48, y + 68);
      group.append(svgElement(document, 'text', { x, y: y - 28, fill: '#34527b', 'font-size': 11, 'text-anchor': 'middle' }, record.observedAt ?? 'Date unavailable'));
    } else if (twin.renderer === 'graph' || twin.renderer === 'spatial') {
      group.append(svgElement(document, 'rect', { x: x - 24, y: y - 24, width: 48, height: 48, rx: 4, fill: STANDING_COLORS[record.standing], stroke: '#173e72', 'stroke-width': 2 }));
      selectionBounds.set(record.id, { shape: 'rect', x: x - 32, y: y - 32, width: 64, height: 64, rx: 7 });
      appendRecordLabel(document, group, record, twin, x, y + 44, y + 62);
    } else {
      if (Number.isFinite(record.value)) {
        const valueY = scale(record.value, numericDomain.minimum, numericDomain.maximum, 340, 120);
        const markY = Math.min(numericBaseline, valueY);
        const markHeight = Math.max(2, Math.abs(numericBaseline - valueY));
        group.append(svgElement(document, 'rect', {
          x: x - 30, y: markY, width: 60, height: markHeight,
          fill: STANDING_COLORS[record.standing], stroke: '#173e72', 'stroke-width': 2,
          'data-numeric-mark': 'true',
        }));
        selectionBounds.set(record.id, { shape: 'rect', x: x - 37, y: markY - 7, width: 74, height: markHeight + 14, rx: 4 });
      } else {
        group.append(svgElement(document, 'circle', {
          cx: x, cy: numericBaseline, r: 9,
          fill: STANDING_COLORS[record.standing], stroke: '#173e72', 'stroke-width': 2,
          'data-standing-mark': record.standing,
        }));
        selectionBounds.set(record.id, { shape: 'circle', cx: x, cy: numericBaseline, r: 17 });
      }
      appendRecordLabel(document, group, record, twin, x, 372, 394);
    }
    marks.append(group);
  });

  const selectedBounds = selectionBounds.get(twin.selectedRecordId);
  if (selectedBounds) {
    const { shape, ...attributes } = selectedBounds;
    selection.append(svgElement(document, shape, {
      ...attributes,
      fill: 'none', stroke: '#e23d70', 'stroke-width': 4, 'stroke-dasharray': '7 4',
      'data-selected-record-id': twin.selectedRecordId,
    }));
  }

  if (twin.continuation.previousRecordId !== null || twin.continuation.nextRecordId !== null) {
    const previous = twin.continuation.previousRecordId === null ? 'start' : `after ${twin.continuation.previousRecordId}`;
    const next = twin.continuation.nextRecordId === null ? 'end' : `before ${twin.continuation.nextRecordId}`;
    svg.append(svgElement(document, 'text', { x: width - 32, y: 438, fill: '#34527b', 'font-size': 12, 'text-anchor': 'end' }, `Page continuity: ${previous} · ${next}`));
  }
  root.querySelector('[data-data-svg]').replaceChildren(svg);
}

export function renderDataViewLab(root, state) {
  const twin = createDataSemanticTwin(state);
  root.dataset.dataJsState = 'enhanced';
  root.querySelector('[data-data-revision]').textContent = twin.revision;
  root.querySelector('[data-data-lineage]').textContent = `${twin.lineage.source} · parent ${twin.lineage.parentRevision ?? 'first admitted revision'}`;
  root.querySelector('[data-data-standing]').textContent = twin.dataStanding;
  root.querySelector('[data-data-renderer]').textContent = twin.renderer;
  root.querySelector('[data-data-request]').textContent = twin.state.request.standing;
  root.querySelector('[data-data-authorization-state]').textContent = twin.state.authorization.standing;
  root.querySelector('[data-data-ownership]').textContent = `${twin.state.ownership.standing} · ${twin.state.ownership.ownerId} · generation ${twin.state.ownership.generation}`;
  root.querySelector('[data-data-live]').textContent = dataStatusMessage(state);
  root.querySelector('[data-data-machine-twin]').textContent = JSON.stringify(twin, null, 2);
  root.querySelector('[data-data-view]').value = twin.decisionNeed;
  root.querySelector('[data-data-authorization]').value = twin.state.authorization.standing;
  root.querySelector('[data-data-page]').textContent = `${twin.page} / ${twin.totalPages}`;
  const released = twin.state.ownership.standing === 'released';
  root.querySelector('[data-data-previous]').disabled = released || twin.page <= 1;
  root.querySelector('[data-data-next]').disabled = released || twin.page >= twin.totalPages;
  root.querySelectorAll('[data-data-action="load"], [data-data-view], [data-data-authorization]')
    .forEach(control => { control.disabled = released; });
  const disclosure = root.querySelector('[data-data-disclosure]');
  const expanded = twin.state.disclosure.standing === 'expanded';
  if (disclosure.open !== expanded) disclosure.open = expanded;
  renderTable(root, twin);
  renderSvg(root, twin);
}
