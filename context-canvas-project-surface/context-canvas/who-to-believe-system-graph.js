(function (root, factory) {
  "use strict";

  const graph = factory();
  if (typeof module === "object" && module.exports) module.exports = graph;
  root.ContextCanvasWhoToBelieveSystemGraph = graph;
}(typeof globalThis === "object" ? globalThis : this, function () {
"use strict";

const MODES = new Set(["symfony", "spring"]);
const STATUSES = new Set(["ok", "strained", "broken"]);
const DIMENSIONS = new Set(["abuse", "misfit", "core", "forecast"]);
const ACTIONS = new Set([
  "SET_MODE",
  "SET_DIMENSION",
  "SET_START",
  "SET_END",
  "TRACE_ROUTE",
  "SELECT_NODE",
  "STEP_ROUTE",
  "RESET",
]);

const mountedGraphs = new WeakMap();
let mountSequence = 0;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value) {
  return Number.isInteger(value) ? value : Number.NaN;
}

function freezeRecord(record) {
  return Object.freeze({ ...record });
}

function freezeGraph(model) {
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
  Object.freeze(model.defaults.routes);
  Object.freeze(model.defaults);
  return Object.freeze(model);
}

/**
 * Admit one finite graph contract before any interactive view uses it.
 * The visitor receives the complete static reading when admission reports errors.
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
  if (!Array.isArray(input.columns) || input.columns.length !== 4) {
    add("columns must contain the four declared graph columns.");
  }
  if (!Array.isArray(input.dimensions) || input.dimensions.length !== 4) {
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
  for (const [index, dimension] of (Array.isArray(input.dimensions) ? input.dimensions : []).entries()) {
    const id = text(dimension?.id);
    const label = text(dimension?.label);
    if (!DIMENSIONS.has(id)) add(`dimensions[${index}].id is outside the declared vocabulary.`);
    if (dimensionIds.has(id)) add(`dimensions[${index}].id duplicates ${id}.`);
    if (!label) add(`dimensions[${index}].label must be present.`);
    if (id) dimensionIds.add(id);
    dimensions.push(freezeRecord({ id, label }));
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
    if (!Number.isInteger(row) || row < 0 || row > 20) add(`nodes[${index}].row must be an integer from 0 through 20.`);
    const position = `${col}:${row}`;
    if (Number.isInteger(col) && Number.isInteger(row) && nodePositions.has(position)) {
      add(`nodes[${index}] duplicates graph position ${position}.`);
    }
    if (dims.length === 0) add(`nodes[${index}].dims must name at least one concern.`);
    if (new Set(dims).size !== dims.length) add(`nodes[${index}].dims contains a duplicate concern.`);
    for (const dim of dims) if (!DIMENSIONS.has(dim)) add(`nodes[${index}].dims includes unknown concern ${dim || "(empty)"}.`);

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
    const status = {};
    for (const mode of MODES) {
      status[mode] = text(candidate?.status?.[mode]);
      if (!STATUSES.has(status[mode])) add(`edges[${index}].status.${mode} is outside the declared vocabulary.`);
    }
    if (id) edgeIds.add(id);
    edges.push({ id, from, to, label, status });
  }

  const defaultMode = text(input.defaults?.mode);
  const defaultDimension = text(input.defaults?.dimension);
  const routes = input.defaults?.routes && typeof input.defaults.routes === "object"
    ? { ...input.defaults.routes }
    : {};
  if (!MODES.has(defaultMode)) add("defaults.mode must name a declared comparison state.");
  if (defaultDimension !== "all" && !DIMENSIONS.has(defaultDimension)) add("defaults.dimension must be all or a declared concern.");
  for (const dimension of ["all", ...DIMENSIONS]) {
    const route = routes[dimension];
    if (
      !route
      || !nodeIds.has(text(route.start))
      || !nodeIds.has(text(route.end))
      || text(route.start) === text(route.end)
    ) {
      add(`defaults.routes.${dimension} must identify two declared nodes.`);
    } else {
      routes[dimension] = freezeRecord({ start: text(route.start), end: text(route.end) });
    }
  }

  if (errors.length === 0) {
    for (const dimension of ["all", ...DIMENSIONS]) {
      const route = routes[dimension];
      if (!findShortestRoute({ nodes, edges }, route.start, route.end, dimension)) {
        add(`defaults.routes.${dimension} must identify a reachable directed route within its concern.`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const model = freezeGraph({
    schemaVersion: input.schemaVersion,
    columns,
    dimensions,
    nodes,
    edges,
    defaults: {
      mode: defaultMode,
      dimension: defaultDimension,
      routes,
    },
  });
  return { ok: true, errors: [], model };
}

function nodeMatches(node, dimension) {
  return dimension === "all" || node.dims.includes(dimension);
}

/** Return the fewest-edge directed route; declared edge order resolves ties. */
function findShortestRoute(model, startId, endId, dimension = "all") {
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  if (!nodeById.has(startId) || !nodeById.has(endId)) return null;
  if (!nodeMatches(nodeById.get(startId), dimension) || !nodeMatches(nodeById.get(endId), dimension)) return null;
  if (startId === endId) return { nodes: [startId], edges: [] };

  const outgoing = new Map();
  for (const edge of model.edges) {
    if (!nodeMatches(nodeById.get(edge.from), dimension) || !nodeMatches(nodeById.get(edge.to), dimension)) continue;
    const group = outgoing.get(edge.from) ?? [];
    group.push(edge);
    outgoing.set(edge.from, group);
  }

  const queue = [startId];
  const visited = new Set(queue);
  const previous = new Map();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const edge of outgoing.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      previous.set(edge.to, { node: current, edge: edge.id });
      if (edge.to === endId) {
        const nodes = [endId];
        const edges = [];
        let step = endId;
        while (step !== startId) {
          const relation = previous.get(step);
          edges.unshift(relation.edge);
          nodes.unshift(relation.node);
          step = relation.node;
        }
        return { nodes, edges };
      }
      queue.push(edge.to);
    }
  }
  return null;
}

function initialSystemGraphState(model) {
  const endpoints = model.defaults.routes[model.defaults.dimension];
  const route = findShortestRoute(model, endpoints.start, endpoints.end, model.defaults.dimension);
  return Object.freeze({
    mode: model.defaults.mode,
    dimension: model.defaults.dimension,
    startId: endpoints.start,
    endId: endpoints.end,
    route,
    routeIndex: 0,
    selectedNodeId: route?.nodes[0] ?? endpoints.start,
    announcement: "The system graph is ready.",
  });
}

function tracedState(model, state, announcement, unavailableAnnouncement = "Choose another endpoint or concern. The current selection has no declared directed route.") {
  const route = findShortestRoute(model, state.startId, state.endId, state.dimension);
  return Object.freeze({
    ...state,
    route,
    routeIndex: 0,
    selectedNodeId: route?.nodes[0] ?? state.startId,
    announcement: route ? announcement : unavailableAnnouncement,
  });
}

/** One closed transition vocabulary feeds keyboard, pointer, and touch interaction. */
function transitionSystemGraph(model, state, action) {
  if (!action || !ACTIONS.has(action.type)) return state;
  switch (action.type) {
    case "SET_MODE":
      return MODES.has(action.value)
        ? Object.freeze({ ...state, mode: action.value, announcement: `Comparison changed to ${action.label || action.value}.` })
        : state;
    case "SET_DIMENSION": {
      const dimension = action.value === "all" || DIMENSIONS.has(action.value) ? action.value : null;
      if (!dimension) return state;
      const endpoints = model.defaults.routes[dimension];
      return tracedState(model, {
        ...state,
        dimension,
        startId: endpoints.start,
        endId: endpoints.end,
      }, `Concern changed to ${action.label || dimension}. A fitting route is ready.`);
    }
    case "SET_START":
      return model.nodes.some(node => node.id === action.value && nodeMatches(node, state.dimension))
        ? Object.freeze({ ...state, startId: action.value, route: null, routeIndex: 0, selectedNodeId: action.value, announcement: "Route start changed. Trace the route to compare its path." })
        : state;
    case "SET_END":
      return model.nodes.some(node => node.id === action.value && nodeMatches(node, state.dimension))
        ? Object.freeze({ ...state, endId: action.value, route: null, routeIndex: 0, announcement: "Route destination changed. Trace the route to compare its path." })
        : state;
    case "TRACE_ROUTE":
      return tracedState(
        model,
        state,
        `Route traced from ${action.startLabel || state.startId} to ${action.endLabel || state.endId}.`,
        `Choose another endpoint or concern. The current selection has no declared directed route from ${action.startLabel || state.startId} to ${action.endLabel || state.endId}.`,
      );
    case "SELECT_NODE":
      if (!model.nodes.some(node => node.id === action.value)) return state;
      return Object.freeze({
        ...state,
        selectedNodeId: action.value,
        routeIndex: state.route?.nodes.includes(action.value)
          ? state.route.nodes.indexOf(action.value)
          : state.routeIndex,
        announcement: `${action.label || action.value} selected.`,
      });
    case "STEP_ROUTE": {
      if (!state.route) return state;
      const routeIndex = Math.min(
        Math.max(state.routeIndex + Number(action.delta || 0), 0),
        state.route.nodes.length - 1,
      );
      const selectedNodeId = state.route.nodes[routeIndex];
      return Object.freeze({
        ...state,
        routeIndex,
        selectedNodeId,
        announcement: `Route step ${routeIndex + 1} of ${state.route.nodes.length}: ${action.label || selectedNodeId}.`,
      });
    }
    case "RESET":
      return initialSystemGraphState(model);
    default:
      return state;
  }
}

function element(document, name, className, content) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function statusLabel(status) {
  return { ok: "Working", strained: "Strained", broken: "Breaking" }[status] ?? "Unknown";
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
    ["[data-graph-error]", "fallback message"],
    ["[data-graph-enhancement]", "enhancement region"],
    ["[data-node-field]", "node field"],
    ["[data-node-grid]", "node grid"],
    ["[data-edge-layer]", "edge layer"],
    ["[data-route-start]", "route-start control"],
    ["[data-route-end]", "route-destination control"],
    ["[data-trace-route]", "route action"],
    ["[data-reset-graph]", "reset action"],
    ["[data-graph-status]", "live status"],
    ["[data-status-summary]", "status summary"],
    ["[data-route-list]", "route reading"],
    ["[data-route-previous]", "previous-route action"],
    ["[data-route-next]", "next-route action"],
    ["[data-detail-title]", "detail title"],
    ["[data-detail-column]", "detail column"],
    ["[data-detail-stack]", "detail implementation"],
    ["[data-detail-status]", "detail status"],
    ["[data-detail-note]", "detail consequence"],
    ["[data-detail-concerns]", "detail concerns"],
    ["[data-detail-neighbors]", "detail neighbors"],
    [".wtb-system-graph__reading", "semantic reading"],
  ];
  for (const [selector, label] of required) {
    if (root.querySelectorAll(selector).length !== 1) errors.push(`The graph requires one ${label} (${selector}).`);
  }

  const modeControls = Array.from(root.querySelectorAll('[name="wtb-system-mode"]'));
  const dimensionControls = Array.from(root.querySelectorAll('[name="wtb-system-dimension"]'));
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

function fallbackController(root, errors, error, enhancement, browser) {
  if (error) {
    error.hidden = false;
    error.textContent = "The complete system reading is ready below. The interactive controls need a repaired data or page structure before they can start.";
  }
  if (enhancement) enhancement.hidden = true;
  const reading = root.querySelector(".wtb-system-graph__reading");
  if (reading) reading.open = true;
  root.dataset.graphState = "fallback";
  browser.console?.error?.(`Who To Believe system graph startup reported validation errors:\n${errors.join("\n")}`);
  const controller = Object.freeze({
    ok: false,
    errors,
    destroy() {
      mountedGraphs.delete(root);
    },
  });
  mountedGraphs.set(root, controller);
  return controller;
}

function replaceOptions(select, model, dimension, selectedId, document) {
  const fragment = document.createDocumentFragment();
  for (const [columnIndex, column] of model.columns.entries()) {
    const group = document.createElement("optgroup");
    group.label = column;
    for (const node of model.nodes.filter(candidate => candidate.col === columnIndex)) {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = node.label;
      option.disabled = !nodeMatches(node, dimension);
      option.selected = node.id === selectedId;
      group.append(option);
    }
    fragment.append(group);
  }
  select.replaceChildren(fragment);
}

function graphStatusSummary(model, state) {
  const eligible = model.nodes.filter(node => nodeMatches(node, state.dimension));
  const counts = { ok: 0, strained: 0, broken: 0 };
  for (const node of eligible) counts[node.status[state.mode]] += 1;
  return `${eligible.length} in view · ${counts.ok} working · ${counts.strained} strained · ${counts.broken} breaking`;
}

function renderRouteList(list, model, state, document) {
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  if (!state.route) {
    const item = element(document, "li", "wtb-system-graph__route-empty", "This concern has no declared directed route between the selected endpoints. Choose another endpoint or concern.");
    list.replaceChildren(item);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const [index, nodeId] of state.route.nodes.entries()) {
    const item = element(document, "li", "");
    if (index === state.routeIndex) item.setAttribute("aria-current", "step");
    const button = element(document, "button", "wtb-system-graph__route-node", nodeById.get(nodeId).label);
    button.type = "button";
    button.dataset.nodeId = nodeId;
    item.append(button);
    if (index < state.route.edges.length) {
      const edge = model.edges.find(candidate => candidate.id === state.route.edges[index]);
      const relation = edge.label ? ` — ${edge.label} → ` : " → ";
      item.append(element(document, "span", "wtb-system-graph__route-relation", relation));
    }
    fragment.append(item);
  }
  list.replaceChildren(fragment);
}

function createNodeButtons(root, model, document) {
  const grid = root.querySelector("[data-node-grid]");
  const fragment = document.createDocumentFragment();
  for (const node of model.nodes) {
    const button = element(document, "button", "wtb-system-graph__node");
    button.type = "button";
    button.dataset.nodeId = node.id;
    button.style.setProperty("--node-column", String(node.col + 1));
    button.style.setProperty("--node-row", String(node.row + 1));
    const label = element(document, "span", "wtb-system-graph__node-label", node.label);
    const state = element(document, "span", "wtb-system-graph__node-state");
    state.dataset.nodeState = "";
    button.append(label, state);
    fragment.append(button);
  }
  grid.replaceChildren(fragment);
}

function drawEdges(root, model, state, browser, markerId) {
  const field = root.querySelector("[data-node-field]");
  const svg = root.querySelector("[data-edge-layer]");
  if (!field || !svg) return;
  const fieldBox = field.getBoundingClientRect();
  if (fieldBox.width === 0 || fieldBox.height === 0) return;
  svg.setAttribute("viewBox", `0 0 ${fieldBox.width} ${fieldBox.height}`);
  svg.replaceChildren();

  const document = root.ownerDocument;
  const namespace = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(namespace, "defs");
  const marker = document.createElementNS(namespace, "marker");
  marker.setAttribute("id", markerId);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrow = document.createElementNS(namespace, "path");
  arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrow.setAttribute("class", "wtb-system-graph__arrow");
  marker.append(arrow);
  defs.append(marker);
  svg.append(defs);

  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const routeEdges = new Set(state.route?.edges ?? []);
  for (const edge of model.edges) {
    const from = root.querySelector(`.wtb-system-graph__node[data-node-id="${edge.from}"]`);
    const to = root.querySelector(`.wtb-system-graph__node[data-node-id="${edge.to}"]`);
    if (!from || !to) continue;
    const fromBox = from.getBoundingClientRect();
    const toBox = to.getBoundingClientRect();
    const x1 = fromBox.right - fieldBox.left;
    const y1 = fromBox.top + fromBox.height / 2 - fieldBox.top;
    const x2 = toBox.left - fieldBox.left;
    const y2 = toBox.top + toBox.height / 2 - fieldBox.top;
    const bend = Math.max(24, (x2 - x1) * 0.45);
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
    path.setAttribute("marker-end", `url(#${markerId})`);
    path.dataset.status = edge.status[state.mode];
    path.dataset.inConcern = String(
      nodeMatches(nodeById.get(edge.from), state.dimension)
      && nodeMatches(nodeById.get(edge.to), state.dimension),
    );
    path.dataset.inRoute = String(routeEdges.has(edge.id));
    path.classList.add("wtb-system-graph__edge");
    svg.append(path);
  }
  void browser;
}

function focusSelected(root, selectedNodeId) {
  const selected = root.querySelector(`.wtb-system-graph__node[data-node-id="${selectedNodeId}"]`);
  if (!selected) return;
  selected.focus({ preventScroll: true });
  selected.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function mountSystemGraph(root, document = globalThis.document, browser = globalThis) {
  if (!root || !document) return null;
  if (mountedGraphs.has(root)) return mountedGraphs.get(root);

  const admission = parseContract(root, document);
  const error = root.querySelector("[data-graph-error]");
  const enhancement = root.querySelector("[data-graph-enhancement]");
  if (!admission.ok) {
    return fallbackController(root, admission.errors, error, enhancement, browser);
  }
  const mountErrors = inspectMountDom(root);
  if (mountErrors.length > 0) {
    return fallbackController(root, mountErrors, error, enhancement, browser);
  }

  const model = admission.model;
  let state = initialSystemGraphState(model);
  const modeControls = Array.from(root.querySelectorAll('[name="wtb-system-mode"]'));
  const dimensionControls = Array.from(root.querySelectorAll('[name="wtb-system-dimension"]'));
  const startSelect = root.querySelector("[data-route-start]");
  const endSelect = root.querySelector("[data-route-end]");
  const status = root.querySelector("[data-graph-status]");
  const summary = root.querySelector("[data-status-summary]");
  const routeList = root.querySelector("[data-route-list]");
  const previousButton = root.querySelector("[data-route-previous]");
  const nextButton = root.querySelector("[data-route-next]");
  const detailTitle = root.querySelector("[data-detail-title]");
  const detailColumn = root.querySelector("[data-detail-column]");
  const detailStack = root.querySelector("[data-detail-stack]");
  const detailStatus = root.querySelector("[data-detail-status]");
  const detailNote = root.querySelector("[data-detail-note]");
  const detailConcerns = root.querySelector("[data-detail-concerns]");
  const detailNeighbors = root.querySelector("[data-detail-neighbors]");
  const reading = root.querySelector(".wtb-system-graph__reading");
  const markerId = `wtb-system-arrow-${++mountSequence}`;
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));
  const dimensionById = new Map(model.dimensions.map(dimension => [dimension.id, dimension]));
  let drawRequest = 0;
  let cancelDrawRequest = () => {};

  createNodeButtons(root, model, document);
  root.dataset.graphState = "enhanced";
  if (enhancement) enhancement.hidden = false;
  if (error) {
    error.hidden = true;
    error.textContent = "";
  }
  reading.open = false;

  const scheduleEdges = () => {
    if (drawRequest) cancelDrawRequest(drawRequest);
    const usesAnimationFrame = typeof browser.requestAnimationFrame === "function";
    const request = usesAnimationFrame
      ? callback => browser.requestAnimationFrame(callback)
      : callback => browser.setTimeout(callback, 0);
    cancelDrawRequest = usesAnimationFrame
      ? requestId => browser.cancelAnimationFrame(requestId)
      : requestId => browser.clearTimeout(requestId);
    drawRequest = request(() => {
      drawRequest = 0;
      drawEdges(root, model, state, browser, markerId);
    });
  };

  const renderDetails = () => {
    const node = nodeById.get(state.selectedNodeId);
    if (!node) return;
    detailTitle.textContent = node.label;
    detailColumn.textContent = model.columns[node.col];
    detailStack.textContent = node.stack[state.mode];
    detailStatus.textContent = statusLabel(node.status[state.mode]);
    detailStatus.dataset.status = node.status[state.mode];
    detailNote.textContent = node.note[state.mode];
    detailConcerns.textContent = node.dims.map(dim => dimensionById.get(dim).label).join(" · ");

    const relations = [
      ...model.edges.filter(edge => edge.to === node.id).map(edge => ({ direction: "From", id: edge.from })),
      ...model.edges.filter(edge => edge.from === node.id).map(edge => ({ direction: "To", id: edge.to })),
    ];
    const fragment = document.createDocumentFragment();
    for (const relation of relations) {
      const button = element(document, "button", "wtb-system-graph__neighbor", `${relation.direction} ${nodeById.get(relation.id).label}`);
      button.type = "button";
      button.dataset.nodeId = relation.id;
      fragment.append(button);
    }
    if (relations.length === 0) fragment.append(element(document, "span", "", "No declared neighboring node."));
    detailNeighbors.replaceChildren(fragment);
  };

  const render = () => {
    for (const control of modeControls) control.checked = control.value === state.mode;
    for (const control of dimensionControls) control.checked = control.value === state.dimension;
    replaceOptions(startSelect, model, state.dimension, state.startId, document);
    replaceOptions(endSelect, model, state.dimension, state.endId, document);

    for (const button of root.querySelectorAll("[data-node-id]")) {
      const node = nodeById.get(button.dataset.nodeId);
      if (!node || !button.classList.contains("wtb-system-graph__node")) continue;
      const nodeStatus = node.status[state.mode];
      const inConcern = nodeMatches(node, state.dimension);
      button.dataset.status = nodeStatus;
      button.dataset.inConcern = String(inConcern);
      button.dataset.inRoute = String(state.route?.nodes.includes(node.id) ?? false);
      button.setAttribute("aria-pressed", String(node.id === state.selectedNodeId));
      if (state.route?.nodes[state.routeIndex] === node.id) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      const concernState = inConcern ? "" : " Outside the current concern.";
      button.setAttribute("aria-label", `${node.label}. ${statusLabel(nodeStatus)} in ${state.mode === "symfony" ? "Symfony" : "partial Spring"}.${concernState}`);
      button.querySelector("[data-node-state]").textContent = `${statusLabel(nodeStatus)}${inConcern ? "" : " · Outside concern"}`;
    }

    renderDetails();
    renderRouteList(routeList, model, state, document);
    previousButton.disabled = !state.route || state.routeIndex <= 0;
    nextButton.disabled = !state.route || state.routeIndex >= state.route.nodes.length - 1;
    summary.textContent = graphStatusSummary(model, state);
    status.textContent = state.announcement;
    scheduleEdges();
  };

  const apply = (action, { focus = false } = {}) => {
    const next = transitionSystemGraph(model, state, action);
    if (next === state) return;
    state = next;
    render();
    if (focus) focusSelected(root, state.selectedNodeId);
  };

  const onChange = event => {
    if (event.target.matches('[name="wtb-system-mode"]')) {
      apply({ type: "SET_MODE", value: event.target.value, label: event.target.dataset.label });
    } else if (event.target.matches('[name="wtb-system-dimension"]')) {
      apply({ type: "SET_DIMENSION", value: event.target.value, label: event.target.dataset.label });
    } else if (event.target === startSelect) {
      apply({ type: "SET_START", value: event.target.value });
    } else if (event.target === endSelect) {
      apply({ type: "SET_END", value: event.target.value });
    }
  };

  const onClick = event => {
    const nodeButton = event.target.closest("[data-node-id]");
    if (nodeButton && root.contains(nodeButton)) {
      const node = nodeById.get(nodeButton.dataset.nodeId);
      if (!node) return;
      const movesFocus = nodeButton.classList.contains("wtb-system-graph__route-node")
        || nodeButton.classList.contains("wtb-system-graph__neighbor");
      apply({ type: "SELECT_NODE", value: node.id, label: node.label }, { focus: movesFocus });
      return;
    }
    if (event.target.closest("[data-trace-route]")) {
      apply({
        type: "TRACE_ROUTE",
        startLabel: nodeById.get(state.startId).label,
        endLabel: nodeById.get(state.endId).label,
      }, { focus: true });
    } else if (event.target.closest("[data-route-previous]")) {
      const nextId = state.route?.nodes[Math.max(0, state.routeIndex - 1)];
      apply({ type: "STEP_ROUTE", delta: -1, label: nodeById.get(nextId)?.label }, { focus: true });
    } else if (event.target.closest("[data-route-next]")) {
      const nextId = state.route?.nodes[Math.min((state.route?.nodes.length ?? 1) - 1, state.routeIndex + 1)];
      apply({ type: "STEP_ROUTE", delta: 1, label: nodeById.get(nextId)?.label }, { focus: true });
    } else if (event.target.closest("[data-reset-graph]")) {
      apply({ type: "RESET" }, { focus: true });
    }
  };

  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
  const resizeObserver = browser.ResizeObserver
    ? new browser.ResizeObserver(scheduleEdges)
    : null;
  if (resizeObserver) resizeObserver.observe(root.querySelector("[data-node-field]"));
  else browser.addEventListener?.("resize", scheduleEdges);

  render();
  const controller = Object.freeze({
    ok: true,
    model,
    getState: () => state,
    dispatch: action => apply(action),
    destroy() {
      root.removeEventListener("change", onChange);
      root.removeEventListener("click", onClick);
      resizeObserver?.disconnect();
      browser.removeEventListener?.("resize", scheduleEdges);
      if (drawRequest) cancelDrawRequest(drawRequest);
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
  findShortestRoute,
  initialSystemGraphState,
  mountSystemGraph,
  transitionSystemGraph,
  validateSystemGraphContract,
});
}));
