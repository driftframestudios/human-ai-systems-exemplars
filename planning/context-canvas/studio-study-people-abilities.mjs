// Development illustration: shared people and tapes retain the study's Undo owner.
export const peopleAbilitiesSeed = {
  peopleFunding: { research: 8, product: 12, engineering: 16, quality: 8 },
  capabilities: [
    { id: 'compare', kind: 'ability', name: 'Compare alternatives', outcome: 'Compare service options with the evidence and trade-offs visible.', teamId: 'discover', ownerId: 'research', preparation: ['synthesis'], review: ['decision'], observation: 'walkthrough', included: true },
    { id: 'recover', kind: 'ability', name: 'Recover interrupted work', outcome: 'Resume a request with its history, ownership and next step intact.', teamId: 'build', ownerId: 'engineering', preparation: ['pairing'], review: ['decision'], observation: 'pending', included: true },
    { id: 'approve', kind: 'ability', name: 'Approve a change', outcome: 'Review the evidence and record the decision before the pilot proceeds.', teamId: 'review', ownerId: 'product', preparation: ['synthesis'], review: ['decision'], observation: 'pending', included: true },
    { id: 'trace', kind: 'ability', name: 'Trace the evidence', outcome: 'Follow a decision back to the source material and the people who reviewed it.', teamId: 'discover', ownerId: 'research', preparation: ['synthesis'], review: [], observation: 'pending', included: false },
    { id: 'expectations', kind: 'practice', name: 'Agree expectations', outcome: 'Agree what the receiving team needs before work changes hands.', teamId: 'discover', ownerId: 'product', preparation: ['synthesis'], review: ['decision'], observation: 'walkthrough', included: true },
    { id: 'handoff', kind: 'practice', name: 'Carry work through a handoff', outcome: 'Give the receiving team the evidence, context and clear ownership to continue.', teamId: 'build', ownerId: 'engineering', preparation: ['pairing'], review: ['decision'], observation: 'recovery', included: true },
    { id: 'learn', kind: 'practice', name: 'Learn from the pilot', outcome: 'Use the pilot walkthrough to decide what to change next.', teamId: 'review', ownerId: 'quality', preparation: [], review: ['decision'], observation: 'pending', included: false }
  ]
};

const PHASES = [['responsibility', 'Responsibility'], ['preparation', 'Preparation'], ['review', 'Review'], ['observation', 'Observation']];
const OBSERVATIONS = [
  { id: 'pending', label: 'Ready to explore', text: 'A walkthrough will show what needs attention.' },
  { id: 'walkthrough', label: 'Walkthrough example', text: 'The example follows a request from arrival to a clear decision.' },
  { id: 'recovery', label: 'Recovery example', text: 'The example resumes an interrupted handoff with its context intact.' }
];
let instanceSequence = 0;

export function createPeopleAbilities({ getModel, change, openSession }) {
  const instance = ++instanceSequence;
  const view = { personId: 'research', teamId: null, abilityId: 'approve', phase: 'responsibility', abilityOpen: true };
  let document, peopleRoot, peopleBoard, personDeck, peopleMatrix, abilityRoot, abilityTables, abilityDeck;
  let personEditor = null, gestureSequence = 0, abilityReturnKey = null;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const key = (element, value) => { element.dataset.focusKey = `study-pa-${instance}-${value}`; return element; };
  function button(label, run, className = '', focusKey, pressed) {
    const element = node('button', label, className); element.type = 'button';
    if (focusKey) key(element, focusKey);
    if (pressed !== undefined) element.setAttribute('aria-pressed', String(pressed));
    element.addEventListener('click', run); return element;
  }
  function field(labelText, input) { const label = node('label', undefined, 'study-pa-field'); label.append(node('span', labelText), input); return label; }
  function checkbox(labelText, checked, onChange, focusKey) {
    const label = node('label', undefined, 'study-pa-switch'), input = node('input');
    input.type = 'checkbox'; input.checked = checked; key(input, focusKey);
    input.addEventListener('change', () => onChange(input.checked));
    label.append(input, node('span', labelText)); return label;
  }
  function attach(container, root) { if (root.parentElement !== container) container.replaceChildren(root); }
  function refreshPeople() { renderPeople(peopleRoot.parentElement); }
  function refreshAbilities() { renderAbilities(abilityRoot.parentElement); }
  const capabilities = () => getModel().study.capabilities;
  const personHours = (model, id) => model.study.peopleFunding[id] ?? 8;
  const amount = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  const tapeMinutes = tape => (tape.hours * 60 + tape.minutes) * tape.occurrences.length;
  const personEffort = (model, id) => model.tapes.filter(tape => tape.people.includes(id)).reduce((sum, tape) => sum + tapeMinutes(tape), 0);
  function updateMembership(ids, id, included) {
    return included ? ids.includes(id) ? ids : [...ids, id] : ids.filter(value => value !== id);
  }
  function reveal(element) {
    element.scrollIntoView({ block: 'nearest', behavior: document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function pickPerson(id) { view.personId = id; view.teamId = null; refreshPeople(); personEditor?.name.focus({ preventScroll: true }); reveal(personDeck); }
  function pickTeam(id) { view.teamId = id; refreshPeople(); personEditor?.name.focus({ preventScroll: true }); reveal(personDeck); }
  function chooseAbility(id, phase = view.phase, source) {
    abilityReturnKey = source?.dataset.focusKey ?? document.activeElement?.dataset.focusKey ?? null;
    view.abilityId = id; view.phase = phase; view.abilityOpen = true; refreshAbilities();
    abilityDeck.focus({ preventScroll: true }); reveal(abilityDeck);
  }

  function numericControl(label, value, { min = 0, max, step = 1, unit, focusKey, write }) {
    const group = node('div', undefined, 'study-pa-quantity'), caption = node('label', label);
    const input = key(node('input'), `${focusKey}-exact`), range = key(node('input'), `${focusKey}-range`);
    input.type = 'number'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value);
    input.id = `study-pa-${instance}-${focusKey}`; caption.htmlFor = input.id;
    range.type = 'range'; range.min = String(min); range.max = String(max); range.step = String(step); range.value = String(value); range.setAttribute('aria-label', label);
    const readout = node('output', `${amount(value)} ${unit}`, 'study-pa-quantity__readout'); readout.htmlFor = input.id;
    let editKey;
    function begin() { editKey = `${focusKey}-${++gestureSequence}`; }
    function commit(raw) {
      if (raw === '') return;
      const next = Number(raw); if (!Number.isFinite(next) || next < min || next > max) return;
      write(next, editKey);
    }
    input.addEventListener('focus', begin); range.addEventListener('pointerdown', begin);
    range.addEventListener('keydown', event => { if (!event.repeat) begin(); });
    input.addEventListener('input', () => commit(input.value)); range.addEventListener('input', () => commit(range.value));
    const exact = node('div', undefined, 'study-pa-quantity__exact'), steps = node('div', undefined, 'study-pa-steps');
    for (const [direction, symbol] of [[-1, '−'], [1, '+']]) {
      const control = button(symbol, () => { begin(); commit(Math.min(max, Math.max(min, Number(input.value) + direction * step))); }, '', `${focusKey}-${direction < 0 ? 'less' : 'more'}`);
      control.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} ${label.toLowerCase()}`); steps.append(control);
    }
    exact.append(input, steps); group.append(caption, readout, range, exact);
    return { root: group, update(next) {
      if (document.activeElement !== input) input.value = String(next);
      if (document.activeElement !== range) range.value = String(next);
      readout.textContent = `${amount(next)} ${unit}`;
    } };
  }

  function renderPeople(container) {
    document = container.ownerDocument;
    if (!peopleRoot) {
      peopleRoot = node('section', undefined, 'study-pa people-study');
      peopleRoot.setAttribute('aria-label', 'People and teams workbench');
      const head = node('header', undefined, 'study-pa-heading');
      head.append(node('h2', 'People and teams'), node('p', 'Choose a person. Tune their time. See where they take part.'));
      const actions = node('div', undefined, 'study-pa-actions');
      actions.append(button('＋ Add person', () => change(model => {
        const id = crypto.randomUUID(); model.people.push({ id, name: 'New specialist', rate: 100 }); model.study.peopleFunding[id] = 8; view.personId = id; view.teamId = null;
      }, 'Person added. Their settings are open.'), 'add', 'add-person'),
      button('＋ Add team', () => change(model => {
        const id = crypto.randomUUID(); model.teams.push({ id, name: 'New team', people: [] }); view.teamId = id;
      }, 'Team added. Choose its people.'), 'add', 'add-team'));
      head.append(actions);
      peopleBoard = node('div', undefined, 'people-study-board');
      personDeck = node('section', undefined, 'study-pa-deck'); personDeck.setAttribute('aria-label', 'Selected person or team');
      peopleMatrix = node('section', undefined, 'study-pa-screen'); peopleMatrix.setAttribute('aria-label', 'Session participation');
      peopleRoot.append(head, peopleBoard, personDeck, peopleMatrix);
    }
    attach(container, peopleRoot);
    const model = getModel();
    if (!model.people.some(person => person.id === view.personId)) view.personId = model.people[0]?.id ?? null;
    if (!model.teams.some(team => team.id === view.teamId)) view.teamId = null;
    peopleBoard.replaceChildren();
    const grouped = new Set(model.teams.flatMap(team => team.people));
    const lanes = [...model.teams, { id: null, name: 'Available people', people: model.people.filter(person => !grouped.has(person.id)).map(person => person.id) }];
    for (const team of lanes) {
      if (team.id === null && !team.people.length) continue;
      const lane = node('section', undefined, 'people-study-lane');
      const heading = team.id ? button(team.name, () => pickTeam(team.id), 'people-study-team', `team-${team.id}`, view.teamId === team.id) : node('h3', team.name, 'people-study-team');
      lane.append(heading);
      for (const id of team.people) {
        const person = model.people.find(item => item.id === id); if (!person) continue;
        const pad = button('', () => pickPerson(id), 'people-study-person', `person-${team.id ?? 'available'}-${id}`, view.teamId === null && view.personId === id);
        pad.append(node('strong', person.name), node('small', `$${amount(person.rate)} / hour · ${amount(personHours(model, id))} h funded`)); lane.append(pad);
      }
      if (!team.people.length) lane.append(node('p', 'Choose people in the team panel.', 'study-pa-note'));
      peopleBoard.append(lane);
    }
    renderPersonDeck(model); renderParticipation(model);
  }

  function renderPersonDeck(model) {
    const record = view.teamId ? model.teams.find(team => team.id === view.teamId) : model.people.find(person => person.id === view.personId);
    if (!record) { personDeck.replaceChildren(node('p', 'Add a person to explore the plan.')); return; }
    const kind = view.teamId ? 'team' : 'person', identity = `${kind}-${record.id}`;
    if (personEditor?.identity !== identity) {
      const head = node('header', undefined, 'study-pa-deck__head'), caption = node('span', kind === 'team' ? 'Loaded team' : 'Loaded person', 'study-pa-kicker');
      const name = key(node('input'), `${identity}-name`); name.type = 'text'; name.maxLength = 80; name.setAttribute('aria-label', `${kind === 'team' ? 'Team' : 'Person'} name`);
      let nameKey;
      name.addEventListener('focus', () => { nameKey = `${identity}-name-${++gestureSequence}`; });
      name.addEventListener('input', () => {
        const next = name.value.trim(); if (!next) return;
        change(current => { const item = current[kind === 'team' ? 'teams' : 'people'].find(row => row.id === record.id); if (item) item.name = next; }, '', nameKey);
      });
      head.append(caption, name);
      const body = node('div', undefined, 'study-pa-deck__body'), switches = node('fieldset', undefined, 'study-pa-options');
      const legend = node('legend', kind === 'team' ? 'People in this team' : 'Teams'); switches.append(legend);
      const choices = node('div', undefined, 'study-pa-pad-grid'); switches.append(choices);
      const note = node('p', '', 'study-pa-note');
      const controls = {};
      if (kind === 'person') {
        const quantities = node('div', undefined, 'study-pa-quantities');
        controls.rate = numericControl('Hourly rate', record.rate, { max: 500, unit: 'USD / hour', focusKey: `${identity}-rate`, write(value, editKey) {
          change(current => { const person = current.people.find(item => item.id === record.id); if (person) person.rate = value; }, '', editKey);
        } });
        controls.funded = numericControl('Funded time', personHours(model, record.id), { max: 80, unit: 'hours in this plan', focusKey: `${identity}-funded`, write(value, editKey) {
          change(current => { current.study.peopleFunding[record.id] = value; }, '', editKey);
        } });
        quantities.append(controls.rate.root, controls.funded.root); body.append(quantities);
      }
      body.append(switches, note); personDeck.replaceChildren(head, body);
      personEditor = { identity, name, choices, note, controls };
    }
    const editor = personEditor;
    if (document.activeElement !== editor.name) editor.name.value = record.name;
    editor.choices.replaceChildren();
    if (kind === 'person') {
      editor.controls.rate.update(record.rate); editor.controls.funded.update(personHours(model, record.id));
      for (const team of model.teams) editor.choices.append(checkbox(team.name, team.people.includes(record.id), included => change(current => {
        const receiving = current.teams.find(item => item.id === team.id); if (receiving) receiving.people = updateMembership(receiving.people, record.id, included);
      }, 'Team membership updated.'), `membership-${record.id}-${team.id}`));
      const hours = personEffort(model, record.id) / 60;
      editor.note.textContent = `${amount(hours)} h in sessions · ${amount(personHours(model, record.id))} h funded`;
    } else {
      for (const person of model.people) editor.choices.append(checkbox(person.name, record.people.includes(person.id), included => change(current => {
        const team = current.teams.find(item => item.id === record.id); if (team) team.people = updateMembership(team.people, person.id, included);
      }, 'Team membership updated.'), `team-membership-${record.id}-${person.id}`));
      editor.note.textContent = 'People can take part in sessions across teams.';
    }
  }

  function renderParticipation(model) {
    const heading = node('h3', 'People × sessions'), scroll = node('div', undefined, 'study-pa-scroll');
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Session participation table'); scroll.tabIndex = 0;
    const table = node('table', undefined, 'study-pa-matrix'); table.append(node('caption', 'Participation in every occurrence of a session'));
    const head = node('thead'), header = node('tr'), first = node('th', 'Session'); first.scope = 'col'; header.append(first);
    for (const person of model.people) { const th = node('th'); th.scope = 'col'; th.append(button(person.name, () => pickPerson(person.id), 'study-pa-table-key', `matrix-person-${person.id}`)); header.append(th); }
    head.append(header); table.append(head); const body = node('tbody');
    for (const tape of model.tapes) {
      const row = node('tr'), label = node('th'); label.scope = 'row';
      label.append(button(`${tape.name} ↗`, event => openSession(tape.id, event.currentTarget), 'study-pa-table-key', `matrix-session-${tape.id}`)); row.append(label);
      for (const person of model.people) {
        const td = node('td'), included = tape.people.includes(person.id);
        td.dataset.included = String(included);
        const control = checkbox('', included, checked => change(current => {
          const session = current.tapes.find(item => item.id === tape.id); if (session) session.people = updateMembership(session.people, person.id, checked);
        }, 'Session participants updated.'), `participation-${tape.id}-${person.id}`);
        control.querySelector('input').setAttribute('aria-label', `${person.name} in ${tape.name}`);
        td.append(control); row.append(td);
      }
      body.append(row);
    }
    table.append(body); scroll.append(table); peopleMatrix.replaceChildren(heading, scroll);
  }

  function renderAbilities(container) {
    document = container.ownerDocument;
    if (!abilityRoot) {
      abilityRoot = node('section', undefined, 'study-pa ability-study'); abilityRoot.setAttribute('aria-label', 'Abilities and practices workbench');
      const head = node('header', undefined, 'study-pa-heading'); head.append(node('h2', 'Abilities and team practices'), node('p', 'Choose what should become possible. Connect the people and work that support it.'));
      abilityTables = node('div', undefined, 'ability-study-tables'); abilityDeck = node('section', undefined, 'study-pa-deck'); abilityDeck.setAttribute('aria-label', 'Loaded ability or practice'); abilityDeck.tabIndex = -1;
      abilityRoot.append(head, abilityTables, abilityDeck);
    }
    attach(container, abilityRoot); const model = getModel(), records = capabilities();
    if (!records.some(item => item.id === view.abilityId)) view.abilityId = records[0]?.id ?? null;
    abilityTables.replaceChildren(); let selectedScreen;
    for (const [kind, title] of [['ability', 'What people can do'], ['practice', 'How the team works']]) {
      const screen = node('section', undefined, 'study-pa-screen'), heading = node('h3', title), scroll = node('div', undefined, 'study-pa-scroll');
      scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', title); scroll.tabIndex = 0;
      const table = node('table', undefined, 'ability-study-table'), caption = node('caption', `${title} · supporting work`); table.append(caption);
      const thead = node('thead'), header = node('tr');
      for (const label of [title, ...PHASES.map(([, text]) => text)]) { const th = node('th', label); th.scope = 'col'; header.append(th); }
      thead.append(header); table.append(thead); const tbody = node('tbody');
      for (const record of records.filter(item => item.kind === kind)) {
        const row = node('tr'), th = node('th'); th.scope = 'row';
        const recordButton = button('', event => chooseAbility(record.id, view.phase, event.currentTarget), 'ability-study-record', `ability-${record.id}`, view.abilityOpen && view.abilityId === record.id);
        recordButton.append(node('strong', record.name), node('small', record.included ? 'Included' : 'Available')); th.append(recordButton); row.append(th);
        for (const [phase] of PHASES) {
          const td = node('td'), cell = button('', event => chooseAbility(record.id, phase, event.currentTarget), 'ability-study-cell', `ability-${record.id}-${phase}`, view.abilityOpen && view.abilityId === record.id && view.phase === phase);
          if (phase === 'responsibility') cell.append(node('strong', model.people.find(item => item.id === record.ownerId)?.name ?? 'Choose people'), node('small', model.teams.find(item => item.id === record.teamId)?.name ?? 'Choose a team'));
          else if (phase === 'observation') cell.append(node('strong', OBSERVATIONS.find(item => item.id === record.observation)?.label ?? 'Ready to explore'), node('small', 'Illustrative result'));
          else { const linked = record[phase].map(id => model.tapes.find(item => item.id === id)).filter(Boolean); cell.append(node('strong', linked.length ? 'Work linked' : 'Choose work'), node('small', linked.map(item => item.name).join(' · ') || (phase === 'review' ? 'Check the outcome' : 'Prepare the work'))); }
          cell.append(node('span', '›', 'ability-study-cell__cue')); cell.setAttribute('aria-label', `${record.name}: ${PHASES.find(([id]) => id === phase)[1]}`); td.append(cell); row.append(td);
        }
        tbody.append(row);
      }
      table.append(tbody); scroll.append(table); screen.append(heading, scroll); abilityTables.append(screen);
      if (records.find(item => item.id === view.abilityId)?.kind === kind) selectedScreen = screen;
    }
    if (selectedScreen) selectedScreen.after(abilityDeck);
    renderAbilityDeck(model);
  }

  function renderAbilityDeck(model) {
    const record = capabilities().find(item => item.id === view.abilityId); abilityDeck.hidden = !record || !view.abilityOpen; if (!record) return;
    const head = node('header', undefined, 'study-pa-deck__head'); head.append(node('span', record.kind === 'ability' ? 'Loaded ability' : 'Loaded practice', 'study-pa-kicker'), node('h3', record.name), button('Close ×', () => {
      view.abilityOpen = false; refreshAbilities();
      const target = [...abilityRoot.querySelectorAll('[data-focus-key]')].find(element => element.dataset.focusKey === abilityReturnKey)
        ?? abilityRoot.querySelector(`[data-focus-key="study-pa-${instance}-ability-${record.id}"]`);
      target?.focus({ preventScroll: true }); if (target) reveal(target);
    }, 'ghost', 'close-ability'));
    const body = node('div', undefined, 'study-pa-deck__body'), overview = node('div', undefined, 'ability-study-outcome');
    overview.append(node('p', record.outcome), checkbox('Include in this plan', record.included, included => updateAbility(record.id, item => { item.included = included; }, 'Plan updated.'), `include-${record.id}`));
    const rail = node('div', undefined, 'study-pa-rail'); rail.setAttribute('role', 'group'); rail.setAttribute('aria-label', 'Ability settings');
    for (const [phase, title] of PHASES) rail.append(button(title, () => {
      view.phase = phase; refreshAbilities();
      abilityDeck.querySelector(`[data-focus-key="study-pa-${instance}-phase-${phase}"]`)?.focus({ preventScroll: true });
    }, '', `phase-${phase}`, view.phase === phase));
    const content = node('div', undefined, 'ability-study-controls');
    if (view.phase === 'responsibility') {
      const team = key(node('select'), `ability-team-${record.id}`); team.setAttribute('aria-label', 'Responsible team');
      for (const choice of [{ id: '', name: 'Choose a team' }, ...model.teams]) { const option = node('option', choice.name); option.value = choice.id; team.append(option); }
      team.value = record.teamId; team.addEventListener('change', () => updateAbility(record.id, item => { item.teamId = team.value; }, 'Responsible team updated.'));
      const people = node('fieldset', undefined, 'study-pa-options'); people.append(node('legend', 'Person guiding the decision')); const pads = node('div', undefined, 'study-pa-pad-grid');
      for (const person of model.people) { const label = node('label', undefined, 'study-pa-switch'), radio = key(node('input'), `ability-owner-${record.id}-${person.id}`); radio.type = 'radio'; radio.name = `study-pa-owner-${instance}`; radio.checked = record.ownerId === person.id;
        radio.addEventListener('change', () => { if (radio.checked) updateAbility(record.id, item => { item.ownerId = person.id; }, 'Decision owner updated.'); }); label.append(radio, node('span', person.name)); pads.append(label); }
      people.append(pads); content.append(field('Responsible team', team), people);
    } else if (view.phase === 'observation') {
      const choices = node('div', undefined, 'study-pa-pad-grid');
      for (const observation of OBSERVATIONS) { const pad = button('', () => updateAbility(record.id, item => { item.observation = observation.id; }, 'Illustrative observation changed.'), 'ability-study-observation', `observation-${record.id}-${observation.id}`, record.observation === observation.id); pad.append(node('strong', observation.label), node('small', observation.text)); choices.append(pad); }
      content.append(node('p', 'Choose an illustrative result.', 'study-pa-note'), choices);
    } else {
      const phase = view.phase, work = node('div', undefined, 'ability-study-work');
      for (const tape of model.tapes) { const card = node('div', undefined, 'ability-study-session'); card.append(checkbox(tape.name, record[phase].includes(tape.id), included => updateAbility(record.id, item => { item[phase] = updateMembership(item[phase], tape.id, included); }, 'Supporting work updated.'), `support-${record.id}-${phase}-${tape.id}`), button('Open session ↗', event => openSession(tape.id, event.currentTarget), 'ghost', `open-support-${record.id}-${phase}-${tape.id}`)); work.append(card); }
      content.append(node('p', view.phase === 'review' ? 'Choose the sessions that check the outcome.' : 'Choose the sessions that prepare this work.', 'study-pa-note'), work);
    }
    body.append(overview, rail, content); abilityDeck.replaceChildren(head, body);
  }
  function updateAbility(id, action, message) { change(model => { const record = model.study.capabilities.find(item => item.id === id); if (record) action(record); }, message); }

  return {
    people: { title: 'People', description: 'People, teams and the sessions they share.', render: renderPeople },
    abilities: { title: 'Abilities', description: 'Connect useful outcomes to people, preparation and review.', render: renderAbilities }
  };
}
