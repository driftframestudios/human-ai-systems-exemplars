(function () {
  "use strict";

  var controls = document.querySelector("[data-debrief-filters]");
  var list = document.querySelector("[data-debrief-list]");
  var preview = document.querySelector("[data-debrief-preview]");

  if (!controls || !list || !preview) {
    return;
  }

  var cards = Array.prototype.slice.call(list.querySelectorAll("[data-types]"));
  var form = controls.querySelector("[data-debrief-filter-form]");
  var filters = Array.prototype.slice.call(controls.querySelectorAll("[data-filter]"));
  var clear = controls.querySelector("[data-clear-filters]");
  var status = controls.querySelector("[data-filter-status]");
  var zeroResults = document.querySelector("[data-zero-results]");
  var zeroClear = document.querySelector("[data-zero-clear]");
  var defaultPanel = preview.querySelector("[data-preview-default]");
  var entryPanel = preview.querySelector("[data-preview-entry]");
  var previewScroller = preview.querySelector(".debrief-catalog__preview-inner");
  var summary = preview.querySelector("[data-preview-summary]");
  var previewCardId = "";
  var activeTypes = [];
  var labels = {};

  filters.forEach(function (input) {
    labels[input.value] = input.parentElement.querySelector(".debrief-filter__label").textContent.trim();
  });

  function syncPreviewScroller() {
    var canScroll = previewScroller.scrollHeight > previewScroller.clientHeight + 1;
    previewScroller.tabIndex = canScroll ? 0 : -1;
    previewScroller.setAttribute("aria-label", canScroll ? "Reading preview; scroll for the complete preview" : "Reading preview");
  }

  function selectionsFromLocation() {
    var requested = new URL(window.location.href).searchParams.getAll("type");
    return requested.filter(function (type, index) {
      return Object.prototype.hasOwnProperty.call(labels, type) && requested.indexOf(type) === index;
    });
  }

  function setSelections(types) {
    filters.forEach(function (input) {
      input.checked = types.indexOf(input.value) !== -1;
    });
  }

  function readSelections() {
    return filters.filter(function (input) {
      return input.checked;
    }).map(function (input) {
      return input.value;
    });
  }

  function syncLocation(mode) {
    var url = new URL(window.location.href);
    url.searchParams.delete("type");
    activeTypes.forEach(function (type) {
      url.searchParams.append("type", type);
    });
    window.history[mode + "State"]({ types: activeTypes.slice() }, "", url);
  }

  function removePreviewState() {
    cards.forEach(function (card) {
      card.removeAttribute("data-preview-active");
    });
  }

  function showCollectionSummary(visibleCount) {
    removePreviewState();
    previewCardId = "";
    previewScroller.scrollTop = 0;
    entryPanel.hidden = true;
    defaultPanel.hidden = false;

    if (activeTypes.length === 0) {
      summary.textContent = "All " + cards.length + " catalog entries are in view. Focus an entry to bring its primary visual and full-page link into this panel.";
      syncPreviewScroller();
      return;
    }

    var selectedLabels = activeTypes.map(function (type) { return labels[type]; });
    summary.textContent = visibleCount + " of " + cards.length + " entries match at least one selected type: " + selectedLabels.join(", ") + ". Focus an entry to inspect it.";
    syncPreviewScroller();
  }

  function applyFilters(historyMode) {
    var visibleCount = 0;

    activeTypes = readSelections();

    cards.forEach(function (card) {
      var cardTypes = card.getAttribute("data-types").split(/\s+/);
      var isVisible = activeTypes.length === 0 || activeTypes.some(function (type) {
        return cardTypes.indexOf(type) !== -1;
      });

      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    clear.disabled = activeTypes.length === 0;
    zeroResults.hidden = visibleCount !== 0;

    if (visibleCount === 0) {
      status.textContent = "No catalog entries match the current reading-type combination.";
    } else if (activeTypes.length === 0) {
      status.textContent = "Showing all " + cards.length + " catalog entries.";
    } else {
      status.textContent = "Showing " + visibleCount + " of " + cards.length + " entries matching at least one selected reading type.";
    }

    showCollectionSummary(visibleCount);
    list.dispatchEvent(new CustomEvent("canvas:page-rail-source-change", { bubbles: true }));
    if (historyMode) {
      syncLocation(historyMode);
    }
  }

  function showEntry(card) {
    var cardChanged = previewCardId !== card.id;
    var title = card.querySelector(":scope > h2");
    var slug = card.querySelector(".project--slug");
    var image = card.querySelector(".project__upfront");
    var route = card.querySelector(".img__anchor") || card.querySelector("a[href]");
    var types = Array.prototype.map.call(card.querySelectorAll(".debrief-card__types li"), function (item) {
      return item.textContent.trim();
    });
    var catalogFacts = card.querySelectorAll(".debrief-card__catalog-meta dd");
    var surfacesText = catalogFacts.length > 0 ? catalogFacts[0].textContent.replace(/\s+/g, " ").trim() : "Primary visual and worked account";
    var usefulText = catalogFacts.length > 1 ? catalogFacts[1].textContent.replace(/\s+/g, " ").trim() : (slug ? slug.textContent.trim() : "Enterprise collaboration and implementation review");
    var imageAlt = image ? image.getAttribute("alt") : "";

    removePreviewState();
    card.setAttribute("data-preview-active", "true");
    previewCardId = card.id;
    defaultPanel.hidden = true;
    entryPanel.hidden = false;

    preview.querySelector("[data-preview-title]").textContent = title ? title.textContent.trim() : "Selected reading";
    preview.querySelector("[data-preview-slug]").textContent = slug ? slug.textContent.trim() : "Open the full reading for its evidence and implementation route.";
    preview.querySelector("[data-preview-types]").textContent = types.join(" · ");
    preview.querySelector("[data-preview-surfaces]").textContent = surfacesText;
    preview.querySelector("[data-preview-useful]").textContent = usefulText;

    if (image) {
      var previewImage = preview.querySelector("[data-preview-image]");
      previewImage.setAttribute("src", image.getAttribute("src"));
      previewImage.setAttribute("alt", "");
      preview.querySelector("[data-preview-caption]").textContent = imageAlt ? "Primary visual — " + imageAlt : "Primary visual from the selected reading.";
    }

    if (route) {
      preview.querySelector("[data-preview-link]").setAttribute("href", route.getAttribute("href"));
    }

    if (cardChanged) {
      previewScroller.scrollTop = 0;
    }
    syncPreviewScroller();
  }

  filters.forEach(function (input) {
    input.addEventListener("change", function () {
      applyFilters("push");
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    applyFilters("replace");
  });

  clear.addEventListener("click", function () {
    setSelections([]);
    applyFilters("push");
  });

  zeroClear.addEventListener("click", function () {
    setSelections([]);
    applyFilters("push");
    filters[0].focus();
  });

  window.addEventListener("popstate", function () {
    setSelections(selectionsFromLocation());
    applyFilters();
  });
  window.addEventListener("resize", syncPreviewScroller);

  cards.forEach(function (card) {
    card.addEventListener("focusin", function () {
      showEntry(card);
    });
    card.addEventListener("mouseenter", function () {
      showEntry(card);
    });
  });

  preview.hidden = false;
  setSelections(selectionsFromLocation());
  applyFilters();
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  controls.hidden = false;
}());
