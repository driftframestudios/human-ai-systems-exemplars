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
  const heading = node(document, 'header', 'studio-session-tracks__heading');
  heading.append(node(document, 'h5', '', label));
  if (onAdd) {
    const add = node(document, 'button', 'native-control--create studio-rack-add', 'Add session'); add.type = 'button';
    add.addEventListener('click', onAdd); heading.append(add);
  }
  const scroll = node(document, 'div', 'studio-session-tracks__scroll');
  scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', label); scroll.tabIndex = 0;
  const table = node(document, 'table');
  table.append(node(document, 'caption', '', label));
  const head = node(document, 'thead'), headings = node(document, 'tr');
  const first = node(document, 'th', '', 'Working session'); first.scope = 'col'; headings.append(first);
  for (const person of plan.people) { const th = node(document, 'th', '', person.label); th.scope = 'col'; headings.append(th); }
  head.append(headings); table.append(head);
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
  table.append(body); scroll.append(table); screen.append(heading, scroll);
  screen.append(node(document, 'p', 'studio-session-tracks__legend', '● Funded time · ◆ Extra investment · Ⅱ Paused'));
  if (!plan.work.length) screen.append(node(document, 'p', '', 'Add a working session to connect people and work.'));
  return screen;
}
