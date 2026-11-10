// Shared session pricing stays distinct from the independent financial comparison tapes.
import { INVESTMENT_TYPES, financialSettings } from './investment-catalog.mjs';
import { INVESTMENT_DECK_LIMIT, INVESTMENT_FIELDS } from './investment-state.mjs';
import { createMoneyControl, createChoiceReel } from './investment-controls.mjs';
import { INVESTMENT_DOMAINS, investmentPortrait, renderInvestmentPortrait, renderInvestmentDiagram } from './investment-portrait.mjs';
import { investmentChoices, writeInvestmentField } from './investment-deck-config.mjs';
import { investmentDeckView, money, number } from './investment-deck-views.mjs';
import { revealReelResult } from './reel-control.mjs';

const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
function button(text, action, className, key) {
  const element = node('button', text, className); element.type = 'button'; element.addEventListener('click', action);
  if (key) element.dataset.focusKey = key;
  return element;
}
const typeFor = record => INVESTMENT_TYPES.find(type => type.id === record.type);
const titleFor = record => `${typeFor(record).title}${record.sequence > 1 ? ` ${record.sequence}` : ''}`;
export function createInvestmentWorkbench({ getContext, change, openSession, setFunding }) {
  let selected = 'pairing', activeId = 'investment-plan-1', domain = 'plan', adding = false, disposed = false;
  let outer, shelf, library, libraryToggle, libraryChoices, panel, loaded, domainControl, domainReading, portraitKey;
  const editors = new Map(), tapes = new Map();
  function focus(container, key) { [...container.querySelectorAll('[data-focus-key]')].find(element => element.dataset.focusKey === key)?.focus({ preventScroll: true }); }
  function addRecord(type) {
    if (disposed || getContext().model.investment.decks.length >= INVESTMENT_DECK_LIMIT) return;
    loaded?.release();
    change(model => { const state = model.investment, sequence = 1 + Math.max(0, ...state.decks.filter(record => record.type === type).map(record => record.sequence)); activeId = `investment-${crypto.randomUUID()}`; domain = type; state.decks.push({ id: activeId, type, sequence, settings: financialSettings(type) }); adding = false; }, 'Investment deck added.');
    focus(outer, `master-${activeId}`);
  }
  function render(container) {
    if (disposed) return;
    const context = getContext(), { model } = context, state = model.investment, pricing = model.pricing;
    if (!context.record(activeId)) activeId = state.decks.find(record => record.type === domain)?.id;
    if (context.record(activeId)) domain = context.record(activeId).type;
    if (!outer) {
      outer = node('div', undefined, 'investment-study investment-study--masters');
      const channel = node('aside', undefined, 'investment-study__channel'); channel.append(node('h2', 'Investment decks'));
      shelf = node('nav', undefined, 'investment-study__masters'); shelf.setAttribute('aria-label', 'Investment comparison decks');
      library = node('section', undefined, 'investment-study__library'); library.setAttribute('aria-label', 'Add an investment comparison');
      panel = node('section', undefined, 'investment-study__loaded-master'); panel.id = 'investment-master-panel';
      domainControl = createChoiceReel({ id: 'investment-domain', label: 'Domain', variant: 'navy', options: Object.entries(INVESTMENT_DOMAINS).map(([id, value]) => ({ id, label: value.label })), read: () => domain, write: value => { if (disposed) return; loaded?.release(); domain = value; activeId = getContext().model.investment.decks.find(record => record.type === value)?.id; render(container); } });
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
    for (const [id, editor] of editors) if (context.record(id)?.type !== editor.type) {
      editor.dispose(); editors.delete(id); if (loaded === editor) loaded = null;
    }
    for (const [id, tape] of tapes) if (!present.has(id)) { tape.remove(); tapes.delete(id); }
    state.decks.forEach((record, index) => {
      let tape = tapes.get(record.id);
      if (!tape) {
        const id = record.id;
        tape = button('', () => {
          if (disposed || tapes.get(id) !== tape) return;
          const current = getContext().record(id); if (!current) return;
          loaded?.release(); activeId = id; domain = current.type; render(container); focus(container, `master-${id}`);
        }, 'investment-master', `master-${id}`);
        tape.dataset.investmentRecord = id; tape.setAttribute('aria-controls', panel.id);
        const face = node('span', undefined, 'investment-master__face');
        const reels = node('span', undefined, 'investment-master__reels'); reels.setAttribute('aria-hidden', 'true');
        face.append(node('span', '', 'investment-master__strip'), node('strong', '', 'investment-master__title'), reels, node('span', '', 'investment-master__amount'), node('small', ''));
        tape.append(face); tapes.set(id, tape);
      }
      const definition = typeFor(record), [amount, detail] = investmentDeckView(record.type).masterReading(record, context.analysis(record.id), pricing);
      tape.dataset.investmentType = record.type;
      tape.setAttribute('aria-pressed', String(activeId === record.id));
      tape.querySelector('.investment-master__strip').textContent = definition.strip;
      tape.querySelector('.investment-master__title').textContent = titleFor(record);
      tape.querySelector('.investment-master__amount').textContent = amount;
      tape.querySelector('small').textContent = detail;
      // Keep unaffected nodes attached: detach/reinsert can drop native focus.
      if (shelf.children[index] !== tape) shelf.insertBefore(tape, shelf.children[index] ?? null);
    });
    if (!libraryToggle) {
      libraryToggle = button('', () => { if (disposed) return; adding = !adding; render(container); focus(container, 'master-add'); }, '', 'master-add');
      libraryToggle.setAttribute('aria-controls', 'investment-tape-library');
      libraryChoices = node('div', undefined, 'investment-study__library-choices'); libraryChoices.id = 'investment-tape-library';
      for (const definition of INVESTMENT_TYPES) {
        const choice = button('', () => addRecord(definition.id), 'investment-study__library-choice', `add-master-${definition.id}`);
        choice.append(node('strong', `＋ ${definition.title}`), node('small', definition.detail)); libraryChoices.append(choice);
      }
      library.append(libraryToggle, libraryChoices);
    }
    libraryToggle.textContent = adding ? 'Close library' : '＋ New investment deck'; libraryToggle.className = adding ? 'ghost' : 'add';
    libraryToggle.disabled = state.decks.length >= INVESTMENT_DECK_LIMIT;
    libraryToggle.setAttribute('aria-expanded', String(adding)); libraryChoices.hidden = !adding;
    const record = context.record(activeId), description = INVESTMENT_DOMAINS[domain];
    const title = node('h3', description.title), detail = node('p', description.detail);
    domainReading.replaceChildren(title, detail);
    if (record) domainReading.append(renderInvestmentPortrait(document, investmentPortrait(record, pricing, context.analysis(record.id))));
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
    if (loaded?.id !== record.id) {
      loaded?.release(); loaded = editors.get(record.id) || createEditor(record);
      editors.set(record.id, loaded); panel.replaceChildren(loaded.root); revealReelResult(loaded.root);
    }
    loaded.update(record, context);
    shelf.scrollLeft = scroll.left; shelf.scrollTop = scroll.top;
    if (focusedKey && !document.activeElement?.closest('.investment-comparison')) focus(outer, focusedKey);
  }

  function createEditor(initial) {
    const id = initial.id, type = initial.type, controls = [], updates = [], groups = new Map();
    const definition = investmentDeckView(type);
    let currentReading, retired = false;
    const read = () => {
      const current = getContext().record(id);
      return current?.type === type ? current.settings : initial.settings;
    };
    const isCurrent = () => !disposed && !retired && loaded?.id === id && getContext().record(id)?.type === type;
    function edit(mutator, message = '', gesture = null) {
      if (!isCurrent()) return;
      return change(model => {
        const record = model.investment.decks.find(item => item.id === id);
        if (record?.type === type) mutator(record, model);
      }, message, gesture);
    }
    const write = (field, value, key) => edit(record => writeInvestmentField(record, field, value), '', key);
    const root = node('section', undefined, 'investment-comparison'); root.dataset.investmentEditor = id; root.dataset.investmentType = type;
    const head = node('header', undefined, 'investment-comparison__head'), title = node('h3', titleFor(initial)), titles = node('div');
    titles.append(node('small', typeFor(initial).strip), title);
    const remove = button('Remove deck', () => {
      if (!isCurrent()) return;
      controls.forEach(control => control.release?.());
      edit((_record, model) => { model.investment.decks = model.investment.decks.filter(record => record.id !== id); }, 'Investment deck removed. Undo restores it.');
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
    function reel(field, label, receive, { variant } = {}) {
      const control = createChoiceReel({ id: `investment-${id}-${field}`, label, variant, secondary: reels.children.length > 0, options: investmentChoices(type, field).map(([id, label]) => ({ id, label })), read: () => read()[field], write: value => receive ? receive(value) : write(field, value) }); controls.push(control); reels.append(control.element); updates.push(state => control.update(state[field]));
    }
    const updateView = definition.create({ id, root, reels, screen, knobs, companion, note, reel, edit, write, moneyControl, range,
      renderPlan: (record, context, analysis) => renderPlan(plan, record, context, analysis, edit, isCurrent),
    });
    if (definition.reelReading) { currentReading = node('output', '', 'investment-comparison__reel-context'); reels.children[0].append(currentReading); }
    return { id, type, root, dispose() { retired = true; controls.forEach(control => control.dispose?.()); root.remove(); }, release() { controls.forEach(control => control.release?.()); }, update(record, context) {
      title.textContent = titleFor(record); const state = record.settings, pricing = context.model.pricing, analysis = context.analysis(id);
      if (currentReading) currentReading.value = definition.reelReading(record, analysis, pricing);
      for (const update of updates) update(state);
      for (const [name, element] of groups) element.hidden = name !== 'all' && name !== state.domain;
      screen.replaceChildren(); companion.replaceChildren();
      updateView(record, context, analysis);
    } };
  }

  function renderPlan(container, record, context, analysis, edit, isCurrent) {
    const { model } = context, base = model.pricing, state = record.settings;
    const pricing = { ...base, sessions: analysis.visibleSessions };
    if (!pricing.sessions.some(item => item.tape.id === selected)) selected = pricing.sessions[0]?.tape.id;
    const current = pricing.sessions.find(item => item.tape.id === selected);
    const root = node('div', undefined, 'investment-study');
    const meter = node('section', undefined, 'investment-study__meter'); meter.setAttribute('aria-label', 'Accepted plan investment');
    for (const [label, value] of [[pricing.complete ? 'Accepted investment' : 'Known investment', money(pricing.total)], ['People’s time', `${number(pricing.effort)} h`], ['Since saved comparison', state.baseline === null ? '—' : `${pricing.total >= state.baseline ? '+' : '−'}${money(Math.abs(pricing.total - state.baseline))}`]]) {
      const reading = node('div'); reading.append(node('span', label), node('strong', value)); meter.append(reading);
    }
    const owns = event => isCurrent() && container.contains(event.currentTarget);
    const save = button(state.baseline === null ? 'Save comparison' : 'Update comparison', event => {
      if (owns(event)) edit((current, model) => { current.settings.baseline = model.pricing.total; }, 'Comparison saved.');
    }, 'ghost', 'investment-save');
    meter.append(save); root.append(meter);

    const board = node('div', undefined, 'investment-study__board');
    board.dataset.fundingLens = state.domain;
    for (const [funding, title, hint] of [['funded', 'Within funded time', 'Time already set aside'], ['extra', 'Extra investment', 'Work to fund separately']]) {
      if (state.domain !== 'all' && state.domain !== funding) continue;
      const lane = node('section', undefined, 'investment-study__lane'); lane.dataset.funding = funding;
      const entries = pricing.sessions.filter(item => item.funding === funding || item.funding === 'mixed')
        .map(item => ({ ...item, ...item.fundingParts?.[funding] }));
      const heading = node('div', undefined, 'bar'); heading.append(node('h3', title), node('strong', `${entries.every(item => item.complete) ? '' : 'Known '}${money(entries.reduce((sum, item) => sum + item.cost, 0))}`, 'number')); lane.append(heading, node('p', hint, 'hint'));
      for (const item of entries) {
        const pad = button('', event => { if (!owns(event)) return; selected = item.tape.id; render(outer.parentElement); container.querySelector(`[data-focus-key="investment-${selected}"]`)?.focus({ preventScroll: true }); }, 'investment-study__pad', `investment-${item.tape.id}`);
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
      if (openSession) heading.append(button('Session controls ↗', event => { if (owns(event)) openSession(current.tape.id, event.currentTarget); }, 'ghost', 'investment-session')); deck.append(heading);
      const modules = node('div', undefined, 'investment-study__modules');
      const funding = node('fieldset'); funding.append(node('legend', 'How this work is funded'));
      if (current.funding === 'mixed') funding.append(node('p', 'Sessions use both funding types.', 'hint'));
      for (const [value, label] of [['funded', 'Within funded time'], ['extra', 'Extra investment']]) {
        const pad = button(label, event => {
          if (!owns(event)) return;
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
        const reading = current.people?.find(item => item.personId === id);
        const hours = reading?.hours ?? current.hours, cost = reading ? reading.cost : person.rate === null ? null : hours * person.rate;
        const chip = node('div'); chip.append(node('strong', person.name), node('span', `${number(hours)} h · ${cost === null ? 'Rate unknown' : money(cost)}`)); chips.append(chip);
      }
      if (!current.tape.people.length) chips.append(node('p', 'Choose people in Session controls.', 'hint'));
      people.append(chips); modules.append(funding, people); deck.append(modules); root.append(deck);
    }
    const sequence = node('section', undefined, 'investment-study__sequence'); sequence.append(node('h3', state.domain === 'all' ? 'Work across the plan' : state.domain === 'funded' ? 'Funded work across the plan' : 'Extra work across the plan'));
    const periods = node('div', undefined, 'investment-study__periods');
    for (const period of model.periods) {
      const amount = pricing.sessions.reduce((sum, item) => sum + (item.placements
        ? item.placements.filter(occ => occ.period === period.id && (state.domain === 'all' || occ.funding === state.domain)).reduce((total, occ) => total + occ.cost, 0)
        : item.tape.occurrences.length ? item.cost / item.tape.occurrences.length * item.tape.occurrences.filter(occ => occ.period === period.id).length : 0), 0);
      const column = node('div'); column.append(node('span', period.caption || period.label), node('strong', `${pricing.complete ? '' : 'Known '}${money(amount)}`));
      const bars = node('div', undefined, 'investment-study__bars'); bars.setAttribute('aria-hidden', 'true');
      for (let step = 0; step < 12; step++) { const bar = node('i'); bar.dataset.lit = String(pricing.total > 0 && step < amount / pricing.total * 12); bars.append(bar); }
      column.append(bars); periods.append(column);
    }
    sequence.append(periods); if (model.periods.length) root.append(sequence);
    container.replaceChildren(root);
  }
  return { render, release() { loaded?.release(); }, dispose() { disposed = true; for (const editor of editors.values()) editor.dispose(); editors.clear(); tapes.clear(); domainControl?.dispose(); outer?.remove(); } };
}
