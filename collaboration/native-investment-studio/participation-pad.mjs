import { duration, wholeMoney } from './display.mjs';
import { summarizeWorkSessions } from './work-sessions.mjs';
import { readWorkParticipation } from './people-capacity.mjs';

// The arranger and the local spread receiver project the same accepted ledger.
// Native checkbox events stay with their controller's participation owner.
export function createParticipationPad(document, { person, work, line }) {
  const pad = document.createElement('label'), check = document.createElement('input');
  const summary = summarizeWorkSessions(work), participation = readWorkParticipation(work, person.id);
  check.type = 'checkbox'; check.checked = participation.complete; check.indeterminate = participation.partial;
  check.dataset.peopleParticipant = person.id; check.dataset.peopleWork = work.id;
  check.setAttribute('aria-label', `${person.label} in ${work.label}${summary.status === 'paused' ? ', paused session' : summary.status === 'mixed' ? ', some sessions paused' : ''}`);
  check.disabled = check.checked && participation.pinned;
  pad.className = 'studio-shared__pad'; pad.dataset.selected = String(participation.included);
  pad.dataset.funding = summary.funding; pad.dataset.status = summary.status;
  const state = document.createElement('span'), time = document.createElement('small'), amount = document.createElement('strong');
  state.className = 'studio-participation-pad__state'; state.textContent = participation.partial ? 'Some sessions' : check.checked ? 'Assigned' : 'Available';
  time.className = 'studio-participation-pad__time'; amount.className = 'studio-participation-pad__amount';
  if (line) {
    const marker = document.createElement('span');
    marker.textContent = summary.status === 'paused' ? 'Ⅱ' : summary.funding === 'allocated' ? '●' : summary.funding === 'mixed' ? '● ◆' : '◆';
    marker.setAttribute('aria-hidden', 'true');
    if (summary.status === 'paused') marker.className = 'studio-pause-marker';
    time.append(marker, document.createTextNode(` ${duration(line.minutes)}`));
  }
  amount.textContent = line ? line.cents === null ? 'Rate needed' : wholeMoney(line.cents) : '';
  if (check.disabled) pad.title = 'Add another person to this session before removing this participant.';
  pad.append(check, state, time, amount);
  return pad;
}
