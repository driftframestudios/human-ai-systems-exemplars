// Illustrative session pricing for the dev study; production accounting retains its own owner.
export const investmentSeed = { investment: {
  funding: { synthesis: 'funded', pairing: 'funded', decision: 'extra' }, baseline: null,
  decks: ['plan'],
  rollout: { teams: 4, setup: 2500, training: 8, quarter: 1 },
  commercial: { retained: 90, expansion: 15000, newRevenue: 20000 },
  service: { people: 80, adoption: 60, minutes: 15 },
  capital: { quarters: 4, benefit: 6000, discount: 2, option: 'pilot' },
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
const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
function button(text, action, className, key) {
  const element = node('button', text, className); element.type = 'button'; element.addEventListener('click', action);
  if (key) element.dataset.focusKey = key;
  return element;
}

const DECKS = [
  { id: 'plan', title: 'Plan investment', strip: 'Internal effort', detail: 'People, sessions & funding' },
  { id: 'rollout', title: 'Customer rollout', strip: 'Implementation', detail: 'Setup, training & timing' },
  { id: 'commercial', title: 'Commercial cohort', strip: 'Recurring revenue', detail: 'Retain, expand & welcome' },
  { id: 'service', title: 'Service operations', strip: 'Working experience', detail: 'Reach, adoption & time' },
  { id: 'capital', title: 'Capital choices', strip: 'Investment decision', detail: 'Pilot, rollout & compare' },
];
const TRAINING_RATE = 120;
const OPENING_REVENUE = 100000;
const USES_PER_WEEK = 2;
const signedMoney = value => `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;
const rolloutCost = state => state.teams * (state.setup + state.training * TRAINING_RATE);
const serviceHours = state => state.people * state.adoption / 100 * state.minutes * USES_PER_WEEK / 60;
function capitalOptions(model, pricing) {
  const state = model.study.investment, options = [
    { id: 'current', label: 'Keep current', upfront: 0, benefit: 0 },
    { id: 'pilot', label: 'Pilot', upfront: pricing.total, benefit: state.capital.benefit },
    { id: 'rollout', label: 'Rollout', upfront: pricing.total + rolloutCost(state.rollout), benefit: state.capital.benefit * 2 },
  ];
  return options.map(option => ({ ...option,
    presentValue: Array.from({ length: state.capital.quarters }, (_, index) => option.benefit / (1 + state.capital.discount / 100) ** (index + 1)).reduce((sum, value) => sum + value, -option.upfront),
  }));
}
function masterReading(id, model, pricing) {
  const state = model.study.investment;
  switch (id) {
    case 'rollout': return [money(rolloutCost(state.rollout)), `Starts in quarter ${state.rollout.quarter}`];
    case 'commercial': return [money(OPENING_REVENUE * state.commercial.retained / 100 + state.commercial.expansion + state.commercial.newRevenue), 'Illustrative revenue / quarter'];
    case 'service': return [`${number(serviceHours(state.service))} h / week`, 'Illustrative time released'];
    case 'capital': return [signedMoney(capitalOptions(model, pricing).find(option => option.id === state.capital.option).presentValue), `Present value · ${state.capital.quarters} quarters`];
    default: return [money(pricing.total), `${number(pricing.effort)} person-hours`];
  }
}

export function createInvestment({ getModel, change, openSession }) {
  let selected = 'pairing', activeDeck = 'plan', adding = false, gesture = 0;
  let outer, shelf, library, panel, loaded, loadedId;
  const editors = new Map();

  function focus(container, key) {
    [...container.querySelectorAll('[data-focus-key]')].find(element => element.dataset.focusKey === key)?.focus({ preventScroll: true });
  }
  function render(container) {
    const model = getModel(), state = model.study.investment, pricing = priceStudy(model);
    if (!state.decks.includes(activeDeck)) activeDeck = 'plan';
    if (!outer) {
      outer = node('div', undefined, 'investment-study investment-study--masters');
      shelf = node('nav', undefined, 'investment-study__masters'); shelf.setAttribute('aria-label', 'Investment comparison tapes');
      library = node('section', undefined, 'investment-study__library'); library.setAttribute('aria-label', 'Add an investment comparison');
      panel = node('section', undefined, 'investment-study__loaded-master'); panel.id = 'investment-master-panel';
      outer.append(shelf, library, panel);
    }
    if (outer.parentElement !== container) container.replaceChildren(outer);
    shelf.replaceChildren();
    for (const definition of DECKS.filter(item => state.decks.includes(item.id))) {
      const [amount, detail] = masterReading(definition.id, model, pricing);
      const tape = button('', () => { activeDeck = definition.id; render(container); focus(container, `master-${definition.id}`); }, 'investment-master', `master-${definition.id}`);
      tape.setAttribute('aria-pressed', String(activeDeck === definition.id)); tape.setAttribute('aria-controls', panel.id);
      const strip = node('span', definition.strip, 'investment-master__strip');
      const reels = node('span', undefined, 'investment-master__reels'); reels.setAttribute('aria-hidden', 'true');
      tape.append(strip, node('strong', definition.title, 'investment-master__title'), reels, node('span', amount, 'investment-master__amount'), node('small', detail));
      shelf.append(tape);
    }
    library.replaceChildren();
    const available = DECKS.filter(item => !state.decks.includes(item.id));
    const add = button(adding ? 'Close tape library' : '＋ Add comparison tape', () => { adding = !adding; render(container); focus(container, 'master-add'); }, adding ? 'ghost' : 'add', 'master-add');
    add.setAttribute('aria-expanded', String(adding)); add.setAttribute('aria-controls', 'investment-tape-library');
    add.disabled = !available.length && !adding;
    library.append(add, node('span', 'Comparison readings stay separate from the planned-session total.', 'hint'));
    const choices = node('div', undefined, 'investment-study__library-choices'); choices.id = 'investment-tape-library'; choices.hidden = !adding;
    for (const definition of available) {
      const choice = button('', () => {
        change(model => { model.study.investment.decks.push(definition.id); activeDeck = definition.id; adding = false; }, `${definition.title} tape added.`);
        focus(container, `master-${definition.id}`);
      }, 'investment-study__library-choice', `add-master-${definition.id}`);
      choice.append(node('strong', `＋ ${definition.title}`), node('small', definition.detail)); choices.append(choice);
    }
    if (!available.length) choices.append(node('p', 'Every comparison tape is on the shelf.', 'hint'));
    library.append(choices);
    const definition = DECKS.find(item => item.id === activeDeck);
    panel.setAttribute('aria-label', definition.title);
    if (activeDeck === 'plan') { loadedId = 'plan'; renderPlan(panel); }
    else {
      if (loadedId !== activeDeck) {
        loaded = editors.get(activeDeck) || createComparison(activeDeck);
        editors.set(activeDeck, loaded); panel.replaceChildren(loaded.root); loadedId = activeDeck;
      }
      loaded.update(model, pricing);
    }
  }

  function createComparison(id) {
    const definition = DECKS.find(item => item.id === id);
    const root = node('section', undefined, 'investment-comparison'), head = node('header', undefined, 'investment-comparison__head');
    const titles = node('div'); titles.append(node('small', definition.strip), node('h3', definition.title));
    const remove = button('Remove tape', () => {
      change(model => { model.study.investment.decks = model.study.investment.decks.filter(value => value !== id); }, `${definition.title} tape removed. Undo restores it.`);
      focus(outer, 'master-plan');
    }, 'remove', `remove-master-${id}`);
    head.append(titles, remove);
    const screen = node('div', undefined, 'investment-comparison__screen'), controls = node('div', undefined, 'investment-comparison__controls'), note = node('p', undefined, 'investment-comparison__note');
    root.append(head, screen, controls, note);
    const updates = [];
    function range(field, label, min, max, step, format = number) {
      const group = node('div', undefined, 'investment-comparison__fader'), labelNode = node('label', label), output = node('output'), input = node('input');
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
      input.id = `investment-${id}-${field}`; input.dataset.focusKey = input.id; labelNode.htmlFor = input.id; output.htmlFor = input.id;
      let editKey;
      const begin = () => { editKey = `investment-${id}-${field}-${++gesture}`; };
      input.addEventListener('pointerdown', begin); input.addEventListener('keydown', event => { if (!event.repeat) begin(); });
      input.addEventListener('input', () => change(model => { model.study.investment[id][field] = Number(input.value); }, '', editKey));
      group.append(labelNode, output, input); controls.append(group);
      updates.push(state => { input.value = String(state[field]); input.setAttribute('aria-valuetext', format(state[field])); output.value = format(state[field]); });
    }
    function pads(field, label, options) {
      const group = node('fieldset', undefined, 'investment-comparison__pads'); group.append(node('legend', label));
      const buttons = options.map(([value, title]) => {
        const pad = button(title, () => change(model => { model.study.investment[id][field] = value; }, `${label}: ${title}.`), '', `investment-${id}-${field}-${value}`);
        group.append(pad); return { value, pad };
      });
      controls.append(group); updates.push(state => { for (const { value, pad } of buttons) pad.setAttribute('aria-pressed', String(value === state[field])); });
    }
    if (id === 'rollout') {
      range('teams', 'Customer teams', 1, 12, 1); range('setup', 'Setup per team', 0, 10000, 250, money); range('training', 'Training per team', 0, 40, 2, value => `${value} hours`);
      pads('quarter', 'Start rollout', [[1, 'Quarter 1'], [2, 'Quarter 2'], [3, 'Quarter 3']]);
      note.textContent = `Setup and training form a separate customer implementation account. Training uses an illustrative ${money(TRAINING_RATE)}/hour.`;
    } else if (id === 'commercial') {
      range('retained', 'Keep opening revenue', 0, 100, 5, value => `${value}%`); range('expansion', 'Expansion in opening cohort', 0, 50000, 2500, money); range('newRevenue', 'New customer revenue', 0, 50000, 2500, money);
      note.textContent = `${money(OPENING_REVENUE)} opening revenue per quarter. Expansion belongs to that cohort; new customer revenue enters separately.`;
    } else if (id === 'service') {
      range('people', 'People reached', 20, 200, 10); range('adoption', 'Adoption', 0, 100, 5, value => `${value}%`); range('minutes', 'Time saved per use', 0, 30, 1, value => `${value} minutes`);
      note.textContent = 'Illustrative change to a 30-minute workflow, used twice each week. The time released remains a time measure.';
    } else {
      range('benefit', 'Pilot net benefit each quarter', 0, 20000, 500, money); range('discount', 'Discount each quarter', 0, 10, .5, value => `${value}%`);
      pads('quarters', 'Compare over', [[2, '2 quarters'], [4, '4 quarters'], [8, '8 quarters']]);
      pads('option', 'Explore a choice', [['current', 'Keep current'], ['pilot', 'Pilot'], ['rollout', 'Rollout']]);
      note.textContent = 'Illustrative net cash flows versus keeping current. Pilot uses planned-session cost upfront. Rollout adds customer implementation and doubles the entered quarterly benefit.';
    }
    function reading(label, value, detail) {
      const item = node('div', undefined, 'investment-comparison__reading'); item.append(node('span', label), node('strong', value)); if (detail) item.append(node('small', detail)); return item;
    }
    function bars(entries) {
      const chart = node('div', undefined, 'investment-comparison__bars'), largest = Math.max(1, ...entries.map(item => Math.abs(item.value)));
      for (const entry of entries) {
        const row = node('div', undefined, 'investment-comparison__bar'); row.append(node('span', entry.label), node('strong', entry.text || money(entry.value)));
        const rail = node('span', undefined, 'investment-comparison__bar-rail'), fill = node('i'); rail.setAttribute('aria-hidden', 'true'); fill.style.width = `${Math.abs(entry.value) / largest * 100}%`; fill.dataset.negative = String(entry.value < 0); rail.append(fill); row.append(rail); chart.append(row);
      }
      return chart;
    }
    return { root, update(model, pricing) {
      const state = model.study.investment[id]; for (const update of updates) update(state);
      screen.replaceChildren();
      if (id === 'rollout') {
        screen.append(reading('Customer implementation', money(rolloutCost(state)), `${state.teams} teams · starts in quarter ${state.quarter}`), bars([{ label: 'Setup', value: state.teams * state.setup }, { label: 'Training', value: state.teams * state.training * TRAINING_RATE }]));
      } else if (id === 'commercial') {
        const retained = OPENING_REVENUE * state.retained / 100, cohort = retained + state.expansion;
        screen.append(reading('Closing revenue / quarter', money(cohort + state.newRevenue), `${number(cohort / OPENING_REVENUE * 100)}% net retention in the opening cohort`), bars([{ label: 'Retained', value: retained }, { label: 'Expansion', value: state.expansion }, { label: 'New customers', value: state.newRevenue }]));
      } else if (id === 'service') {
        const reached = state.people * state.adoption / 100;
        screen.append(reading('Time released each week', `${number(serviceHours(state))} hours`, `${number(reached)} people use the changed workflow`), bars([{ label: 'Current workflow', value: reached, text: `${number(reached)} h / week` }, { label: 'With the change', value: reached * (30 - state.minutes) / 30, text: `${number(reached * (30 - state.minutes) / 30)} h / week` }]));
      } else {
        const options = capitalOptions(model, pricing), selectedOption = options.find(option => option.id === state.option);
        screen.append(reading(`${selectedOption.label} · net present value`, signedMoney(selectedOption.presentValue), `${money(selectedOption.upfront)} upfront · ${state.quarters} quarters`), bars(options.map(option => ({ label: option.label, value: option.presentValue, text: signedMoney(option.presentValue) }))));
      }
    } };
  }

  function renderPlan(container) {
    const model = getModel(), pricing = priceStudy(model), state = model.study.investment;
    if (!model.tapes.some(tape => tape.id === selected)) selected = model.tapes[0]?.id;
    const current = pricing.sessions.find(item => item.tape.id === selected);
    const root = node('div', undefined, 'investment-study');
    const meter = node('section', undefined, 'investment-study__meter'); meter.setAttribute('aria-label', 'Illustrative investment');
    for (const [label, value] of [['Planned sessions', money(pricing.total)], ['People’s time', `${number(pricing.effort)} h`], ['Since saved comparison', state.baseline === null ? '—' : `${pricing.total >= state.baseline ? '+' : '−'}${money(Math.abs(pricing.total - state.baseline))}`]]) {
      const reading = node('div'); reading.append(node('span', label), node('strong', value)); meter.append(reading);
    }
    const save = button(state.baseline === null ? 'Save comparison' : 'Update comparison', () => change(model => { model.study.investment.baseline = priceStudy(model).total; }, 'Comparison saved.'), 'ghost', 'investment-save');
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
        const pad = button(label, () => change(model => { model.study.investment.funding[current.tape.id] = value; }, 'Funding updated.'), '', `funding-${value}`);
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
