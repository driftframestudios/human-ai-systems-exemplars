import { summarizeWorkSessions } from './work-sessions.mjs';
import { CONTRACT, LIMITS } from './config.mjs';
import { revealStudioDestination } from './motion.mjs';
import { createDraftCoordinator } from './editing.mjs';
import { money, wholeMoney, duration, workDuration } from './display.mjs';
import { preparePersonDraftValues } from './person-draft.mjs';
import { mountRateControls } from './rate-controls.mjs';
import { projectAssuranceConsequences } from './assurance-consequences.mjs';
import { appendAssuranceBadges } from './assurance-badges.mjs';
import { mountRackHeader, focusSubmitControl } from './rack-controls.mjs';
import { createRackAddControl } from './rack-creation-controls.mjs';
import { createRackRecord } from './rack-record-creation.mjs';
import { createParticipationPad } from './participation-pad.mjs';
import { summarizeWorkCapacity, readPersonSessionSpread, planPersonSessionSpread, readWorkParticipation } from './people-capacity.mjs';

const FIELDS = Object.freeze(['label', 'ratePerHour', 'fundedHours', 'fundedMinutes']);
const LABELS = Object.freeze({ label: 'Name', ratePerHour: 'Hourly rate', fundedHours: 'Funded hours', fundedMinutes: 'Funded minutes' });
const SPREAD_PRESETS = Object.freeze([['one', 'One plan'], ['half', 'Half'], ['all', 'All plans']]);
const spreadCount = (preset, total) => preset === 'one' ? Math.min(1, total) : preset === 'half' ? Math.ceil(total / 2) : total;
const INSTANCES = new WeakMap();

// The host owns accepted state. This receiver owns one person's editing controls.
export function mountTeamPanel(root, { studio, editing: sharedEditing, isActive = () => true, canOpen = isActive,
  onAccepted = () => {}, onEditing = () => {}, onBegin = () => {}, onClose = () => false, onSpread = () => {} }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument;
  const find = selector => {
    const element = root.querySelector(selector);
    if (!element) throw new TypeError('Supply the complete native team panel.');
    return element;
  };
  const elements = Object.fromEntries([
    ['roster', '[data-team-roster]'], ['configure', '[data-person-configure]'],
    ['summary', '[data-person-configure] > summary'], ['name', '[data-person-name]'],
    ['form', '[data-person-configure] form'], ['fieldset', '[data-person-configure] fieldset'], ['apply', '[data-person-action="apply"]'],
    ['total', '[data-person-total]'], ['capacity', '[data-person-capacity]'],
    ['status', '[data-person-status]'], ['empty', '[data-team-empty]'],
    ['recovery', '[data-person-recovery]'], ['current', '[data-person-current]'],
  ].map(([key, selector]) => [key, find(selector)]));
  const summaryPreview = document.createElement('span');
  summaryPreview.className = 'native-coordination__summary-preview';
  elements.summary.append(summaryPreview);
  elements.roster.classList.add('studio-people-reading');
  elements.roster.setAttribute('role', 'region');
  elements.roster.setAttribute('aria-label', 'People in working sessions');
  elements.roster.tabIndex = 0;
  const ratesRack = elements.roster.closest('.studio-people-rates');
  const oldAdd = root.querySelector('[data-assembly-action="person-create"]');
  const addPerson = createRackAddControl(document, { label: 'Add person', text: 'Person', className: 'studio-rack-create-zone--persistent', dataset: { assemblyAction: 'person-create' } });
  oldAdd?.replaceWith(addPerson);
  const personReceiver = ratesRack?.querySelector('.studio-person-receiver') ?? document.createElement('div');
  personReceiver.className = 'studio-person-receiver';
  if (ratesRack) { personReceiver.append(elements.configure, elements.status); ratesRack.append(personReceiver); }
  const localHeader = mountRackHeader(elements.configure, { title: 'Person settings', owner: 'All people',
    closeAttribute: 'data-person-rack-close', applyAttribute: 'data-editor-apply',
    onClose: event => { event.stopPropagation(); closeLocal(); } });
  localHeader.element.classList.add('studio-people-editor__heading');
  localHeader.close.dataset.personAction = 'close';
  elements.summary.after(localHeader.element);
  localHeader.update({ source: elements.apply });
  const inputs = Object.fromEntries(FIELDS.map(field => [field, find(`[data-person-configure] [name="${field}"]`)]));
  const errors = Object.fromEntries(FIELDS.map(field => [field, find(`[data-person-error="${field}"]`)]));
  const spread = document.createElement('section'); spread.className = 'studio-person-spread'; spread.setAttribute('aria-label', 'Session spread');
  const spreadSelector = document.createElement('div'); spreadSelector.className = 'studio-person-spread__selector';
  const spreadLabel = document.createElement('span'); spreadLabel.className = 'studio-person-spread__label'; spreadLabel.textContent = 'Session spread';
  const spreadCurrent = document.createElement('strong'); spreadCurrent.className = 'studio-person-spread__current';
  const spreadPreview = document.createElement('div'); spreadPreview.className = 'studio-person-spread__preview';
  spreadPreview.setAttribute('role', 'region'); spreadPreview.setAttribute('aria-label', 'Session participation'); spreadPreview.tabIndex = 0;
  const spreadPresets = document.createElement('div'); spreadPresets.className = 'studio-person-spread__presets'; spreadPresets.setAttribute('role', 'group'); spreadPresets.setAttribute('aria-label', 'Choose session spread');
  for (const [value, label] of SPREAD_PRESETS) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.personSpreadPreset = value; button.textContent = label; spreadPresets.append(button);
  }
  const spreadHint = document.createElement('small'); spreadHint.className = 'studio-person-spread__hint';
  spreadSelector.append(spreadLabel, spreadCurrent, spreadPresets);
  spread.append(spreadSelector, spreadHint, spreadPreview);
  elements.apply.closest('.native-coordination__actions').before(spread);
  // A regular grid owns layout; the fieldset keeps native disabled semantics.
  // Chromium can collapse nested grids when a fieldset's validation rows change.
  const personFields = document.createElement('div'); personFields.className = 'studio-person-fields';
  personFields.append(...elements.fieldset.childNodes); elements.fieldset.append(personFields);
  const editing = sharedEditing ?? createDraftCoordinator(studio);
  const editor = editing.person;
  const cleanup = [];
  let selectedId = null, selectionProjection = null;
  let projection = null, spreadProjection = null, spreadPersonId = null;
  let people = new Map();
  let disposed = false;
  let composing = false;
  let generation = 0, retiredToken = null;

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanup.push(() => target.removeEventListener(event, handler));
  }

  function owns(epoch) { return !disposed && epoch === generation; }
  function boundary() { const view = editing.read(); return { projection: studio.read(), intent: view.intent, token: view.active?.token ?? null }; }
  function retains(epoch, mark) {
    const view = editing.read();
    return owns(epoch) && studio.read() === mark.projection && view.intent === mark.intent && (view.active?.token ?? null) === mark.token;
  }
  function releaseRetiredLease() {
    if (retiredToken === null) return;
    const active = editing.read().active;
    if (active?.kind !== 'person' || active.token !== retiredToken) { retiredToken = null; return; }
    const result = editing.park();
    if (result.ok || result.error.code !== 'settling') retiredToken = null;
  }
  function operate(method, ...args) {
    try { return editor[method](...args); }
    finally { releaseRetiredLease(); }
  }
  function announce(message) { if (!disposed) elements.status.textContent = message; }
  function notify(epoch, focus = null) {
    const mark = boundary();
    onEditing();
    if (focus && retains(epoch, mark)) focus();
  }
  function returnAfterClose(epoch) {
    const mark = boundary(), handled = onClose();
    if (handled !== true && retains(epoch, mark)) elements.summary.focus();
  }
  const rateControls = mountRateControls({ host: inputs.ratePerHour.closest('.native-coordination__control'), precision: inputs.ratePerHour,
    read() {
      const view = editor.read(), active = editing.read().active;
      const parsed = view.draft ? preparePersonDraftValues(view.draft.raw) : null;
      return { token: view.draft?.token, raw: view.draft?.raw.ratePerHour, cents: parsed?.admitted.rateCentsPerHour ?? null,
        enabled: !disposed && !composing && isActive() && elements.configure.open && view.status === 'editing'
          && active?.kind === 'person' && active.token === view.draft?.token };
    }, write(token, value) {
      const epoch = ++generation, result = operate('setText', token, 'ratePerHour', value);
      if (!owns(epoch)) return; announce(result.ok ? '' : result.error.message); render();
    } });

  function renderRoster(next) {
    if (next === projection) return;
    // Accepted participation refreshes the readings while each open person card
    // keeps its local disclosure and the rows below it keep their position.
    const openCards = new Set([...elements.roster.querySelectorAll('[data-roster-person] .studio-person-more[open]')]
      .map(card => card.closest('[data-roster-person]').dataset.rosterPerson));
    people = new Map(next.state.people.map(person => [person.id, person]));
    const memberships = new Map(next.state.people.map(person => [person.id, []]));
    for (const team of next.state.teams) {
      for (const id of team.personIds) memberships.get(id).push(team.label);
    }
    const capacity = new Map(next.result.capacity.map(row => [row.personId, row]));
    const support = new Map(projectAssuranceConsequences(next).accepted.badges.people.map(row => [row.personId, row.badges]));
    const totals = summarizeWorkCapacity(next);
    const rollup = document.createElement('dl'); rollup.className = 'studio-capacity-rollup studio-capacity-readings';
    for (const [label, value, description] of [
      ['Assigned time', duration(totals.personMinutes), 'Across people and sessions'],
      ['Known work value', wholeMoney(totals.knownCents), totals.completeMoney ? 'Funded time and extra investment' : 'Some hourly rates are still needed'],
    ]) {
      const reading = document.createElement('div'), title = document.createElement('dt'), amount = document.createElement('dd'), number = document.createElement('span'), context = document.createElement('small');
      title.textContent = label; number.textContent = value; context.textContent = description;
      amount.append(number, context); reading.append(title, amount); rollup.append(reading);
    }
    const legend = document.createElement('p'); legend.className = 'studio-capacity-legend';
    for (const [kind, symbol, text] of [['allocated', '●', 'Funded time'], ['additional', '◆', 'Extra investment'], ['paused', 'Ⅱ', 'Paused · still planned']]) {
      const key = document.createElement('span'), marker = document.createElement('span');
      key.dataset.capacityMeaning = kind; marker.textContent = symbol; marker.setAttribute('aria-hidden', 'true');
      if (kind === 'paused') marker.className = 'studio-pause-marker';
      key.append(marker, document.createTextNode(` ${text}`)); legend.append(key);
    }
    const ledger = new Map(next.result.ledger.map(row => [row.workId, new Map(row.lines.map(line => [line.personId, line]))]));
    const table = document.createElement('table'); table.className = 'studio-people-arranger'; table.dataset.emptySessions = String(next.state.work.length === 0);
    table.style.setProperty('--studio-people-columns', String(next.state.work.length + 1));
    const caption = document.createElement('caption'); caption.textContent = 'People in working sessions';
    const head = document.createElement('thead'), headings = document.createElement('tr');
    const label = document.createElement('th'); label.scope = 'col'; label.textContent = 'People and funded time'; headings.append(label);
    for (const work of next.state.work) {
      const cell = document.createElement('th'); cell.scope = 'col'; cell.dataset.workId = work.id; cell.dataset.workStatus = summarizeWorkSessions(work).status;
      const open = document.createElement('button'); open.type = 'button';
      open.className = 'studio-track-key studio-session-tracks__pad native-control--navigate';
      open.dataset.nativeWorkOpen = work.id; open.dataset.studioSessionId = work.id;
      const title = document.createElement('strong'), detail = document.createElement('small');
      title.textContent = work.label; detail.textContent = `${work.sessionOverrides?.length ? workDuration(work) : `${duration(work.minutesPerOccurrence)} · ${work.occurrences} sessions`}${summarizeWorkSessions(work).status === 'paused' ? ' · Paused' : summarizeWorkSessions(work).status === 'mixed' ? ' · Some paused' : ''}`;
      open.append(title, detail); cell.append(open); headings.append(cell);
    }
    head.append(headings); const body = document.createElement('tbody'); table.append(caption, head, body);
    for (const [index, person] of next.state.people.entries()) {
      const row = document.createElement('tr'); row.dataset.rosterPerson = person.id;
      const item = document.createElement('th'); item.scope = 'row'; item.className = 'studio-roster-card';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-track-key native-control--navigate';
      button.dataset.personId = person.id;
      button.textContent = person.label;
      const saved = document.createElement('span');
      saved.dataset.personSaved = person.id;
      saved.className = 'native-coordination__plate';
      saved.textContent = 'Saved edit';
      saved.hidden = true;
      const team = document.createElement('p');
      team.textContent = memberships.get(person.id).join(' · ') || 'No team assigned';
      const detail = document.createElement('span'); detail.className = 'studio-people-arranger__value';
      detail.textContent = person.rateCentsPerHour === null ? 'Hourly rate needed' : `${wholeMoney(person.rateCentsPerHour)}/hr`;
      const remaining = capacity.get(person.id).remainingMinutes;
      const space = document.createElement('span'); space.className = 'studio-people-arranger__value studio-people-arranger__funding';
      const available = document.createElement('span'), funded = document.createElement('span');
      available.textContent = remaining < 0 ? `${duration(-remaining)} over` : `${duration(remaining)} available`;
      funded.textContent = `/ ${duration(person.fundedMinutes)} funded`;
      space.append(available, document.createTextNode(' '), funded);
      const values = document.createElement('div'); values.className = 'studio-people-arranger__values'; values.append(detail, space);
      const reading = document.createElement('div'); reading.className = 'studio-people-arranger__reading';
      reading.append(team, values); item.append(button, saved, reading);
      const order = document.createElement('div'); order.className = 'studio-person-order native-coordination__actions';
      for (const [action, label, disabled] of [['person-up', 'Move earlier', index === 0], ['person-down', 'Move later', index === next.state.people.length - 1], ['person-remove', 'Remove', false]]) {
        const control = document.createElement('button'); control.type = 'button'; control.textContent = label;
        control.dataset.assemblyAction = action; control.dataset.assemblyId = person.id; control.disabled = disabled;
        control.setAttribute('aria-label', `${label}: ${person.label}`);
        if (action === 'person-remove') control.className = 'native-control--remove';
        order.append(control);
      }
      const more = document.createElement('details'); more.className = 'studio-person-more'; more.open = openCards.has(person.id);
      const moreLabel = document.createElement('summary'); moreLabel.textContent = 'Card actions'; moreLabel.setAttribute('aria-label', `Card actions for ${person.label}`);
      more.append(moreLabel, order); item.append(more);
      appendAssuranceBadges(document, item, support.get(person.id) ?? [], { kind: 'person', id: person.id, label: person.label });
      row.append(item);
      for (const work of next.state.work) {
        const cell = document.createElement('td');
        cell.dataset.workId = work.id; cell.dataset.workStatus = summarizeWorkSessions(work).status;
        cell.append(createParticipationPad(document, { person, work, line: ledger.get(work.id).get(person.id) }));
        row.append(cell);
      }
      body.append(row);
    }
    const addition = document.createElement('tr'), slot = document.createElement('td');
    addition.className = 'studio-roster-add'; slot.colSpan = next.state.work.length + 1; const addSession = createRackAddControl(document, { label: 'Add session', text: 'Session', className: 'studio-rack-create-zone--persistent', dataset: { peopleCreateSession: '' } });
    slot.append(addPerson, addSession); addition.append(slot); body.append(addition);
    const foot = document.createElement('tfoot'), totalRow = document.createElement('tr'), totalLabel = document.createElement('th');
    totalLabel.scope = 'row'; totalLabel.textContent = 'Assigned time · known work value'; totalRow.append(totalLabel);
    for (const work of next.state.work) {
      const total = summarizeWorkCapacity(next, [work.id]);
      const cell = document.createElement('td'), hours = document.createElement('strong'), price = document.createElement('small');
      cell.dataset.workId = work.id; cell.dataset.workStatus = summarizeWorkSessions(work).status;
      hours.textContent = duration(total.personMinutes); price.textContent = `${wholeMoney(total.knownCents)}${total.completeMoney ? '' : ' known'}`;
      cell.append(hours, price); totalRow.append(cell);
    }
    foot.append(totalRow); table.append(foot);
    const empty = document.createElement('p'); empty.className = 'studio-people-arranger__empty';
    empty.textContent = 'Add a session to choose who works together.'; empty.hidden = next.state.work.length > 0;
    elements.roster.replaceChildren(rollup, legend, empty, table);
    elements.empty.hidden = next.state.people.length > 0;
    projection = next;
  }

  function renderSpreadPreview(next, person) {
    if (spreadProjection === next && spreadPersonId === person.id) return;
    const ledger = new Map(next.result.ledger.map(row => [row.workId, row.lines.find(line => line.personId === person.id)]));
    const table = document.createElement('table'); table.className = 'studio-person-spread__table';
    table.style.setProperty('--studio-spread-columns', String(next.state.work.length));
    const caption = document.createElement('caption'); caption.textContent = `${person.label} · Session participation`;
    const head = document.createElement('thead'), headings = document.createElement('tr');
    const body = document.createElement('tbody'), row = document.createElement('tr');
    for (const work of next.state.work) {
      const heading = document.createElement('th'), cell = document.createElement('td');
      heading.scope = 'col'; heading.textContent = work.label;
      for (const entry of [heading, cell]) { entry.dataset.workId = work.id; entry.dataset.workStatus = summarizeWorkSessions(work).status; }
      cell.append(createParticipationPad(document, { person, work, line: ledger.get(work.id) }));
      headings.append(heading); row.append(cell);
    }
    head.append(headings); body.append(row); table.append(caption, head, body);
    spreadPreview.replaceChildren(table); spreadPreview.hidden = next.state.work.length === 0;
    spreadProjection = next; spreadPersonId = person.id;
  }

  function render() {
    const view = editor.read(), epoch = generation;
    if (disposed) return view;
    renderRoster(view.projection);
    root.dataset.teamState = view.status;
    for (const button of elements.roster.querySelectorAll('[data-person-id]')) {
      const expanded = button.dataset.personId === selectedId && elements.configure.open;
      button.setAttribute('aria-pressed', String(expanded)); button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-controls', elements.configure.id);
    }
    const parked = new Set(editing.read().parked.filter(row => row.kind === 'person').map(row => row.targetId));
    for (const marker of elements.roster.querySelectorAll('[data-person-saved]')) marker.hidden = !parked.has(marker.dataset.personSaved);
    elements.configure.hidden = selectedId === null;
    elements.name.textContent = people.get(selectedId)?.label ?? 'Person unavailable';
    localHeader.update({ title: people.get(selectedId)?.label ?? 'Person settings', source: elements.apply });
    elements.fieldset.disabled = !canOpen() || !['editing', 'parked', 'idle'].includes(view.status);
    elements.recovery.hidden = view.status !== 'stale';
    const currentPerson = people.get(selectedId);
    const currentSpread = readPersonSessionSpread(view.projection, selectedId);
    spread.hidden = currentSpread === null;
    if (currentSpread) {
      const selectedWork = new Set(view.projection.state.work.filter(row => readWorkParticipation(row, selectedId).complete).map(row => row.id));
      const matches = SPREAD_PRESETS.filter(([id]) => {
        const count = spreadCount(id, currentSpread.totalPlans);
        return count === currentSpread.selectedPlans && planPersonSessionSpread(view.projection, selectedId, count).command.workIds.every(id => selectedWork.has(id));
      });
      const current = matches.find(([id]) => id === 'all') ?? matches[0];
      spreadCurrent.textContent = currentSpread.totalPlans === 0 ? 'No plans yet' : current?.[1] ?? 'Custom spread';
      renderSpreadPreview(view.projection, currentPerson);
      spreadHint.textContent = currentSpread.pinnedPlans
        ? `${currentSpread.pinnedPlans} ${currentSpread.pinnedPlans === 1 ? 'plan needs' : 'plans need'} this person. Add another participant before reducing further.`
        : currentSpread.totalPlans ? '' : 'Add a plan to choose participation.';
      spreadHint.hidden = spreadHint.textContent === '';
      for (const button of spreadPresets.children) {
        const pinned = spreadCount(button.dataset.personSpreadPreset, currentSpread.totalPlans) < currentSpread.pinnedPlans;
        button.disabled = !canOpen() || view.status === 'stale' || currentSpread.totalPlans === 0 || pinned;
        button.setAttribute('aria-pressed', String(currentSpread.totalPlans > 0 && button.dataset.personSpreadPreset === current?.[0]));
        button.title = pinned ? 'Add another participant to these plans before reducing this spread.' : '';
      }
    }
    summaryPreview.textContent = currentPerson
      ? ` · ${currentPerson.rateCentsPerHour === null ? 'Add an hourly rate' : `${money(currentPerson.rateCentsPerHour)}/hour`} · ${duration(currentPerson.fundedMinutes)} funded${view.draft?.changed ? ' · Unsaved edits' : ''}`
      : ' · Choose a person';
    elements.current.textContent = currentPerson
      ? `Current values: ${currentPerson.rateCentsPerHour === null ? 'hourly rate unknown' : `${money(currentPerson.rateCentsPerHour)}/hour`} · ${duration(currentPerson.fundedMinutes)} funded.`
      : 'This person has been removed. The saved values remain below.';
    elements.apply.setAttribute('aria-disabled', String(!view.draft?.changed));
    const accepted = currentPerson && { label: currentPerson.label, ratePerHour: currentPerson.rateCentsPerHour === null ? '' : (currentPerson.rateCentsPerHour / 100).toFixed(2),
        fundedHours: String(Math.floor(currentPerson.fundedMinutes / CONTRACT.minutesPerHour)), fundedMinutes: String(currentPerson.fundedMinutes % CONTRACT.minutesPerHour) };
    for (const field of FIELDS) {
      const raw = view.draft?.raw[field] ?? accepted?.[field] ?? '';
      if (inputs[field].value !== raw) inputs[field].value = raw;
      const error = view.draft?.errors.find(item => item.path === `draft.${field}`);
      inputs[field].setAttribute('aria-invalid', String(Boolean(error)));
      errors[field].textContent = error ? `${LABELS[field]}: ${error.message}` : '';
    }
    rateControls.refresh();
    let proposed = view.status === 'editing' && view.draft && !composing ? operate('preview', view.draft.token) : null;
    // A sibling role control may own the editing lease. A fresh parked person
    // still has a canonical preview, without taking that lease from its sibling.
    if (view.status === 'parked' && view.draft && currentPerson && !composing) {
      const parsed = preparePersonDraftValues(view.draft.raw);
      if (!parsed.errors.length) proposed = studio.previewPerson(selectedId,
        { ...currentPerson, ...parsed.admitted, label: view.draft.raw.label.trim() }, view.projection);
    }
    if (!owns(epoch)) return editor.read();
    const current = editor.read();
    if (proposed && current.status !== 'editing' && (current.projection !== view.projection || current.draft?.token !== view.draft?.token || current.status !== view.status)) return render();
    elements.total.textContent = proposed?.ok ? money(proposed.projection.result.knownCommitmentCents) : '—';
    const row = proposed?.ok ? proposed.projection.result.capacity.find(item => item.personId === selectedId) : null;
    elements.capacity.textContent = row ? (row.remainingMinutes < 0
      ? `${duration(-row.remainingMinutes)} above funded time`
      : `${duration(row.remainingMinutes)} of funded time available`) : view.status === 'stale'
      ? 'Review the saved values against the current plan.' : 'Check the rate and funded time.';
    if (view.status === 'stale') announce('The plan changed. Review or discard the saved edit.');
    return view;
  }

  function select(personId, focus = true) {
    if (disposed) return;
    rateControls.release();
    const epoch = ++generation, before = boundary();
    onBegin();
    const active = editing.read().active;
    if (!owns(epoch) || studio.read() !== before.projection || editing.read().intent !== before.intent
      || (active && active.token !== before.token)) return;
    const result = operate('begin', personId, studio.read());
    if (!owns(epoch)) return;
    selectedId = editing.read().selected.person;
    if (result.ok) selectionProjection = studio.read();
    render();
    if (!owns(epoch)) return;
    if (selectedId !== null) elements.configure.open = true;
    render();
    rateControls.refresh();
    announce(result.ok ? '' : result.error.message);
    notify(epoch, focus ? () => {
      const destination = editor.read().status === 'stale' ? elements.recovery.querySelector('button') : inputs.ratePerHour;
      if (['editing', 'stale'].includes(editor.read().status)) destination.focus({ preventScroll: true });
      revealStudioDestination(destination);
    } : null);
    return result;
  }

  // Role and participation choices keep this person's editable fields intact.
  // Only an owned acceptance can refresh the retained typed proposal's base.
  function reconcileRoleChange(previous, next) {
    if (disposed || !elements.configure.open || selectionProjection !== previous || studio.read() !== next) return false;
    const before = previous.state.people.find(row => row.id === selectedId);
    const after = next.state.people.find(row => row.id === selectedId);
    if (!before || !after || ['label', 'rateCentsPerHour', 'fundedMinutes', 'lifecycle'].some(field => before[field] !== after[field])) return false;
    const view = editor.read();
    if (editing.read().active !== null || view.draft && view.draft.personId !== selectedId) return false;
    const epoch = ++generation;
    const result = view.draft ? operate('review', view.draft.token, next) : operate('begin', selectedId, next);
    if (!owns(epoch) || !result.ok) return false;
    selectionProjection = next;
    return true;
  }
  function ensurePersonOwner() {
    if (disposed || !elements.configure.open || !canOpen() || selectedId === null) return false;
    const view = editor.read(), active = editing.read().active;
    if (active?.kind === 'person' && view.status === 'editing' && active.targetId === selectedId) return true;
    if (view.status === 'stale') return false;
    return select(selectedId, false)?.ok === true;
  }

  function settle(action) {
    if (disposed) return;
    rateControls.release();
    const view = editor.read();
    if (!view.draft) return;
    if (composing && action === 'apply') { announce('Finish entering the number, then apply.'); return; }
    const epoch = ++generation, result = operate(action, view.draft.token);
    if (!owns(epoch)) return;
    if (!result.ok) {
      render();
      if (!owns(epoch)) return;
      announce(result.error.message);
      const field = FIELDS.find(key => result.error.path === `draft.${key}`);
      if (field) inputs[field].focus();
      return;
    }
    composing = false;
    if (action === 'apply') {
      const begun = operate('begin', selectedId, studio.read());
      if (!owns(epoch)) return;
      if (begun.ok) selectionProjection = studio.read();
      const mark = boundary();
      onAccepted(mark.projection);
      if (!retains(epoch, mark)) return;
      render();
      if (!retains(epoch, mark)) return;
      elements.configure.open = true;
      announce(`Total updated to ${money(mark.projection.result.knownCommitmentCents)}.`);
      focusSubmitControl(elements.apply);
    } else {
      render();
      if (!owns(epoch)) return;
      elements.configure.open = false;
      announce('Changes cancelled.');
      notify(epoch, () => returnAfterClose(epoch));
    }
  }

  function edit(event) {
    if (disposed) return;
    const field = event.target.name;
    if (!Object.hasOwn(inputs, field) || inputs[field] !== event.target) return;
    const epoch = ++generation;
    const view = editor.read();
    if (!view.draft) return;
    const result = operate('setText', view.draft.token, field, event.target.value);
    if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message);
    render();
  }

  function closeLocal() {
    if (disposed) return;
      rateControls.release(); const epoch = ++generation; composing = false;
      if (editing.read().active?.kind === 'person') editing.park();
      elements.configure.open = false; render(); onEditing();
      if (owns(epoch) && onClose() !== true && owns(epoch)) elements.roster.querySelector(`[data-person-id="${selectedId}"]`)?.focus();
  }

  function click(event) {
    if (disposed) return;
    const button = event.target.closest('button');
    if (!button || (!root.contains(button) && !elements.configure.contains(button)) || button.disabled) return;
    if (button.dataset.personSpreadPreset) {
      const total = studio.read().state.work.length;
      setSessionSpread(spreadCount(button.dataset.personSpreadPreset, total)); return;
    }
    if (button.hasAttribute('data-people-create-session')) {
      if (!canOpen()) return;
      rateControls.release(); const epoch = ++generation;
      const result = createRackRecord(studio, editing, 'session');
      if (!owns(epoch)) return;
      if (result.ok) { const mark = boundary(); onAccepted(result.projection); if (!retains(epoch, mark)) return; }
      if (!owns(epoch)) return;
      render(); announce(result.ok ? 'Session added. Choose its people in the arranger.' : result.error.message);
      elements.roster.querySelector('[data-people-create-session]')?.focus({ preventScroll: true });
      return;
    }
    const personId = button.dataset.personId ?? button.dataset.teamPersonId;
    if (personId) {
      if (personId === selectedId && elements.configure.open && root.contains(elements.configure)) closeLocal();
      else select(personId);
      return;
    }
    const action = button.dataset.personAction;
    if (action === 'close') { closeLocal(); return; }
    if (action === 'review' || action === 'use-current' || action === 'discard') {
      const view = editor.read();
      if (!view.draft) return;
      const method = action === 'use-current' ? 'useCurrent' : action === 'discard' ? 'cancel' : 'review';
      const epoch = ++generation, result = operate(method, view.draft.token, projection);
      if (!owns(epoch)) return;
      if (result.ok && method !== 'cancel') selectionProjection = studio.read();
      render();
      if (!owns(epoch)) return;
      announce(result.ok ? '' : result.error.message);
      if (result.ok && action === 'discard') elements.configure.open = false;
      notify(epoch, result.ok ? () => {
        if (action === 'discard') returnAfterClose(epoch);
        else inputs.ratePerHour.focus();
      } : null);
      return;
    }
    if (button.dataset.personAction === 'cancel') { settle('cancel'); return; }
    const field = button.dataset.personField;
    const view = editor.read();
    if (!Object.hasOwn(inputs, field) || !view.draft || composing) return;
    const epoch = ++generation, result = operate('step', view.draft.token, field, Number(button.dataset.step));
    if (!owns(epoch)) return;
    announce(result.ok ? '' : result.error.message);
    render();
  }

  function changeParticipation(event) {
    const control = event.target;
    if (!control.matches('[data-people-participant]') || disposed || !canOpen()) return;
    const workId = control.dataset.peopleWork, personId = control.dataset.peopleParticipant;
    const work = studio.read().state.work.find(row => row.id === workId);
    if (!work || !studio.read().state.people.some(row => row.id === personId)) return;
    const source = spreadPreview.contains(control) ? spreadPreview : elements.roster;
    const previous = studio.read();
    rateControls.release(); let epoch = ++generation;
    const parked = editing.park(); if (!owns(epoch)) return;
    if (!parked.ok) { control.checked = readWorkParticipation(work, personId).complete; announce(parked.error.message); return; }
    const result = studio.applyCommand({ type: 'work.participant.set', workId, personId, included: control.checked }, previous);
    if (!owns(epoch)) return;
    if (result.ok) {
      reconcileRoleChange(previous, result.projection); epoch = generation;
      const mark = boundary(); onAccepted(result.projection); if (!retains(epoch, mark)) return;
      const current = readPersonSessionSpread(result.projection, selectedId);
      if (current) onSpread({ ...current, projection: result.projection });
      if (!retains(epoch, mark)) return;
    }
    else control.checked = readWorkParticipation(work, personId).complete;
    if (!owns(epoch)) return;
    render(); announce(result.ok ? 'Session participation saved.' : result.error.message);
    source.querySelector(`[data-people-work="${workId}"][data-people-participant="${personId}"]`)?.focus({ preventScroll: true });
  }

  function setSessionSpread(count, { gesture = null } = {}) {
    if (disposed || !canOpen() || !elements.configure.open || selectedId === null || editor.read().status === 'stale') return;
    const previous = studio.read(), proposal = planPersonSessionSpread(previous, selectedId, count);
    if (!proposal) return;
    rateControls.release(); let epoch = ++generation;
    const parked = editing.park(); if (!owns(epoch)) return;
    if (!parked.ok) { announce(parked.error.message); return parked; }
    const result = studio.applyCommand(proposal.command, previous, gesture);
    if (!owns(epoch)) return result;
    if (result.ok) {
      reconcileRoleChange(previous, result.projection); epoch = generation;
      const mark = boundary(); onAccepted(result.projection);
      if (!retains(epoch, mark)) return result;
      const current = readPersonSessionSpread(result.projection, selectedId);
      onSpread({ ...current, projection: result.projection });
      if (!retains(epoch, mark)) return result;
    }
    render(); announce(result.ok ? result.projection === previous ? 'Session spread already matches.'
      : 'Session spread saved. Undo is available in the amp controls.' : result.error.message);
    return result;
  }

  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    const active = editing.read().active;
    if (active?.kind === 'person') retiredToken = active.token;
    releaseRetiredLease();
    rateControls.dispose();
    localHeader.dispose(); summaryPreview.remove(); spread.remove();
    personFields.replaceWith(...personFields.childNodes);
    for (const release of cleanup) release();
    cleanup.length = 0;
    if (!sharedEditing) editing.dispose();
    elements.fieldset.disabled = true;
    elements.configure.open = false;
    delete root.dataset.teamReady;
    INSTANCES.delete(root);
  }

  const receiver = Object.freeze({ read: () => editor.read(), refresh: render, reconcileRoleChange, setSessionSpread,
    close: () => { if (!disposed) { rateControls.release(); generation += 1; composing = false; elements.configure.open = false; } },
    select, resume: () => { if (disposed) return; composing = false; if (selectedId !== null && elements.configure.open) select(selectedId, false); else render(); }, dispose });
  try {
    for (const [field, input] of Object.entries(inputs)) input.maxLength = field === 'label' ? LIMITS.label : 32;
    if (!elements.configure.id) elements.configure.id = `${root.id || 'people'}-person-settings`;
    listen(elements.roster, 'change', changeParticipation);
    listen(spreadPreview, 'change', changeParticipation);
    listen(root, 'click', event => { if (!elements.configure.contains(event.target)) click(event); });
    listen(elements.configure, 'click', click);
    listen(elements.form, 'focusin', event => { if (inputs[event.target.name] === event.target) ensurePersonOwner(); });
    const acquirePerson = event => { if (event.target.closest('input,button')) ensurePersonOwner(); };
    elements.form.addEventListener('pointerdown', acquirePerson, true);
    cleanup.push(() => elements.form.removeEventListener('pointerdown', acquirePerson, true));
    listen(elements.form, 'input', edit);
    listen(elements.form, 'submit', event => { event.preventDefault(); settle('apply'); });
    listen(elements.form, 'compositionstart', () => { rateControls.release(); generation += 1; composing = true; render(); });
    listen(elements.form, 'compositionend', event => { composing = false; edit(event); });
    listen(elements.configure.querySelector('summary'), 'click', event => {
      if (!disposed && !elements.configure.open && selectedId !== null && canOpen()) {
        event.preventDefault(); select(selectedId);
      }
    });
    listen(elements.configure, 'toggle', () => {
      if (!elements.configure.open) rateControls.release();
      rateControls.refresh();
      if (!disposed && isActive() && elements.configure.open && editor.read().draft === null && selectedId !== null) select(selectedId);
    });
    render();
    root.dataset.teamReady = 'true';
    INSTANCES.set(root, receiver);
    return receiver;
  } catch (error) { dispose(); throw error; }
}
