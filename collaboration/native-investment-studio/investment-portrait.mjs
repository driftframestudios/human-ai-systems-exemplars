import { analyseInvestment } from './investment-financials.mjs';
import { diagramArrowPath } from './diagram-geometry.mjs';

// Each portrait compares one unit within one deck. Values retain their signs;
// equal-angle sectors encode absolute amount by area, with exact values beside it.
export const INVESTMENT_DOMAINS = Object.freeze({
  plan: { label: 'Internal', title: 'Make room for the work', detail: 'See the people’s time, reserve and options that compete for the same budget.', flow: ['People & sessions', 'Funded work', 'Budget choices'] },
  rollout: { label: 'Customer', title: 'Make delivery worth its cost', detail: 'Balance the price a customer pays with the work needed to deliver and support it.', flow: ['Customer teams', 'Delivery & service', 'Contribution'] },
  commercial: { label: 'Commercial', title: 'Grow from the customers you keep', detail: 'Compare retained revenue, deeper use and new business before expanding acquisition.', flow: ['Opening customers', 'Retention & growth', 'Closing revenue'] },
  service: { label: 'Operations', title: 'Give people useful time back', detail: 'Connect adoption to working time, service cost and the capacity to support people.', flow: ['People adopting', 'Changed workflow', 'Time & capacity'] },
  capital: { label: 'Planning', title: 'Choose where capital can help', detail: 'Compare keeping the current approach, running a pilot and extending the rollout.', flow: ['Upfront investment', 'Quarterly benefit', 'Return & payback'] },
});
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const entry = (label, value) => ({ label, value: Number.isFinite(value) ? value : null });
const known = value => value?.status === 'known' ? value.value : null;

export function investmentPortrait(record, pricing) {
  const s = record.settings, a = analyseInvestment(record, pricing);
  let title, unit, values, format = money;
  switch (record.type) {
    case 'plan':
      title = 'Budget allocation'; unit = 'USD';
      values = [entry(pricing.complete ? 'Planned work' : 'Known work', pricing.total), entry('Reserve', a.reserve), entry('Options', a.opportunity), entry(a.remaining < 0 ? 'Shortfall' : 'Unassigned', a.remaining)]; break;
    case 'rollout':
      if (s.domain === 'implementation') {
        title = 'Customer implementation'; unit = 'USD · all customer teams';
        values = [entry('Setup', a.setup), entry('Training', a.training)];
      } else {
        title = 'Price and delivery'; unit = 'USD / team / quarter';
        values = [entry('Net price', known(a.metrics.netPrice)), entry('Delivery cost', s.variableCost), entry('Service cost', s.serviceCost), entry('Contribution', known(a.metrics.unitContribution))];
      } break;
    case 'commercial':
      title = 'Closing revenue sources'; unit = 'USD / quarter';
      values = [entry('Opening cohort retained', s.openingRevenue * s.retained / 100), entry('Expansion', s.expansion), entry('New customers', s.newRevenue), entry('Reactivated', s.reactivation)]; break;
    case 'service': {
      const people = known(a.metrics.adoptedPopulation);
      if (s.domain === 'budget') {
        title = 'Service cost'; unit = 'USD / quarter';
        values = [entry('Current service', people * s.baselineCost), entry('Changed service', people * s.candidateCost), entry('Budget change', known(a.metrics.budgetImpact))];
      } else if (s.domain === 'capacity') {
        title = 'People and capacity'; unit = 'people'; format = number;
        values = [entry('People adopting', people), entry('Capacity available', s.capacity), entry('Capacity gap', known(a.metrics.capacityGap))];
      } else {
        title = 'Weekly working time'; unit = 'hours / week'; format = value => `${number(value)} h`;
        const fullAdoptionHours = s.people * s.minutes * 2 / 60;
        values = [entry('Time released', a.releasedHours), entry('With wider adoption', fullAdoptionHours - a.releasedHours)];
      } break;
    }
    case 'capital':
      title = s.metric === 'npv' ? 'Net present value' : s.metric === 'irr' ? 'Internal rate of return' : 'Payback';
      unit = s.metric === 'npv' ? 'USD' : s.metric === 'irr' ? '% / quarter' : 'quarters';
      format = s.metric === 'npv' ? money : s.metric === 'irr' ? value => `${number(value * 100)}%` : number;
      values = a.alternatives.map(option => entry(option.label, known(option[s.metric]))); break;
    default: throw new TypeError('Choose an investment domain.');
  }
  return { title, unit, entries: values.map(item => ({ ...item, text: item.value === null ? 'Unavailable' : format(item.value) })) };
}

export function roseSectors(entries, radius = 88) {
  const maximum = Math.max(0, ...entries.map(item => Math.abs(item.value ?? 0)));
  const angle = 2 * Math.PI / entries.length, gap = .035;
  return entries.map((item, index) => {
    const r = maximum ? radius * Math.sqrt(Math.abs(item.value ?? 0) / maximum) : 0;
    const start = index * angle - Math.PI / 2 + gap, end = start + angle - 2 * gap;
    const point = a => `${(110 + r * Math.cos(a)).toFixed(3)} ${(110 + r * Math.sin(a)).toFixed(3)}`;
    return { ...item, radius: r, path: r ? `M 110 110 L ${point(start)} A ${r.toFixed(3)} ${r.toFixed(3)} 0 ${angle > Math.PI ? 1 : 0} 1 ${point(end)} Z` : '' };
  });
}
const svgNode = (document, tag, attributes, text) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes || {})) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
};

export function renderInvestmentPortrait(document, portrait) {
  const figure = document.createElement('figure'); figure.className = 'investment-domain__portrait';
  const svg = svgNode(document, 'svg', { viewBox: '0 0 220 220', role: 'img', 'aria-label': `${portrait.title}. ${portrait.unit}. Sector area shows absolute amount; exact values follow.` });
  for (const radius of [29, 59, 88]) svg.append(svgNode(document, 'circle', { cx: 110, cy: 110, r: radius, class: 'investment-domain__guide' }));
  const sectors = svgNode(document, 'g', { class: 'investment-domain__sectors' });
  const values = document.createElement('dl'); values.className = 'investment-domain__values';
  roseSectors(portrait.entries).forEach((item, index) => {
    const row = document.createElement('div'); row.dataset.sector = String(index);
    const name = document.createElement('dt'), amount = document.createElement('dd'); name.textContent = item.label; amount.textContent = item.text;
    row.append(name, amount); values.append(row);
    if (item.path) { const path = svgNode(document, 'path', { d: item.path, 'data-sector': index, 'data-negative': String(item.value < 0) }); path.append(svgNode(document, 'title', {}, `${item.label}: ${item.text}`)); sectors.append(path); }
  });
  svg.append(sectors);
  const caption = document.createElement('figcaption'); caption.textContent = `${portrait.title} · ${portrait.unit}`;
  const note = document.createElement('small'); note.textContent = 'Area shows magnitude. Values retain their sign.';
  figure.append(svg, values, caption, note); return figure;
}

export function renderInvestmentDiagram(document, domain) {
  const svg = svgNode(document, 'svg', { viewBox: '0 0 540 170', role: 'img', 'aria-label': domain.flow.join(' leads to ') });
  svg.classList.add('investment-domain__diagram');
  for (const [start, end] of [[[163, 70], [193, 70]], [[343, 70], [373, 70]]]) { const edge = svgNode(document, 'g', { class: 'studio-diagram__edge' }); edge.append(svgNode(document, 'path', { d: diagramArrowPath({ start, end, shaftWidth: 3, headWidth: 10, headLength: 9 }), class: 'studio-diagram__arrow' })); svg.append(edge); }
  const returnPath = svgNode(document, 'path', { d: diagramArrowPath({ start: [447, 99], end: [87, 99], control1: [447, 161], control2: [87, 161], shaftWidth: 3, headWidth: 10, headLength: 9 }), class: 'studio-diagram__arrow', }); const returning = svgNode(document, 'g', { class: 'studio-diagram__edge', 'data-direction': 'return' }); returning.append(returnPath); svg.append(returning);
  domain.flow.forEach((label, index) => {
    const group = svgNode(document, 'g', { class: 'investment-domain__diagram-node' });
    group.append(svgNode(document, 'rect', { x: 12 + index * 180, y: 40, width: 150, height: 60, rx: 5 }), svgNode(document, 'text', { x: 87 + index * 180, y: 75, 'text-anchor': 'middle' }, label)); svg.append(group);
  });
  svg.append(svgNode(document, 'text', { x: 267, y: 164, 'text-anchor': 'middle', class: 'investment-domain__return-label' }, 'Compare and adjust'));
  return svg;
}
