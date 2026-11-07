import { duration } from './display.mjs';

const node = (document, tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// These readings borrow accepted or explicitly proposed records. Their buttons
// hand control to the existing editors; the view never accepts a plan change.
export function createTeamLanes(document, { plan, teams = plan.teams, onNavigate, onAdd, proposed = false }) {
  const board = node(document, 'div', 'studio-team-lanes');
  const people = new Map(plan.people.map(person => [person.id, person]));
  for (const team of teams) {
    const lane = node(document, 'section', 'studio-team-lane'); lane.dataset.teamLane = team.id;
    const title = node(document, 'button', 'studio-team-lane__title native-control--navigate', team.label);
    title.type = 'button'; title.addEventListener('click', () => onNavigate({ kind: 'team', id: team.id }));
    const members = node(document, 'ul', 'studio-team-lane__people');
    for (const id of team.personIds ?? []) {
      const person = people.get(id); if (!person) continue;
      const item = node(document, 'li');
      const control = node(document, 'button', 'studio-team-lane__person native-control--navigate', person.label);
      control.type = 'button'; control.addEventListener('click', () => onNavigate({ kind: proposed ? 'team' : 'person', id: proposed ? team.id : id }));
      item.append(control); members.append(item);
    }
    if (!members.children.length) members.append(node(document, 'li', 'studio-team-lane__empty', 'Choose the people for this team'));
    const sessions = plan.work.filter(work => work.teamId === team.id);
    const note = node(document, 'p', 'studio-team-lane__note', sessions.length
      ? sessions.map(work => work.label).join(' · ') : 'Connect this team to its work');
    lane.append(title, members, note);
    if (onAdd) {
      const choose = node(document, 'button', 'native-control--navigate studio-team-lane__add', 'Choose people');
      choose.type = 'button'; choose.addEventListener('click', () => onNavigate({ kind: 'team', id: team.id })); lane.append(choose);
    }
    board.append(lane);
  }
  if (onAdd) {
    const actions = node(document, 'div', 'studio-team-lanes__actions');
    const add = node(document, 'button', 'native-control--create', 'Add team'); add.type = 'button';
    add.addEventListener('click', () => onAdd({ kind: 'team' })); actions.append(add); board.append(actions);
  }
  return board;
}

export function createSessionTracks(document, { plan, onSession, onAdd, sessionIds = new Set(plan.work.map(work => work.id)), label = 'People in working sessions' }) {
  const screen = node(document, 'div', 'studio-session-tracks');
  screen.setAttribute('role', 'region'); screen.setAttribute('aria-label', label); screen.tabIndex = 0;
  const table = node(document, 'table');
  table.append(node(document, 'caption', '', label));
  const head = node(document, 'thead'), heading = node(document, 'tr');
  const first = node(document, 'th', '', 'Working session'); first.scope = 'col'; heading.append(first);
  for (const person of plan.people) { const th = node(document, 'th', '', person.label); th.scope = 'col'; heading.append(th); }
  head.append(heading); table.append(head);
  const body = node(document, 'tbody');
  for (const work of plan.work) {
    const row = node(document, 'tr'); row.dataset.sessionTrack = work.id;
    const title = node(document, 'th'); title.scope = 'row';
    const choose = node(document, 'button', 'studio-track-key studio-session-tracks__name native-control--navigate'); choose.type = 'button';
    if (sessionIds.has(work.id)) choose.dataset.studioSessionId = work.id;
    choose.setAttribute('aria-label', `${work.label}. ${sessionIds.has(work.id) ? 'Open session settings.' : 'Open proposed session settings.'}`);
    choose.append(node(document, 'strong', '', work.label), node(document, 'small', '', `${duration(work.minutesPerOccurrence)} each · ${work.occurrences} sessions`));
    if (onSession) choose.addEventListener('click', () => onSession(work.id));
    else choose.dataset.nativeWorkOpen = work.id;
    title.append(choose); row.append(title);
    const members = new Set(work.personIds);
    for (const person of plan.people) {
      const cell = node(document, 'td');
      if (members.has(person.id)) {
        const pad = node(document, 'button', 'studio-session-tracks__pad native-control--navigate', work.status === 'paused' ? 'Ⅱ' : work.funding === 'additional' ? '◆' : '●'); pad.type = 'button';
        if (sessionIds.has(work.id)) pad.dataset.studioSessionId = work.id;
        pad.dataset.funding = work.funding; pad.dataset.status = work.status;
        pad.setAttribute('aria-label', `${person.label} · ${work.label} · ${duration(work.minutesPerOccurrence)} per session · ${work.funding === 'additional' ? 'extra investment' : 'within funded time'}${work.status === 'paused' ? ' · paused' : ''}. Open session settings.`);
        pad.title = `${person.label} · ${duration(work.minutesPerOccurrence)} per session`;
        if (onSession) pad.addEventListener('click', () => onSession(work.id));
        else pad.dataset.nativeWorkOpen = work.id;
        cell.append(pad);
      } else { const empty = node(document, 'span', 'studio-session-tracks__empty', '·'); empty.setAttribute('aria-label', `${person.label}: not included in this session`); cell.append(empty); }
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body); screen.append(table);
  if (onAdd) {
    const add = node(document, 'button', 'native-control--create studio-rack-add', 'Add session'); add.type = 'button';
    add.addEventListener('click', onAdd); screen.append(add);
  }
  screen.append(node(document, 'p', 'studio-session-tracks__legend', '● Funded time · ◆ Extra investment · Ⅱ Paused'));
  if (!plan.work.length) screen.append(node(document, 'p', '', 'Add a working session to connect people and work.'));
  return screen;
}

export function createLifecycleLanes(document, { plan, onSession }) {
  const section = node(document, 'section', 'studio-lifecycle');
  section.append(node(document, 'h4', '', 'Delivery lifecycle'));
  const lanes = node(document, 'div', 'studio-lifecycle__lanes');
  const work = new Map(plan.work.map(row => [row.id, row]));
  const included = new Set();
  const stageRows = plan.scoreSettings.stages.map(stage => ({ label: stage.label, workIds: stage.workIds }));
  for (const stage of stageRows) for (const id of stage.workIds) included.add(id);
  const additional = plan.work.filter(row => !included.has(row.id)).map(row => row.id);
  if (additional.length) stageRows.push({ label: 'Supporting work', workIds: additional });
  for (const stage of stageRows) {
    const lane = node(document, 'section', 'studio-lifecycle__lane'); lane.append(node(document, 'h5', '', stage.label));
    for (const id of stage.workIds) {
      const session = work.get(id); if (!session) continue;
      const pad = node(document, 'button', 'studio-lifecycle__pad native-control--navigate', session.label); pad.type = 'button';
      pad.addEventListener('click', () => onSession(id)); lane.append(pad);
    }
    if (lane.children.length === 1) lane.append(node(document, 'p', '', 'Choose supporting work in Stages & handoffs.'));
    lanes.append(lane);
  }
  section.append(lanes); return section;
}
