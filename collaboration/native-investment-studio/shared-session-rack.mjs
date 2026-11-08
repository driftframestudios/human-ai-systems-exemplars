import { duration } from './display.mjs';
import { mountRackHeader, syncReorderButtons } from './rack-controls.mjs';
import { animateRackChange } from './reel-control.mjs';

let sequence = 0;

// This receiver changes accepted relationships through the caller's command
// boundary. The handoff editor remains canonical and is borrowed into its slot.
export function mountSharedSessionRack(container, { onCommand, onNavigate, onCreate, onCloseEditor }) {
  const document = container.ownerDocument, id = `shared-rack-${++sequence}`;
  const node = (tag, text, className) => {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const button = (text, className, action) => {
    const result = node('button', text, className); result.type = 'button'; result.addEventListener('click', action); return result;
  };
  const root = node('section', undefined, 'studio-session-tracks'); root.dataset.sharedSessionRack = '';
  const heading = node('header', undefined, 'studio-session-tracks__heading');
  const title = node('h5', 'Shared sessions'); title.id = `${id}-title`; root.setAttribute('aria-labelledby', title.id);
  const tabs = node('div', undefined, 'studio-shared__tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Shared sessions view');
  const panels = new Map(), keys = new Map();
  let plan = null, view = 'people', selectedId = null, message = '';
  const controls = node('div', undefined, 'studio-shared__controls');
  const add = button('Add session', 'native-control--create studio-rack-add', event => onCreate(view === 'people' ? 'session' : 'connection', {}, event.currentTarget));
  add.dataset.studioEntryKey = 'shared-session-add';
  const saved = node('span', '', 'studio-rack-header__saved'); saved.setAttribute('role', 'status');
  controls.append(saved, add); heading.append(title, tabs, controls); root.append(heading);
  for (const [key, label] of [['people', 'People'], ['handoffs', 'Handoffs']]) {
    const tab = button(label, 'studio-track-key', () => chooseView(key)); tab.id = `${id}-${key}-tab`;
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `${id}-${key}`);
    const panel = node('div'); panel.id = `${id}-${key}`; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id);
    tabs.append(tab); root.append(panel); panels.set(key, panel); keys.set(key, tab);
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 'people' : event.key === 'End' ? 'handoffs' : key === 'people' ? 'handoffs' : 'people';
      chooseView(next); keys.get(next).focus({ preventScroll: true });
    });
  }
  const selection = node('section', undefined, 'studio-shared__selection'); selection.hidden = true;
  const selectedBody = node('div', undefined, 'studio-shared__selected-body'); selection.append(selectedBody);
  const selectedHeader = mountRackHeader(selection, { owner: 'Shared sessions', onClose: () => {
    const returning = selectedId; selectedId = null; render();
    root.querySelector(`[data-shared-select="${returning}"]`)?.focus({ preventScroll: true });
  } });
  const editorSlot = node('div'); editorSlot.dataset.sharedRackEditor = '';
  root.append(selection, editorSlot); container.append(root);
  function chooseView(next) {
    if (next === view) return;
    onCloseEditor(); view = next; selectedId = null; render();
  }
  function accept(command, text, focusKey) {
    if (!onCommand(command, text)) { render(); return false; }
    message = text; render();
    [...root.querySelectorAll('[data-shared-focus]')].find(control => control.dataset.sharedFocus === focusKey)?.focus({ preventScroll: true });
    return true;
  }
  function shell(label, columns) {
    const scroll = node('div', undefined, 'studio-session-tracks__scroll'); scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', label);
    const table = node('table'); table.append(node('caption', label));
    const head = node('thead'), row = node('tr'), first = node('th', 'Working session'); first.scope = 'col'; row.append(first);
    for (const column of columns) { const th = node('th'); th.scope = 'col'; th.append(column); row.append(th); }
    head.append(row); const body = node('tbody'); table.append(head, body); scroll.append(table); return { scroll, body };
  }
  function rowFor(work) {
    const row = node('tr'); row.dataset.sessionTrack = work.id;
    const th = node('th'); th.scope = 'row';
    const choose = button('', 'studio-track-key studio-record-key studio-session-tracks__name', () => {
      onCloseEditor(); selectedId = selectedId === work.id ? null : work.id; render();
      root.querySelector(`[data-shared-select="${work.id}"]`)?.focus({ preventScroll: true });
    });
    choose.dataset.sharedSelect = work.id; choose.dataset.sharedFocus = `row:${work.id}`;
    choose.setAttribute('aria-expanded', String(selectedId === work.id)); choose.setAttribute('aria-pressed', String(selectedId === work.id));
    choose.setAttribute('aria-controls', `${id}-selected`);
    choose.append(node('strong', work.label), node('small', `${duration(work.minutesPerOccurrence)} each · ${work.occurrences} sessions`));
    th.append(choose); row.append(th); return row;
  }
  function renderPeople() {
    const { scroll, body } = shell('Shared sessions · people who take part', plan.people.map(person => node('span', person.label)));
    for (const work of plan.work) {
      const row = rowFor(work), members = new Set(work.personIds);
      for (const person of plan.people) {
        const cell = node('td'), label = node('label', undefined, 'studio-shared__pad');
        const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.checked = members.has(person.id);
        checkbox.dataset.sharedParticipant = person.id; checkbox.dataset.sharedWork = work.id;
        checkbox.dataset.sharedFocus = `person:${work.id}:${person.id}`;
        checkbox.setAttribute('aria-label', `${person.label} in ${work.label}`);
        label.dataset.funding = work.funding; label.dataset.selected = String(checkbox.checked); label.dataset.status = work.status;
        const last = checkbox.checked && work.personIds.length === 1;
        checkbox.disabled = last;
        if (last) {
          const reason = node('small', 'Add another person first'); reason.id = `${id}-${work.id}-last-person`;
          checkbox.setAttribute('aria-describedby', reason.id); label.append(reason);
        }
        checkbox.addEventListener('change', () => accept({ type: 'work.participants.replace', workId: work.id,
          personIds: checkbox.checked ? [...work.personIds, person.id] : work.personIds.filter(value => value !== person.id) }, 'People saved', checkbox.dataset.sharedFocus));
        label.prepend(checkbox); cell.append(label); row.append(cell);
      }
      body.append(row);
    }
    const addRow = node('tr', undefined, 'studio-rack-create-row'), label = node('th', 'New session'); label.scope = 'row'; addRow.append(label);
    for (const person of plan.people) {
      const cell = node('td'), create = button('Add session', 'native-control--create studio-rack-add studio-rack-create-zone',
        event => onCreate('session', { personId: person.id }, event.currentTarget));
      create.dataset.studioEntryKey = `shared-session-add:${person.id}`;
      create.setAttribute('aria-label', `Add a session with ${person.label}`); cell.append(create); addRow.append(cell);
    }
    body.append(addRow); panels.get('people').replaceChildren(scroll);
  }
  function renderHandoffs() {
    const columns = plan.connections.map(connection => {
      const inspect = button(connection.sharedObject, 'studio-track-key studio-shared__handoff', event => {
        selectedId = null; selection.hidden = true; onNavigate({ kind: 'connection', id: connection.id }, event.currentTarget);
      });
      inspect.dataset.studioRecordKind = 'connection'; inspect.dataset.studioRecordId = connection.id;
      inspect.dataset.studioEntryKey = `shared-handoff:${connection.id}`;
      inspect.setAttribute('aria-label', `Open handoff: ${connection.sharedObject}`); return inspect;
    });
    const { scroll, body } = shell('Shared sessions · handoffs they support', columns);
    for (const work of plan.work) {
      const row = rowFor(work);
      for (const connection of plan.connections) {
        const cell = node('td'), label = node('label', undefined, 'studio-shared__pad');
        const input = node('input'); input.type = 'checkbox'; input.checked = connection.workIds.includes(work.id);
        input.dataset.sharedHandoff = connection.id; input.dataset.sharedWork = work.id;
        input.dataset.sharedFocus = `handoff:${connection.id}:${work.id}`;
        input.setAttribute('aria-label', `${work.label} supports ${connection.sharedObject}`); label.dataset.selected = String(input.checked);
        input.addEventListener('change', () => accept({ type: 'connection.update', connectionId: connection.id,
          connection: { ...connection, workIds: input.checked ? [...connection.workIds, work.id] : connection.workIds.filter(value => value !== work.id) } }, 'Handoff saved', input.dataset.sharedFocus));
        label.append(input); cell.append(label); row.append(cell);
      }
      body.append(row);
    }
    panels.get('handoffs').replaceChildren(scroll);
    if (!plan.connections.length) panels.get('handoffs').append(node('p', 'Add a handoff to connect shared work.'));
  }
  function renderSelected() {
    const work = plan.work.find(row => row.id === selectedId); selection.hidden = !work;
    if (!work) return;
    selectedHeader.update({ title: work.label, owner: `Shared sessions · ${view === 'people' ? 'People' : 'Handoffs'}`, saved: 'Saved' });
    const host = node('label', 'Hosted by'), team = node('select'); team.setAttribute('aria-label', `Team for ${work.label}`);
    for (const row of plan.teams) { const option = node('option', row.label); option.value = row.id; team.append(option); } team.value = work.teamId;
    team.dataset.sharedFocus = `team:${work.id}`;
    team.addEventListener('change', () => accept({ type: 'work.update', workId: work.id, work: { ...work, teamId: team.value } }, 'Team saved', team.dataset.sharedFocus)); host.append(team);
    const people = new Map(plan.people.map(person => [person.id, person]));
    const order = node('ol', undefined, 'studio-shared__order');
    for (const [index, personId] of work.personIds.entries()) {
      const person = people.get(personId), row = node('li'); row.dataset.sharedPersonRow = personId;
      const up = button('Move up', '', () => move(-1)), down = button('Move down', '', () => move(1));
      up.dataset.sharedFocus = `order:${work.id}:${personId}`; down.dataset.sharedFocus = `order-down:${work.id}:${personId}`;
      syncReorderButtons(up, down, { label: person.label, index, count: work.personIds.length });
      const actions = node('div', undefined, 'native-coordination__actions'); actions.append(up, down); row.append(node('strong', person.label), actions); order.append(row);
      function move(delta) {
        const ids = [...work.personIds]; [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
        animateRackChange(selectedBody, () => accept({ type: 'work.participants.replace', workId: work.id, personIds: ids }, 'Order saved', up.dataset.sharedFocus),
          { selector: '[data-shared-person-row]', key: 'sharedPersonRow' });
      }
    }
    selectedBody.replaceChildren(host, order);
  }
  function render() {
    if (!plan) return;
    const scroll = panels.get(view).querySelector('.studio-session-tracks__scroll')?.scrollLeft ?? 0;
    for (const [key, tab] of keys) { tab.setAttribute('aria-selected', String(key === view)); tab.tabIndex = key === view ? 0 : -1; panels.get(key).hidden = key !== view; }
    add.textContent = view === 'people' ? 'Add session' : 'Add handoff'; saved.textContent = message;
    if (view === 'people') { panels.get('handoffs').replaceChildren(); renderPeople(); }
    else { panels.get('people').replaceChildren(); renderHandoffs(); }
    renderSelected();
    panels.get(view).querySelector('.studio-session-tracks__scroll').scrollLeft = scroll;
  }
  selection.id = `${id}-selected`;
  return Object.freeze({ element: root, editorSlot,
    update(next) { plan = next; render(); },
    dispose() { selectedHeader.dispose(); root.remove(); } });
}
