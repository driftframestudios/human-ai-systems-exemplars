(function () {
  "use strict";

  var catalog = document.querySelector(".debrief-catalog");
  var controls = document.querySelector("[data-debrief-filters]");
  var list = document.querySelector("[data-debrief-list]");
  var preview = document.querySelector("[data-debrief-preview]");

  if (!catalog || !controls || !list || !preview) {
    return;
  }

  var cards = Array.prototype.slice.call(list.querySelectorAll("[data-formats][data-topics]"));
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
  var previewRoute = "";
  var previewRouteLabel = "";
  var caseBriefDisplayRequestId = 0;
  var caseBriefCache = new Map();
  var caseBriefLoads = new WeakMap();
  var activeSelection = { format: ["catalog"], topic: [] };
  var legacyOrActive = false;
  var labels = { format: {}, topic: {} };
  var legacyTypeAliases = {
    "executive-summary": { kind: "format", value: "case-brief" },
    debrief: { kind: "format", value: "full-debrief" },
    article: { kind: "format", value: "article" },
    practice: { kind: "topic", value: "practice" },
    "data-visualization": { kind: "topic", value: "data-visualization" },
    research: { kind: "topic", value: "research" },
    "ai-systems-entry": { kind: "topic", value: "ai-systems" },
    instrument: { kind: "topic", value: "instrument" }
  };

  filters.forEach(function (input) {
    var kind = input.getAttribute("data-filter-kind");
    labels[kind][input.value] = input.parentElement.querySelector(".debrief-filter__label").textContent.trim();
  });

  function unique(values) {
    return values.filter(function (value, index) {
      return values.indexOf(value) === index;
    });
  }

  function normalizedText(node) {
    return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function currentMode() {
    return activeSelection.format[0] || "catalog";
  }

  function syncPreviewScroller() {
    var canScroll = previewScroller.scrollHeight > previewScroller.clientHeight + 1;
    previewScroller.tabIndex = canScroll ? 0 : -1;
    previewScroller.setAttribute("aria-label", canScroll ? "Catalog preview; scroll for the complete preview" : "Catalog preview");
  }

  function selectionsFromLocation() {
    var url = new URL(window.location.href);
    var rawModernFormats = url.searchParams.getAll("format");
    var modernFormats = unique(rawModernFormats).filter(function (value) {
      return Object.prototype.hasOwnProperty.call(labels.format, value);
    });
    var hasModernSelection = url.searchParams.has("format") || url.searchParams.has("topic");
    var selection = {
      format: [modernFormats[0] || "catalog"],
      topic: unique(url.searchParams.getAll("topic")).filter(function (value) {
        return Object.prototype.hasOwnProperty.call(labels.topic, value);
      })
    };
    var legacyTypes = unique(url.searchParams.getAll("type"));
    var recognizedLegacyTypes = legacyTypes.filter(function (type) {
      return Object.prototype.hasOwnProperty.call(legacyTypeAliases, type);
    });

    recognizedLegacyTypes.forEach(function (type) {
      var alias = legacyTypeAliases[type];
      if (alias.kind === "format" && modernFormats.length === 0 && selection.format[0] === "catalog") {
        selection.format[0] = alias.value;
      }
      if (alias.kind === "topic" && selection.topic.indexOf(alias.value) === -1) {
        selection.topic.push(alias.value);
      }
    });

    var legacyKinds = unique(recognizedLegacyTypes.map(function (type) {
      return legacyTypeAliases[type].kind;
    }));
    var legacyOrMode = !hasModernSelection && legacyKinds.length > 1;
    var repeatedModernMode = rawModernFormats.length > 1;
    var explicitCatalogMode = rawModernFormats.indexOf("catalog") !== -1;

    return {
      selection: selection,
      legacyOrMode: legacyOrMode,
      shouldCanonicalize: (recognizedLegacyTypes.length > 0 && !legacyOrMode) || repeatedModernMode || explicitCatalogMode
    };
  }

  function setSelections(selection) {
    var mode = selection.format[0] || "catalog";

    filters.forEach(function (input) {
      var kind = input.getAttribute("data-filter-kind");
      input.checked = kind === "format" ? input.value === mode : selection.topic.indexOf(input.value) !== -1;
    });
  }

  function readSelections() {
    var selection = { format: [], topic: [] };

    filters.forEach(function (input) {
      if (input.checked) {
        selection[input.getAttribute("data-filter-kind")].push(input.value);
      }
    });
    if (selection.format.length === 0) {
      selection.format.push("catalog");
    }

    return selection;
  }

  function hasSelections() {
    return currentMode() !== "catalog" || activeSelection.topic.length > 0;
  }

  function syncLocation(mode) {
    var url = new URL(window.location.href);
    var unknownLegacyTypes = unique(url.searchParams.getAll("type").filter(function (type) {
      return !Object.prototype.hasOwnProperty.call(legacyTypeAliases, type);
    }));
    url.searchParams.delete("type");
    url.searchParams.delete("format");
    url.searchParams.delete("topic");
    unknownLegacyTypes.forEach(function (type) {
      url.searchParams.append("type", type);
    });
    if (currentMode() !== "catalog") {
      url.searchParams.set("format", currentMode());
    }
    activeSelection.topic.forEach(function (topic) {
      url.searchParams.append("topic", topic);
    });
    window.history[mode + "State"]({
      format: activeSelection.format.slice(),
      topic: activeSelection.topic.slice()
    }, "", url);
  }

  function removePreviewState() {
    cards.forEach(function (card) {
      card.removeAttribute("data-preview-active");
    });
  }

  function selectionSummary() {
    var clauses = [];

    if (legacyOrActive) {
      return "format or topic: " + activeSelection.format.concat(activeSelection.topic).filter(function (value) {
        return value !== "catalog";
      }).map(function (value) {
        return labels.format[value] || labels.topic[value];
      }).join(", ");
    }

    if (currentMode() !== "catalog") {
      clauses.push("reading mode: " + labels.format[currentMode()]);
    }
    if (activeSelection.topic.length > 0) {
      clauses.push("topics or tools: " + activeSelection.topic.map(function (value) {
        return labels.topic[value];
      }).join(", "));
    }

    return clauses.join("; ");
  }

  function showCollectionSummary(visibleCount) {
    removePreviewState();
    previewCardId = "";
    previewRoute = "";
    previewRouteLabel = "";
    previewScroller.scrollTop = 0;
    entryPanel.hidden = true;
    defaultPanel.hidden = false;

    if (!hasSelections()) {
      summary.textContent = "All " + cards.length + " catalog entries are in view. Focus an entry to bring its primary visual and direct reading route into this panel.";
      syncPreviewScroller();
      return;
    }

    summary.textContent = visibleCount + " of " + cards.length + " catalog groups match the selected " + selectionSummary() + ". Focus an entry to inspect its direct reading route.";
    syncPreviewScroller();
  }

  function cardValues(card, attribute) {
    return card.getAttribute(attribute).split(/\s+/).filter(Boolean);
  }

  function rewriteFragmentLinks(node, route) {
    Array.prototype.forEach.call(node.querySelectorAll("a[href^='#']"), function (link) {
      link.setAttribute("href", route + link.getAttribute("href"));
    });
  }

  function caseBriefRoutes(card) {
    return card.hasAttribute("data-case-brief-routes") ? cardValues(card, "data-case-brief-routes") : [];
  }

  function cloneForCatalog(node, className, route) {
    var clone = document.importNode(node, true);
    clone.className = className;
    clone.removeAttribute("id");
    clone.removeAttribute("aria-labelledby");
    Array.prototype.forEach.call(clone.querySelectorAll("[id]"), function (identified) {
      identified.removeAttribute("id");
    });
    rewriteFragmentLinks(clone, route);
    return clone;
  }

  function loadCaseBrief(route) {
    if (!caseBriefCache.has(route)) {
      var request = window.fetch(route, { credentials: "same-origin" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Case Brief source returned " + response.status);
        }
        return response.text();
      }).then(function (source) {
        var parsed = new DOMParser().parseFromString(source, "text/html");
        var section = parsed.querySelector("#case-brief[data-content-form='case-brief']");
        var orientation = section ? section.querySelector(":scope > h2 + p") : null;
        var fields = section ? section.querySelector(":scope > dl.debrief-at-glance") : null;
        var basis = section ? Array.prototype.find.call(section.querySelectorAll(":scope > p"), function (paragraph) {
          var label = paragraph.querySelector(":scope > strong:first-child");
          return label && label.textContent.trim() === "Basis and limits:";
        }) : null;
        var heading = parsed.querySelector("main h1, h1");

        if (!section || !orientation || !fields || !basis) {
          throw new Error("Case Brief source is missing its orientation, fields, or basis and limits");
        }

        return {
          title: normalizedText(heading) || "Case Brief",
          orientation: orientation,
          fields: fields,
          basis: basis
        };
      }).catch(function (error) {
        caseBriefCache.delete(route);
        throw error;
      });
      caseBriefCache.set(route, request);
    }

    return caseBriefCache.get(route);
  }

  function routeLabel(card, route) {
    var cardTitle = normalizedText(card.querySelector(":scope > h2")) || "Selected reading";
    var routes = caseBriefRoutes(card);

    if (routes.length === 1) {
      return cardTitle;
    }

    var matchingLink = Array.prototype.find.call(card.querySelectorAll("a[href]"), function (link) {
      return link.getAttribute("href").split(/[?#]/)[0] === route && link.getAttribute("href").indexOf("#case-brief") !== -1;
    });
    return normalizedText(matchingLink) || cardTitle;
  }

  function createActionLink(className, href, text) {
    var link = document.createElement("a");
    link.className = className;
    link.href = href;
    link.textContent = text;
    return link;
  }

  function appendCaseBriefActions(article, route) {
    var actions = document.createElement("div");
    actions.className = "debrief-preview-actions";
    actions.append(
      createActionLink("debrief-preview-link", route + "#case-brief", "Open this Case Brief"),
      createActionLink("debrief-preview-secondary-link", route, "Read the Full Debrief")
    );
    article.append(actions);
  }

  function createCaseBriefArticle(card, route, source, index) {
    var article = document.createElement("article");
    var heading = document.createElement("h3");
    var headingLink = document.createElement("a");
    var headingId = card.id + "-case-brief-" + (index + 1);

    article.className = "debrief-card__case-brief";
    article.setAttribute("data-case-brief-route", route);
    article.setAttribute("aria-labelledby", headingId);
    heading.className = "txt-h3 debrief-card__case-brief-title";
    heading.id = headingId;
    headingLink.href = route + "#case-brief";
    headingLink.textContent = source.title;
    heading.append(headingLink);
    article.append(
      heading,
      cloneForCatalog(source.orientation, "debrief-preview-slug", route),
      cloneForCatalog(source.fields, "debrief-preview-facts", route),
      cloneForCatalog(source.basis, "debrief-preview-note", route)
    );
    appendCaseBriefActions(article, route);
    return article;
  }

  function createCaseBriefFallback(card, route, index) {
    var article = document.createElement("article");
    var heading = document.createElement("h3");
    var headingLink = document.createElement("a");
    var note = document.createElement("p");
    var headingId = card.id + "-case-brief-" + (index + 1);

    article.className = "debrief-card__case-brief";
    article.setAttribute("data-case-brief-route", route);
    article.setAttribute("data-case-brief-state", "direct-route");
    article.setAttribute("aria-labelledby", headingId);
    heading.className = "txt-h3 debrief-card__case-brief-title";
    heading.id = headingId;
    headingLink.href = route + "#case-brief";
    headingLink.textContent = routeLabel(card, route);
    heading.append(headingLink);
    note.className = "debrief-preview-note";
    note.textContent = "The source page carries this complete Case Brief. Open the direct route to read its concise account, basis, and limits.";
    article.append(heading, note);
    appendCaseBriefActions(article, route);
    return article;
  }

  function ensureCaseBriefDisplay(card) {
    var existing = card.querySelector(":scope > [data-card-case-briefs]");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "debrief-card__case-brief-list";
      existing.setAttribute("data-card-case-briefs", "");
      existing.hidden = true;
      card.append(existing);
    }
    existing.hidden = false;

    if (existing.getAttribute("data-case-brief-complete") === "true") {
      return Promise.resolve({ routes: caseBriefRoutes(card).length, failures: 0 });
    }
    if (caseBriefLoads.has(card)) {
      return caseBriefLoads.get(card);
    }

    var routes = caseBriefRoutes(card);
    var loading = document.createElement("p");
    loading.className = "debrief-card__case-brief-loading";
    loading.textContent = routes.length === 1 ? "Loading the source-owned Case Brief…" : "Loading " + routes.length + " source-owned Case Briefs…";
    existing.replaceChildren(loading);
    existing.setAttribute("aria-busy", "true");
    existing.setAttribute("data-case-brief-count", String(routes.length));

    var request = Promise.all(routes.map(function (route) {
      return loadCaseBrief(route).then(function (source) {
        return { route: route, source: source, failed: false };
      }).catch(function () {
        return { route: route, source: null, failed: true };
      });
    })).then(function (results) {
      var failures = 0;
      existing.replaceChildren();
      results.forEach(function (result, index) {
        if (result.failed) {
          failures += 1;
          existing.append(createCaseBriefFallback(card, result.route, index));
        } else {
          existing.append(createCaseBriefArticle(card, result.route, result.source, index));
        }
      });
      existing.setAttribute("aria-busy", "false");
      existing.setAttribute("data-case-brief-complete", failures === 0 ? "true" : "false");
      caseBriefLoads.delete(card);
      return { routes: routes.length, failures: failures };
    });

    caseBriefLoads.set(card, request);
    return request;
  }

  function ensureFullDebriefIndex(card) {
    var existing = card.querySelector(":scope > [data-card-full-index]");
    if (existing) {
      existing.hidden = false;
      return;
    }

    var routes = caseBriefRoutes(card);
    var heading = document.createElement("h3");
    var headingId = card.id + "-full-debrief-index";
    existing = document.createElement("section");
    existing.className = "debrief-card__full-index";
    existing.setAttribute("data-card-full-index", "");
    existing.setAttribute("aria-labelledby", headingId);
    heading.className = "txt-h3";
    heading.id = headingId;
    heading.textContent = routes.length === 1 ? "Complete account" : "Complete accounts";
    existing.append(heading);

    if (routes.length === 1) {
      existing.append(createActionLink("debrief-preview-link", routes[0], "Read the Full Debrief"));
    } else {
      var routeList = document.createElement("ul");
      routeList.className = "clean-list debrief-card__full-index-list";
      routes.forEach(function (route) {
        var item = document.createElement("li");
        item.append(createActionLink("debrief-preview-secondary-link", route, routeLabel(card, route)));
        routeList.append(item);
      });
      existing.append(routeList);
    }
    card.append(existing);
  }

  function syncCardModePanels(card, mode) {
    var compactPanel = card.querySelector(":scope > [data-card-case-briefs]");
    var fullPanel = card.querySelector(":scope > [data-card-full-index]");

    if (compactPanel) {
      compactPanel.hidden = mode !== "case-brief";
    }
    if (fullPanel) {
      fullPanel.hidden = mode !== "full-debrief";
    }
    if (mode === "full-debrief" && caseBriefRoutes(card).length > 0) {
      ensureFullDebriefIndex(card);
    }
  }

  function matchesAny(selected, available) {
    return selected.length === 0 || selected.some(function (value) {
      return available.indexOf(value) !== -1;
    });
  }

  function routeCount(visibleCards) {
    return visibleCards.reduce(function (count, card) {
      var routes = caseBriefRoutes(card);
      return count + (routes.length || 1);
    }, 0);
  }

  function statusForMode(mode, visibleCards) {
    var visibleCount = visibleCards.length;
    var selectedTopics = activeSelection.topic.length > 0 ? " for the selected topics and tools" : "";

    if (legacyOrActive) {
      return "Showing " + visibleCount + " of " + cards.length + " catalog groups for " + selectionSummary() + ".";
    }
    if (mode === "case-brief") {
      return "Showing " + routeCount(visibleCards) + " Case Briefs across " + visibleCount + " catalog cases" + selectedTopics + ".";
    }
    if (mode === "full-debrief") {
      return "Showing " + routeCount(visibleCards) + " Full Debrief routes across " + visibleCount + " catalog cases" + selectedTopics + ".";
    }
    if (mode === "article") {
      return "Showing " + visibleCount + " Articles" + selectedTopics + ".";
    }
    if (activeSelection.topic.length > 0) {
      return "Showing " + visibleCount + " of " + cards.length + " catalog entries for the selected topics and tools.";
    }
    return "Showing all " + cards.length + " catalog entries. Catalog overview is active.";
  }

  function showCaseBriefCatalog(visibleCards, requestId) {
    var expectedRoutes = routeCount(visibleCards);
    list.setAttribute("aria-busy", "true");
    status.textContent = statusForMode("case-brief", visibleCards) + " Source-owned brief content is loading.";

    Promise.all(visibleCards.map(ensureCaseBriefDisplay)).then(function (results) {
      if (requestId !== caseBriefDisplayRequestId || currentMode() !== "case-brief") {
        return;
      }
      var failures = results.reduce(function (count, result) {
        return count + result.failures;
      }, 0);
      list.setAttribute("aria-busy", "false");
      if (failures === 0) {
        status.textContent = statusForMode("case-brief", visibleCards);
      } else {
        var fallbackMessage = failures === 1
          ? "The direct source route remains available for the other brief."
          : "Direct source routes remain available for the other " + failures + " briefs.";
        status.textContent = (expectedRoutes - failures) + " of " + expectedRoutes + " Case Briefs are displayed in the catalog. " + fallbackMessage;
      }
      list.dispatchEvent(new CustomEvent("canvas:page-rail-source-change", { bubbles: true }));
    });
  }

  function applyFilters(historyMode) {
    var visibleCards = [];
    var modeRequestId = ++caseBriefDisplayRequestId;

    activeSelection = readSelections();
    var mode = currentMode();
    var displayMode = legacyOrActive ? "catalog" : mode;
    catalog.setAttribute("data-reading-mode", displayMode);

    cards.forEach(function (card) {
      var availableFormats = cardValues(card, "data-formats");
      var availableTopics = cardValues(card, "data-topics");
      var formatMatch = mode === "catalog" || availableFormats.indexOf(mode) !== -1;
      var topicMatch = matchesAny(activeSelection.topic, availableTopics);
      var selectedLegacyFormats = activeSelection.format.filter(function (value) {
        return value !== "catalog";
      });
      var legacyMatch = selectedLegacyFormats.some(function (value) {
        return availableFormats.indexOf(value) !== -1;
      }) || activeSelection.topic.some(function (value) {
        return availableTopics.indexOf(value) !== -1;
      });
      var isVisible = legacyOrActive ? legacyMatch : formatMatch && topicMatch;

      card.hidden = !isVisible;
      syncCardModePanels(card, displayMode);
      if (isVisible) {
        visibleCards.push(card);
      }
    });

    clear.disabled = !hasSelections();
    zeroResults.hidden = visibleCards.length !== 0;
    status.textContent = visibleCards.length === 0 ? "No catalog entries match the selected reading mode and topics." : statusForMode(mode, visibleCards);

    if (displayMode === "case-brief" && visibleCards.length > 0) {
      removePreviewState();
      preview.hidden = true;
      showCaseBriefCatalog(visibleCards, modeRequestId);
    } else {
      list.setAttribute("aria-busy", "false");
      preview.hidden = false;
      showCollectionSummary(visibleCards.length);
    }
    list.dispatchEvent(new CustomEvent("canvas:page-rail-source-change", { bubbles: true }));
    if (historyMode) {
      syncLocation(historyMode);
    }
  }

  function routeSelection(card, target, routes, fallbackLabel) {
    var canRetainRoute = card.id === previewCardId && routes.indexOf(previewRoute) !== -1;
    var selection = {
      route: canRetainRoute ? previewRoute : routes[0],
      label: canRetainRoute ? previewRouteLabel : fallbackLabel
    };
    var link = target && target.closest ? target.closest("a[href]") : null;

    if (!link || !card.contains(link)) {
      return selection;
    }

    var linkedRoute = link.getAttribute("href").split(/[?#]/)[0];
    if (routes.indexOf(linkedRoute) !== -1) {
      selection.route = linkedRoute;
      if (routes.length > 1) {
        var normalizedLinkLabel = normalizedText(link);
        if (normalizedLinkLabel) {
          selection.label = normalizedLinkLabel;
        }
      }
    }

    return selection;
  }

  function showEntry(card, target) {
    if (catalog.getAttribute("data-reading-mode") === "case-brief") {
      return;
    }

    var cardChanged = previewCardId !== card.id;
    var title = card.querySelector(":scope > h2");
    var slug = card.querySelector(".project--slug");
    var image = card.querySelector(".project__upfront");
    var route = card.querySelector(".img__anchor") || card.querySelector("a[href]");
    var routeHref = route ? route.getAttribute("href").split(/[?#]/)[0] : "";
    var formats = Array.prototype.map.call(card.querySelectorAll(".debrief-card__types li"), function (item) {
      return item.textContent.trim();
    });
    var topics = Array.prototype.map.call(card.querySelectorAll(".debrief-card__topics li"), function (item) {
      return item.textContent.trim();
    });
    var catalogFacts = card.querySelectorAll(".debrief-card__catalog-meta dd");
    var surfacesText = catalogFacts.length > 0 ? normalizedText(catalogFacts[0]) : "Primary visual and worked account";
    var usefulText = catalogFacts.length > 1 ? normalizedText(catalogFacts[1]) : (normalizedText(slug) || "Enterprise collaboration and implementation review");
    var imageAlt = image ? image.getAttribute("alt") : "";
    var routes = caseBriefRoutes(card);
    var fallbackLabel = normalizedText(title) || "Selected reading";
    var selectedRoute = routes.length > 0 ? routeSelection(card, target, routes, fallbackLabel) : {
      route: routeHref,
      label: fallbackLabel
    };
    var primaryLink = preview.querySelector("[data-preview-link]");
    var primaryLinkLabel = preview.querySelector("[data-preview-link-label]");

    removePreviewState();
    card.setAttribute("data-preview-active", "true");
    previewCardId = card.id;
    previewRoute = selectedRoute.route;
    previewRouteLabel = selectedRoute.label;
    defaultPanel.hidden = true;
    entryPanel.hidden = false;

    preview.querySelector("[data-preview-title]").textContent = selectedRoute.label;
    preview.querySelector("[data-preview-slug]").textContent = normalizedText(slug) || "Open the complete reading for its evidence and implementation route.";
    preview.querySelector("[data-preview-formats]").textContent = formats.join(" · ");
    preview.querySelector("[data-preview-topics]").textContent = topics.join(" · ");
    preview.querySelector("[data-preview-surfaces]").textContent = surfacesText;
    preview.querySelector("[data-preview-useful]").textContent = usefulText;

    if (image) {
      var previewImage = preview.querySelector("[data-preview-image]");
      previewImage.setAttribute("src", image.getAttribute("src"));
      previewImage.setAttribute("alt", "");
      preview.querySelector("[data-preview-caption]").textContent = imageAlt ? "Primary visual — " + imageAlt : "Primary visual from the selected reading.";
    }

    primaryLink.setAttribute("href", selectedRoute.route);
    primaryLinkLabel.textContent = routes.length > 0 ? "Read the Full Debrief" : "Open the Article";

    if (cardChanged) {
      previewScroller.scrollTop = 0;
    }
    syncPreviewScroller();
  }

  filters.forEach(function (input) {
    input.addEventListener("change", function () {
      legacyOrActive = false;
      applyFilters("push");
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    legacyOrActive = false;
    applyFilters("replace");
  });

  clear.addEventListener("click", function () {
    legacyOrActive = false;
    setSelections({ format: ["catalog"], topic: [] });
    applyFilters("push");
  });

  zeroClear.addEventListener("click", function () {
    legacyOrActive = false;
    setSelections({ format: ["catalog"], topic: [] });
    applyFilters("push");
    filters[0].focus();
  });

  window.addEventListener("popstate", function () {
    var locationState = selectionsFromLocation();
    legacyOrActive = locationState.legacyOrMode;
    setSelections(locationState.selection);
    applyFilters();
  });
  window.addEventListener("resize", syncPreviewScroller);

  cards.forEach(function (card) {
    card.addEventListener("focusin", function (event) {
      showEntry(card, event.target);
    });
    card.addEventListener("mouseenter", function () {
      if (window.matchMedia("(hover: hover)").matches) {
        showEntry(card);
      }
    });
  });

  var initial = selectionsFromLocation();
  catalog.setAttribute("data-enhanced", "true");
  preview.hidden = false;
  setSelections(initial.selection);
  legacyOrActive = initial.legacyOrMode;
  applyFilters();
  if (initial.shouldCanonicalize) {
    syncLocation("replace");
  }
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  controls.hidden = false;
}());
