import { CADENCE_SUBDIVISIONS } from './cadence.mjs';

const PAGE_SIZE = 12;
let sequence = 0;

// A presentation of the session owner's placement field. Selection stays local;
// all value changes return to the same draft token and acceptance route.
export function mountSessionOccurrenceControls(document, { onPlacement, onAdd, onRemove }) {
  const instance = ++sequence;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const root = node('section', 'studio-occurrences');
  root.dataset.sessionOccurrences = '';
  const heading = node('h4', '', 'Working sessions');
  heading.id = `session-occurrence-${instance}-heading`;
  root.setAttribute('aria-labelledby', heading.id);
  const header = node('div', 'studio-occurrences__header');
  const title = node('div', 'studio-occurrences__title');
  const count = node('output', 'studio-occurrences__count');
  const add = node('button', 'native-control--create studio-rack-add', 'Add session');
  add.type = 'button'; add.dataset.sessionOccurrenceAdd = '';
  const remove = node('button', 'native-control--remove', 'Remove session');
  remove.type = 'button'; remove.dataset.sessionOccurrenceRemove = '';
  const pads = node('div', 'studio-occurrences__pads');
  pads.setAttribute('role', 'group'); pads.setAttribute('aria-label', 'Choose a working session');
  const pager = node('div', 'studio-occurrences__pager');
  const previous = node('button', '', 'Previous'), next = node('button', '', 'Next');
  previous.type = next.type = 'button';
  previous.setAttribute('aria-label', 'Previous sessions'); next.setAttribute('aria-label', 'Next sessions');
  const pageLabel = node('span');
  pager.append(previous, pageLabel, next);
  const placement = node('div', 'studio-occurrences__placement');
  const periodField = node('fieldset'), periodLegend = node('legend');
  const periods = node('div', 'studio-occurrences__choices');
  const subdivisionField = node('fieldset'), subdivisionLegend = node('legend');
  const subdivisions = node('div', 'studio-occurrences__choices');
  periodField.append(periodLegend, periods); subdivisionField.append(subdivisionLegend, subdivisions);
  placement.append(periodField, subdivisionField);
  const error = node('p', 'native-coordination__error');
  const meaning = node('p', 'studio-occurrences__meaning', 'Duration and people apply to every session.');
  const footer = node('div', 'studio-occurrences__footer');
  title.append(heading, count); header.append(title, add); footer.append(remove);
  root.append(header, pads, pager, placement, meaning, error, footer);
  let selected = 0, current = null, signature = null, padSignature = null, identity = null, disposed = false;
  let periodControls = new Map(), subdivisionControls = new Map(), padControls = new Map();
  const cleanup = [];
  function listen(element, type, callback) {
    element.addEventListener(type, callback); cleanup.push(() => element.removeEventListener(type, callback));
  }
  function radio(value, label, field, parent, controls) {
    const wrapper = node('label', 'studio-occurrences__choice'), input = node('input'), words = node('span', '', label);
    input.type = 'radio'; input.name = `session-occurrence-${instance}-${field}`; input.value = value;
    input.dataset.occurrenceField = field;
    wrapper.append(input, words); parent.append(wrapper); controls.set(value, input);
  }
  function render(value) {
    if (disposed) return;
    current = value;
    if (identity !== value.identity) { identity = value.identity; selected = 0; }
    selected = Math.max(0, Math.min(selected, value.count - 1));
    count.textContent = `${value.count} ${value.count === 1 ? 'session' : 'sessions'}`;
    add.disabled = !value.canAdd;
    remove.disabled = !value.canRemove || value.count === 0;
    remove.setAttribute('aria-label', `Remove session ${selected + 1}`);
    placement.hidden = value.count === 0;
    const page = Math.floor(selected / PAGE_SIZE), first = page * PAGE_SIZE, last = Math.min(value.count, first + PAGE_SIZE);
    const nextPads = `${value.count}:${page}`;
    if (padSignature !== nextPads) {
      padSignature = nextPads; padControls = new Map();
      const buttons = [];
      for (let index = first; index < last; index++) {
        const button = node('button', 'studio-occurrences__pad'); button.type = 'button';
        button.dataset.sessionOccurrence = String(index);
        button.append(node('strong', '', String(index + 1)), node('small'));
        buttons.push(button); padControls.set(index, button);
      }
      pads.replaceChildren(...buttons);
    }
    const placements = new Map(value.placements.map(item => [item.occurrenceIndex, item]));
    const labels = new Map(value.cadence.periods.map(period => [period.id, period.label]));
    const unit = value.cadence.basis === 'sprint' ? 'Week' : 'Month';
    for (const [index, button] of padControls) {
      const entry = placements.get(index), label = entry ? labels.get(entry.periodId) ?? 'Unplaced' : 'Unplaced';
      button.querySelector('small').textContent = label;
      button.setAttribute('aria-label', `Session ${index + 1} · ${label}${entry ? ` · ${unit} ${entry.subdivision}` : ''}`);
      button.setAttribute('aria-pressed', String(index === selected));
      button.dataset.placed = String(Boolean(entry));
    }
    pager.hidden = value.count <= PAGE_SIZE;
    previous.disabled = first === 0; next.disabled = last === value.count;
    pageLabel.textContent = `${first + 1}–${last} of ${value.count}`;
    const nextSignature = JSON.stringify([value.cadence.basis, value.cadence.periods]);
    if (signature !== nextSignature) {
      signature = nextSignature; periods.replaceChildren(); subdivisions.replaceChildren();
      periodControls = new Map(); subdivisionControls = new Map();
      radio('', 'Unplaced', 'periodId', periods, periodControls);
      for (const period of value.cadence.periods) radio(period.id, period.label, 'periodId', periods, periodControls);
      for (let part = 1; part <= CADENCE_SUBDIVISIONS[value.cadence.basis]; part++)
        radio(String(part), `${unit} ${part}`, 'subdivision', subdivisions, subdivisionControls);
    }
    const entry = placements.get(selected);
    periodLegend.textContent = `Session ${selected + 1} · ${value.cadence.basis === 'sprint' ? 'Sprint' : 'Quarter'}`;
    subdivisionLegend.textContent = unit;
    for (const [id, input] of periodControls) input.checked = id === (entry?.periodId ?? '');
    for (const [part, input] of subdivisionControls) input.checked = part === String(entry?.subdivision ?? '');
    subdivisionField.disabled = !entry?.periodId;
    error.textContent = value.error ?? '';
  }
  function select(index, { focus = false } = {}) {
    if (disposed || !current || !Number.isSafeInteger(index) || index < 0 || index >= current.count
      || focus && (root.hidden || !root.isConnected)) return false;
    selected = index; render(current);
    if (focus) padControls.get(index)?.focus({ preventScroll: true });
    return true;
  }
  listen(pads, 'click', event => {
    const button = event.target.closest('[data-session-occurrence]');
    if (button && pads.contains(button)) select(Number(button.dataset.sessionOccurrence));
  });
  listen(placement, 'change', event => {
    const input = event.target, field = input.dataset.occurrenceField;
    if (input.checked && (field === 'periodId' || field === 'subdivision')) onPlacement(selected, field, input.value);
  });
  listen(add, 'click', () => {
    if (!current?.canAdd) return;
    selected = current.count;
    onAdd();
    if (current?.count > selected) select(selected, { focus: true });
  });
  listen(remove, 'click', () => { if (current?.canRemove && current.count > 0) onRemove?.(selected); });
  listen(previous, 'click', () => select(Math.max(0, selected - PAGE_SIZE), { focus: true }));
  listen(next, 'click', () => select(Math.min(current.count - 1, selected + PAGE_SIZE), { focus: true }));
  return Object.freeze({ root, render, select, dispose() {
    disposed = true; current = null;
    cleanup.splice(0).forEach(release => release()); root.remove();
  } });
}
