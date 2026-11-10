import { PlanError } from './contract.mjs';
import { listCoordinationTemplates, prepareCoordinationReplacement, applyCoordinationTemplate, isGeneratedArrangementRecord } from './connection-templates.mjs';
import { prepareWorkDraftValues } from './draft.mjs';
import { money } from './display.mjs';
import { createArrangementReading } from './connection-view.mjs';
import { getCoordinationTemplate, projectCoordinationArrangements } from './coordination-arrangements.mjs';
import { createReel, revealReelResult, animateRackChange } from './reel-control.mjs';
import { mountSharedSessionRack } from './shared-session-rack.mjs';
import { createDeliveryBoard } from './delivery-board.mjs';
import { syncReorderButtons, mountRackHeader } from './rack-controls.mjs';
import { workDefaultsTarget } from './navigation-policy.mjs';

const INSTANCES = new WeakMap();
const TEMPLATES = listCoordinationTemplates();
const BY_ID = new Map(TEMPLATES.map(row => [row.id, row]));
const sameAcceptance = (a, b) => a.instance === b.instance && a.token === b.token;
let nextInstance = 0;

// One arrangement identity belongs to this receiver. Preset choices settle
// through the accepted owner; record edits use the canonical in-rack editors.
export function mountConnectionTemplatePanel(root, { studio, editing, onBegin = () => {}, onEditing = () => {},
  onViewChanged = () => {}, onAccepted = () => {}, onNavigate = () => {}, isActive = () => true, canOpen = isActive }) {
  const panel = root.matches('[data-connection-templates]') ? root : root.querySelector('[data-connection-templates]');
  if (!panel) throw new TypeError('Supply the coordination template panel.');
  if (INSTANCES.has(panel)) return INSTANCES.get(panel);
  if (!studio || !['read', 'readAcceptance', 'replace'].every(key => typeof studio[key] === 'function')
      || !editing || !['read', 'park'].every(key => typeof editing[key] === 'function')
      || ![onBegin, onEditing, onAccepted, isActive, canOpen].every(callback => typeof callback === 'function')) {
    throw new TypeError('Supply the Studio, its draft coordinator and receiver callbacks.');
  }
  const document = panel.ownerDocument, body = panel.querySelector('[data-connection-template-body]');
  const disclosure = panel.tagName === 'DETAILS';
  const exposed = !disclosure || panel.hasAttribute('data-template-exposed');
  const status = panel.querySelector('[data-connection-template-status]'), summary = panel.querySelector('summary');
  if (!body || !status || disclosure && !summary) throw new TypeError('Supply the complete coordination template panel.');
  const instance = `connection-template-${++nextInstance}`, cleanup = [];
  let disposed = false, acknowledged = false, generation = 0, rawRevision = 0, configuration, proposal = null;
  let arrangementId = null, dirty = false, committing = false, undoProjection = null;
  let projection = studio.read();
  const deliveryView = { phaseId: null, overviewScroll: 0, returnPhase: null, placements: { team: new Map(), connection: new Map() } };
  let selectedTeamId = null, memberOrder = [], previousMemberIds = null, teamReturnKey = null, teamReturnPhase = null, teamReturn = null;
  const configurations = new Map();
  const form = document.createElement('div'); form.className = 'native-connection-template__form';
  const choice = document.createElement('select'); choice.dataset.templateChoice = '';
  for (const template of TEMPLATES) choice.append(option(template.id, template.label));
  const choiceLabel = document.createElement('label'); choiceLabel.textContent = 'Arrangement'; choiceLabel.append(choice);
  const description = document.createElement('p'); description.className = 'native-coordination__hint';
  const structure = document.createElement('div'); structure.dataset.templateStructure = '';
  const delivery = document.createElement('section'); delivery.className = 'studio-team-rack'; delivery.dataset.templateRack = '';
  const rackHeading = element('header', undefined, 'studio-team-rack__heading');
  const rackTitle = element('h4', 'Teams and shared work'); rackTitle.id = `${instance}-rack-title`;
  delivery.setAttribute('aria-labelledby', rackTitle.id);
  const readout = element('dl', undefined, 'studio-rack-amount');
  const amountLabel = element('dt', 'Included work');
  const amount = element('output'); amount.dataset.templateTotal = '';
  const amountValue = element('dd'); amountValue.append(amount); readout.append(amountLabel, amountValue);
  rackHeading.append(rackTitle, readout);
  const rackBody = element('div', undefined, 'studio-team-rack__body');
  const boardSlot = element('div'); boardSlot.dataset.teamRackBoard = '';
  const editorSlot = element('div'); editorSlot.dataset.teamRackEditor = '';
  const teamEditor = element('section', undefined, 'studio-team-rack__record'); teamEditor.dataset.teamRackRecord = '';
  const teamHeader = mountRackHeader(teamEditor, { title: 'Team settings', owner: 'Delivery overview',
    id: `${instance}-team-title`, onClose: closeTeam });
  const teamBack = teamHeader.parent; teamBack.dataset.templateAction = 'team-back';
  teamEditor.setAttribute('aria-labelledby', teamHeader.title.id);
  const teamFields = element('div', undefined, 'studio-team-rack__record-fields');
  let teamFieldsSignature = null;
  teamEditor.append(teamFields);
  rackBody.append(boardSlot, editorSlot);
  delivery.append(rackHeading, rackBody);
  const shared = mountSharedSessionRack(rackBody, {
    onCommand(command, message) {
      return active(canOpen) && (active() || open()) && directCommand(command, message);
    },
    onNavigate: navigate,
    onCreate: (kind, context, source) => navigate({ kind: `create-${kind}`, ...context }, source),
    onCloseEditor() { if (shared.editorSlot.querySelector('.studio-rack-editor:not([hidden])'))
      shared.editorSlot.querySelector('[data-rack-editor-close]')?.click(); },
  });
  const reel = createReel(document, { label: 'Team arrangement', choices: TEMPLATES, value: TEMPLATES[0].id,
    onSelect(id) {
      if (!active(canOpen) || (!active() && !open())) return;
      selectArrangement(id);
      revealReelResult(structure); revealReelResult(delivery);
    } });
  const arrangementDeck = document.createElement('div'); arrangementDeck.className = 'studio-arrangement-deck';
  arrangementDeck.append(reel.element, structure);
  choiceLabel.className = 'studio-arrangement-native-choice';
  const previewRegion = document.createElement('section'); previewRegion.className = 'native-coordination__preview native-connection-template__preview';
  previewRegion.dataset.templatePreview = ''; previewRegion.hidden = true; previewRegion.setAttribute('aria-label', 'Arrangement preview');
  const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
  const applyButton = button('Apply arrangement', 'apply'); applyButton.className = 'native-control--confirm';
  const cancelButton = button('Keep current arrangement', 'cancel'); cancelButton.className = 'native-control--cancel';
  const undoButton = button('Undo arrangement', 'undo'); undoButton.className = 'native-control--cancel'; undoButton.hidden = true;
  const preserveButton = button('Keep shared records and use this arrangement', 'preserve'); preserveButton.className = 'native-control--confirm'; preserveButton.hidden = true;
  actions.append(undoButton, applyButton, preserveButton, cancelButton);
  form.append(choiceLabel, arrangementDeck, description, delivery, actions, previewRegion); body.replaceChildren(form);
  function option(value, label) { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; }
  function element(tag, text, className) {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  }
  function button(text, action) { const node = element('button', text); node.type = 'button'; node.dataset.templateAction = action; return node; }
  function listen(target, type, handler) { target.addEventListener(type, handler); cleanup.push(() => target.removeEventListener(type, handler)); }
  function owns(epoch) { return !disposed && epoch === generation; }
  function active(gate = isActive) { return !disposed && gate() && !disposed; }
  function announce(text) { if (!disposed) status.textContent = text; }
  function currentArrangement() {
    return projectCoordinationArrangements(projection.state).arrangements.find(row => row.id === arrangementId);
  }
  function acceptedReadout() {
    const arrangement = currentArrangement();
    const linked = new Set(arrangement ? arrangement.connections.flatMap(row => row.connection.workIds)
      : configuration.connections.flatMap(row => row.workIds));
    const lines = projection.result.ledger.filter(row => linked.has(row.workId)).flatMap(row => row.lines);
    amountLabel.textContent = lines.some(row => row.cents === null) ? 'Known included work' : 'Included work';
    amount.textContent = money(lines.reduce((total, row) => total + (row.cents ?? 0), 0));
    undoButton.hidden = undoProjection !== projection || !studio.readHistory?.().undoCount;
  }
  function retirePreview() {
    proposal = null; previewRegion.hidden = true; previewRegion.replaceChildren();
    applyButton.hidden = true; preserveButton.hidden = true; cancelButton.hidden = true;
    for (const element of [choiceLabel, description, arrangementDeck]) element.hidden = false;
    acceptedReadout();
  }
  function touch() { rawRevision += 1; generation += 1; dirty = true; retirePreview(); announce(''); }
  function fresh(preview) {
    if (disposed || !preview || preview.revision !== rawRevision) return false;
    const current = studio.read(), acceptance = studio.readAcceptance(), drafts = editing.read();
    return !disposed && preview.revision === rawRevision && preview.base === current
      && sameAcceptance(preview.acceptance, acceptance) && preview.intent === drafts.intent
      && !drafts.disposed && drafts.active === null;
  }
  function nextPrefix(template, state) {
    const teams = new Set(state.teams.map(row => row.id)), connections = new Set(state.connections.map(row => row.id)), work = new Set(state.work.map(row => row.id));
    const arrangements = new Set(state.arrangements.map(row => row.id));
    // Each occupied prefix consumes at least one of these finitely many IDs.
    for (let number = 1; number <= teams.size + connections.size + work.size + arrangements.size + 1; number += 1) {
      const prefix = `arrangement-${number}`;
      if (!arrangements.has(prefix) && !template.teams.some(slot => teams.has(`${prefix}-team-${slot.id}`))
          && !template.connections.some(slot => connections.has(`${prefix}-connection-${slot.id}`) || work.has(`${prefix}-recovery-${slot.id}`))) return prefix;
    }
    throw new TypeError('The finite arrangement identity range was exhausted.');
  }
  function startingConfiguration(template) {
    const people = projection.state.people;
    const teams = template.teams.map((slot, index) => {
      const assigned = people.filter((row, position) => position % template.teams.length === index).map(row => row.id);
      return { slotId: slot.id, selection: 'new', label: slot.label, personIds: assigned.length ? assigned : people.slice(0, 1).map(row => row.id) };
    });
    return { templateId: template.id, proposalId: arrangementId ?? nextPrefix(template, projection.state),
      teams,
      connections: template.connections.map(slot => ({ slotId: slot.id, receiverPersonId: teams.find(team => team.slotId === slot.receiverSlotId).personIds[0] ?? '',
        sharedObject: slot.sharedObject ?? 'Working plan', responseExpectation: slot.responseExpectation ?? '',
        workIds: projection.state.work.length ? [projection.state.work[0].id] : [], status: 'active', recoveryEnabled: Boolean(slot.sessionLabel && people.length),
        recovery: { label: slot.sessionLabel ?? 'Review the handoff', team: `slot:${slot.receiverSlotId}`,
          personIds: teams.find(team => team.slotId === slot.receiverSlotId).personIds.slice(), hoursPerSession: '0', minutesPerSession: '30',
          occurrences: '1', funding: 'additional', status: 'planned', timing: null, lifecycle: 'active' } })),
    };
  }
  function acceptedConfiguration(row) {
    const template = BY_ID.get(row.templateId), config = startingConfiguration(template);
    config.proposalId = row.id;
    const teams = new Map(projection.state.teams.map(team => [team.id, team]));
    const connections = new Map(projection.state.connections.map(edge => [edge.id, edge]));
    const work = new Map(projection.state.work.map(session => [session.id, session]));
    config.teams = row.teamBindings.map(binding => {
      const team = teams.get(binding.teamId);
      return { slotId: binding.slotId, selection: isGeneratedArrangementRecord(row.id, 'team', binding.slotId, team.id) ? 'new' : `team:${team.id}`,
        acceptedId: team.id, label: team.label, personIds: [...team.personIds] };
    });
    config.connections = row.connectionBindings.map(binding => {
      const edge = connections.get(binding.connectionId), defaults = config.connections.find(item => item.slotId === binding.slotId);
      const recovery = edge.workIds.map(id => work.get(id)).find(session => isGeneratedArrangementRecord(row.id, 'recovery', binding.slotId, session.id));
      const teamSlot = recovery && row.teamBindings.find(item => item.teamId === recovery.teamId);
      return { ...defaults, receiverPersonId: edge.receiverPersonId ?? '', sharedObject: edge.sharedObject,
        responseExpectation: edge.responseExpectation ?? '', workIds: edge.workIds.filter(id => id !== recovery?.id), status: edge.status,
        recoveryEnabled: Boolean(recovery), recovery: recovery ? { label: recovery.label,
          team: teamSlot ? `slot:${teamSlot.slotId}` : `team:${recovery.teamId}`, personIds: [...recovery.personIds],
          hoursPerSession: String(Math.floor(recovery.minutesPerOccurrence / 60)), minutesPerSession: String(recovery.minutesPerOccurrence % 60),
          occurrences: String(recovery.occurrences), funding: recovery.funding, status: recovery.status, timing: recovery.timing, lifecycle: recovery.lifecycle } : defaults.recovery };
    });
    return config;
  }
  function receiveAccepted() {
    let row = projection.state.arrangements.find(item => item.id === arrangementId);
    if (!row && !dirty) row = projection.state.arrangements[0];
    if (row) {
      arrangementId = row.id; configuration = acceptedConfiguration(row);
      configurations.set(configuration.templateId, configuration);
    } else {
      arrangementId = null;
      configuration = startingConfiguration(BY_ID.get(configuration?.templateId) ?? TEMPLATES[0]);
    }
    dirty = false;
  }
  function teamId(row) { return row.selection === 'new' ? row.acceptedId ?? `${configuration.proposalId}-team-${row.slotId}` : row.selection.slice(5); }
  function teamLabel(row) {
    return row.selection === 'new' ? row.label : projection.state.teams.find(team => team.id === row.selection.slice(5))?.label ?? `${row.selection.slice(5)} · removed team`;
  }
  function directCommand(command, message) {
    if (!active()) return false;
    const epoch = ++generation;
    const parked = editing.park();
    if (!owns(epoch)) return false;
    if (!parked.ok) { announce(parked.error.message); return false; }
    const result = studio.applyCommand(command, studio.read());
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    refresh(true); onAccepted(result.projection);
    if (owns(epoch)) { announce(message); if (selectedTeamId) teamHeader.update({ title: projection.state.teams.find(row => row.id === selectedTeamId)?.label ?? 'Team settings', owner: teamReturn ? 'Handoff settings' : 'Delivery overview', saved: 'Saved' }); }
    return true;
  }
  function renderTeam() {
    const team = projection.state.teams.find(row => row.id === selectedTeamId);
    if (!team) { selectedTeamId = null; return false; }
    teamHeader.update({ title: team.label, owner: teamReturn ? 'Handoff settings' : 'Delivery overview', saved: 'Saved' });
    const signature = JSON.stringify([team.id, team.personIds, projection.state.people.map(person => [person.id, person.label])]);
    if (signature === teamFieldsSignature) {
      teamFields.querySelector('[data-team-rack-name]').value = team.label;
      return true;
    }
    teamFieldsSignature = signature;
    const label = element('label', 'Team name');
    const name = element('input'); name.value = team.label; name.dataset.teamRackName = '';
    name.addEventListener('input', () => teamHeader.update({ title: team.label, owner: teamReturn ? 'Handoff settings' : 'Delivery overview', saved: 'Editing name' }));
    name.addEventListener('change', () => {
      const current = studio.read().state.teams.find(row => row.id === team.id);
      if (current && !directCommand({ type: 'team.update', teamId: team.id,
        team: { ...current, label: name.value.trim() } }, 'Team name updated. Undo is available.'))
        teamHeader.update({ title: team.label, owner: teamReturn ? 'Handoff settings' : 'Delivery overview', saved: 'Check team name' });
    });
    label.append(name);
    const members = element('fieldset', undefined, 'studio-team-members');
    members.append(element('legend', 'People in this team'));
    const people = new Map(projection.state.people.map(person => [person.id, person]));
    memberOrder = memberOrder.filter(id => people.has(id));
    for (const id of people.keys()) if (!memberOrder.includes(id)) memberOrder.push(id);
    const included = new Set(team.personIds), previous = new Set(previousMemberIds ?? []);
    const retainedBefore = previousMemberIds?.filter(id => included.has(id));
    const retainedNow = team.personIds.filter(id => previous.has(id));
    // Inclusion leaves every card in place. Accepted ordering changes, including
    // Undo, reorder the included slots while available cards keep their positions.
    if (!retainedBefore || retainedBefore.some((id, index) => id !== retainedNow[index])) {
      let position = 0;
      memberOrder = memberOrder.map(id => included.has(id) ? team.personIds[position++] : id);
    }
    previousMemberIds = [...team.personIds];
    const positions = new Map(team.personIds.map((id, index) => [id, index]));
    for (const id of memberOrder) {
      const person = people.get(id), index = positions.get(id);
      const row = element('div', undefined, 'studio-team-member'); row.dataset.teamMemberRow = id;
      row.dataset.selected = String(index !== undefined);
      const choose = element('label'), checkbox = element('input'); checkbox.type = 'checkbox';
      checkbox.checked = index !== undefined; checkbox.dataset.teamRackMember = id;
      const words = element('span');
      words.append(element('strong', person.label), element('small', index === undefined ? 'Available' : `Included · ${index + 1}`));
      choose.append(checkbox, words);
      checkbox.addEventListener('change', () => {
        const ids = checkbox.checked ? [...team.personIds, id] : team.personIds.filter(member => member !== id);
        if (directCommand({ type: 'team.members.replace', teamId: team.id, personIds: ids }, 'Team updated. Undo is available.'))
          teamFields.querySelector(`[data-team-rack-member="${id}"]`)?.focus({ preventScroll: true });
      });
      const actions = element('div', undefined, 'native-coordination__actions native-coordination__manipulation');
      const up = element('button', 'Move up'), down = element('button', 'Move down');
      up.type = down.type = 'button'; up.dataset.teamMemberMove = 'up'; down.dataset.teamMemberMove = 'down';
      syncReorderButtons(up, down, { label: `${person.label} in the team`, index, count: team.personIds.length });
      for (const [control, direction] of [[up, -1], [down, 1]]) control.addEventListener('click', () => {
        const ids = [...team.personIds], destination = index + direction;
        if (index === undefined || destination < 0 || destination >= ids.length) return;
        [ids[index], ids[destination]] = [ids[destination], ids[index]];
        animateRackChange(teamFields, () => {
          directCommand({ type: 'team.members.replace', teamId: team.id, personIds: ids }, 'Team order updated. Undo is available.');
          teamFields.querySelector(`[data-team-rack-member="${id}"]`)?.focus({ preventScroll: true });
        }, { selector: '[data-team-member-row]', key: 'teamMemberRow' });
      });
      actions.append(up, down); row.append(choose, actions); members.append(row);
    }
    teamFields.replaceChildren(label, members);
    return true;
  }
  function openTeam(id, source, { onReturn = null, returnLabel = '← Delivery overview' } = {}) {
    if (!studio.read().state.teams.some(team => team.id === id) || !open()) return false;
    if (selectedTeamId !== id) { memberOrder = []; previousMemberIds = null; teamFieldsSignature = null; }
    selectedTeamId = id; teamReturnKey = source?.dataset.studioEntryKey ?? teamReturnKey;
    teamReturnPhase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase ?? null;
    teamReturn = onReturn; teamBack.textContent = returnLabel;
    setEditorOpen(false); renderStructure();
    teamBack.focus({ preventScroll: true });
    return true;
  }
  function setEditorOpen(opened) { delivery.dataset.editorOpen = String(opened); }
  function closeTeam() {
    const returnToOrigin = teamReturn; teamReturn = null;
    selectedTeamId = null; renderStructure();
    if (returnToOrigin) { returnToOrigin(); return; }
    const source = [...panel.querySelectorAll('[data-studio-entry-key]')]
      .find(node => node.dataset.studioEntryKey === teamReturnKey
        && (node.closest('[data-delivery-phase]')?.dataset.deliveryPhase ?? null) === teamReturnPhase);
    (source ?? panel.querySelector('[data-delivery-open]'))?.focus({ preventScroll: true });
  }
  function renderStructure() {
    const focused = document.activeElement;
    const focusKey = ['deliveryOpen', 'deliveryOverview', 'deliverySession', 'deliveryConnection', 'deliveryPerson']
      .find(key => focused && Object.hasOwn(focused.dataset ?? {}, key));
    const focusValue = focusKey ? focused.dataset[focusKey] : null;
    const focusPhase = focused?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
    const template = BY_ID.get(configuration.templateId);
    const teams = configuration.teams.map(row => ({ slotId: row.slotId, slotLabel: template.teams.find(slot => slot.id === row.slotId).label,
      team: { id: `proposal-slot-${row.slotId}`, label: teamLabel(row).trim() || 'Team name to choose', personIds: row.personIds } }));
    const connections = template.connections.map(slot => {
      const row = configuration.connections.find(row => row.slotId === slot.id);
      return { slotId: slot.id, slotLabel: slot.label, adapted: false,
        connection: { id: `proposal-edge-${slot.id}`, senderTeamId: `proposal-slot-${slot.senderSlotId}`, receiverTeamId: `proposal-slot-${slot.receiverSlotId}`,
          sharedObject: row.sharedObject, status: row.status, workIds: row.workIds } };
    });
    const exampleArrangement = { id: configuration.proposalId, templateId: template.id, templateVersion: template.version, label: template.label, purpose: template.description, adapted: false, teams, connections };
    const proposedWork = configuration.connections.filter(row => row.recoveryEnabled).flatMap(row => {
      const parsed = prepareWorkDraftValues(row.recovery); if (parsed.errors.length) return [];
      return [{ id: `proposal-session-${row.slotId}`, label: row.recovery.label,
        teamId: row.recovery.team.startsWith('slot:') ? `proposal-slot-${row.recovery.team.slice(5)}` : row.recovery.team.slice(5),
        personIds: row.recovery.personIds, ...parsed.admitted, funding: row.recovery.funding, status: row.recovery.status }];
    });
    const proposedIds = new Set(proposedWork.map(row => row.id));
    for (const row of connections) {
      const workId = `proposal-session-${row.slotId}`;
      if (proposedIds.has(workId)) row.connection.workIds = [...row.connection.workIds, workId];
    }
    const examplePlan = { ...projection.state, teams: [...projection.state.teams, ...teams.map(row => row.team)], work: [...projection.state.work, ...proposedWork] };
    const accepted = currentArrangement();
    const arrangement = accepted ?? exampleArrangement, previewPlan = accepted ? projection.state : examplePlan;
    // A new custom record remains visible without claiming a template slot.
    const groupedTeams = new Set(projection.state.arrangements.flatMap(row => row.teamBindings.map(binding => binding.teamId)));
    const groupedConnections = new Set(projection.state.arrangements.flatMap(row => row.connectionBindings.map(binding => binding.connectionId)));
    const rackArrangement = { ...arrangement,
      teams: [...arrangement.teams, ...projection.state.teams.filter(team => !groupedTeams.has(team.id))
        .map(team => ({ slotId: `custom-team:${team.id}`, slotLabel: team.label, team }))],
      connections: [...arrangement.connections, ...projection.state.connections.filter(connection => !groupedConnections.has(connection.id))
        .map(connection => ({ slotId: `custom-connection:${connection.id}`, slotLabel: connection.sharedObject, connection }))] };
    function acceptedSource(kind, id, source) {
      const phase = source?.closest('[data-delivery-phase]')?.dataset.deliveryPhase;
      const candidates = [...rackBody.querySelectorAll(kind === 'work' ? '[data-studio-session-id]' : '[data-studio-record-kind]')]
        .filter(node => kind === 'work' ? node.dataset.studioSessionId === id
          : node.dataset.studioRecordKind === kind && node.dataset.studioRecordId === id);
      return candidates.find(node => node.closest('[data-delivery-phase]')?.dataset.deliveryPhase === phase) ?? candidates[0] ?? source;
    }
    function acceptStarter() {
      if (!active(canOpen) || (!active() && !open())) return false;
      return commit();
    }
    function inspectTemplate(target, source) {
      if (!active(canOpen)) return;
      if (target.kind === 'team') { openTeam(target.id, source); return; }
      if (['person', 'connection'].includes(target.kind)) { navigate(target, source); return; }
      const kind = target.kind === 'template-team' ? 'team' : 'connection';
      if (!accepted && !acceptStarter()) return;
      const row = currentArrangement();
      const id = kind === 'team' ? row?.teams.find(binding => binding.slotId === target.id)?.team.id
        : row?.connections.find(binding => binding.slotId === target.id)?.connection.id;
      if (id) {
        const acceptedControl = acceptedSource(kind, id, source);
        if (kind === 'team') openTeam(id, acceptedControl);
        else navigate({ kind, id }, acceptedControl);
      }
    }
    const inspectSession = (target, source) => {
      const { id } = target;
      const proposed = configuration.connections.find(row => `proposal-session-${row.slotId}` === id);
      if (proposed) {
        const slotId = proposed.slotId;
        if (!acceptStarter()) return;
        const row = currentArrangement();
        const edge = row?.connections.find(binding => binding.slotId === slotId)?.connection;
        const workId = edge?.workIds.find(workId => isGeneratedArrangementRecord(row.id, 'recovery', slotId, workId));
        if (workId) navigate(workDefaultsTarget(workId), acceptedSource('work', workId, source));
      } else navigate(target, source);
    };
    const acceptedSessionIds = new Set(projection.state.work.map(work => work.id));
    structure.replaceChildren(createArrangementReading(document, { arrangement, plan: previewPlan, reading: accepted ? 'accepted' : 'example', onNavigate: inspectTemplate, includeTeamLanes: false, includeConnections: false }));
    const board = createDeliveryBoard(document, { arrangement: rackArrangement, plan: previewPlan, acceptedSessionIds,
      acceptedTeamIds: new Set(projection.state.teams.map(team => team.id)),
      acceptedConnectionIds: new Set(projection.state.connections.map(connection => connection.id)),
      onNavigate: inspectTemplate, onSession: inspectSession, viewState: deliveryView,
      onAdd(kind, deliveryPhase, source) { navigate({ kind: `create-${kind}`, deliveryPhase }, source); } });
    const nextBoard = renderTeam() ? teamEditor : board;
    if (boardSlot.firstElementChild !== nextBoard) boardSlot.replaceChildren(nextBoard);
    shared.update(projection.state);
    const boardScroller = rackBody.querySelector('.studio-delivery__board');
    if (boardScroller && deliveryView.phaseId === null) boardScroller.scrollLeft = deliveryView.overviewScroll;
    if (boardScroller && focusKey) {
      const target = [...rackBody.querySelectorAll('button')].find(node => node.dataset[focusKey] === focusValue
        && (!focusPhase || node.closest('[data-delivery-phase]')?.dataset.deliveryPhase === focusPhase));
      if (target) {
        const bounds = boardScroller.getBoundingClientRect(), key = target.getBoundingClientRect();
        if (key.left < bounds.left) boardScroller.scrollLeft += key.left - bounds.left;
        else if (key.right > bounds.right) boardScroller.scrollLeft += key.right - bounds.right;
        if (deliveryView.phaseId === null) deliveryView.overviewScroll = boardScroller.scrollLeft;
        target.focus({ preventScroll: true });
      }
    }
    onViewChanged();
  }
  function refresh(rebuild = false) {
    if (disposed) return;
    const next = studio.read(), changed = next !== projection;
    projection = next;
    if (changed && !dirty && !committing) { receiveAccepted(); build(); return; }
    acceptedReadout();
    if (changed || rebuild) renderStructure();
    if (proposal && !fresh(proposal)) {
      retirePreview(); announce('The plan changed. Choose the arrangement again.');
    }
  }
  function build() {
    const template = BY_ID.get(configuration.templateId);
    choice.value = template.id; reel.select(template.id); description.textContent = template.description;
    refresh(true);
  }
  function request() {
    const template = BY_ID.get(configuration.templateId);
    const teams = configuration.teams.map(row => row.selection === 'new'
      ? { slotId: row.slotId, kind: 'new', label: row.label, personIds: [...row.personIds] }
      : { slotId: row.slotId, kind: 'existing', teamId: row.selection.slice(5), addPersonIds: [...row.personIds] });
    const connections = configuration.connections.map(row => {
      let recoveryWork = null;
      if (row.recoveryEnabled) {
        const parsed = prepareWorkDraftValues(row.recovery);
        if (parsed.errors.length) {
          throw new PlanError('fields', 'template', 'Correct the session duration or count.');
        }
        const selectedTeam = row.recovery.team.startsWith('slot:')
          ? teamId(configuration.teams.find(team => team.slotId === row.recovery.team.slice(5))) : row.recovery.team.slice(5);
        recoveryWork = { label: row.recovery.label, teamId: selectedTeam, personIds: [...row.recovery.personIds], ...parsed.admitted,
          funding: row.recovery.funding, status: row.recovery.status, timing: row.recovery.timing, lifecycle: row.recovery.lifecycle };
      }
      return { slotId: row.slotId, receiverPersonId: row.receiverPersonId || null, sharedObject: row.sharedObject,
        responseExpectation: row.responseExpectation.trim() || null, workIds: [...row.workIds], status: row.status, recoveryWork };
    });
    return { templateId: template.id, version: template.version, proposalId: configuration.proposalId, teams, connections };
  }
  function parkAndNotify(epoch) {
    const result = editing.park(); if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    onBegin(); if (!owns(epoch)) return false;
    onEditing(); return owns(epoch);
  }
  function settleText() { return true; }
  function navigate(target, source) {
    if (!disposed) onNavigate(target, source);
  }
  function selectArrangement(id) {
    if (!BY_ID.has(id)) return;
    if (id === configuration.templateId && currentArrangement() && !dirty) return;
    if (!active(canOpen) || (!active() && !open())) return;
    configurations.set(configuration.templateId, configuration);
    selectedTeamId = null;
    touch(); projection = studio.read();
    configuration = configurations.get(id) ?? startingConfiguration(BY_ID.get(id));
    configuration.proposalId = arrangementId ?? configuration.proposalId;
    build(); commit();
  }
  function commit({ preserveShared = false } = {}) {
    if (committing || !active()) return false;
    const epoch = ++generation; retirePreview(); committing = true;
    try {
      if (!parkAndNotify(epoch)) return false;
      refresh();
      const base = studio.read(), acceptance = studio.readAcceptance(), draft = editing.read(), revision = rawRevision;
      const prepared = prepareCoordinationReplacement(base, request(), { preserveShared });
      const candidate = { prepared, base, acceptance, intent: draft.intent, revision };
      if (!owns(epoch) || !fresh(candidate)) return false;
      const result = applyCoordinationTemplate(studio, prepared);
      if (!owns(epoch)) return false;
      if (!result.ok) { announce(result.error.message); return false; }
      const changed = result.projection !== base;
      arrangementId = configuration.proposalId;
      projection = result.projection;
      if (changed) undoProjection = result.projection;
      receiveAccepted(); build();
      const intent = editing.read().intent;
      if (changed) onAccepted(result.projection);
      if (!owns(epoch) || studio.read() !== result.projection || editing.read().intent !== intent) return true;
      announce(changed ? `${BY_ID.get(configuration.templateId).label} arrangement updated. Undo is available.` : 'Arrangement is current.');
      return true;
    } catch (error) {
      if (!owns(epoch)) return false;
      if (!(error instanceof PlanError)) throw error;
      if (error.code === 'retained-record-choice') {
        proposal = { base: studio.read(), acceptance: studio.readAcceptance(), intent: editing.read().intent, revision: rawRevision };
        previewRegion.replaceChildren(element('p', 'Some arrangement records support other work. Keep those records and use separate records for this choice?'));
        previewRegion.hidden = false; preserveButton.hidden = false; cancelButton.hidden = false;
      }
      announce(error.message); return false;
    } finally { committing = false; }
  }
  function apply() {
    if (!active() || !proposal?.command) return false;
    const epoch = ++generation, held = proposal;
    if (!fresh(held)) { announce('The plan changed. Open this grouping again.'); return false; }
    const result = studio.applyCommand(held.command, held.base);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    dirty = false; retirePreview(); refresh(); onAccepted(result.projection);
    if (owns(epoch)) announce('Grouping removed. Teams, connections and sessions remain.');
    return true;
  }
  function undo() {
    if (!active() || undoProjection !== studio.read()) return false;
    const epoch = ++generation;
    if (!parkAndNotify(epoch)) return false;
    const result = studio.undo(undoProjection);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    undoProjection = null; dirty = false; retirePreview(); refresh(); onAccepted(result.projection);
    if (owns(epoch)) announce('Previous arrangement restored.');
    return true;
  }
  function detach(id) {
    if (!open()) return false;
    const epoch = ++generation; retirePreview();
    const base = studio.read(), row = base.state.arrangements.find(row => row.id === id);
    if (!row) { announce('Choose an arrangement still present in this plan.'); return false; }
    const command = { type: 'arrangement.remove', arrangementId: id }, result = studio.previewCommand(command, base);
    if (!owns(epoch)) return false;
    if (!result.ok) { announce(result.error.message); return false; }
    const candidate = { command, base, acceptance: studio.readAcceptance(), intent: editing.read().intent, revision: rawRevision };
    if (!fresh(candidate)) return false;
    proposal = candidate;
    for (const element of [choiceLabel, description, arrangementDeck]) element.hidden = true;
    applyButton.hidden = false; cancelButton.hidden = false;
    applyButton.textContent = 'Use connections without template';
    const template = getCoordinationTemplate(row.templateId, row.templateVersion);
    previewRegion.replaceChildren(element('h4', `Use ${template.label} connections without the template?`),
      element('p', 'Apply removes this arrangement’s grouping identity. Its teams, current connections and working sessions remain available, with the same accepted investment.'),
      element('p', `Accepted investment stays ${money(base.result.knownCommitmentCents)}${base.result.plannedCommitmentCents === null ? ' known; complete total unavailable' : ''}.`));
    previewRegion.hidden = false; applyButton.setAttribute('aria-disabled', 'false'); applyButton.focus(); return true;
  }
  function open() {
    if (!active(canOpen)) return false;
    const epoch = ++generation;
    if (!parkAndNotify(epoch)) return false;
    acknowledged = true; if (disclosure) panel.open = true; refresh(); return true;
  }
  function close() {
    if (disposed) return;
    generation += 1; acknowledged = false; if (disclosure && !exposed) panel.open = false;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1; proposal = null; configuration = null;
    cleanup.forEach(remove => remove()); reel.dispose(); shared.dispose(); teamHeader.dispose();
    body.replaceChildren(); status.textContent = ''; if (disclosure) panel.open = false; panel.hidden = true; INSTANCES.delete(panel);
  }
  if (disclosure) listen(panel, 'toggle', () => {
    if (disposed || exposed) return;
    if (panel.open && !acknowledged) { if (!open() && !disposed) panel.open = false; }
    else if (!panel.open) acknowledged = false;
  });
  listen(form, 'focusin', event => {
    // Browsing the rack (including WebKit's scroll-region focus) keeps the
    // current record owner until an explicit rack action selects another one.
    if (event.target.closest('[data-template-rack], [data-studio-record-kind], [data-studio-session-id]')) return;
    if (exposed && !active() && active(canOpen)) open();
  });
  listen(choice, 'change', () => selectArrangement(choice.value));
  listen(form, 'click', event => {
    const target = event.target.closest('[data-template-action]');
    if (!target || !form.contains(target) || !active(canOpen) || (!active() && !open())) return;
    event.preventDefault(); event.stopPropagation();
    const focusedAt = generation;
    target.focus();
    if (!owns(focusedAt) || !active()) return;
    switch (target.dataset.templateAction) {
      case 'apply': apply(); break;
      case 'team-back': break;
      case 'undo': undo(); break;
      case 'preserve': if (fresh(proposal)) commit({ preserveShared: true }); break;
      case 'cancel':
        dirty = false; receiveAccepted(); retirePreview(); build(); announce('Current arrangement retained.'); break;
    }
  });
  configuration = startingConfiguration(TEMPLATES[0]); receiveAccepted(); build(); retirePreview(); panel.hidden = false;
  if (disclosure && exposed) panel.open = true;
  const controller = Object.freeze({ open, resume: open, close, detach, settleText, openTeam, setEditorOpen,
    recordCreated(kind, id, context) {
      if (deliveryView.placements[kind] && context?.deliveryPhase) deliveryView.placements[kind].set(id, context.deliveryPhase);
    },
    isTeamOpen: () => selectedTeamId !== null && teamEditor.isConnected,
    focus() { if (!disposed) reel.element.querySelector('[data-reel-choice][aria-pressed="true"]')?.focus(); },
    isOpen: () => !disposed && (disclosure ? panel.open : acknowledged), render: refresh, dispose });
  INSTANCES.set(panel, controller);
  return controller;
}
