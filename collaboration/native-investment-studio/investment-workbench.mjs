// Shared session pricing stays distinct from the independent financial comparison tapes.
import { INVESTMENT_TYPES, PLAN_APPROACHES, FINANCIAL_PRESETS, financialSettings } from './investment-catalog.mjs';
import { analyseInvestment } from './investment-financials.mjs';
import { INVESTMENT_DECK_LIMIT, INVESTMENT_FIELDS } from './investment-state.mjs';
import { createMoneyControl, createChoiceReel } from './investment-controls.mjs';
import { INVESTMENT_DOMAINS, investmentPortrait, renderInvestmentPortrait, renderInvestmentDiagram } from './investment-portrait.mjs';
import { revealReelResult } from './reel-control.mjs';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
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
const typeFor = record => INVESTMENT_TYPES.find(type => type.id === record.type);
const titleFor = record => `${typeFor(record).title}${record.sequence > 1 ? ` ${record.sequence}` : ''}`;
function masterReading(record, analysis, pricing) {
  switch (record.type) {
    case 'rollout': return [money(analysis.implementation), `${record.settings.teams} customer teams`];
    case 'commercial': return [metric(analysis.metrics.closingRevenue), 'Revenue / quarter'];
    case 'service': return [`${number(analysis.releasedHours)} h / week`, 'Time released'];
    case 'capital': return [metric(analysis.selected.npv, signedMoney), `${record.settings.quarters} quarters · NPV`];
    default: return [`${pricing.complete ? '' : 'Known '}${money(pricing.total)}`, `${number(pricing.effort)} person-hours`];
  }
}
function reelReading(record, analysis, pricing) {
  const state = record.settings, m = analysis.metrics;
  if (record.type === 'rollout' && state.domain === 'pricing') return `${metric(m.netPrice)} net · ${metric(m.unitContribution)} contribution`;
  if (record.type === 'commercial') return state.metric === 'cac' ? `${metric(m.cac, money, 'Needs customers')} per new customer` : state.metric === 'payback' ? `${paybackText(m.cacPayback)} acquisition payback` : `${metric(m[state.metric], percent)} ${state.metric.toUpperCase()} · ${metric(m.closingRevenue)} closing`;
  if (record.type === 'service' && state.domain !== 'time') return state.domain === 'budget' ? `${metric(m.budgetImpact, signedMoney)} budget change / quarter` : `${metric(m.capacityGap, number)} people · capacity gap`;
  const [amount, detail] = masterReading(record, analysis, pricing); return `${amount} · ${detail}`;
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

export function createInvestmentWorkbench({ getModel, change, openSession, setFunding }) {
  let selected = 'pairing', activeId = 'investment-plan-1', domain = 'plan', adding = false;
  let outer, shelf, library, panel, loaded, domainControl, domainReading, portraitKey;
  const editors = new Map();
  const records = () => getModel().investment.decks;
  const recordFor = id => records().find(record => record.id === id);
  function focus(container, key) { [...container.querySelectorAll('[data-focus-key]')].find(element => element.dataset.focusKey === key)?.focus({ preventScroll: true }); }
  function addRecord(type) {
    if (records().length >= INVESTMENT_DECK_LIMIT) return;
    loaded?.release();
    change(model => { const state = model.investment, sequence = 1 + Math.max(0, ...state.decks.filter(record => record.type === type).map(record => record.sequence)); activeId = `investment-${crypto.randomUUID()}`; domain = type; state.decks.push({ id: activeId, type, sequence, settings: financialSettings(type) }); adding = false; }, 'Investment deck added.');
    focus(outer, `master-${activeId}`);
  }
  function render(container) {
    const model = getModel(), state = model.investment, pricing = model.pricing;
    if (!recordFor(activeId)) activeId = state.decks.find(record => record.type === domain)?.id;
    if (recordFor(activeId)) domain = recordFor(activeId).type;
    if (!outer) {
      outer = node('div', undefined, 'investment-study investment-study--masters');
      const channel = node('aside', undefined, 'investment-study__channel'); channel.append(node('h2', 'Investment decks'));
      shelf = node('nav', undefined, 'investment-study__masters'); shelf.setAttribute('aria-label', 'Investment comparison decks');
      library = node('section', undefined, 'investment-study__library'); library.setAttribute('aria-label', 'Add an investment comparison');
      panel = node('section', undefined, 'investment-study__loaded-master'); panel.id = 'investment-master-panel';
      domainControl = createChoiceReel({ id: 'investment-domain', label: 'Domain', variant: 'chocolate', options: Object.entries(INVESTMENT_DOMAINS).map(([id, value]) => ({ id, label: value.label })), read: () => domain, write: value => { loaded?.release(); domain = value; activeId = records().find(record => record.type === value)?.id; render(container); } });
      domainControl.element.classList.add('investment-study__domain');
      const body = node('div', undefined, 'investment-study__body'), domainRow = node('section', undefined, 'investment-study__orientation');
      domainRow.setAttribute('aria-label', 'Investment domain');
      domainReading = node('section', undefined, 'investment-domain');
      domainRow.append(domainControl.element, domainReading);
      body.append(domainRow, panel); channel.append(shelf, library); outer.append(channel, body);
    }
    if (outer.parentElement !== container) container.replaceChildren(outer);
    const focusedKey = outer.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    const scroll = { left: shelf.scrollLeft, top: shelf.scrollTop };
    domainControl.update(domain);
    const present = new Set(state.decks.map(record => record.id));
    for (const [id, editor] of editors) if (!present.has(id)) { editor.dispose(); editors.delete(id); }
    shelf.replaceChildren();
    for (const record of state.decks) {
      const definition = typeFor(record), [amount, detail] = masterReading(record, analyseInvestment(record, pricing), pricing);
      const tape = button('', () => { loaded?.release(); activeId = record.id; domain = record.type; render(container); focus(container, `master-${record.id}`); }, 'investment-master', `master-${record.id}`);
      tape.dataset.investmentType = record.type; tape.dataset.investmentRecord = record.id;
      tape.setAttribute('aria-pressed', String(activeId === record.id)); tape.setAttribute('aria-controls', panel.id);
      const face = node('span', undefined, 'investment-master__face');
      const reels = node('span', undefined, 'investment-master__reels'); reels.setAttribute('aria-hidden', 'true');
      face.append(node('span', definition.strip, 'investment-master__strip'), node('strong', titleFor(record), 'investment-master__title'), reels, node('span', amount, 'investment-master__amount'), node('small', detail)); tape.append(face); shelf.append(tape);
    }
    library.replaceChildren();
    const add = button(adding ? 'Close library' : '＋ New investment deck', () => { adding = !adding; render(container); focus(container, 'master-add'); }, adding ? 'ghost' : 'add', 'master-add');
    add.disabled = state.decks.length >= INVESTMENT_DECK_LIMIT; add.setAttribute('aria-expanded', String(adding)); add.setAttribute('aria-controls', 'investment-tape-library'); library.append(add);
    const choices = node('div', undefined, 'investment-study__library-choices'); choices.id = 'investment-tape-library'; choices.hidden = !adding;
    for (const definition of INVESTMENT_TYPES) {
      const choice = button('', () => addRecord(definition.id), 'investment-study__library-choice', `add-master-${definition.id}`);
      choice.append(node('strong', `＋ ${definition.title}`), node('small', definition.detail)); choices.append(choice);
    }
    library.append(choices);
    const record = recordFor(activeId), description = INVESTMENT_DOMAINS[domain];
    const title = node('h3', description.title), detail = node('p', description.detail);
    domainReading.replaceChildren(title, detail);
    if (record) domainReading.append(renderInvestmentPortrait(document, investmentPortrait(record, pricing)));
    else {
      domainReading.append(renderInvestmentDiagram(document, description));
      const definition = INVESTMENT_TYPES.find(type => type.id === domain);
      const restore = button(`＋ Add ${definition.title.toLowerCase()}`, () => addRecord(domain), 'add', 'master-empty-add');
      restore.disabled = state.decks.length >= INVESTMENT_DECK_LIMIT;
      domainReading.append(restore);
    }
    const nextPortraitKey = `${domain}:${activeId || 'empty'}`;
    if (portraitKey !== nextPortraitKey) { revealReelResult(domainReading); portraitKey = nextPortraitKey; }
    if (!record) {
      loaded?.release(); loaded = null; panel.replaceChildren(); panel.hidden = true;
      if (focusedKey) focus(outer, focusedKey);
      return;
    }
    panel.hidden = false;
    panel.setAttribute('aria-label', titleFor(record));
    if (editors.has(record.id) && editors.get(record.id).type !== record.type) {
      editors.get(record.id).dispose(); editors.delete(record.id); if (loaded?.id === record.id) loaded = null;
    }
    if (loaded?.id !== record.id) {
      loaded?.release(); loaded = editors.get(record.id) || createEditor(record);
      editors.set(record.id, loaded); panel.replaceChildren(loaded.root); revealReelResult(loaded.root);
    }
    loaded.update(record, pricing);
    shelf.scrollLeft = scroll.left; shelf.scrollTop = scroll.top;
    if (focusedKey && !document.activeElement?.closest('.investment-comparison')) focus(outer, focusedKey);
  }

  function createEditor(initial) {
    const id = initial.id, type = initial.type, controls = [], updates = [], groups = new Map();
    let approachReading, lensReading, currentReading;
    const read = () => recordFor(id)?.settings || initial.settings;
    const write = (field, value, key) => change(model => {
      const record = model.investment.decks.find(item => item.id === id); if (!record) return;
      record.settings[field] = value;
      if (type === 'plan' && ['budget', 'reserve', 'opportunity'].includes(field)) record.settings.approach = 'custom';
      if (FINANCIAL_PRESETS[type]?.some(preset => Object.hasOwn(preset.values, field))) record.settings.lifecycle = 'custom';
    }, '', key);
    const root = node('section', undefined, 'investment-comparison'); root.dataset.investmentEditor = id; root.dataset.investmentType = type;
    const head = node('header', undefined, 'investment-comparison__head'), title = node('h3', titleFor(initial)), titles = node('div');
    titles.append(node('small', typeFor(initial).strip), title);
    const remove = button('Remove deck', () => {
      controls.forEach(control => control.release?.());
      change(model => { model.investment.decks = model.investment.decks.filter(record => record.id !== id); }, 'Investment deck removed. Undo restores it.');
      focus(outer, activeId ? `master-${activeId}` : 'master-empty-add');
    }, 'remove', `remove-master-${id}`);
    head.append(titles, remove);
    const reels = node('div', undefined, 'investment-comparison__reels'), screen = node('div', undefined, 'investment-comparison__screen'), knobs = node('div', undefined, 'investment-comparison__controls'), companion = node('div', undefined, 'investment-comparison__companion'), plan = node('div'), note = node('p', undefined, 'investment-comparison__note');
    root.append(head, reels, screen, knobs, companion, plan, note);
    function group(name = 'all') {
      if (!groups.has(name)) { const element = node('div', undefined, 'investment-comparison__control-group'); groups.set(name, element); knobs.append(element); }
      return groups.get(name);
    }
    function moneyControl(field, label, domain = 'all', scale = 'unit', readout = scale === 'aggregate' ? 'stacked' : 'inline') {
      const control = createMoneyControl({ id: `investment-${id}-${field}`, label, read: () => read()[field], write: (value, key) => write(field, value, key), max: INVESTMENT_FIELDS[type][field].max, increments: scale === 'aggregate' ? [1000, 100] : [100, 5], readout }); controls.push(control); group(domain).append(control.element); updates.push(state => control.update(state[field]));
    }
    function range(field, label, format = number, domain = 'all', besideReels = false) {
      const { min, max, step } = INVESTMENT_FIELDS[type][field];
      const fieldset = node('div', undefined, 'investment-comparison__fader'), labelNode = node('label', label), output = node('output'), input = node('input');
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.id = `investment-${id}-${field}`; input.dataset.focusKey = input.id; labelNode.htmlFor = input.id; output.htmlFor = input.id;
      let editKey; const begin = () => { editKey = Symbol(`investment-${id}-${field}`); };
      input.addEventListener('pointerdown', begin); input.addEventListener('keydown', event => { if (!event.repeat) begin(); }); input.addEventListener('input', () => write(field, Number(input.value), editKey));
      fieldset.append(labelNode, output, input); (besideReels ? reels : group(domain)).append(fieldset); updates.push(state => { input.value = String(state[field]); input.setAttribute('aria-valuetext', format(state[field])); output.value = format(state[field]); });
    }
    function reel(field, label, choices, receive) {
      const control = createChoiceReel({ id: `investment-${id}-${field}`, label, variant: type === 'capital' && field === 'metric' ? 'rose' : undefined, secondary: reels.children.length > 0, options: choices.map(([id, label]) => ({ id, label })), read: () => read()[field], write: value => receive ? receive(value) : write(field, value) }); controls.push(control); reels.append(control.element); updates.push(state => control.update(state[field]));
    }
    function lifecycle() {
      reel('lifecycle', 'Lifecycle', [...FINANCIAL_PRESETS[type].map(item => [item.id, item.label]), ['custom', 'Custom']], value => change(model => {
        const record = model.investment.decks.find(item => item.id === id); Object.assign(record.settings, FINANCIAL_PRESETS[type].find(item => item.id === value)?.values, { lifecycle: value });
      }, value === 'custom' ? 'Current settings retained.' : 'Lifecycle settings loaded.'));
    }
    if (type === 'plan') {
      reels.classList.add('investment-comparison__reels--connected');
      reel('approach', 'Investment approach', [...PLAN_APPROACHES.map(item => [item.id, item.label]), ['custom', 'Custom']], value => change(model => {
        const state = model.investment.decks.find(item => item.id === id).settings, preset = PLAN_APPROACHES.find(item => item.id === value);
        if (preset) Object.assign(state, { reserve: preset.reserve, opportunity: preset.opportunity }); state.approach = value;
      }, value === 'custom' ? 'Current allocation retained.' : 'Budget allocation updated.'));
      reel('domain', 'Investment lens', [['all', 'Whole plan'], ['funded', 'Funded time'], ['extra', 'Extra investment']]); moneyControl('budget', 'Budget to compare', 'all', 'aggregate');
      approachReading = node('output', '', 'investment-comparison__reel-context'); lensReading = node('output', '', 'investment-comparison__reel-context');
      reels.children[0].append(approachReading); reels.children[1].append(lensReading); root.insertBefore(companion, knobs);
      range('reserve', 'Reserve set aside', value => `${value}% of budget`, 'all', true); range('opportunity', 'Options set aside', value => `${value}% of budget`);
      note.textContent = 'Reserve and options use this deck’s budget. Shared work keeps its planned time and price.';
    } else if (type === 'rollout') {
      lifecycle(); reel('domain', 'Customer account', [['pricing', 'Price & margin'], ['implementation', 'Implementation']]);
      moneyControl('listPrice', 'List price / team / quarter', 'pricing', 'unit', 'stacked'); range('discount', 'Price discount', value => `${value}%`, 'all', true); moneyControl('variableCost', 'Delivery cost / team / quarter', 'pricing'); moneyControl('serviceCost', 'Service cost / team / quarter', 'pricing');
      range('teams', 'Customer teams', number, 'implementation'); moneyControl('setup', 'Setup per customer team', 'implementation', 'unit', 'stacked'); range('training', 'Training per team', value => `${value} hours`, 'implementation');
      note.textContent = 'Training uses $120/hour. Customer implementation stays separate from recurring price and contribution.';
    } else if (type === 'commercial') {
      lifecycle(); reel('metric', 'Commercial reading', [['grr', 'GRR'], ['nrr', 'NRR'], ['cac', 'CAC'], ['payback', 'Payback']], value => change(model => { const state = model.investment.decks.find(item => item.id === id).settings; state.metric = value; state.domain = ['grr', 'nrr'].includes(value) ? 'retention' : 'acquisition'; }, 'Commercial reading selected.'));
      moneyControl('openingRevenue', 'Opening revenue / quarter', 'retention', 'aggregate'); range('retained', 'Opening revenue retained', value => `${value}%`, 'all', true); moneyControl('expansion', 'Cohort expansion / quarter', 'retention', 'aggregate'); moneyControl('reactivation', 'Reactivated revenue / quarter', 'retention', 'aggregate');
      moneyControl('acquisitionSpend', 'Acquisition spend', 'acquisition', 'aggregate'); range('newCustomers', 'New customers', number, 'acquisition'); moneyControl('newRevenue', 'New revenue / quarter', 'acquisition', 'aggregate'); range('contributionMargin', 'New revenue contribution margin', value => `${value}%`, 'acquisition');
      note.textContent = 'GRR and NRR track the opening cohort. New and reactivated revenue join the closing total separately.';
    } else if (type === 'service') {
      lifecycle(); reel('domain', 'Operational lens', [['time', 'Working time'], ['budget', 'Service budget'], ['capacity', 'Capacity']]);
      range('people', 'People reached'); range('adoption', 'Adoption', value => `${value}%`, 'all', true); range('minutes', 'Time saved per use', value => `${value} minutes`, 'time');
      moneyControl('baselineCost', 'Current cost / person / quarter', 'budget'); moneyControl('candidateCost', 'Changed cost / person / quarter', 'budget'); range('capacity', 'People supported per quarter', number, 'capacity');
      note.textContent = 'The time comparison starts with a 30-minute workflow, twice each week. Budget and capacity retain their own units.';
    } else {
      reel('alternative', 'Alternative', [['current', 'Keep current'], ['pilot', 'Pilot'], ['rollout', 'Rollout']]); reel('lifecycle', 'Benefit pattern', [['ramp', 'Ramp up'], ['steady', 'Steady'], ['expand', 'Expand']]);
      reel('metric', 'Capital reading', [['npv', 'NPV'], ['irr', 'IRR'], ['payback', 'Payback']]);
      moneyControl('upfront', 'Pilot upfront investment', 'all', 'aggregate'); moneyControl('benefit', 'Pilot net benefit / quarter', 'all', 'aggregate'); range('discount', 'Discount per quarter', value => `${value}%`); range('quarters', 'Comparison horizon', value => `${value} quarters`);
      note.textContent = 'Quarter-end net cash flows. Rollout uses 2.5× upfront, 1.8× benefit and one quarter to start.';
    }
    if (type !== 'plan') { currentReading = node('output', '', 'investment-comparison__reel-context'); reels.children[0].append(currentReading); }
    return { id, type, root, dispose() { controls.forEach(control => control.dispose?.()); root.remove(); }, release() { controls.forEach(control => control.release?.()); }, update(record, pricing) {
      title.textContent = titleFor(record); const state = record.settings, analysis = analyseInvestment(record, pricing);
      if (currentReading) currentReading.value = reelReading(record, analysis, pricing);
      for (const update of updates) update(state);
      for (const [name, element] of groups) element.hidden = name !== 'all' && name !== state.domain;
      screen.replaceChildren(); companion.replaceChildren();
      if (type === 'plan') {
        approachReading.value = `Reserve ${money(analysis.reserve)} · options ${money(analysis.opportunity)}`;
        lensReading.value = `${money(analysis.amount)} in view · ${analysis.remaining < 0 ? 'shortfall' : 'unassigned'} ${money(Math.abs(analysis.remaining))}`;
        screen.append(reading(state.domain === 'all' ? pricing.complete ? 'Whole plan investment' : 'Known plan investment' : state.domain === 'funded' ? 'Within funded time' : 'Extra investment', money(analysis.amount)), reading(analysis.remaining < 0 ? 'Budget shortfall' : 'Budget unassigned', money(Math.abs(analysis.remaining)), `${money(state.budget)} budget`));
        const allocation = node('div', undefined, 'investment-comparison__allocation'); allocation.setAttribute('aria-label', 'Budget allocation');
        for (const [kind, label, amount] of [['work', 'Planned work', pricing.total], ['reserve', 'Reserve', analysis.reserve], ['opportunity', 'Options', analysis.opportunity], ['remaining', analysis.remaining < 0 ? 'Shortfall' : 'Unassigned', Math.abs(analysis.remaining)]]) {
          const pad = node('div', undefined, 'investment-comparison__allocation-pad'); pad.dataset.allocation = kind; pad.dataset.shortfall = String(kind === 'remaining' && analysis.remaining < 0); pad.style.setProperty('--allocation-share', `${state.budget ? Math.min(100, amount / state.budget * 100) : 0}%`); pad.append(node('span', label), node('strong', `${pricing.complete ? '' : 'Known '}${money(amount)}`)); allocation.append(pad);
        }
        companion.append(node('h4', 'Budget allocation'), allocation);
        renderPlan(plan, record);
      } else if (type === 'rollout') {
        const m = analysis.metrics, net = m.netPrice.value, contribution = m.unitContribution.value;
        screen.append(metricTiles([['Net price / quarter', metric(m.netPrice), 'Per customer team'], ['Contribution / quarter', metric(m.unitContribution), 'Per customer team'], ['Customer implementation', money(analysis.implementation), `${state.teams} teams`]]));
        companion.append(bars(state.domain === 'pricing' ? [{ label: 'List price', value: state.listPrice }, { label: 'Net price', value: net }, { label: 'Delivery & service', value: state.variableCost + state.serviceCost }, { label: 'Contribution', value: contribution }] : [{ label: 'Setup', value: analysis.setup }, { label: 'Training', value: analysis.training }]));
      } else if (type === 'commercial') {
        const m = analysis.metrics;
        screen.append(metricTiles(state.domain === 'retention' ? [['GRR', metric(m.grr, percent), 'Gross revenue retention', 'grr'], ['NRR', metric(m.nrr, percent), 'Net revenue retention', 'nrr'], ['Closing revenue', metric(m.closingRevenue), 'Per quarter']] : [['CAC', metric(m.cac, money, 'Needs customers'), 'Per new customer', 'cac'], ['Acquisition payback', paybackText(m.cacPayback), 'At the entered contribution margin', 'payback'], ['New revenue', money(state.newRevenue), 'Per quarter']], state.metric));
        companion.append(bars([{ label: 'Opening cohort retained', value: state.openingRevenue * state.retained / 100 }, { label: 'Cohort expansion', value: state.expansion }, { label: 'New + reactivated', value: state.newRevenue + state.reactivation }]));
      } else if (type === 'service') {
        const m = analysis.metrics, reached = m.adoptedPopulation.value;
        screen.append(metricTiles([['Time released', `${number(analysis.releasedHours)} h / week`, `${number(reached)} people adopting`], ['Budget change', metric(m.budgetImpact, signedMoney), 'Per quarter'], ['Capacity gap', metric(m.capacityGap, number), 'People per quarter']]));
        const items = state.domain === 'time' ? [{ label: 'Current workflow', value: reached, text: `${number(reached)} h / week` }, { label: 'Changed workflow', value: reached - analysis.releasedHours, text: `${number(reached - analysis.releasedHours)} h / week` }] : state.domain === 'budget' ? [{ label: 'Current service', value: reached * state.baselineCost }, { label: 'Changed service', value: reached * state.candidateCost }] : [{ label: 'People adopting', value: reached, text: number(reached) }, { label: 'Capacity available', value: state.capacity, text: number(state.capacity) }];
        companion.append(bars(items));
      } else {
        const selected = analysis.selected;
        screen.append(metricTiles([['Net present value', metric(selected.npv, signedMoney), selected.label, 'npv'], ['IRR / quarter', irrText(selected.irr), 'Internal rate of return', 'irr'], ['Payback', paybackText(selected.payback), 'Undiscounted', 'payback']], state.metric));
        const flows = node('div', undefined, 'investment-comparison__flows'); flows.setAttribute('role', 'region'); flows.setAttribute('aria-label', 'Quarterly net cash flows'); flows.tabIndex = 0;
        const flowLine = node('div'); selected.flows.forEach((value, index) => { const pad = node('div', undefined, 'investment-comparison__flow'); pad.dataset.negative = String(value < 0); pad.append(node('small', index === 0 ? 'Upfront' : `Q${index}`), node('strong', signedMoney(value))); flowLine.append(pad); }); flows.append(flowLine);
        const sensitivity = node('fieldset', undefined, 'investment-comparison__sensitivity'); sensitivity.append(node('legend', 'Net benefit sensitivity'));
        for (const choice of analysis.sensitivity) { const pad = button('', () => write('sensitivity', choice.percent), '', `investment-${id}-sensitivity-${choice.percent}`); pad.setAttribute('aria-pressed', String(choice.percent === state.sensitivity)); pad.append(node('span', choice.percent === 100 ? 'Entered benefit' : choice.percent < 100 ? '20% lower' : '20% higher'), node('strong', metric(choice.npv, signedMoney))); sensitivity.append(pad); }
        const comparison = state.metric === 'npv' ? { title: 'Net present value', value: option => option.npv.value, text: option => metric(option.npv, signedMoney) } : state.metric === 'irr' ? { title: 'Internal rate of return / quarter', value: option => option.irr.value, text: option => irrText(option.irr) } : { title: 'Undiscounted payback', value: option => option.payback.value, text: option => paybackText(option.payback) };
        companion.append(node('h4', comparison.title), bars(analysis.alternatives.map(option => ({ label: option.label, value: comparison.value(option), text: comparison.text(option) }))), flows, sensitivity);
      }
    } };
  }

  function renderPlan(container, record) {
    const model = getModel(), base = model.pricing, state = record.settings;
    const pricing = { ...base, sessions: analyseInvestment(record, base).visibleSessions };
    if (!pricing.sessions.some(item => item.tape.id === selected)) selected = pricing.sessions[0]?.tape.id;
    const current = pricing.sessions.find(item => item.tape.id === selected);
    const root = node('div', undefined, 'investment-study');
    const meter = node('section', undefined, 'investment-study__meter'); meter.setAttribute('aria-label', 'Accepted plan investment');
    for (const [label, value] of [[pricing.complete ? 'Accepted investment' : 'Known investment', money(pricing.total)], ['People’s time', `${number(pricing.effort)} h`], ['Since saved comparison', state.baseline === null ? '—' : `${pricing.total >= state.baseline ? '+' : '−'}${money(Math.abs(pricing.total - state.baseline))}`]]) {
      const reading = node('div'); reading.append(node('span', label), node('strong', value)); meter.append(reading);
    }
    const save = button(state.baseline === null ? 'Save comparison' : 'Update comparison', () => change(model => { model.investment.decks.find(item => item.id === record.id).settings.baseline = model.pricing.total; }, 'Comparison saved.'), 'ghost', 'investment-save');
    meter.append(save); root.append(meter);

    const board = node('div', undefined, 'investment-study__board');
    board.dataset.fundingLens = state.domain;
    for (const [funding, title, hint] of [['funded', 'Within funded time', 'Time already set aside'], ['extra', 'Extra investment', 'Work to fund separately']]) {
      if (state.domain !== 'all' && state.domain !== funding) continue;
      const lane = node('section', undefined, 'investment-study__lane'); lane.dataset.funding = funding;
      const entries = pricing.sessions.filter(item => item.funding === funding);
      const heading = node('div', undefined, 'bar'); heading.append(node('h3', title), node('strong', `${entries.every(item => item.complete) ? '' : 'Known '}${money(entries.reduce((sum, item) => sum + item.cost, 0))}`, 'number')); lane.append(heading, node('p', hint, 'hint'));
      for (const item of entries) {
        const pad = button('', () => { selected = item.tape.id; render(outer.parentElement); container.querySelector(`[data-focus-key="investment-${selected}"]`)?.focus({ preventScroll: true }); }, 'investment-study__pad', `investment-${item.tape.id}`);
        pad.setAttribute('aria-pressed', String(selected === item.tape.id));
        pad.append(node('strong', item.tape.name), node('span', `${item.complete ? '' : 'Known '}${money(item.cost)} · ${number(item.effort)} person-hours`));
        const strip = node('span', undefined, 'investment-study__strip'); strip.style.setProperty('--share', `${pricing.total ? item.cost / pricing.total * 100 : 0}%`); strip.setAttribute('aria-hidden', 'true'); pad.append(strip); lane.append(pad);
      }
      if (!entries.length) lane.append(node('p', state.domain === 'all' ? 'Choose a session below to move work here.' : 'Choose Whole plan to move work into this group.', 'hint'));
      board.append(lane);
    }
    root.append(board);
    if (current) {
      const deck = node('section', undefined, 'investment-study__deck'); deck.setAttribute('aria-label', 'Selected session investment');
      const heading = node('div', undefined, 'bar'); heading.append(node('h3', current.tape.name));
      if (openSession) heading.append(button('Session controls ↗', event => openSession(current.tape.id, event.currentTarget), 'ghost', 'investment-session')); deck.append(heading);
      const modules = node('div', undefined, 'investment-study__modules');
      const funding = node('fieldset'); funding.append(node('legend', 'How this work is funded'));
      for (const [value, label] of [['funded', 'Within funded time'], ['extra', 'Extra investment']]) {
        const pad = button(label, event => {
          const heldFocus = document.activeElement === event.currentTarget;
          setFunding(current.tape.id, value);
          if (heldFocus && !container.querySelector(`[data-focus-key="funding-${value}"]`)) focus(outer, `investment-${record.id}-domain-${state.domain}`);
        }, '', `funding-${value}`);
        pad.setAttribute('aria-pressed', String(current.funding === value)); funding.append(pad);
      }
      const people = node('section'); people.append(node('h3', 'Time behind the amount'));
      const chips = node('div', undefined, 'investment-study__people');
      for (const id of current.tape.people) {
        const person = model.people.find(item => item.id === id); if (!person) continue;
        const chip = node('div'); chip.append(node('strong', person.name), node('span', `${number(current.hours)} h · ${person.rate === null ? 'Rate unknown' : money(current.hours * person.rate)}`)); chips.append(chip);
      }
      if (!current.tape.people.length) chips.append(node('p', 'Choose people in Session controls.', 'hint'));
      people.append(chips); modules.append(funding, people); deck.append(modules); root.append(deck);
    }
    const sequence = node('section', undefined, 'investment-study__sequence'); sequence.append(node('h3', state.domain === 'all' ? 'Work across the plan' : state.domain === 'funded' ? 'Funded work across the plan' : 'Extra work across the plan'));
    const periods = node('div', undefined, 'investment-study__periods');
    for (const period of model.periods) {
      const amount = pricing.sessions.reduce((sum, item) => sum + (item.tape.occurrences.length ? item.cost / item.tape.occurrences.length * item.tape.occurrences.filter(occ => occ.period === period.id).length : 0), 0);
      const column = node('div'); column.append(node('span', period.caption || period.label), node('strong', `${pricing.complete ? '' : 'Known '}${money(amount)}`));
      const bars = node('div', undefined, 'investment-study__bars'); bars.setAttribute('aria-hidden', 'true');
      for (let step = 0; step < 12; step++) { const bar = node('i'); bar.dataset.lit = String(pricing.total > 0 && step < amount / pricing.total * 12); bars.append(bar); }
      column.append(bars); periods.append(column);
    }
    sequence.append(periods); if (model.periods.length) root.append(sequence);
    container.replaceChildren(root);
  }
  return { render, release() { loaded?.release(); }, dispose() { for (const editor of editors.values()) editor.dispose(); editors.clear(); domainControl?.dispose(); outer?.remove(); } };
}
