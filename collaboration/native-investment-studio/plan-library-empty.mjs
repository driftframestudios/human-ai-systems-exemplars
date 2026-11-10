import { COORDINATION_STARTERS } from './coordination-starters.mjs';
import { createReel, revealReelResult } from './reel-control.mjs';
import { diagramArrowPath } from './diagram-geometry.mjs';

// This receiver owns presentation only. Loading and free creation remain with
// the canonical plan controller and its shared Undo history.
export function createPlanLibraryEmpty(root, { onLoad, onCreate }) {
  const document = root.ownerDocument;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const svgNode = (tag, attributes = {}, text) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let selected = COORDINATION_STARTERS[0], disposed = false;
  const element = node('section', undefined, 'studio-plan-starters');
  element.setAttribute('aria-label', 'Choose a working pattern'); element.hidden = true;
  const header = node('header', undefined, 'studio-plan-starters__heading');
  header.append(node('h4', 'Start with a working pattern'), node('p', 'Load a set of plans, then make it yours.'));
  const body = node('div', undefined, 'studio-plan-starters__body');
  const result = node('section', undefined, 'studio-plan-starters__result');
  const title = node('h5'), description = node('p');
  const viewport = node('div', undefined, 'studio-plan-starters__viewport');
  viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Working pattern diagram');
  const actions = node('div', undefined, 'native-coordination__actions studio-plan-starters__actions');
  const error = node('p', '', 'native-coordination__error studio-plan-starters__error'); error.setAttribute('role', 'alert'); error.hidden = true;
  const load = node('button', '', 'native-control--primary'), create = node('button', 'Create a plan', 'native-control--create');
  load.type = create.type = 'button';
  load.dataset.starterLoad = ''; create.dataset.starterCreate = '';
  const loadSelected = () => {
    if (disposed) return;
    const result = onLoad(selected.id, load);
    if (disposed) return;
    error.textContent = result?.ok === false ? result.error.message : '';
    error.hidden = !error.textContent;
  };
  const createPlan = () => { if (!disposed) onCreate(create); };
  load.addEventListener('click', loadSelected); create.addEventListener('click', createPlan);
  const reel = createReel(document, { label: 'Working pattern', choices: COORDINATION_STARTERS,
    value: selected.id, variant: 'cobalt', onSelect(id) {
      selected = COORDINATION_STARTERS.find(item => item.id === id); error.textContent = ''; error.hidden = true;
      render(); revealReelResult(result);
    } });
  actions.append(load, create); result.append(title, description, viewport, actions, error);
  body.append(reel.element, result); element.append(header, body); root.append(element);
  function render() {
    title.textContent = selected.label; description.textContent = selected.outcome;
    load.textContent = 'Load these plans'; element.dataset.starter = selected.id;
    const svg = svgNode('svg', { viewBox: '0 0 660 190', role: 'img', 'aria-label': selected.sessions.map(item => item.label).join(' leads to ') });
    svg.append(svgNode('title', {}, selected.outcome));
    for (const [start, end] of [[[196, 81], [234, 81]], [[416, 81], [454, 81]]]) {
      const edge = svgNode('g', { class: 'studio-diagram__edge' });
      edge.append(svgNode('path', { d: diagramArrowPath({ start, end, shaftWidth: 4, headWidth: 13, headLength: 12 }), class: 'studio-diagram__arrow' })); svg.append(edge);
    }
    const returning = svgNode('g', { class: 'studio-diagram__edge', 'data-direction': 'return' });
    returning.append(svgNode('path', { d: diagramArrowPath({ start: [545, 120], end: [105, 120], control1: [545, 176], control2: [105, 176], shaftWidth: 3, headWidth: 11, headLength: 10 }), class: 'studio-diagram__arrow' }));
    svg.append(returning, svgNode('text', { x: 330, y: 179, 'text-anchor': 'middle', class: 'studio-plan-starters__return' }, 'Review and adjust'));
    selected.sessions.forEach((item, index) => {
      const x = 15 + index * 220;
      const group = svgNode('g', { class: 'studio-plan-starters__node' });
      group.append(svgNode('rect', { x, y: 40, width: 180, height: 80, rx: 6 }));
      const words = item.label.split(' '), split = Math.ceil(words.length / 2);
      for (const [line, text] of [words.slice(0, split).join(' '), words.slice(split).join(' ')].entries())
        group.append(svgNode('text', { x: x + 90, y: 65 + line * 18, 'text-anchor': 'middle' }, text));
      group.append(svgNode('text', { x: x + 90, y: 106, 'text-anchor': 'middle', class: 'studio-plan-starters__duration' },
        `${item.minutes} min · ${item.occurrences} ${item.occurrences === 1 ? 'session' : 'sessions'}`));
      svg.append(group);
    });
    viewport.replaceChildren(svg);
  }
  render();
  return Object.freeze({ refresh(visible) { if (!disposed) element.hidden = !visible; }, dispose() {
    if (disposed) return; disposed = true; reel.dispose();
    load.removeEventListener('click', loadSelected); create.removeEventListener('click', createPlan); element.remove();
  } });
}
