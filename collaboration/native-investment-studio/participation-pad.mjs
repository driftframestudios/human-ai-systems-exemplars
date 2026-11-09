import { duration, wholeMoney } from './display.mjs';

// The arranger and the local spread receiver project the same accepted ledger.
// Native checkbox events stay with their controller's participation owner.
export function createParticipationPad(document, { person, work, line }) {
  const pad = document.createElement('label'), check = document.createElement('input');
  check.type = 'checkbox'; check.checked = work.personIds.includes(person.id);
  check.dataset.peopleParticipant = person.id; check.dataset.peopleWork = work.id;
  check.setAttribute('aria-label', `${person.label} in ${work.label}${work.status === 'paused' ? ', paused session' : ''}`);
  check.disabled = check.checked && work.personIds.length === 1;
  pad.className = 'studio-shared__pad'; pad.dataset.selected = String(check.checked);
  pad.dataset.funding = work.funding; pad.dataset.status = work.status;
  const state = document.createElement('span'), time = document.createElement('small'), amount = document.createElement('strong');
  state.className = 'studio-participation-pad__state'; state.textContent = check.checked ? 'Assigned' : 'Available';
  time.className = 'studio-participation-pad__time'; amount.className = 'studio-participation-pad__amount';
  if (line) {
    const marker = document.createElement('span');
    marker.textContent = work.status === 'paused' ? 'Ⅱ' : work.funding === 'allocated' ? '●' : '◆';
    marker.setAttribute('aria-hidden', 'true');
    if (work.status === 'paused') marker.className = 'studio-pause-marker';
    time.append(marker, document.createTextNode(` ${duration(line.minutes)}`));
  }
  amount.textContent = line ? line.cents === null ? 'Rate needed' : wholeMoney(line.cents) : '';
  if (check.disabled) pad.title = 'Add another person to this session before removing this participant.';
  pad.append(check, state, time, amount);
  return pad;
}
