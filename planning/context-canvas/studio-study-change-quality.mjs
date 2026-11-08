// Isolated study state. Production framework definitions remain read-only inputs.
import { listChangeFrameworks, listInterpretiveLenses } from '../../collaboration/native-investment-studio/change-models.mjs';

const frameworks = listChangeFrameworks().filter(item => ['kotter', 'npt', 'adkar'].includes(item.id));
const lenses = listInterpretiveLenses().filter(item => ['people', 'operating', 'quality', 'executive'].includes(item.id));
const lensNames = { people: 'People', operating: 'Delivery', quality: 'Evidence', executive: 'Investment' };
const frameworkNames = { kotter: 'Accelerators', npt: 'Everyday practice', adkar: 'ADKAR' };
const phases = [{ id: 'prepare', label: 'Prepare' }, { id: 'practice', label: 'Practice' }, { id: 'carry', label: 'Carry forward' }];
const channels = [{ id: 'urgency', label: 'Urgency', note: 'How soon the work needs attention' }, { id: 'participation', label: 'Participation', note: 'How widely people take part' }, { id: 'readiness', label: 'Preparation', note: 'How much rehearsal to plan' }];
const levels = ['Light', 'Focused', 'Balanced', 'Strong', 'Highest'];
const checks = [
  { id: 'acceptance', name: 'Acceptance', phase: 'prepare', description: 'Agree examples of a useful result before the review.', action: 'Walk through the acceptance examples.' },
  { id: 'review', name: 'Independent review', phase: 'prepare', description: 'Bring another perspective to the evidence and decision.', action: 'Ask a reviewer to inspect the result.' },
  { id: 'accessibility', name: 'Accessibility', phase: 'practice', description: 'Try the work with the people and access conditions it should support.', action: 'Rehearse the important user journey.' },
  { id: 'recovery', name: 'Recovery', phase: 'practice', description: 'Practice restoring the work after an interrupted handoff.', action: 'Restore the saved work and repeat the handoff.' },
  { id: 'observe', name: 'Observability', phase: 'carry', description: 'Make changes and abnormal states visible to the receiving team.', action: 'Choose a useful signal and its receiver.' },
  { id: 'learning', name: 'Learning', phase: 'carry', description: 'Use the first operating observations to revise the next session.', action: 'Bring an observation back into the plan.' },
];
const preparationChoices = [{ id: 'acceptance', name: 'Acceptance' }, { id: 'review', name: 'Review' }, { id: 'accessibility', name: 'Access' }];
const recoveryChoices = [{ id: 'recovery', name: 'Recover' }, { id: 'observe', name: 'Observe' }, { id: 'learning', name: 'Learn' }];

export const changeQualitySeed = {
  changeRack: { framework: 'kotter', lens: 'people', attention: { urgency: 2, participation: 3, readiness: 3 }, phases: {},
    links: { 'kotter:urgency': ['synthesis'], 'kotter:broad-participation': ['pairing'], 'kotter:short-term-wins': ['decision'],
      'npt:coherence': ['synthesis'], 'npt:collective-action': ['pairing'], 'npt:reflexive-monitoring': ['decision'] } },
  qualityRack: { preparation: 'acceptance', recovery: 'recovery', sigma: 4,
    included: ['acceptance', 'review', 'accessibility', 'recovery'],
    links: { acceptance: ['decision'], review: ['decision'], accessibility: ['pairing'], recovery: ['pairing'] } },
};

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function key(element, value) { element.dataset.cqKey = value; element.dataset.focusKey = `cq-${value}`; return element; }
function button(label, action, className = 'cq-pad', pressed, id) {
  const result = node('button', label, className); result.type = 'button';
  if (pressed !== undefined) result.setAttribute('aria-pressed', String(pressed));
  if (id) key(result, id);
  result.addEventListener('click', action); return result;
}
function section(title, className = 'cq-panel') {
  const result = node('section', undefined, className); result.append(node('h3', title)); return result;
}
function selectedFocus(root, render) {
  const active = root.contains(document.activeElement) ? document.activeElement : null;
  const focusKey = active?.dataset.cqKey;
  render();
  if (focusKey && !active.isConnected) [...root.querySelectorAll('[data-cq-key]')].find(item => item.dataset.cqKey === focusKey)?.focus({ preventScroll: true });
}
function mount(container, root) { if (root.parentElement !== container) container.replaceChildren(root); }
function currentLinks(model, links = []) { return model.tapes.filter(tape => links.includes(tape.id)); }

export function createChangeQuality({ getModel, change, openSession }) {
  const local = { component: null, check: 'acceptance', gesture: 0 };
  const changeRoot = node('div', undefined, 'cq-study cq-change');
  const qualityRoot = node('div', undefined, 'cq-study cq-quality');
  const changeReels = node('div', undefined, 'cq-reels');
  const changeReading = node('p', undefined, 'cq-reading');
  const mixer = section('Choose the emphasis', 'cq-mixer');
  const changeBoard = node('div', undefined, 'cq-board');
  const changeDetail = section('Selected work', 'cq-loaded');
  changeRoot.append(changeReels, changeReading, mixer, changeBoard, changeDetail);

  function reel(title, choices, value, choose, prefix) {
    const field = node('fieldset', undefined, 'cq-reel'); field.append(node('legend', title));
    const index = Math.max(0, choices.findIndex(choice => choice.id === value));
    const rotor = button('', () => choose(choices[(index + 1) % choices.length].id), 'cq-reel__rotor', undefined, `${prefix}-next`);
    rotor.setAttribute('aria-label', `Next ${title.toLowerCase()}`);
    const artwork = node('span'); artwork.setAttribute('aria-hidden', 'true'); artwork.style.setProperty('--cq-turn', `${index * 75}deg`); rotor.append(artwork);
    const options = node('div', undefined, 'cq-reel__choices');
    for (const choice of choices) options.append(button(choice.name, () => choose(choice.id), 'cq-pad', choice.id === value, `${prefix}-${choice.id}`));
    field.append(rotor, options); return field;
  }

  const faders = new Map();
  const faderBank = node('div', undefined, 'cq-fader-bank'); mixer.append(faderBank);
  for (const channel of channels) {
    const field = node('div', undefined, 'cq-channel');
    const label = node('label', channel.label); const input = key(node('input'), `attention-${channel.id}`);
    input.type = 'range'; input.min = '0'; input.max = '4'; input.step = '1'; input.id = `study-cq-${channel.id}`; label.htmlFor = input.id;
    const output = node('output'); output.htmlFor = input.id;
    input.addEventListener('pointerdown', () => { local.gesture += 1; });
    input.addEventListener('keydown', () => { local.gesture += 1; });
    input.addEventListener('input', () => change(model => { model.study.changeRack.attention[channel.id] = Number(input.value); }, `${channel.label}: ${levels[Number(input.value)]}.`, `cq-fader-${channel.id}-${local.gesture}`));
    field.append(label, input, output, node('small', channel.note)); faderBank.append(field); faders.set(channel.id, { input, output });
  }

  function phaseFor(component, index, state) {
    const explicit = state.phases[`${state.framework}:${component.id}`];
    if (explicit) return explicit;
    if (state.attention.urgency >= 3 && index < 4) return 'prepare';
    if (state.attention.participation >= 3 && /participation|coalition|desire|knowledge/.test(component.id)) return 'practice';
    if (state.attention.readiness >= 3 && /action|ability|barriers|acceleration/.test(component.id)) return 'practice';
    if (state.attention.readiness <= 1 && index >= 3) return 'carry';
    return phases[Math.min(2, Math.floor(index / 3))].id;
  }
  function sessionPads(title, ids, set, prefix) {
    const field = node('fieldset', undefined, 'cq-session-links'); field.append(node('legend', title));
    for (const tape of getModel().tapes) {
      const label = node('label', undefined, 'cq-link-pad'); const input = key(node('input'), `${prefix}-${tape.id}`);
      input.type = 'checkbox'; input.checked = ids.includes(tape.id);
      input.addEventListener('change', () => set(tape.id, input.checked));
      label.append(input, node('span', tape.name)); field.append(label);
    }
    if (!getModel().tapes.length) field.append(node('p', 'Add a session in Coordination to connect this work.'));
    return field;
  }
  function linkedNavigation(ids) {
    const group = node('div', undefined, 'cq-linked');
    for (const tape of currentLinks(getModel(), ids)) group.append(button(`${tape.name} ↗`, event => openSession(tape.id, event.currentTarget), 'cq-open', undefined, `open-${tape.id}`));
    return group;
  }
  function toggleLink(model, owner, record, id, included) {
    const links = model.study[owner].links;
    links[record] = included ? [...new Set([...(links[record] || []), id])] : (links[record] || []).filter(value => value !== id);
  }
  function renderChange(container) {
    mount(container, changeRoot);
    selectedFocus(changeRoot, () => {
      const state = getModel().study.changeRack;
      const framework = frameworks.find(item => item.id === state.framework) || frameworks[0];
      const lens = lenses.find(item => item.id === state.lens) || lenses[0];
      const component = framework.components.find(item => item.id === local.component) || framework.components[0]; local.component = component.id;
      changeReels.replaceChildren(
        reel('Change framework', frameworks.map(item => ({ id: item.id, name: frameworkNames[item.id] })), framework.id, id => change(model => { model.study.changeRack.framework = id; }, 'Change framework selected.'), 'framework'),
        reel('Viewpoint', lenses.map(item => ({ id: item.id, name: lensNames[item.id] })), lens.id, id => change(model => { model.study.changeRack.lens = id; }, 'Viewpoint selected.'), 'lens')
      );
      changeReading.replaceChildren(node('strong', `${lensNames[lens.id]} in view · `), node('span', lens.surface));
      for (const channel of channels) { const control = faders.get(channel.id), value = state.attention[channel.id]; control.input.value = String(value); control.input.setAttribute('aria-valuetext', levels[value]); control.output.value = levels[value]; }
      changeBoard.replaceChildren();
      for (const phase of phases) {
        const lane = section(phase.label, 'cq-lane');
        framework.components.forEach((item, index) => {
          if (phaseFor(item, index, state) !== phase.id) return;
          const id = `${framework.id}:${item.id}`, links = currentLinks(getModel(), state.links[id]);
          const pad = button('', () => { local.component = item.id; renderChange(container); }, 'cq-component', item.id === component.id, `component-${id}`);
          pad.append(node('strong', item.label), node('small', links.length ? links.map(tape => tape.name).join(' · ') : 'Choose supporting work'));
          lane.append(pad);
        });
        changeBoard.append(lane);
      }
      const record = `${framework.id}:${component.id}`;
      changeDetail.replaceChildren(node('h3', component.label), node('p', component.explanation));
      const timing = node('fieldset', undefined, 'cq-timing'); timing.append(node('legend', 'Work stage'));
      for (const phase of phases) timing.append(button(phase.label, () => change(model => { model.study.changeRack.phases[record] = phase.id; }, `${component.label}: ${phase.label}.`), 'cq-pad', phaseFor(component, framework.components.indexOf(component), state) === phase.id, `phase-${phase.id}`));
      changeDetail.append(timing, sessionPads('Supporting sessions', state.links[record] || [], (id, included) => change(model => toggleLink(model, 'changeRack', record, id, included), 'Supporting work updated.'), `change-link-${record}`), linkedNavigation(state.links[record] || []));
    });
  }

  const qualityReels = node('div', undefined, 'cq-reels');
  const qualityMonitor = section('Quality attention', 'cq-monitor');
  const monitorHead = node('div', undefined, 'cq-monitor__heading');
  const monitorText = node('strong'); const sigmaLabel = node('label', 'Sigma attention');
  const sigma = key(node('input'), 'sigma'); sigma.type = 'range'; sigma.min = '1'; sigma.max = '6'; sigma.step = '.5'; sigma.id = 'study-cq-sigma'; sigmaLabel.htmlFor = sigma.id;
  const sigmaValue = node('output'); sigmaValue.htmlFor = sigma.id;
  monitorHead.append(monitorText, sigmaValue); const screen = node('div', undefined, 'cq-monitor__screen');
  const monitorNote = node('p', 'An authored attention illustration. Review and recovery work supply the plan.', 'cq-note');
  qualityMonitor.append(monitorHead, screen, sigmaLabel, sigma, monitorNote);
  const qualityBoard = node('div', undefined, 'cq-board'); const qualityDetail = section('Selected check', 'cq-loaded');
  qualityRoot.append(qualityReels, qualityMonitor, qualityBoard, qualityDetail);
  sigma.addEventListener('pointerdown', () => { local.gesture += 1; });
  sigma.addEventListener('keydown', () => { local.gesture += 1; });
  sigma.addEventListener('input', () => change(model => { model.study.qualityRack.sigma = Number(sigma.value); }, `Sigma attention: ${sigma.value}.`, `cq-sigma-${local.gesture}`));

  function trace(attention, reviewNeeded) {
    const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 600 130'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path'); const points = [];
    for (let x = 0; x <= 600; x += 5) {
      const wave = Math.sin(x / 30) * (reviewNeeded ? 18 : 5);
      const peak = Math.exp(-((x - 300) ** 2) / (1000 + (7 - attention) * 650)) * 65;
      points.push(`${x ? 'L' : 'M'} ${x} ${105 - peak + wave}`);
    }
    path.setAttribute('d', points.join(' ')); svg.append(path); return svg;
  }
  function renderQuality(container) {
    mount(container, qualityRoot);
    selectedFocus(qualityRoot, () => {
      const state = getModel().study.qualityRack;
      const selected = checks.find(item => item.id === local.check) || checks[0];
      const reviewNeeded = state.sigma < 2.5 || (getModel().study.changeRack.attention.urgency >= 3 && state.sigma < 4);
      const choosePreset = (field, id) => change(model => { const value = model.study.qualityRack; value[field] = id; value.included = [...new Set([...value.included, id])]; local.check = id; }, 'Quality focus selected.');
      qualityReels.replaceChildren(reel('Before release', preparationChoices, state.preparation, id => choosePreset('preparation', id), 'preparation'), reel('After release', recoveryChoices, state.recovery, id => choosePreset('recovery', id), 'recovery'));
      qualityMonitor.dataset.attention = reviewNeeded ? 'review' : 'balanced';
      monitorText.textContent = reviewNeeded ? 'Make space for review' : 'Review & recovery in view';
      sigma.value = String(state.sigma); sigma.setAttribute('aria-valuetext', `${state.sigma} sigma attention`); sigmaValue.value = `${state.sigma}σ`;
      screen.replaceChildren(trace(state.sigma, reviewNeeded));
      qualityBoard.replaceChildren();
      for (const phase of phases) {
        const lane = section(phase.label, 'cq-lane');
        for (const check of checks.filter(item => item.phase === phase.id)) {
          const pad = button('', () => { local.check = check.id; renderQuality(container); }, 'cq-component', check.id === selected.id, `check-${check.id}`);
          pad.dataset.included = String(state.included.includes(check.id));
          pad.append(node('strong', check.name), node('small', state.included.includes(check.id) ? 'Included' : 'Available')); lane.append(pad);
        }
        qualityBoard.append(lane);
      }
      qualityDetail.replaceChildren(node('h3', selected.name), node('p', selected.description));
      const inclusion = node('label', undefined, 'cq-inclusion'); const include = key(node('input'), `include-${selected.id}`); include.type = 'checkbox'; include.checked = state.included.includes(selected.id);
      include.addEventListener('change', () => change(model => { const current = model.study.qualityRack; current.included = include.checked ? [...new Set([...current.included, selected.id])] : current.included.filter(id => id !== selected.id); }, 'Quality check updated.'));
      inclusion.append(include, node('span', 'Include this check')); qualityDetail.append(inclusion, node('p', selected.action, 'cq-check-action'));
      qualityDetail.append(sessionPads('Sessions that carry this check', state.links[selected.id] || [], (id, included) => change(model => toggleLink(model, 'qualityRack', selected.id, id, included), 'Quality support updated.'), `quality-link-${selected.id}`), linkedNavigation(state.links[selected.id] || []));
    });
  }
  return {
    change: { title: 'Change', description: 'Shape the work that helps a new practice take hold.', render: renderChange },
    quality: { title: 'Quality & recovery', description: 'Prepare the review. Rehearse recovery. Carry learning forward.', render: renderQuality },
  };
}
