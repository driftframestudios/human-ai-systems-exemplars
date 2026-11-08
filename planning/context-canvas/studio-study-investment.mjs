// Shared session pricing stays distinct from the independent financial comparison tapes.
import { INVESTMENT_TYPES, FINANCIAL_PRESETS, financialSettings, analyseInvestment } from './studio-investment-financials.mjs';
import { createMoneyControl, createChoiceReel } from './studio-investment-controls.mjs';

export const investmentSeed = { investment: {
  funding: { synthesis: 'funded', pairing: 'funded', decision: 'extra' },
  tapes: INVESTMENT_TYPES.map(type => ({ id: `investment-${type.id}-1`, type: type.id, sequence: 1, settings: financialSettings(type.id) })),
  nextSequence: Object.fromEntries(INVESTMENT_TYPES.map(type => [type.id, 2])),
} };

export function priceStudy(model) {
  const people = new Map(model.people.map(person => [person.id, person]));
  const sessions = model.tapes.map(tape => {
    const hours = (tape.hours + tape.minutes / 60) * tape.occurrences.length;
    const cost = tape.people.reduce((sum, id) => sum + (people.get(id)?.rate || 0) * hours, 0);
    return { tape, hours, effort: hours * tape.people.length, cost, funding: model.study.investment.funding[tape.id] || 'extra' };
  });
  return { sessions, total: sessions.reduce((sum, item) => sum + item.cost, 0), effort: sessions.reduce((sum, item) => sum + item.effort, 0) };
}
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
    default: return [money(pricing.total), `${number(pricing.effort)} person-hours`];
  }
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

export function createInvestment({ getModel, change, openSession }) {
  let selected = 'pairing', activeId = 'investment-plan-1', domain = 'plan', adding = false, gesture = 0;
  let outer, shelf, library, panel, loaded, domainControl;
  const editors = new Map();
  const records = () => getModel().study.investment.tapes;
  const recordFor = id => records().find(record => record.id === id);
  function focus(container, key) { [...container.querySelectorAll('[data-focus-key]')].find(element => element.dataset.focusKey === key)?.focus({ preventScroll: true }); }
  function addRecord(type) {
    loaded?.release();
    change(model => { const state = model.study.investment, sequence = state.nextSequence[type]++; activeId = crypto.randomUUID(); domain = type; state.tapes.push({ id: activeId, type, sequence, settings: financialSettings(type) }); adding = false; }, 'Investment tape added.');
    focus(outer, `master-${activeId}`);
  }
  function render(container) {
    const model = getModel(), state = model.study.investment, pricing = priceStudy(model);
    if (!recordFor(activeId)) activeId = state.tapes.find(record => record.type === domain)?.id;
    if (recordFor(activeId)) domain = recordFor(activeId).type;
    if (!outer) {
      outer = node('div', undefined, 'investment-study investment-study--masters');
      const channel = node('aside', undefined, 'investment-study__channel'); channel.append(node('h2', 'Investment tapes'));
      shelf = node('nav', undefined, 'investment-study__masters'); shelf.setAttribute('aria-label', 'Investment comparison tapes');
      library = node('section', undefined, 'investment-study__library'); library.setAttribute('aria-label', 'Add an investment comparison');
      panel = node('section', undefined, 'investment-study__loaded-master'); panel.id = 'investment-master-panel';
      domainControl = createChoiceReel({ id: 'investment-domain', label: 'Domain', options: [{ id: 'plan', label: 'Internal' }, { id: 'rollout', label: 'Customer' }, { id: 'commercial', label: 'Commercial' }, { id: 'service', label: 'Operations' }, { id: 'capital', label: 'Planning' }], read: () => domain, write: value => { loaded?.release(); domain = value; activeId = records().find(record => record.type === value)?.id; render(container); } });
      domainControl.element.classList.add('investment-study__domain');
      channel.append(shelf, library); outer.append(domainControl.element, channel, panel);
    }
    if (outer.parentElement !== container) container.replaceChildren(outer);
    domainControl.update(domain);
    shelf.replaceChildren();
    for (const record of state.tapes) {
      const definition = typeFor(record), [amount, detail] = masterReading(record, analyseInvestment(record, pricing), pricing);
      const tape = button('', () => { loaded?.release(); activeId = record.id; domain = record.type; render(container); focus(container, `master-${record.id}`); }, 'investment-master', `master-${record.id}`);
      tape.dataset.investmentType = record.type; tape.dataset.investmentRecord = record.id;
      tape.setAttribute('aria-pressed', String(activeId === record.id)); tape.setAttribute('aria-controls', panel.id);
      const face = node('span', undefined, 'investment-master__face');
      const reels = node('span', undefined, 'investment-master__reels'); reels.setAttribute('aria-hidden', 'true');
      face.append(node('span', definition.strip, 'investment-master__strip'), node('strong', titleFor(record), 'investment-master__title'), reels, node('span', amount, 'investment-master__amount'), node('small', detail)); tape.append(face); shelf.append(tape);
    }
    library.replaceChildren();
    const add = button(adding ? 'Close library' : '＋ New investment tape', () => { adding = !adding; render(container); focus(container, 'master-add'); }, adding ? 'ghost' : 'add', 'master-add');
    add.setAttribute('aria-expanded', String(adding)); add.setAttribute('aria-controls', 'investment-tape-library'); library.append(add);
    const choices = node('div', undefined, 'investment-study__library-choices'); choices.id = 'investment-tape-library'; choices.hidden = !adding;
    for (const definition of INVESTMENT_TYPES) {
      const choice = button('', () => addRecord(definition.id), 'investment-study__library-choice', `add-master-${definition.id}`);
      choice.append(node('strong', `＋ ${definition.title}`), node('small', definition.detail)); choices.append(choice);
    }
    library.append(choices);
    const record = recordFor(activeId);
    if (!record) { loaded?.release(); loaded = null; const definition = INVESTMENT_TYPES.find(type => type.id === domain); panel.replaceChildren(node('h3', definition.title), button(`＋ Add ${definition.title.toLowerCase()}`, () => addRecord(domain), 'add', 'master-empty-add')); panel.setAttribute('aria-label', 'Investment comparison'); return; }
    panel.setAttribute('aria-label', titleFor(record));
    if (loaded?.id !== record.id) {
      loaded?.release(); loaded = editors.get(record.id) || createEditor(record);
      editors.set(record.id, loaded); panel.replaceChildren(loaded.root);
    }
    loaded.update(record, pricing);
  }

  function createEditor(initial) {
    const id = initial.id, type = initial.type, controls = [], updates = [], groups = new Map();
    const read = () => recordFor(id)?.settings || initial.settings;
    const write = (field, value, key) => change(model => { const record = model.study.investment.tapes.find(item => item.id === id); if (record) record.settings[field] = value; }, '', key);
    const root = node('section', undefined, 'investment-comparison'); root.dataset.investmentEditor = id;
    const head = node('header', undefined, 'investment-comparison__head'), title = node('h3', titleFor(initial)), titles = node('div');
    titles.append(node('small', typeFor(initial).strip), title);
    const remove = button('Remove tape', () => {
      controls.forEach(control => control.release?.());
      change(model => { model.study.investment.tapes = model.study.investment.tapes.filter(record => record.id !== id); }, 'Investment tape removed. Undo restores it.');
      focus(outer, activeId ? `master-${activeId}` : 'master-add');
    }, 'remove', `remove-master-${id}`);
    head.append(titles, remove);
    const reels = node('div', undefined, 'investment-comparison__reels'), screen = node('div', undefined, 'investment-comparison__screen'), knobs = node('div', undefined, 'investment-comparison__controls'), companion = node('div', undefined, 'investment-comparison__companion'), plan = node('div'), note = node('p', undefined, 'investment-comparison__note');
    root.append(head, reels, screen, knobs, companion, plan, note);
    function group(name = 'all') {
      if (!groups.has(name)) { const element = node('div', undefined, 'investment-comparison__control-group'); groups.set(name, element); knobs.append(element); }
      return groups.get(name);
    }
    function moneyControl(field, label, max = 1000000, domain = 'all') {
      const control = createMoneyControl({ id: `investment-${id}-${field}`, label, read: () => read()[field], write: (value, key) => write(field, value, key), max }); controls.push(control); group(domain).append(control.element); updates.push(state => control.update(state[field]));
    }
    function range(field, label, min, max, step, format = number, domain = 'all') {
      const fieldset = node('div', undefined, 'investment-comparison__fader'), labelNode = node('label', label), output = node('output'), input = node('input');
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.id = `investment-${id}-${field}`; input.dataset.focusKey = input.id; labelNode.htmlFor = input.id; output.htmlFor = input.id;
      let editKey; const begin = () => { editKey = `investment-${id}-${field}-${++gesture}`; };
      input.addEventListener('pointerdown', begin); input.addEventListener('keydown', event => { if (!event.repeat) begin(); }); input.addEventListener('input', () => write(field, Number(input.value), editKey));
      fieldset.append(labelNode, output, input); group(domain).append(fieldset); updates.push(state => { input.value = String(state[field]); input.setAttribute('aria-valuetext', format(state[field])); output.value = format(state[field]); });
    }
    function reel(field, label, choices, receive) {
      const control = createChoiceReel({ id: `investment-${id}-${field}`, label, options: choices.map(([id, label]) => ({ id, label })), read: () => read()[field], write: value => receive ? receive(value) : write(field, value) }); controls.push(control); reels.append(control.element); updates.push(state => control.update(state[field]));
    }
    function lifecycle() {
      reel('lifecycle', 'Lifecycle', FINANCIAL_PRESETS[type].map(item => [item.id, item.label]), value => change(model => {
        const record = model.study.investment.tapes.find(item => item.id === id); Object.assign(record.settings, FINANCIAL_PRESETS[type].find(item => item.id === value).values, { lifecycle: value });
      }, 'Lifecycle settings loaded.'));
    }
    if (type === 'plan') {
      reel('domain', 'Investment lens', [['all', 'Whole plan'], ['funded', 'Funded time'], ['extra', 'Extra investment']]); moneyControl('budget', 'Budget to compare');
      note.textContent = 'Each tape compares the same planned work through its own funding choices and saved amount.';
    } else if (type === 'rollout') {
      lifecycle(); reel('domain', 'Customer account', [['pricing', 'Price & margin'], ['implementation', 'Implementation']]);
      moneyControl('listPrice', 'List price / team / quarter', 100000, 'pricing'); range('discount', 'Price discount', 0, 50, 1, value => `${value}%`, 'pricing'); moneyControl('variableCost', 'Delivery cost / team / quarter', 100000, 'pricing'); moneyControl('serviceCost', 'Service cost / team / quarter', 100000, 'pricing');
      range('teams', 'Customer teams', 1, 30, 1, number, 'implementation'); moneyControl('setup', 'Setup per customer team', 100000, 'implementation'); range('training', 'Training per team', 0, 40, 1, value => `${value} hours`, 'implementation');
      note.textContent = 'Training uses $120/hour. Customer implementation stays separate from recurring price and contribution.';
    } else if (type === 'commercial') {
      lifecycle(); reel('metric', 'Commercial reading', [['grr', 'GRR'], ['nrr', 'NRR'], ['cac', 'CAC'], ['payback', 'Payback']], value => change(model => { const state = model.study.investment.tapes.find(item => item.id === id).settings; state.metric = value; state.domain = ['grr', 'nrr'].includes(value) ? 'retention' : 'acquisition'; }, 'Commercial reading selected.'));
      moneyControl('openingRevenue', 'Opening revenue / quarter', 1000000, 'retention'); range('retained', 'Opening revenue retained', 0, 100, 1, value => `${value}%`, 'retention'); moneyControl('expansion', 'Cohort expansion / quarter', 100000, 'retention'); moneyControl('reactivation', 'Reactivated revenue / quarter', 100000, 'retention');
      moneyControl('acquisitionSpend', 'Acquisition spend', 1000000, 'acquisition'); range('newCustomers', 'New customers', 0, 100, 1, number, 'acquisition'); moneyControl('newRevenue', 'New revenue / quarter', 500000, 'acquisition'); range('contributionMargin', 'New revenue contribution margin', 0, 100, 1, value => `${value}%`, 'acquisition');
      note.textContent = 'GRR and NRR track the opening cohort. New and reactivated revenue join the closing total separately.';
    } else if (type === 'service') {
      lifecycle(); reel('domain', 'Operational lens', [['time', 'Working time'], ['budget', 'Service budget'], ['capacity', 'Capacity']]);
      range('people', 'People reached', 20, 200, 10); range('adoption', 'Adoption', 0, 100, 1, value => `${value}%`); range('minutes', 'Time saved per use', 0, 30, 1, value => `${value} minutes`, 'time');
      moneyControl('baselineCost', 'Current cost / person / quarter', 10000, 'budget'); moneyControl('candidateCost', 'Changed cost / person / quarter', 10000, 'budget'); range('capacity', 'People supported per quarter', 0, 200, 10, number, 'capacity');
      note.textContent = 'The time comparison starts with a 30-minute workflow, twice each week. Budget and capacity retain their own units.';
    } else {
      reel('alternative', 'Alternative', [['current', 'Keep current'], ['pilot', 'Pilot'], ['rollout', 'Rollout']]); reel('lifecycle', 'Benefit pattern', [['ramp', 'Ramp up'], ['steady', 'Steady'], ['expand', 'Expand']]);
      reel('metric', 'Capital reading', [['npv', 'NPV'], ['irr', 'IRR'], ['payback', 'Payback']]);
      moneyControl('upfront', 'Pilot upfront investment'); moneyControl('benefit', 'Pilot net benefit / quarter'); range('discount', 'Discount per quarter', 0, 10, .5, value => `${value}%`); range('quarters', 'Comparison horizon', 2, 12, 1, value => `${value} quarters`);
      note.textContent = 'Quarter-end net cash flows. Rollout uses 2.5× upfront, 1.8× benefit and one quarter to start.';
    }
    return { id, root, release() { controls.forEach(control => control.release?.()); }, update(record, pricing) {
      title.textContent = titleFor(record); const state = record.settings, analysis = analyseInvestment(record, pricing);
      for (const update of updates) update(state);
      for (const [name, element] of groups) element.hidden = name !== 'all' && name !== state.domain;
      screen.replaceChildren(); companion.replaceChildren();
      if (type === 'plan') {
        screen.append(reading(state.domain === 'all' ? 'Whole plan investment' : state.domain === 'funded' ? 'Within funded time' : 'Extra investment', money(analysis.amount)), reading('Budget remaining', signedMoney(state.budget - analysis.amount), `${money(state.budget)} budget`));
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
    const model = getModel(), base = priceStudy(model), state = record.settings;
    const pricing = { ...base, sessions: analyseInvestment(record, base).sessions };
    if (!model.tapes.some(tape => tape.id === selected)) selected = model.tapes[0]?.id;
    const current = pricing.sessions.find(item => item.tape.id === selected);
    const root = node('div', undefined, 'investment-study');
    const meter = node('section', undefined, 'investment-study__meter'); meter.setAttribute('aria-label', 'Illustrative investment');
    for (const [label, value] of [['Planned sessions', money(pricing.total)], ['People’s time', `${number(pricing.effort)} h`], ['Since saved comparison', state.baseline === null ? '—' : `${pricing.total >= state.baseline ? '+' : '−'}${money(Math.abs(pricing.total - state.baseline))}`]]) {
      const reading = node('div'); reading.append(node('span', label), node('strong', value)); meter.append(reading);
    }
    const save = button(state.baseline === null ? 'Save comparison' : 'Update comparison', () => change(model => { model.study.investment.tapes.find(item => item.id === record.id).settings.baseline = priceStudy(model).total; }, 'Comparison saved.'), 'ghost', 'investment-save');
    meter.append(save); root.append(meter);

    const board = node('div', undefined, 'investment-study__board');
    for (const [funding, title, hint] of [['funded', 'Within funded time', 'Time already set aside'], ['extra', 'Extra investment', 'Work to fund separately']]) {
      const lane = node('section', undefined, 'investment-study__lane');
      const entries = pricing.sessions.filter(item => item.funding === funding);
      const heading = node('div', undefined, 'bar'); heading.append(node('h3', title), node('strong', money(entries.reduce((sum, item) => sum + item.cost, 0)), 'number')); lane.append(heading, node('p', hint, 'hint'));
      for (const item of entries) {
        const pad = button('', () => { selected = item.tape.id; render(outer.parentElement); container.querySelector(`[data-focus-key="investment-${selected}"]`)?.focus({ preventScroll: true }); }, 'investment-study__pad', `investment-${item.tape.id}`);
        pad.setAttribute('aria-pressed', String(selected === item.tape.id));
        pad.append(node('strong', item.tape.name), node('span', `${money(item.cost)} · ${number(item.effort)} person-hours`));
        const strip = node('span', undefined, 'investment-study__strip'); strip.style.setProperty('--share', `${pricing.total ? item.cost / pricing.total * 100 : 0}%`); strip.setAttribute('aria-hidden', 'true'); pad.append(strip); lane.append(pad);
      }
      if (!entries.length) lane.append(node('p', 'Choose a session below to move work here.', 'hint'));
      board.append(lane);
    }
    root.append(board);
    if (current) {
      const deck = node('section', undefined, 'investment-study__deck'); deck.setAttribute('aria-label', 'Selected session investment');
      const heading = node('div', undefined, 'bar'); heading.append(node('h3', current.tape.name), button('Session controls ↗', event => openSession(current.tape.id, event.currentTarget), 'ghost', 'investment-session')); deck.append(heading);
      const modules = node('div', undefined, 'investment-study__modules');
      const funding = node('fieldset'); funding.append(node('legend', 'How this work is funded'));
      for (const [value, label] of [['funded', 'Within funded time'], ['extra', 'Extra investment']]) {
        const pad = button(label, () => change(model => { model.study.investment.tapes.find(item => item.id === record.id).settings.funding[current.tape.id] = value; }, 'Funding updated.'), '', `funding-${value}`);
        pad.setAttribute('aria-pressed', String(current.funding === value)); funding.append(pad);
      }
      const people = node('section'); people.append(node('h3', 'Time behind the amount'));
      const chips = node('div', undefined, 'investment-study__people');
      for (const id of current.tape.people) {
        const person = model.people.find(item => item.id === id); if (!person) continue;
        const chip = node('div'); chip.append(node('strong', person.name), node('span', `${number(current.hours)} h · ${money(current.hours * person.rate)}`)); chips.append(chip);
      }
      if (!current.tape.people.length) chips.append(node('p', 'Choose people in Session controls.', 'hint'));
      people.append(chips); modules.append(funding, people); deck.append(modules); root.append(deck);
    }
    const sequence = node('section', undefined, 'investment-study__sequence'); sequence.append(node('h3', 'Investment across sprints'));
    const periods = node('div', undefined, 'investment-study__periods');
    for (let period = 1; period <= 4; period++) {
      const amount = pricing.sessions.reduce((sum, item) => sum + (item.tape.occurrences.length ? item.cost / item.tape.occurrences.length * item.tape.occurrences.filter(occ => occ.period === period).length : 0), 0);
      const column = node('div'); column.append(node('span', `Sprint ${period}`), node('strong', money(amount)));
      const bars = node('div', undefined, 'investment-study__bars'); bars.setAttribute('aria-hidden', 'true');
      for (let step = 0; step < 12; step++) { const bar = node('i'); bar.dataset.lit = String(pricing.total > 0 && step < amount / pricing.total * 12); bars.append(bar); }
      column.append(bars); periods.append(column);
    }
    sequence.append(periods); root.append(sequence, node('p', 'Illustrative rates × session time × people. Funding groups keep the same total.', 'hint'));
    container.replaceChildren(root);
  }
  return { investment: { title: 'See where the time goes.', description: 'Move work between funding groups. Compare a saved arrangement.', render } };
}
