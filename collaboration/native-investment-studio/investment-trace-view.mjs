import { money, duration } from './display.mjs';

let sequence = 0;
const CHANNELS = [['baseline', 'A · Held baseline'], ['accepted', 'B · Accepted plan'], ['difference', 'Difference · B − A']];
const NS = 'http://www.w3.org/2000/svg';
const amount = row => row === null ? 'Outside this plan · $0.00' : `${row.totalCents === null ? 'Known ' : ''}${money(row.knownCents)}`;

export function mountInvestmentTrace(root, { onSource = () => {}, onHold = () => {} } = {}) {
  const document = root.ownerDocument, id = `investment-trace-${++sequence}`;
  const node = (tag, text, className) => {
    const element = document.createElement(tag); if (text !== undefined) element.textContent = text;
    if (className) element.className = className; return element;
  };
  const section = node('section', undefined, 'native-investment-trace'); section.dataset.investmentTrace = '';
  section.setAttribute('aria-labelledby', `${id}-heading`);
  const heading = node('h4', 'Trace the investment'); heading.id = `${id}-heading`;
  const intro = node('p', 'Compare each person’s funded staffing and additional work. Allocated work is already inside staffing.');
  const controls = node('div', undefined, 'native-investment-trace__controls');
  const channels = node('fieldset'), legend = node('legend', 'Channel'); channels.append(legend);
  const radioInputs = new Map();
  for (const [value, label] of CHANNELS) {
    const choice = node('label'), radio = node('input'); radio.type = 'radio'; radio.name = `${id}-channel`; radio.value = value;
    radio.dataset.traceChannel = value; choice.append(radio, node('span', label)); channels.append(choice); radioInputs.set(value, radio);
  }
  const hold = node('button', 'Hold accepted plan as A'); hold.type = 'button'; hold.dataset.traceHold = '';
  const scaleLabel = node('label', 'Scale'), scale = node('select'); scale.id = `${id}-scale`; scaleLabel.htmlFor = scale.id; scale.dataset.traceScale = '';
  for (const [value, label] of [['contributions', 'Fit contributions'], ['plan', 'Whole commitment']]) {
    const option = node('option', label); option.value = value; scale.append(option);
  }
  const personLabel = node('label', 'Inspect a person'), selection = node('select'); selection.id = `${id}-person`; personLabel.htmlFor = selection.id; selection.dataset.traceSelection = '';
  const selects = node('div', undefined, 'native-investment-trace__selects'); selects.append(scaleLabel, scale, personLabel, selection);
  controls.append(channels, selects, hold);
  const basis = node('p', undefined, 'native-investment-trace__basis'), total = node('p', undefined, 'native-investment-trace__total');
  total.dataset.traceTotal = '';
  const plotRegion = node('div', undefined, 'native-investment-trace__screen'); plotRegion.tabIndex = 0;
  plotRegion.setAttribute('role', 'region'); plotRegion.setAttribute('aria-label', 'Investment contribution plot, horizontally scrollable');
  const detail = node('section', undefined, 'native-investment-trace__detail'); detail.dataset.traceDetail = '';
  const ledger = node('details', undefined, 'native-investment-trace__ledger');
  ledger.append(node('summary', 'Read the whole-plan ledger'));
  const tableRegion = node('div', undefined, 'native-investment-trace__table-region'); tableRegion.tabIndex = 0;
  tableRegion.setAttribute('role', 'region'); tableRegion.setAttribute('aria-label', 'Whole-plan investment ledger, horizontally scrollable');
  ledger.append(tableRegion);
  const note = node('p', 'Amounts describe whole-plan commitments in USD. Difference compares source contributions; it does not assign causes to interacting inputs.');
  const status = node('p', undefined, 'native-investment-trace__status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  section.append(heading, intro, controls, basis, total, plotRegion, detail, ledger, note, status);
  root.prepend(section);
  let model = null, selected = null, channel = 'accepted', scaleMode = 'contributions', disposed = false;
  let visibleLabels = new Map();
  const labelFor = row => visibleLabels.get(row.key);

  const valueFor = row => channel === 'difference' ? row.difference : row[channel];
  function draw() {
    const svg = document.createElementNS(NS, 'svg'), height = 70 + model.rows.length * 54;
    svg.classList.add('native-investment-trace__plot'); svg.setAttribute('viewBox', `0 0 760 ${Math.max(150, height)}`);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-labelledby', `${id}-plot-title ${id}-plot-description`);
    const shape = (tag, attrs = {}, text) => {
      const element = document.createElementNS(NS, tag); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      if (text !== undefined) element.textContent = text; return element;
    };
    svg.append(shape('title', { id: `${id}-plot-title` }, `${CHANNELS.find(row => row[0] === channel)[1]}: commitment by person`),
      shape('desc', { id: `${id}-plot-description` }, 'Horizontal lengths show USD from zero. Exact amounts and source controls follow in the ledger. Hollow endpoints and dashed stems identify incomplete pricing.'));
    const maximum = Math.max(1, scaleMode === 'plan' ? Math.max(model.accepted.knownCents, model.baseline?.knownCents ?? 0)
      : Math.max(0, ...model.rows.flatMap(row => channel === 'difference' ? [Math.abs(row.difference.knownCents)] : [row.accepted?.knownCents ?? 0, row.baseline?.knownCents ?? 0])));
    const left = 230, right = 625, zero = channel === 'difference' ? (left + right) / 2 : left;
    const width = channel === 'difference' ? (right - left) / 2 : right - left;
    for (let index = 0; index <= 4; index += 1) {
      const x = left + index * (right - left) / 4;
      svg.append(shape('line', { x1: x, x2: x, y1: 38, y2: Math.max(96, height - 10), class: 'native-investment-trace__grid' }));
    }
    svg.append(shape('line', { x1: zero, x2: zero, y1: 38, y2: Math.max(96, height - 10), class: 'native-investment-trace__zero' }),
      shape('text', { x: left, y: 22, 'text-anchor': 'start', class: 'native-investment-trace__axis' }, channel === 'difference' ? money(-maximum) : '$0.00'),
      shape('text', { x: right, y: 22, 'text-anchor': 'end', class: 'native-investment-trace__axis' }, money(maximum)));
    if (channel === 'difference') svg.append(shape('text', { x: zero, y: 22, 'text-anchor': 'middle', class: 'native-investment-trace__axis' }, '$0.00'));
    if (!model.rows.length) svg.append(shape('text', { x: 20, y: 80, class: 'native-investment-trace__label' }, 'Add people and planned work to trace the investment.'));
    model.rows.forEach((row, index) => {
      const value = valueFor(row), cents = value?.knownCents ?? 0, x = zero + cents / maximum * width, y = 66 + index * 54;
      const group = shape('g', { class: 'native-investment-trace__mark', 'data-trace-key': row.key,
        'data-selected': String(row.key === selected), 'data-incomplete': String(value?.totalCents === null) });
      const label = labelFor(row);
      group.append(shape('title', {}, `${label}: ${amount(value)}`), shape('rect', { x: 0, y: y - 22, width: 756, height: 48, fill: 'transparent' }),
        shape('text', { x: 12, y: y + 4, class: 'native-investment-trace__label' }, label.length > 28 ? label.slice(0, 27) + '…' : label),
        shape('line', { x1: zero, x2: x, y1: y, y2: y, class: 'native-investment-trace__stem' }),
        shape('circle', { cx: x, cy: y, r: 5, class: 'native-investment-trace__point' }),
        shape('text', { x: 744, y: y + 21, 'text-anchor': 'end', class: 'native-investment-trace__value' }, `${value?.totalCents === null ? 'Known ' : ''}${money(cents)}`));
      svg.append(group);
    });
    plotRegion.replaceChildren(svg);
  }
  function renderDetail() {
    const row = model.rows.find(row => row.key === selected); detail.replaceChildren();
    if (!row) { detail.append(node('p', 'A person’s contribution will appear when the plan includes people.')); return; }
    const source = channel === 'baseline' ? row.baseline : row.accepted ?? row.baseline;
    detail.append(node('h5', labelFor(row)));
    if (!source) { detail.append(node('p', 'This person is outside the held baseline. Their baseline contribution is $0.00.')); return; }
    const isCurrent = source === row.accepted;
    detail.append(node('p', `${isCurrent ? 'Accepted plan' : 'Held baseline'} · ${source.lifecycle === 'retired' ? 'Retired record; its commitment is retained.' : 'Planned commitment.'}`));
    const amounts = node('dl', undefined, 'native-investment-trace__amounts');
    for (const [label, value] of [['Funded staffing', `${duration(source.funded.minutes)} · ${money(source.funded.cents)}`],
      ['Additional work', `${duration(source.additional.minutes)} · ${money(source.additional.cents)}`],
      ['Commitment', amount(source)], ['Work within funded time', `${duration(source.allocated.minutes)} · ${money(source.allocated.cents)} attributed inside staffing`]]) {
      const item = node('div'); item.append(node('dt', label), node('dd', value)); amounts.append(item);
    }
    detail.append(amounts);
    if (row.source) {
      const follow = node('button', isCurrent ? 'Follow person' : 'Follow current person'); follow.type = 'button'; follow.className = 'native-control--navigate';
      follow.dataset.traceSourceKind = 'person'; follow.dataset.traceSourceId = row.source.id; detail.append(follow);
    } else detail.append(node('p', 'This person belongs to the held baseline. Restore that baseline to work with its complete arrangement.'));
    const supports = node('ul', undefined, 'native-investment-trace__work');
    const currentWork = new Set(model.workSources.map(item => item.id));
    const samePlan = isCurrent || model.baseline?.planId === model.accepted.planId;
    for (const work of source.work) {
      const item = node('li'), label = node('strong', work.label);
      item.append(label, node('p', `${duration(work.minutes)} for this person · ${money(work.cents)} line attribution · ${work.funding === 'allocated' ? 'inside funded staffing' : 'additional work'}${work.status === 'paused' ? ' · paused' : ''}${work.lifecycle === 'retired' ? ' · retired' : ''}.`));
      if (samePlan && currentWork.has(work.workId)) {
        const follow = node('button', isCurrent ? 'Follow session' : 'Follow current session'); follow.type = 'button'; follow.className = 'native-control--navigate';
        follow.dataset.traceSourceKind = 'work'; follow.dataset.traceSourceId = work.workId; item.append(follow);
      }
      supports.append(item);
    }
    detail.append(node('h6', isCurrent ? 'Accepted supporting sessions' : 'Baseline supporting sessions'), supports,
      node('p', 'Session lines are attributed amounts. Staffing and additional work settle once per person, so split sessions retain the same commitment.'));
    if (!source.work.length) supports.append(node('li', 'No working sessions are assigned to this person.'));
  }
  function renderLedger() {
    const table = node('table'); table.dataset.traceLedger = ''; table.append(node('caption', 'Whole-plan commitment by person · USD'));
    const head = node('thead'), header = node('tr');
    for (const title of ['Person', 'A · Baseline', 'B · Accepted', 'Difference · B − A']) { const th = node('th', title); th.scope = 'col'; header.append(th); }
    head.append(header); const body = node('tbody');
    for (const row of model.rows) {
      const tr = node('tr'); tr.dataset.traceLedgerKey = row.key; const th = node('th'); th.scope = 'row';
      const button = node('button', labelFor(row)); button.type = 'button'; button.dataset.traceChoose = row.key; button.setAttribute('aria-pressed', String(row.key === selected)); th.append(button); tr.append(th);
      for (const text of [model.baseline ? amount(row.baseline) : 'Save a baseline', amount(row.accepted), model.baseline ? amount(row.difference) : 'Save a baseline']) tr.append(node('td', text));
      body.append(tr);
    }
    const foot = node('tfoot'), tr = node('tr'), th = node('th', 'Whole plan'); th.scope = 'row'; tr.append(th);
    for (const text of [model.baseline ? amount(model.baseline) : 'Save a baseline', amount(model.accepted), model.baseline ? amount(model.difference) : 'Save a baseline']) tr.append(node('td', text));
    foot.append(tr); table.append(head, body, foot); tableRegion.replaceChildren(table);
  }
  function render() {
    if (disposed || !model) return;
    if (!model.baseline && channel !== 'accepted') channel = 'accepted';
    if (!model.rows.some(row => row.key === selected)) selected = model.rows[0]?.key ?? null;
    const counts = new Map();
    for (const row of model.rows) counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
    visibleLabels = new Map(model.rows.map(row => [row.key, counts.get(row.label) > 1
      ? `${row.accepted ? row.baseline ? 'A/B' : 'B' : 'A'} · ${row.label}` : row.label]));
    section.dataset.traceChannel = channel;
    for (const [value, input] of radioInputs) { input.checked = value === channel; input.disabled = value !== 'accepted' && !model.baseline; }
    scale.value = scaleMode;
    selection.replaceChildren(...model.rows.map(row => { const option = node('option', labelFor(row)); option.value = row.key; return option; }));
    selection.value = selected ?? ''; selection.disabled = !model.rows.length;
    hold.textContent = model.baseline ? 'Replace held A with accepted plan' : 'Hold accepted plan as A';
    basis.textContent = `B: ${model.accepted.planId} · ${model.accepted.horizonWeeks}-week plan${model.baseline ? `. A: ${model.baseline.planId} · ${model.baseline.horizonWeeks}-week plan.` : '. Save a baseline to compare.'}`;
    const current = channel === 'baseline' ? model.baseline : channel === 'difference' ? model.difference : model.accepted;
    total.textContent = `${CHANNELS.find(row => row[0] === channel)[1]} · ${amount(current)}`;
    draw(); renderDetail(); renderLedger();
  }
  function choose(key) { if (!model.rows.some(row => row.key === key)) return; selected = key; render(); status.textContent = `Inspecting ${labelFor(model.rows.find(row => row.key === key))}.`; }
  function change(event) {
    if (disposed) return;
    if (event.target === selection) choose(selection.value);
    else if (event.target === scale) { scaleMode = scale.value; render(); }
    else if (event.target.dataset.traceChannel && event.target.checked) { channel = event.target.value; render(); }
  }
  function click(event) {
    if (disposed || !model) return;
    const source = event.target.closest('[data-trace-source-kind]');
    if (source && section.contains(source)) {
      onSource({ kind: source.dataset.traceSourceKind, id: source.dataset.traceSourceId }, { targetId: 'investment', traceKey: selected, channel }); return;
    }
    if (event.target.closest('[data-trace-hold]')) { onHold(); return; }
    const choice = event.target.closest('[data-trace-choose], [data-trace-key]');
    if (choice && section.contains(choice)) {
      const restoreFocus = choice === document.activeElement;
      choose(choice.dataset.traceChoose ?? choice.dataset.traceKey);
      if (restoreFocus) [...tableRegion.querySelectorAll('[data-trace-choose]')].find(button => button.dataset.traceChoose === selected)?.focus({ preventScroll: true });
    }
  }
  section.addEventListener('change', change); section.addEventListener('click', click);
  return Object.freeze({ refresh(next) { if (disposed || next === model) return; model = next; render(); },
    restore(origin = {}) {
      if (disposed || !model) return;
      if (CHANNELS.some(([key]) => key === origin.channel)) channel = origin.channel;
      if (model.rows.some(row => row.key === origin.traceKey)) selected = origin.traceKey;
      render(); selection.focus({ preventScroll: true }); section.scrollIntoView({ block: 'start' });
    }, dispose() { if (disposed) return; disposed = true; section.removeEventListener('change', change); section.removeEventListener('click', click); section.remove(); } });
}
