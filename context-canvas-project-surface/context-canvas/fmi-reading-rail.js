/* FMI's authored rail keeps native fragment navigation. Enhancement reports
   the URL destination separately from the heading reached by reading. */
(function () {
  "use strict";

  const rail = document.querySelector(".fmi-reading-rail");
  if (!rail || rail.dataset.readingReady === "true") return;

  function fragmentId(fragment) {
    try { return decodeURIComponent(fragment.slice(1)); }
    catch { return ""; }
  }

  const entries = [];
  const destinations = new Map();
  for (const link of rail.querySelectorAll('a[href^="#"]')) {
    const id = fragmentId(link.getAttribute("href"));
    const target = document.getElementById(id);
    const label = link.querySelector(".fmi-reading-rail__text");
    if (!target || !label || destinations.has(id)) continue;
    const status = document.createElement("span");
    status.className = "fmi-reading-rail__state";
    status.id = "fmi-reading-state-" + entries.length;
    label.appendChild(status);
    const descriptions = link.getAttribute("aria-describedby");
    link.setAttribute("aria-describedby", descriptions ? descriptions + " " + status.id : status.id);
    const entry = { link, target, label, status, current: false, selected: false };
    entries.push(entry);
    destinations.set(id, entry);
  }
  if (!entries.length) return;
  rail.dataset.readingReady = "true";

  const header = document.querySelector(".nav__top--sticky");
  const list = rail.querySelector("ol");
  const compact = window.matchMedia("(max-width: 74.99rem)");
  let pendingFrame = null;
  let focusedEntry = null;
  let pointerEntry = null;
  let previewEntry = null;
  let previewDismissed = false;

  function entryFromNode(node) {
    const link = node instanceof Element ? node.closest("a") : null;
    if (!link || !rail.contains(link)) return null;
    const entry = destinations.get(fragmentId(link.getAttribute("href") || ""));
    return entry && entry.link === link ? entry : null;
  }

  function updatePreview() {
    let next = compact.matches && !previewDismissed ? focusedEntry || pointerEntry : null;
    const linkBox = next ? next.link.getBoundingClientRect() : null;
    const listBox = list.getBoundingClientRect();
    if (next && (linkBox.bottom <= listBox.top || linkBox.top >= listBox.bottom)) next = null;
    if (previewEntry !== next) {
      if (previewEntry) previewEntry.link.classList.remove("is-preview");
      if (next) next.link.classList.add("is-preview");
      previewEntry = next;
    }
    if (!next) return;
    const halfHeight = next.label.getBoundingClientRect().height / 2;
    const edgeReserve = 8;
    const center = Math.min(
      Math.max(linkBox.top + linkBox.height / 2, halfHeight + edgeReserve),
      window.innerHeight - halfHeight - edgeReserve
    );
    const top = center + "px";
    if (next.label.style.insetBlockStart !== top) next.label.style.insetBlockStart = top;
  }

  function update() {
    pendingFrame = null;
    const selected = destinations.get(fragmentId(window.location.hash)) || null;
    // Match native anchor clearance, including a resized or wrapped top bar.
    const anchorClearance = parseFloat(getComputedStyle(entries[0].target).scrollMarginBlockStart) || 0;
    const readingLine = Math.max(header ? header.getBoundingClientRect().bottom : 0, anchorClearance) + 1;
    let current = null;
    for (const entry of entries) {
      if (entry.target.getBoundingClientRect().top <= readingLine) current = entry;
    }
    // Geometry is read before state paint. At most nine authored destinations
    // are inspected per animation frame, and unchanged state keeps its DOM.
    for (const entry of entries) {
      const isCurrent = entry === current;
      const isSelected = entry === selected;
      if (entry.current === isCurrent && entry.selected === isSelected) continue;
      entry.current = isCurrent;
      entry.selected = isSelected;
      entry.link.classList.toggle("is-current", isCurrent);
      entry.link.classList.toggle("is-selected", isSelected);
      if (isCurrent) entry.link.setAttribute("aria-current", "location");
      else entry.link.removeAttribute("aria-current");
      entry.status.textContent = isCurrent
        ? isSelected ? "Reading · Selected" : "Reading"
        : isSelected ? "Selected" : "";
    }
    updatePreview();
  }

  function scheduleUpdate() {
    if (pendingFrame === null) pendingFrame = window.requestAnimationFrame(update);
  }

  rail.addEventListener("focusin", event => {
    focusedEntry = entryFromNode(event.target);
    previewDismissed = false;
    scheduleUpdate();
  });
  rail.addEventListener("focusout", event => {
    focusedEntry = entryFromNode(event.relatedTarget);
    scheduleUpdate();
  });
  rail.addEventListener("pointerover", event => {
    const next = entryFromNode(event.target);
    if (next !== pointerEntry) previewDismissed = false;
    pointerEntry = next;
    scheduleUpdate();
  });
  rail.addEventListener("pointerout", event => {
    pointerEntry = entryFromNode(event.relatedTarget);
    scheduleUpdate();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && previewEntry) {
      previewDismissed = true;
      scheduleUpdate();
    }
  });
  list.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  document.addEventListener("load", scheduleUpdate, true);
  if (document.fonts) document.fonts.ready.then(scheduleUpdate);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleUpdate);
    const main = document.querySelector("main");
    if (main) observer.observe(main);
    if (header) observer.observe(header);
  }
  scheduleUpdate();
}());
