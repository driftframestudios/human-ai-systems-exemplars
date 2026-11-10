import { selectPlanApproach, selectLifecycle, selectCommercialMetric } from './investment-deck-config.mjs';

// Financial readings use dollar units; accepted ledger cents keep display.mjs.
const DOLLARS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const money = value => DOLLARS.format(value);
export const number = value => NUMBER.format(value);
const signedMoney = value => `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;
const percent = value => `${number(value * 100)}%`;
const metric = (value, format = money, fallback = '—') => value?.status === 'known' ? format(value.value) : fallback;
const paybackText = value => metric(value, amount => `${number(amount)} quarters`, value?.status === 'unreached' ? 'Beyond horizon' : value?.status === 'inapplicable' ? 'No initial outlay' : 'Needs revenue');
const irrText = value => metric(value, percent, value?.status === 'inapplicable' ? 'Not applicable' : 'Outside range');
const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
function button(text, action, className, key) {
  const element = node('button', text, className); element.type = 'button'; element.addEventListener('click', action);
  if (key) element.dataset.focusKey = key;
  return element;
}
function reading(label, value, detail) {
  const item = node('div', undefined, 'investment-comparison__reading'); item.append(node('span', label), node('strong', value)); if (detail) item.append(node('small', detail)); return item;
}
function metricTiles(items, selected) {
  const grid = node('div', undefined, 'investment-comparison__metrics');
  for (const [label, value, detail, key] of items) { const item = reading(label, value, detail); if (selected) item.dataset.featured = String(key === selected); grid.append(item); }
  return grid;
}
function bars(entries) {
  const chart = node('div', undefined, 'investment-comparison__bars'), largest = Math.max(1, ...entries.map(item => Math.abs(item.value || 0)));
  for (const entry of entries) {
    const row = node('div', undefined, 'investment-comparison__bar'); row.append(node('span', entry.label), node('strong', entry.text || money(entry.value)));
    const rail = node('span', undefined, 'investment-comparison__bar-rail'), fill = node('i'); rail.setAttribute('aria-hidden', 'true'); fill.style.width = `${Math.abs(entry.value || 0) / largest * 100}%`; fill.dataset.negative = String(entry.value < 0); rail.append(fill); row.append(rail); chart.append(row);
  }
  return chart;
}

function lifecycle(reel, edit) {
  reel('lifecycle', 'Lifecycle', value => edit(record => selectLifecycle(record, value),
    value === 'custom' ? 'Current settings retained.' : 'Lifecycle settings loaded.'));
}

// Factories mount controls once. Their update functions receive the current
// analysis after the workbench clears reading slots; guarded edit/write ports
// retain the mounted editor’s ownership and gesture boundaries.
function createPlanView({ root, reels, knobs, companion, screen, note, reel, edit, moneyControl, range, renderPlan }) {
  reels.classList.add('investment-comparison__reels--connected');
  reel('approach', 'Investment approach', value => edit(record => selectPlanApproach(record, value), value === 'custom' ? 'Current allocation retained.' : 'Budget allocation updated.'));
  reel('domain', 'Investment lens'); moneyControl('budget', 'Budget to compare', 'all', 'aggregate');
  const approachReading = node('output', '', 'investment-comparison__reel-context'), lensReading = node('output', '', 'investment-comparison__reel-context');
  reels.children[0].append(approachReading); reels.children[1].append(lensReading); root.insertBefore(companion, knobs);
  range('reserve', 'Reserve set aside', value => `${value}% of budget`, 'all', { besideReels: true, description: 'Reserves part of the budget, reducing the amount left for work and options.' }); range('opportunity', 'Options set aside', value => `${value}% of budget`, 'all', { description: 'Sets aside budget for options, reducing the unassigned amount.' });
  note.textContent = 'Reserve and options use this deck’s budget. Shared work keeps its planned time and price.';
  return (record, context, analysis) => {
    const state = record.settings, pricing = context.model.pricing;
    approachReading.value = `Reserve ${money(analysis.reserve)} · options ${money(analysis.opportunity)}`;
    lensReading.value = `${money(analysis.amount)} in view · ${analysis.remaining < 0 ? 'shortfall' : 'unassigned'} ${money(Math.abs(analysis.remaining))}`;
    screen.append(reading(state.domain === 'all' ? pricing.complete ? 'Whole plan investment' : 'Known plan investment' : state.domain === 'funded' ? 'Within funded time' : 'Extra investment', money(analysis.amount)), reading(analysis.remaining < 0 ? 'Budget shortfall' : 'Budget unassigned', money(Math.abs(analysis.remaining)), `${money(state.budget)} budget`));
    const allocation = node('div', undefined, 'investment-comparison__allocation'); allocation.setAttribute('aria-label', 'Budget allocation');
    for (const [kind, label, amount] of [['work', 'Planned work', pricing.total], ['reserve', 'Reserve', analysis.reserve], ['opportunity', 'Options', analysis.opportunity], ['remaining', analysis.remaining < 0 ? 'Shortfall' : 'Unassigned', Math.abs(analysis.remaining)]]) {
      const pad = node('div', undefined, 'investment-comparison__allocation-pad'); pad.dataset.allocation = kind; pad.dataset.shortfall = String(kind === 'remaining' && analysis.remaining < 0); pad.style.setProperty('--allocation-share', `${state.budget ? Math.min(100, amount / state.budget * 100) : 0}%`); pad.append(node('span', label), node('strong', `${pricing.complete ? '' : 'Known '}${money(amount)}`)); allocation.append(pad);
    }
    companion.append(node('h4', 'Budget allocation'), allocation);
    renderPlan(record, context, analysis);
  };
}

function createRolloutView({ companion, screen, note, reel, edit, moneyControl, range }) {
  lifecycle(reel, edit); reel('domain', 'Customer account');
  moneyControl('listPrice', 'List price / team / quarter', 'pricing', 'unit', 'stacked'); range('discount', 'Price discount', value => `${value}%`, 'all', { besideReels: true, description: 'Reduces the price and contribution earned per customer team.' }); moneyControl('variableCost', 'Delivery cost / team / quarter', 'pricing'); moneyControl('serviceCost', 'Service cost / team / quarter', 'pricing');
  range('teams', 'Customer teams', number, 'implementation'); moneyControl('setup', 'Setup per customer team', 'implementation', 'unit', 'stacked'); range('training', 'Training per team', value => `${value} hours`, 'implementation');
  note.textContent = 'Training uses $120/hour. Customer implementation stays separate from recurring price and contribution.';
  return (record, _context, analysis) => {
    const state = record.settings;
    const m = analysis.metrics, net = m.netPrice.value, contribution = m.unitContribution.value;
    screen.append(metricTiles([['Net price / quarter', metric(m.netPrice), 'Per customer team'], ['Contribution / quarter', metric(m.unitContribution), 'Per customer team'], ['Customer implementation', money(analysis.implementation), `${state.teams} teams`]]));
    companion.append(bars(state.domain === 'pricing' ? [{ label: 'List price', value: state.listPrice }, { label: 'Net price', value: net }, { label: 'Delivery & service', value: state.variableCost + state.serviceCost }, { label: 'Contribution', value: contribution }] : [{ label: 'Setup', value: analysis.setup }, { label: 'Training', value: analysis.training }]));
  };
}

function createCommercialView({ companion, screen, note, reel, edit, moneyControl, range }) {
  lifecycle(reel, edit); reel('metric', 'Commercial reading', value => edit(record => selectCommercialMetric(record, value), 'Commercial reading selected.'));
  moneyControl('openingRevenue', 'Opening revenue / quarter', 'retention', 'aggregate'); range('retained', 'Opening revenue retained', value => `${value}%`, 'all', { besideReels: true, description: 'Sets how much opening revenue carries forward into retention and closing revenue.' }); moneyControl('expansion', 'Cohort expansion / quarter', 'retention', 'aggregate'); moneyControl('reactivation', 'Reactivated revenue / quarter', 'retention', 'aggregate');
  moneyControl('acquisitionSpend', 'Acquisition spend', 'acquisition', 'aggregate'); range('newCustomers', 'New customers', number, 'acquisition'); moneyControl('newRevenue', 'New revenue / quarter', 'acquisition', 'aggregate'); range('contributionMargin', 'New revenue contribution margin', value => `${value}%`, 'acquisition');
  note.textContent = 'GRR and NRR track the opening cohort. New and reactivated revenue join the closing total separately.';
  return (record, _context, analysis) => {
    const state = record.settings;
    const m = analysis.metrics;
    screen.append(metricTiles(state.domain === 'retention' ? [['GRR', metric(m.grr, percent), 'Gross revenue retention', 'grr'], ['NRR', metric(m.nrr, percent), 'Net revenue retention', 'nrr'], ['Closing revenue', metric(m.closingRevenue), 'Per quarter']] : [['CAC', metric(m.cac, money, 'Needs customers'), 'Per new customer', 'cac'], ['Acquisition payback', paybackText(m.cacPayback), 'At the entered contribution margin', 'payback'], ['New revenue', money(state.newRevenue), 'Per quarter']], state.metric));
    companion.append(bars([{ label: 'Opening cohort retained', value: state.openingRevenue * state.retained / 100 }, { label: 'Cohort expansion', value: state.expansion }, { label: 'New + reactivated', value: state.newRevenue + state.reactivation }]));
  };
}

function createServiceView({ companion, screen, note, reel, edit, moneyControl, range }) {
  lifecycle(reel, edit); reel('domain', 'Operational lens');
  range('people', 'People reached'); range('adoption', 'Adoption', value => `${value}%`, 'all', { besideReels: true, description: 'Sets the share of people using the change, affecting time saved, service cost and capacity demand.' }); range('minutes', 'Time saved per use', value => `${value} minutes`, 'time');
  moneyControl('baselineCost', 'Current cost / person / quarter', 'budget'); moneyControl('candidateCost', 'Changed cost / person / quarter', 'budget'); range('capacity', 'People supported per quarter', number, 'capacity');
  note.textContent = 'The time comparison starts with a 30-minute workflow, twice each week. Budget and capacity retain their own units.';
  return (record, _context, analysis) => {
    const state = record.settings;
    const m = analysis.metrics, reached = m.adoptedPopulation.value;
    screen.append(metricTiles([['Time released', `${number(analysis.releasedHours)} h / week`, `${number(reached)} people adopting`], ['Budget change', metric(m.budgetImpact, signedMoney), 'Per quarter'], ['Capacity gap', metric(m.capacityGap, number), 'People per quarter']]));
    const items = state.domain === 'time' ? [{ label: 'Current workflow', value: reached, text: `${number(reached)} h / week` }, { label: 'Changed workflow', value: reached - analysis.releasedHours, text: `${number(reached - analysis.releasedHours)} h / week` }] : state.domain === 'budget' ? [{ label: 'Current service', value: reached * state.baselineCost }, { label: 'Changed service', value: reached * state.candidateCost }] : [{ label: 'People adopting', value: reached, text: number(reached) }, { label: 'Capacity available', value: state.capacity, text: number(state.capacity) }];
    companion.append(bars(items));
  };
}

function createCapitalView({ id, companion, screen, note, reel, moneyControl, range, write }) {
  reel('alternative', 'Alternative'); reel('lifecycle', 'Benefit pattern');
  reel('metric', 'Capital reading', undefined, { variant: 'rose' });
  moneyControl('upfront', 'Pilot upfront investment', 'all', 'aggregate'); moneyControl('benefit', 'Pilot net benefit / quarter', 'all', 'aggregate'); range('discount', 'Discount per quarter', value => `${value}%`, 'all', { description: 'Reduces the present value of future cash flows in the NPV comparison.' }); range('quarters', 'Comparison horizon', value => `${value} quarters`);
  note.textContent = 'Quarter-end net cash flows. Rollout uses 2.5× upfront, 1.8× benefit and one quarter to start.';
  return (record, _context, analysis) => {
    const state = record.settings;
    const selected = analysis.selected;
    screen.append(metricTiles([['Net present value', metric(selected.npv, signedMoney), selected.label, 'npv'], ['IRR / quarter', irrText(selected.irr), 'Internal rate of return', 'irr'], ['Payback', paybackText(selected.payback), 'Undiscounted', 'payback']], state.metric));
    const flows = node('div', undefined, 'investment-comparison__flows'); flows.setAttribute('role', 'region'); flows.setAttribute('aria-label', 'Quarterly net cash flows'); flows.tabIndex = 0;
    const flowLine = node('div'); selected.flows.forEach((value, index) => { const pad = node('div', undefined, 'investment-comparison__flow'); pad.dataset.negative = String(value < 0); pad.append(node('small', index === 0 ? 'Upfront' : `Q${index}`), node('strong', signedMoney(value))); flowLine.append(pad); }); flows.append(flowLine);
    const sensitivity = node('fieldset', undefined, 'investment-comparison__sensitivity'); sensitivity.append(node('legend', 'Net benefit sensitivity'));
    for (const choice of analysis.sensitivity) { const pad = button('', () => write('sensitivity', choice.percent), '', `investment-${id}-sensitivity-${choice.percent}`); pad.setAttribute('aria-pressed', String(choice.percent === state.sensitivity)); pad.append(node('span', choice.percent === 100 ? 'Entered benefit' : choice.percent < 100 ? '20% lower' : '20% higher'), node('strong', metric(choice.npv, signedMoney))); sensitivity.append(pad); }
    const comparison = state.metric === 'npv' ? { title: 'Net present value', value: option => option.npv.value, text: option => metric(option.npv, signedMoney) } : state.metric === 'irr' ? { title: 'Internal rate of return / quarter', value: option => option.irr.value, text: option => irrText(option.irr) } : { title: 'Undiscounted payback', value: option => option.payback.value, text: option => paybackText(option.payback) };
    companion.append(node('h4', comparison.title), bars(analysis.alternatives.map(option => ({ label: option.label, value: comparison.value(option), text: comparison.text(option) }))), flows, sensitivity);
  };
}

// Each admitted type owns its controls and readings. The workbench owns their lifetime.
const DECK_VIEWS = Object.freeze({
  plan: Object.freeze({
    create: createPlanView,
    masterReading: (_record, _analysis, pricing) => [`${pricing.complete ? '' : 'Known '}${money(pricing.total)}`, `${number(pricing.effort)} person-hours`],
  }),
  rollout: Object.freeze({
    create: createRolloutView,
    masterReading: (record, analysis) => [money(analysis.implementation), `${record.settings.teams} customer teams`],
    reelReading: (record, analysis) => record.settings.domain === 'pricing'
      ? `${metric(analysis.metrics.netPrice)} net · ${metric(analysis.metrics.unitContribution)} contribution`
      : `${money(analysis.implementation)} · ${record.settings.teams} customer teams`,
  }),
  commercial: Object.freeze({
    create: createCommercialView,
    masterReading: (_record, analysis) => [metric(analysis.metrics.closingRevenue), 'Revenue / quarter'],
    reelReading: (record, analysis) => {
      const state = record.settings, m = analysis.metrics;
      return state.metric === 'cac' ? `${metric(m.cac, money, 'Needs customers')} per new customer` : state.metric === 'payback' ? `${paybackText(m.cacPayback)} acquisition payback` : `${metric(m[state.metric], percent)} ${state.metric.toUpperCase()} · ${metric(m.closingRevenue)} closing`;
    },
  }),
  service: Object.freeze({
    create: createServiceView,
    masterReading: (_record, analysis) => [`${number(analysis.releasedHours)} h / week`, 'Time released'],
    reelReading: (record, analysis) => {
      const state = record.settings, m = analysis.metrics;
      if (state.domain === 'time') return `${number(analysis.releasedHours)} h / week · Time released`;
      return state.domain === 'budget' ? `${metric(m.budgetImpact, signedMoney)} budget change / quarter` : `${metric(m.capacityGap, number)} people · capacity gap`;
    },
  }),
  capital: Object.freeze({
    create: createCapitalView,
    masterReading: (record, analysis) => [metric(analysis.selected.npv, signedMoney), `${record.settings.quarters} quarters · NPV`],
    reelReading: (record, analysis) => `${metric(analysis.selected.npv, signedMoney)} · ${record.settings.quarters} quarters · NPV`,
  }),
});

export function investmentDeckView(type) {
  if (!Object.hasOwn(DECK_VIEWS, type)) throw new TypeError(`Unknown investment deck type: ${type}`);
  return DECK_VIEWS[type];
}
