(function (root, factory) {
  "use strict";

  const graph = factory();
  if (typeof module === "object" && module.exports) module.exports = graph;
  root.ContextCanvasWhoToBelieveSystemGraph = graph;
}(typeof globalThis === "object" ? globalThis : this, function () {
"use strict";

const MODES = new Set(["symfony", "spring"]);
const MODE_LABELS = Object.freeze({
  symfony: "Symfony PHP monolith",
  spring: "Partial Spring Boot migration",
});
const STATUSES = new Set(["ok", "strained", "broken"]);
const DIMENSIONS = new Set(["abuse", "misfit", "core", "forecast"]);
const ACTIONS = new Set(["SET_MODE", "SET_DIMENSION", "SELECT_NODE", "RESET"]);
const MODE_CONTROL_SELECTOR = "[data-graph-mode-control]";
const DIMENSION_CONTROL_SELECTOR = "[data-graph-dimension-control]";
const INITIAL_STATE = Object.freeze({
  mode: "symfony",
  dimension: "all",
  selectedNodeId: "household",
  announcement: "The system graph is ready. Household profile is selected.",
});

// These coordinates and dimensions are the original Review Routing graph's
// presentation contract. CSS owns color and emphasis; SVG owns geometry.
const COLUMN_X = Object.freeze([130, 420, 710, 1000]);
const ROW_START = 110;
const ROW_GAP = 82;
const ROW_Y = row => ROW_START + row * ROW_GAP;
const NODE_WIDTH = 190;
const NODE_HEIGHT = 52;
const VIEWBOX_WIDTH = 1130;
const VIEWBOX_HEIGHT = 600;
// Admission follows the owned geometry so every accepted node remains visible.
const MAX_RENDERABLE_ROW = Math.floor((VIEWBOX_HEIGHT - NODE_HEIGHT / 2 - ROW_START) / ROW_GAP);

const TOKEN_IDREF_ATTRIBUTES = Object.freeze([
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
  "headers",
]);
const SINGLE_IDREF_ATTRIBUTES = Object.freeze([
  "aria-activedescendant",
  "for",
  "form",
  "list",
  "popovertarget",
]);
const FRAGMENT_REFERENCE_ATTRIBUTES = Object.freeze(["href", "xlink:href"]);

const mountedGraphs = new WeakMap();
let mountSequence = 0;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value) {
  return Number.isInteger(value) ? value : Number.NaN;
}

function nodeFitsViewBox(col, row) {
  const x = COLUMN_X[col];
  const y = ROW_Y(row);
  return Number.isFinite(x)
    && Number.isFinite(y)
    && x - NODE_WIDTH / 2 >= 0
    && x + NODE_WIDTH / 2 <= VIEWBOX_WIDTH
    && y - NODE_HEIGHT / 2 >= 0
    && y + NODE_HEIGHT / 2 <= VIEWBOX_HEIGHT;
}

function freezeGraph(model) {
  for (const dimension of model.dimensions) Object.freeze(dimension);
  for (const node of model.nodes) {
    Object.freeze(node.dims);
    Object.freeze(node.stack);
    Object.freeze(node.status);
    Object.freeze(node.note);
    Object.freeze(node);
  }
  for (const edge of model.edges) {
    Object.freeze(edge.status);
    Object.freeze(edge);
  }
  Object.freeze(model.columns);
  Object.freeze(model.dimensions);
  Object.freeze(model.nodes);
  Object.freeze(model.edges);
  Object.freeze(model.defaults);
  return Object.freeze(model);
}

/**
 * Admit the finite graph contract before the interactive view uses any value.
 * Admission keeps the static reading available whenever data is incomplete.
 */
function validateSystemGraphContract(input) {
  const errors = [];
  const add = message => {
    if (errors.length < 50) errors.push(message);
  };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["The graph contract must be one JSON object."] };
  }

  if (input.schemaVersion !== "1.0.0") add("schemaVersion must be 1.0.0.");
  if (!Array.isArray(input.columns) || input.columns.length !== COLUMN_X.length) {
    add("columns must contain the four declared graph columns.");
  }
  if (!Array.isArray(input.dimensions) || input.dimensions.length !== DIMENSIONS.size) {
    add("dimensions must contain the four declared concern lenses.");
  }
  if (!Array.isArray(input.nodes) || input.nodes.length === 0) add("nodes must be a populated array.");
  if (!Array.isArray(input.edges) || input.edges.length === 0) add("edges must be a populated array.");

  const columns = Array.isArray(input.columns) ? input.columns.map(text) : [];
  const columnLabels = new Set();
  for (const [index, label] of columns.entries()) {
    if (!label) add(`columns[${index}] must be present.`);
    if (columnLabels.has(label)) add(`columns[${index}] duplicates ${label}.`);
    if (label) columnLabels.add(label);
  }

  const dimensions = [];
  const dimensionIds = new Set();
  for (const [index, candidate] of (Array.isArray(input.dimensions) ? input.dimensions : []).entries()) {
    const id = text(candidate?.id);
    const label = text(candidate?.label);
    const color = text(candidate?.color);
    if (!DIMENSIONS.has(id)) add(`dimensions[${index}].id is outside the declared vocabulary.`);
    if (dimensionIds.has(id)) add(`dimensions[${index}].id duplicates ${id}.`);
    if (!label) add(`dimensions[${index}].label must be present.`);
    if (!/^#[0-9a-f]{6}$/iu.test(color)) add(`dimensions[${index}].color must be a six-digit hexadecimal color.`);
    if (id) dimensionIds.add(id);
    dimensions.push({ id, label, color });
  }

  const nodes = [];
  const nodeIds = new Set();
  const nodePositions = new Set();
  for (const [index, candidate] of (Array.isArray(input.nodes) ? input.nodes : []).entries()) {
    const id = text(candidate?.id);
    const label = text(candidate?.label);
    const col = integer(candidate?.col);
    const row = integer(candidate?.row);
    const dims = Array.isArray(candidate?.dims) ? candidate.dims.map(text) : [];

    if (!id || !/^[a-z][a-z0-9-]*$/u.test(id)) add(`nodes[${index}].id must be a stable lowercase identity.`);
    if (nodeIds.has(id)) add(`nodes[${index}].id duplicates ${id}.`);
    if (!label) add(`nodes[${index}].label must be present.`);
    if (!Number.isInteger(col) || col < 0 || col >= columns.length) add(`nodes[${index}].col must identify a declared column.`);
    if (!Number.isInteger(row) || row < 0 || row > MAX_RENDERABLE_ROW) {
      add(`nodes[${index}].row must be an integer from 0 through ${MAX_RENDERABLE_ROW} so the complete node fits the graph viewBox.`);
    } else if (Number.isInteger(col) && col >= 0 && col < columns.length && !nodeFitsViewBox(col, row)) {
      add(`nodes[${index}] must place the complete node within the graph viewBox.`);
    }
    const position = `${col}:${row}`;
    if (Number.isInteger(col) && Number.isInteger(row) && nodePositions.has(position)) {
      add(`nodes[${index}] duplicates graph position ${position}.`);
    }
    if (dims.length === 0) add(`nodes[${index}].dims must name at least one concern.`);
    if (new Set(dims).size !== dims.length) add(`nodes[${index}].dims contains a duplicate concern.`);
    for (const dimension of dims) {
      if (!DIMENSIONS.has(dimension)) add(`nodes[${index}].dims includes unknown concern ${dimension || "(empty)"}.`);
    }

    const stack = {};
    const status = {};
    const note = {};
    for (const mode of MODES) {
      stack[mode] = text(candidate?.stack?.[mode]);
      status[mode] = text(candidate?.status?.[mode]);
      note[mode] = text(candidate?.note?.[mode]);
      if (!stack[mode]) add(`nodes[${index}].stack.${mode} must be present.`);
      if (!STATUSES.has(status[mode])) add(`nodes[${index}].status.${mode} is outside the declared vocabulary.`);
      if (!note[mode]) add(`nodes[${index}].note.${mode} must be present.`);
    }

    if (id) nodeIds.add(id);
    if (Number.isInteger(col) && Number.isInteger(row)) nodePositions.add(position);
    nodes.push({ id, label, col, row, dims, stack, status, note });
  }

  const edges = [];
  const edgeIds = new Set();
  // One directed pair owns one visible lane in this simple graph renderer.
  const directedRelationships = new Set();
  for (const [index, candidate] of (Array.isArray(input.edges) ? input.edges : []).entries()) {
    const id = text(candidate?.id);
    const from = text(candidate?.from);
    const to = text(candidate?.to);
    const label = text(candidate?.label);
    if (!id || !/^[a-z][a-z0-9-]*$/u.test(id)) add(`edges[${index}].id must be a stable lowercase identity.`);
    if (edgeIds.has(id)) add(`edges[${index}].id duplicates ${id}.`);
    if (!nodeIds.has(from)) add(`edges[${index}].from references unknown node ${from || "(empty)"}.`);
    if (!nodeIds.has(to)) add(`edges[${index}].to references unknown node ${to || "(empty)"}.`);
    if (from && from === to) add(`edges[${index}] must connect two distinct nodes.`);
    const relationship = `${from}\u0000${to}`;
    if (from && to && directedRelationships.has(relationship)) {
      add(`edges[${index}] duplicates directed relationship ${from} → ${to}.`);
    }
    const status = {};
    for (const mode of MODES) {
      status[mode] = text(candidate?.status?.[mode]);
      if (!STATUSES.has(status[mode])) add(`edges[${index}].status.${mode} is outside the declared vocabulary.`);
    }
    if (id) edgeIds.add(id);
    if (from && to) directedRelationships.add(relationship);
    edges.push({ id, from, to, label, status });
  }

  const defaultMode = text(input.defaults?.mode);
  const defaultDimension = text(input.defaults?.dimension);
  const defaultSelection = text(input.defaults?.selectedNode);
  if (defaultMode !== INITIAL_STATE.mode) add(`defaults.mode must be ${INITIAL_STATE.mode}.`);
  if (defaultDimension !== INITIAL_STATE.dimension) add(`defaults.dimension must be ${INITIAL_STATE.dimension}.`);
  if (defaultSelection !== INITIAL_STATE.selectedNodeId) {
    add(`defaults.selectedNode must be ${INITIAL_STATE.selectedNodeId}.`);
  }
  if (!nodeIds.has(INITIAL_STATE.selectedNodeId)) add(`nodes must include the initial ${INITIAL_STATE.selectedNodeId} selection.`);
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    model: freezeGraph({
      schemaVersion: input.schemaVersion,
      columns,
      dimensions,
      nodes,
      edges,
      defaults: {
        mode: defaultMode,
        dimension: defaultDimension,
        selectedNode: defaultSelection,
      },
    }),
  };
}

function initialSystemGraphState(model) {
  if (
    model?.defaults?.mode !== INITIAL_STATE.mode
    || model.defaults.dimension !== INITIAL_STATE.dimension
    || model.defaults.selectedNode !== INITIAL_STATE.selectedNodeId
    || !model.nodes?.some(node => node.id === INITIAL_STATE.selectedNodeId)
  ) {
    throw new TypeError("The admitted graph must include its initial household selection.");
  }
  return Object.freeze({ ...INITIAL_STATE });
}

/** One finite transition vocabulary feeds pointer, keyboard, and touch input. */
function transitionSystemGraph(model, state, action) {
  if (!action || !ACTIONS.has(action.type)) return state;
  // The admitted model and closed vocabularies retain visitor-facing wording
  // authority while callers supply transition requests.
  switch (action.type) {
    case "SET_MODE":
      if (!MODES.has(action.value) || action.value === state.mode) return state;
      return Object.freeze({
        ...state,
        mode: action.value,
        announcement: `Architecture state changed to ${MODE_LABELS[action.value]}.`,
      });
    case "SET_DIMENSION": {
      const dimension = action.value === "all" || DIMENSIONS.has(action.value) ? action.value : null;
      if (!dimension || dimension === state.dimension) return state;
      const dimensionLabel = dimension === "all"
        ? "All dimensions"
        : model.dimensions.find(candidate => candidate.id === dimension)?.label;
      if (!dimensionLabel) return state;
      return Object.freeze({
        ...state,
        dimension,
        announcement: `Concern changed to ${dimensionLabel}.`,
      });
    }
    case "SELECT_NODE": {
      const node = model.nodes.find(candidate => candidate.id === action.value);
      if (!node || node.id === state.selectedNodeId) return state;
      return Object.freeze({
        ...state,
        selectedNodeId: node.id,
        announcement: `${node.label} selected.`,
      });
    }
    case "RESET":
      return state.mode === INITIAL_STATE.mode
        && state.dimension === INITIAL_STATE.dimension
        && state.selectedNodeId === INITIAL_STATE.selectedNodeId
        ? state
        : initialSystemGraphState(model);
    default:
      return state;
  }
}

function nodeMatches(node, dimension) {
  return dimension === "all" || node.dims.includes(dimension);
}

function countStatuses(model, mode) {
  if (!MODES.has(mode)) return null;
  const counts = { ok: 0, strained: 0, broken: 0 };
  for (const node of model.nodes) counts[node.status[mode]] += 1;
  return Object.freeze(counts);
}

function statusLabel(status) {
  return { ok: "Working", strained: "Degraded", broken: "Breaking" }[status] ?? "Unknown";
}

function element(document, name, className, content) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function svgElement(document, name, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function parseContract(root, document) {
  const contractId = root.getAttribute("data-contract-id");
  const source = contractId ? document.getElementById(contractId) : null;
  if (!source) return { ok: false, errors: ["The graph data block is unavailable."] };
  try {
    return validateSystemGraphContract(JSON.parse(source.textContent));
  } catch (error) {
    return { ok: false, errors: [`The graph data block is invalid JSON: ${error.message}`] };
  }
}

function inspectMountDom(root) {
  const errors = [];
  const required = [
    ["[data-graph-title]", "graph title"],
    ["[data-graph-error]", "fallback message"],
    ["[data-graph-enhancement]", "enhancement region"],
    ["[data-status-summary]", "status legend"],
    ["[data-graph-svg]", "graph canvas"],
    ["[data-detail-panel]", "selected-node panel"],
    ["[data-detail-status]", "detail status"],
    ["[data-detail-title]", "detail title"],
    ["[data-detail-stack]", "detail implementation"],
    ["[data-detail-note]", "detail consequence"],
    ["[data-detail-neighbors]", "detail connections"],
    ["[data-detail-concerns]", "detail concerns"],
    ["[data-graph-status]", "live status"],
    [".wtb-system-graph__reading", "semantic reading"],
  ];
  for (const [selector, label] of required) {
    if (root.querySelectorAll(selector).length !== 1) errors.push(`The graph requires one ${label} (${selector}).`);
  }

  const modeControls = Array.from(root.querySelectorAll(MODE_CONTROL_SELECTOR));
  const dimensionControls = Array.from(root.querySelectorAll(DIMENSION_CONTROL_SELECTOR));
  const modeValues = new Set(modeControls.map(control => control.value));
  const dimensionValues = new Set(dimensionControls.map(control => control.value));
  if (
    modeControls.length !== MODES.size
    || modeControls.some(control => !control.matches('input[type="radio"]'))
    || modeValues.size !== MODES.size
    || [...MODES].some(value => !modeValues.has(value))
  ) {
    errors.push("The graph comparison controls must carry the complete mode vocabulary.");
  }
  const expectedDimensions = new Set(["all", ...DIMENSIONS]);
  if (
    dimensionControls.length !== expectedDimensions.size
    || dimensionControls.some(control => !control.matches('input[type="radio"]'))
    || dimensionValues.size !== expectedDimensions.size
    || [...expectedDimensions].some(value => !dimensionValues.has(value))
  ) {
    errors.push("The graph concern controls must carry the complete dimension vocabulary.");
  }
  return errors;
}

function isolateMountDom(root, mountId) {
  const modeControls = Array.from(root.querySelectorAll(MODE_CONTROL_SELECTOR));
  const dimensionControls = Array.from(root.querySelectorAll(DIMENSION_CONTROL_SELECTOR));
  for (const control of modeControls) control.name = `wtb-system-mode-${mountId}`;
  for (const control of dimensionControls) control.name = `wtb-system-dimension-${mountId}`;

  // A cloned graph keeps every accessible relationship local while the
  // sibling JSON contract retains its page-level identity.
  const identifiedElements = [root, ...root.querySelectorAll("[id]")]
    .filter(element => element.hasAttribute("id"));
  const isolatedIds = new Map();
  for (const element of identifiedElements) {
    const currentId = element.id;
    if (!currentId) continue;
    const isolatedId = `${currentId}-${mountId}`;
    isolatedIds.set(currentId, isolatedId);
    element.id = isolatedId;
  }

  const allElements = [root, ...root.querySelectorAll("*")];
  for (const element of allElements) {
    for (const attribute of TOKEN_IDREF_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const isolated = current
        .trim()
        .split(/\s+/u)
        .map(id => isolatedIds.get(id) ?? id)
        .join(" ");
      element.setAttribute(attribute, isolated);
    }
    for (const attribute of SINGLE_IDREF_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current && isolatedIds.has(current)) element.setAttribute(attribute, isolatedIds.get(current));
    }
    for (const attribute of FRAGMENT_REFERENCE_ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (!current?.startsWith("#")) continue;
      const targetId = current.slice(1);
      if (isolatedIds.has(targetId)) element.setAttribute(attribute, `#${isolatedIds.get(targetId)}`);
    }
  }

  // Required names also recover when repaired markup supplies the semantic
  // element using its replacement or generated ID.
  const graphTitle = root.querySelector("[data-graph-title]");
  if (graphTitle) {
    if (!graphTitle.id) graphTitle.id = `wtb-system-graph-title-${mountId}`;
    root.setAttribute("aria-labelledby", graphTitle.id);
  } else {
    root.removeAttribute("aria-labelledby");
  }

  const detailPanel = root.querySelector("[data-detail-panel]");
  const detailTitle = root.querySelector("[data-detail-title]");
  if (detailPanel && detailTitle) {
    if (!detailTitle.id) detailTitle.id = `wtb-system-detail-title-${mountId}`;
    detailPanel.setAttribute("aria-labelledby", detailTitle.id);
  } else {
    detailPanel?.removeAttribute("aria-labelledby");
  }

  return { dimensionControls, modeControls };
}

function fallbackController(root, errors, error, enhancement, browser) {
  if (error) {
    error.hidden = false;
    error.textContent = "The complete system reading is ready below. The interactive view needs a repaired data or page structure before it can start.";
  }
  if (enhancement) enhancement.hidden = true;
  const reading = root.querySelector(".wtb-system-graph__reading");
  if (reading) reading.open = true;
  root.dataset.graphState = "fallback";
  browser.console?.error?.(`Who To Believe system graph startup reported validation errors:\n${errors.join("\n")}`);
  let destroyed = false;
  const controller = Object.freeze({
    ok: false,
    errors: Object.freeze([...errors]),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      mountedGraphs.delete(root);
    },
  });
  mountedGraphs.set(root, controller);
  return controller;
}

function renderLegend(container, counts, document) {
  const fragment = document.createDocumentFragment();
  for (const status of STATUSES) {
    const item = element(document, "span", "wtb-system-graph__legend-item");
    item.dataset.status = status;
    const swatch = element(document, "span", "wtb-system-graph__legend-swatch");
    swatch.dataset.status = status;
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, `${statusLabel(status)} · ${counts[status]}`);
    fragment.append(item);
  }
  container.replaceChildren(fragment);
}

function graphPosition(model) {
  return new Map(model.nodes.map(node => [node.id, {
    x: COLUMN_X[node.col],
    y: ROW_Y(node.row),
  }]));
}

function renderGraph(svg, model, state, document, hatchId) {
  const positions = graphPosition(model);
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const dimensionById = new Map(model.dimensions.map(dimension => [dimension.id, dimension]));
  const connected = new Set(
    model.edges
      .filter(edge => edge.from === state.selectedNodeId || edge.to === state.selectedNodeId)
      .flatMap(edge => [edge.from, edge.to]),
  );
  const fragment = document.createDocumentFragment();

  const defs = svgElement(document, "defs");
  const pattern = svgElement(document, "pattern", {
    id: hatchId,
    width: 6,
    height: 6,
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)",
  });
  const hatch = svgElement(document, "line", { x1: 0, y1: 0, x2: 0, y2: 6, "stroke-width": 2 });
  hatch.classList.add("wtb-system-graph__hatch-line");
  pattern.append(hatch);
  defs.append(pattern);
  fragment.append(defs);

  for (const [columnIndex, column] of model.columns.entries()) {
    const heading = svgElement(document, "text", {
      x: COLUMN_X[columnIndex],
      y: 50,
      "text-anchor": "middle",
    });
    heading.classList.add("wtb-system-graph__column-label");
    heading.textContent = column.toUpperCase();
    fragment.append(heading);
  }

  for (const edge of model.edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    const selected = edge.from === state.selectedNodeId || edge.to === state.selectedNodeId;
    const inDimension = nodeMatches(fromNode, state.dimension) && nodeMatches(toNode, state.dimension);
    const x1 = from.x + NODE_WIDTH / 2;
    const x2 = to.x - NODE_WIDTH / 2;
    const sameColumn = from.x === to.x;
    const pathData = sameColumn
      ? `M${from.x + NODE_WIDTH / 2} ${from.y} C${from.x + NODE_WIDTH / 2 + 50} ${from.y} ${to.x + NODE_WIDTH / 2 + 50} ${to.y} ${to.x + NODE_WIDTH / 2} ${to.y}`
      : `M${x1} ${from.y} C${(x1 + x2) / 2} ${from.y} ${(x1 + x2) / 2} ${to.y} ${x2} ${to.y}`;
    const group = svgElement(document, "g");
    group.classList.add("wtb-system-graph__edge-group");
    group.dataset.edgeId = edge.id;
    group.dataset.status = edge.status[state.mode];
    group.dataset.selected = String(selected);
    group.dataset.inDimension = String(inDimension);
    const path = svgElement(document, "path", { d: pathData });
    path.classList.add("wtb-system-graph__edge");
    path.dataset.edgeId = edge.id;
    path.dataset.status = edge.status[state.mode];
    path.dataset.selected = String(selected);
    path.dataset.inDimension = String(inDimension);
    group.append(path);
    if (edge.label && selected) {
      const label = svgElement(document, "text", {
        x: (x1 + x2) / 2,
        y: (from.y + to.y) / 2 - 6,
        "text-anchor": "middle",
      });
      label.classList.add("wtb-system-graph__edge-label");
      label.dataset.status = edge.status[state.mode];
      label.textContent = edge.label;
      group.append(label);
    }
    fragment.append(group);
  }

  for (const node of model.nodes) {
    const position = positions.get(node.id);
    const status = node.status[state.mode];
    const selected = node.id === state.selectedNodeId;
    const inDimension = nodeMatches(node, state.dimension);
    const nodeGroup = svgElement(document, "g", {
      role: "button",
      tabindex: 0,
      "aria-pressed": String(selected),
      "aria-label": `${node.label}. ${statusLabel(status)}. ${node.stack[state.mode]}.`,
    });
    nodeGroup.classList.add("wtb-system-graph__node");
    nodeGroup.dataset.nodeId = node.id;
    nodeGroup.dataset.status = status;
    nodeGroup.dataset.selected = String(selected);
    nodeGroup.dataset.connected = String(connected.has(node.id));
    nodeGroup.dataset.inDimension = String(inDimension);

    if (status === "broken") {
      const base = svgElement(document, "rect", {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      base.classList.add("wtb-system-graph__node-broken-base");
      nodeGroup.append(base);
    }

    const frame = svgElement(document, "rect", {
      x: position.x - NODE_WIDTH / 2,
      y: position.y - NODE_HEIGHT / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
    frame.classList.add("wtb-system-graph__node-frame");
    frame.dataset.status = status;
    frame.dataset.selected = String(selected);
    if (status === "broken") frame.style.setProperty("--graph-node-fill", `url(#${hatchId})`);
    nodeGroup.append(frame);

    if (status === "broken") {
      const band = svgElement(document, "rect", {
        x: position.x - NODE_WIDTH / 2 + 6,
        y: position.y - 11,
        width: NODE_WIDTH - 12,
        height: 22,
      });
      band.classList.add("wtb-system-graph__node-label-band");
      nodeGroup.append(band);
    }

    const label = svgElement(document, "text", {
      x: position.x,
      y: position.y + 4,
      "text-anchor": "middle",
    });
    label.classList.add("wtb-system-graph__node-label");
    label.dataset.status = status;
    label.dataset.selected = String(selected);
    label.textContent = node.label;
    nodeGroup.append(label);

    for (const [index, dimension] of node.dims.entries()) {
      const dot = svgElement(document, "circle", {
        cx: position.x + NODE_WIDTH / 2 - 8 - index * 9,
        cy: position.y - NODE_HEIGHT / 2 + 8,
        r: 3,
      });
      dot.classList.add("wtb-system-graph__node-dot");
      dot.dataset.dimension = dimension;
      dot.setAttribute("fill", dimensionById.get(dimension).color);
      nodeGroup.append(dot);
    }
    fragment.append(nodeGroup);
  }

  svg.setAttribute("viewBox", `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`);
  svg.replaceChildren(fragment);
}

function renderDetails(elements, model, state, document) {
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const dimensionById = new Map(model.dimensions.map(dimension => [dimension.id, dimension]));
  const selected = nodeById.get(state.selectedNodeId);
  const status = selected.status[state.mode];

  elements.panel.dataset.status = status;
  elements.status.textContent = statusLabel(status).toUpperCase();
  elements.status.dataset.status = status;
  elements.title.textContent = selected.label;
  elements.stack.textContent = selected.stack[state.mode];
  elements.note.textContent = selected.note[state.mode];

  const concernFragment = document.createDocumentFragment();
  for (const dimension of selected.dims) {
    const tag = element(document, "span", "wtb-system-graph__tag", dimensionById.get(dimension).label);
    tag.dataset.dimension = dimension;
    tag.style.setProperty("--tag-color", dimensionById.get(dimension).color);
    concernFragment.append(tag);
  }
  elements.concerns.replaceChildren(concernFragment);

  const neighborFragment = document.createDocumentFragment();
  for (const edge of model.edges.filter(candidate => candidate.from === selected.id || candidate.to === selected.id)) {
    const outbound = edge.from === selected.id;
    const other = nodeById.get(outbound ? edge.to : edge.from);
    const edgeState = statusLabel(edge.status[state.mode]);
    const directionLabel = outbound ? "Outgoing connection to" : "Incoming connection from";
    const viaLabel = edge.label ? ` via ${edge.label}` : "";
    const button = element(document, "button", "wtb-system-graph__neighbor");
    button.type = "button";
    button.dataset.nodeId = other.id;
    button.dataset.status = edge.status[state.mode];
    button.setAttribute(
      "aria-label",
      `${directionLabel} ${other.label}${viaLabel}. ${edgeState}.`,
    );
    const relation = element(document, "span", "wtb-system-graph__neighbor-node", `${outbound ? "→" : "←"} ${other.label}`);
    const relationStatus = element(document, "span", "wtb-system-graph__neighbor-status", edgeState);
    button.append(relation, relationStatus);
    neighborFragment.append(button);
  }
  elements.neighbors.replaceChildren(neighborFragment);
}

function focusSelected(root, selectedNodeId) {
  const selected = root.querySelector(`.wtb-system-graph__node[data-node-id="${selectedNodeId}"]`);
  const scroller = root.querySelector(".wtb-system-graph__canvas-scroll");
  if (!selected || !scroller) return;

  selected.focus({ preventScroll: true });
  const selectedBox = selected.getBoundingClientRect();
  const scrollerBox = scroller.getBoundingClientRect();
  const visibleLeft = scrollerBox.left + scroller.clientLeft;
  const visibleRight = visibleLeft + scroller.clientWidth;
  if (selectedBox.left < visibleLeft) {
    scroller.scrollLeft -= visibleLeft - selectedBox.left;
  } else if (selectedBox.right > visibleRight) {
    scroller.scrollLeft += selectedBox.right - visibleRight;
  }
}

function mountSystemGraph(root, document = globalThis.document, browser = globalThis) {
  if (!root || !document) return null;
  if (mountedGraphs.has(root)) return mountedGraphs.get(root);

  const mountId = ++mountSequence;
  const isolatedControls = isolateMountDom(root, mountId);

  const admission = parseContract(root, document);
  const error = root.querySelector("[data-graph-error]");
  const enhancement = root.querySelector("[data-graph-enhancement]");
  if (!admission.ok) return fallbackController(root, admission.errors, error, enhancement, browser);

  const mountErrors = inspectMountDom(root);
  if (mountErrors.length > 0) return fallbackController(root, mountErrors, error, enhancement, browser);

  const model = admission.model;
  let state = initialSystemGraphState(model);
  let destroyed = false;
  const modeControls = isolatedControls.modeControls;
  const dimensionControls = isolatedControls.dimensionControls;
  const summary = root.querySelector("[data-status-summary]");
  const svg = root.querySelector("[data-graph-svg]");
  const liveStatus = root.querySelector("[data-graph-status]");
  const reading = root.querySelector(".wtb-system-graph__reading");
  const hatchId = `wtb-system-hatch-${mountId}`;
  const details = {
    panel: root.querySelector("[data-detail-panel]"),
    status: root.querySelector("[data-detail-status]"),
    title: root.querySelector("[data-detail-title]"),
    stack: root.querySelector("[data-detail-stack]"),
    note: root.querySelector("[data-detail-note]"),
    neighbors: root.querySelector("[data-detail-neighbors]"),
    concerns: root.querySelector("[data-detail-concerns]"),
  };

  root.dataset.graphState = "enhanced";
  enhancement.hidden = false;
  error.hidden = true;
  error.textContent = "";
  reading.open = false;

  const render = () => {
    for (const control of modeControls) control.checked = control.value === state.mode;
    for (const control of dimensionControls) control.checked = control.value === state.dimension;
    renderLegend(summary, countStatuses(model, state.mode), document);
    renderGraph(svg, model, state, document, hatchId);
    renderDetails(details, model, state, document);
    liveStatus.textContent = state.announcement;
  };

  const apply = (action, { focus = false } = {}) => {
    if (destroyed) return state;
    const next = transitionSystemGraph(model, state, action);
    if (next === state) return state;
    state = next;
    render();
    if (focus) focusSelected(root, state.selectedNodeId);
    return state;
  };

  const onChange = event => {
    if (!event.target || typeof event.target.matches !== "function") return;
    if (event.target.matches(MODE_CONTROL_SELECTOR)) {
      apply({ type: "SET_MODE", value: event.target.value });
    } else if (event.target.matches(DIMENSION_CONTROL_SELECTOR)) {
      apply({ type: "SET_DIMENSION", value: event.target.value });
    }
  };

  const selectFromTarget = target => {
    if (!target || typeof target.closest !== "function") return false;
    const nodeControl = target.closest("[data-node-id]");
    if (!nodeControl || !root.contains(nodeControl)) return false;
    const node = model.nodes.find(candidate => candidate.id === nodeControl.dataset.nodeId);
    if (!node) return false;
    apply({ type: "SELECT_NODE", value: node.id }, { focus: true });
    return true;
  };

  const onClick = event => {
    selectFromTarget(event.target);
  };

  const onKeydown = event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.target || typeof event.target.closest !== "function") return;
    const nodeControl = event.target.closest(".wtb-system-graph__node[data-node-id]");
    if (!nodeControl || !root.contains(nodeControl)) return;
    event.preventDefault();
    selectFromTarget(nodeControl);
  };

  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  render();

  const controller = Object.freeze({
    ok: true,
    model,
    getState: () => state,
    dispatch: action => apply(action),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.removeEventListener("change", onChange);
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeydown);
      enhancement.hidden = true;
      reading.open = true;
      root.dataset.graphState = "static";
      mountedGraphs.delete(root);
    },
  });
  mountedGraphs.set(root, controller);
  return controller;
}

function start() {
  for (const root of document.querySelectorAll("[data-wtb-system-graph]")) mountSystemGraph(root);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

return Object.freeze({
  countStatuses,
  initialSystemGraphState,
  mountSystemGraph,
  transitionSystemGraph,
  validateSystemGraphContract,
});
}));
