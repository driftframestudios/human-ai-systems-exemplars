// Illustrative session pricing for the dev study; production accounting retains its own owner.
export const investmentSeed = { investment: { funding: { synthesis: 'funded', pairing: 'funded', decision: 'extra' }, baseline: null } };

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

export function createInvestment({ getModel, change, openSession }) {
  let selected = 'pairing';
  function render(container) {
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
        const pad = button('', () => { selected = item.tape.id; render(container); container.querySelector(`[data-focus-key="investment-${selected}"]`)?.focus({ preventScroll: true }); }, 'investment-study__pad', `investment-${item.tape.id}`);
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
