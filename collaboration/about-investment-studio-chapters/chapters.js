/* About's derived Studio presentation. Runs after the unchanged Studio controllers
   and before embedded-content-fit. Existing nodes retain calculation and state. */
(function () {
  "use strict";

  const root = document.documentElement;
  if (root.dataset.aboutStudioChapters === "ready") return;
  const main = document.getElementById("costing-workspace");
  const intro = main?.querySelector(".intro");
  const workspace = main?.querySelector(".workspace");
  const ledger = workspace?.querySelector(":scope > .ledger");
  const summary = main?.querySelector(".summary");
  const estimate = summary?.querySelector(".estimate");
  const presets = document.getElementById("presets");
  const definitions = [
    { key: "plan", label: "Plan", description: "Choose a starting plan and name its horizon, goal, and decision boundary.",
      owners: ["preset-title", "shape-title", "goal-title"] },
    { key: "people", label: "People", description: "Edit roles and allocations, examine coverage, and name the human receiver for each AI contribution.",
      owners: ["roles-title", "staffing-title", "collaboration-title"] },
    { key: "work", label: "Work & recovery", description: "Edit activities, recovery effort, and quality attention. The planning band follows these same inputs.",
      owners: ["activities-title", "disruptions-title", "sigma-title", "quality-title"] },
    { key: "coordination", label: "Coordination", description: "Examine the horizon, rotate the lens, and map change-model components into the working plan.",
      owners: ["horizon-title", "lens-title", "components-title", "allocation-title", "investment-changes-title", "learning-title"] },
    { key: "comparison", label: "Comparison", description: "Inspect the planning breakdown, compare analytical scenarios, and carry an accepted account into a report.",
      owners: ["summary-title", "method-title", "investment-analysis-title"] },
  ];

  // Verify the receiving shape before moving any source-owned control. A changed
  // source structure keeps its complete original reading as the recovery state.
  if (!main || !intro || !workspace || !ledger || !summary || !estimate || !presets) return;
  const chapters = definitions.map(definition => ({
    ...definition,
    nodes: definition.owners.map(id => main.querySelector(`[aria-labelledby="${id}"]`)),
  }));
  const nodes = chapters.flatMap(chapter => chapter.nodes);
  if (nodes.some(node => !node) || new Set(nodes).size !== nodes.length) return;
  if ([...workspace.children].some(node => node !== ledger && node !== summary)
    || [...ledger.children].some(node => !nodes.includes(node))) return;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const shell = element("div", "about-studio-chapters");
  const overview = element("section", "about-studio-overview");
  overview.setAttribute("aria-labelledby", "about-studio-overview-title");
  const heading = element("h2", "about-studio-overview__title", "Your working investment plan");
  heading.id = "about-studio-overview-title";
  const selectedPlan = element("p", "about-studio-overview__plan");
  selectedPlan.setAttribute("data-studio-plan-name", "");
  const fullView = element("a", "about-studio-full-view", "Open the full Studio in a new tab ↗");
  fullView.href = "https://iframes.vik.guru/v1/canvas/cross-functional-investment-studio/";
  fullView.target = "_blank";
  fullView.rel = "noopener noreferrer";
  const onwardNote = element("p", "about-studio-overview__note", "The full view starts its own plan. Your current edits stay here; Comparison can capture this account in a report.");
  overview.append(heading, selectedPlan, estimate, fullView, onwardNote);

  const controls = element("div", "about-studio-chapter-controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Investment Studio chapters");
  const chapterMap = new Map();
  for (const chapter of chapters) {
    const panel = element("section", "about-studio-panel");
    panel.id = `about-studio-panel-${chapter.key}`;
    panel.dataset.studioPanel = chapter.key;
    const title = element("h2", "about-studio-panel__title", chapter.label);
    title.id = `about-studio-title-${chapter.key}`;
    panel.setAttribute("aria-labelledby", title.id);
    panel.append(title, element("p", "about-studio-panel__description", chapter.description), ...chapter.nodes);
    const button = element("button", "about-studio-chapter-button", chapter.label);
    button.type = "button";
    button.dataset.studioChapter = chapter.key;
    button.setAttribute("aria-controls", panel.id);
    controls.append(button);
    chapterMap.set(chapter.key, { panel, button });
  }
  shell.append(overview, controls, ...[...chapterMap.values()].map(chapter => chapter.panel));
  intro.after(shell);
  workspace.remove();

  let activeChapter = null;
  let sizingPending = false;
  let pendingNavigation = null;
  let navigationPending = false;
  function fitEditors() {
    sizingPending = false;
    for (const editor of shell.querySelectorAll("textarea")) {
      if (!editor.getClientRects().length) continue;
      editor.style.blockSize = "auto";
      const style = getComputedStyle(editor);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      editor.style.blockSize = `${Math.ceil(editor.scrollHeight + borders)}px`;
    }
  }
  function scheduleEditorFit() {
    if (sizingPending) return;
    sizingPending = true;
    requestAnimationFrame(fitEditors);
  }
  function selectChapter(key) {
    if (!chapterMap.has(key)) return;
    for (const [candidate, { panel, button }] of chapterMap) {
      const selected = candidate === key;
      panel.hidden = !selected;
      button.setAttribute("aria-pressed", String(selected));
    }
    activeChapter = key;
    root.dataset.studioChapter = key;
    // Size visible editors before the shared adapter observes this new panel.
    fitEditors();
  }
  function revealTarget(target) {
    const panel = target?.closest("[data-studio-panel]");
    if (!panel) return;
    if (activeChapter !== panel.dataset.studioPanel) selectChapter(panel.dataset.studioPanel);
    for (let parent = target.parentElement; parent && parent !== panel; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    fitEditors();
  }
  function fragmentTarget(hash) {
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }
  function completeNavigation() {
    navigationPending = false;
    if (!pendingNavigation) return;
    // Native fragment scrolling can run while the parent still has the preceding
    // chapter's frame height. Its resize supplies the receiving geometry.
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (root.dataset.contentFit === "active" && Math.abs(innerHeight - height) > 2) return;
    const { target, addedActivity } = pendingNavigation;
    pendingNavigation = null;
    const destination = addedActivity
      ? [...document.querySelectorAll('#activities [data-field="name"]')].at(-1)
      : target;
    if (!destination?.isConnected) return;
    if (!destination.matches("a[href], button, input, select, textarea, summary, [tabindex]")) {
      destination.setAttribute("tabindex", "-1");
    }
    destination.focus({ preventScroll: true });
    // About owns its viewport and navigation clearance. A fitted receiver sends
    // geometry through the existing document channel; standalone use stays native.
    const request = new CustomEvent("context-canvas:content-fit-reveal", {
      detail: { target: destination }, cancelable: true,
    });
    if (document.dispatchEvent(request)) {
      destination.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }
  }
  function scheduleNavigation() {
    if (!pendingNavigation || navigationPending) return;
    navigationPending = true;
    requestAnimationFrame(completeNavigation);
  }
  function navigateTo(target, addedActivity = false) {
    if (!target?.closest("[data-studio-panel]")) return;
    revealTarget(target);
    pendingNavigation = { target, addedActivity };
    scheduleNavigation();
  }
  function revealFragment() { navigateTo(fragmentTarget(location.hash)); }
  function updatePlanName() {
    const selected = presets.querySelector('[data-preset][aria-pressed="true"]');
    const label = selected?.querySelector("span:not(.preset-state)")?.textContent;
    selectedPlan.textContent = label ? `Selected starting plan: ${label}` : "Editable initiative plan";
  }

  controls.addEventListener("click", event => {
    const button = event.target.closest("button[data-studio-chapter]");
    if (button) {
      pendingNavigation = null;
      selectChapter(button.dataset.studioChapter);
    }
  });
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target.closest?.("[data-gap-add], a[href]");
    if (!target) return;
    if (target.matches("[data-gap-add]")) {
      // The original controller creates the row and focuses it on its next frame.
      navigateTo(document.getElementById("activities-title"), true);
      return;
    }
    if (target.hasAttribute("download") || (target.getAttribute("target") && target.getAttribute("target") !== "_self")) return;
    let destination;
    try { destination = new URL(target.getAttribute("href"), document.baseURI); }
    catch { return; }
    if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) {
      navigateTo(fragmentTarget(destination.hash));
    }
  }, true);
  // Capture runs before the original fragment listeners focus their receivers.
  window.addEventListener("hashchange", revealFragment, true);
  window.addEventListener("popstate", revealFragment, true);
  shell.addEventListener("input", scheduleEditorFit);
  shell.addEventListener("change", scheduleEditorFit);
  shell.addEventListener("click", scheduleEditorFit);
  shell.addEventListener("toggle", scheduleEditorFit, true);
  window.addEventListener("investment-analysis-change", scheduleEditorFit);
  window.addEventListener("resize", () => {
    scheduleEditorFit();
    scheduleNavigation();
  });
  document.fonts?.ready.then(scheduleEditorFit);
  new MutationObserver(updatePlanName).observe(presets, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  updatePlanName();
  root.dataset.aboutStudioChapters = "ready";
  selectChapter("plan");
  revealFragment();
})();
