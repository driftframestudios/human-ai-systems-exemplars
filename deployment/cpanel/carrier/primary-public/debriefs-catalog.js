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

  function caseBriefRoutes(card) {
    return card.hasAttribute("data-case-brief-routes") ? cardValues(card, "data-case-brief-routes") : [];
  }

  function caseBriefProjection(route) {
    // Source-checked templates keep the scan available from HTTP and direct-file viewing alike.
    var matches = Array.prototype.filter.call(document.querySelectorAll("template[data-case-brief-projection]"), function (template) {
      return template.getAttribute("data-case-brief-projection") === route;
    });

    if (matches.length !== 1) {
      return null;
    }

    var template = matches[0];
    var content = document.importNode(template.content, true);
    var title = template.getAttribute("data-case-brief-title");
    var orientation = content.querySelector(".debrief-preview-slug");
    var fields = content.querySelector(".debrief-preview-facts");
    var basis = content.querySelector(".debrief-preview-note");
    var trackContainers = content.querySelectorAll("[data-case-brief-detail]");
    var media = content.querySelector(".debrief-card__case-brief-media[data-case-brief-media]");

    if (
      !title
      || !orientation
      || !fields
      || fields.children.length !== 6
      || !basis
      || trackContainers.length !== 1
      || !media
    ) {
      return null;
    }

    var trackContainer = trackContainers[0];
    // Admit the complete group as one ordered contract. A source may add one
    // concise orientation paragraph between the heading and disclosure pair;
    // every other child shape keeps the ordinary catalog card in view.
    var trackChildren = Array.prototype.slice.call(trackContainer.children);
    var trackHeading = trackChildren[0];
    var trackIntro = trackChildren[1]
      && trackChildren[1].matches("p.debrief-case-brief__track-intro")
      ? trackChildren[1]
      : null;
    var disclosures = trackChildren.slice(trackIntro ? 2 : 1);
    var allDisclosures = trackContainer.querySelectorAll("details");
    var nestedDisclosures = trackContainer.querySelectorAll(
      "details.debrief-case-brief__track--disclosure[data-case-brief-track]"
    );
    var trackNames = disclosures.map(function (disclosure) {
      return disclosure.getAttribute("data-case-brief-track") || "";
    });
    var completeDisclosures = disclosures.every(function (disclosure) {
      var summary = disclosure.firstElementChild;
      var trackList = summary ? summary.nextElementSibling : null;
      var trackTitle = summary
        ? summary.querySelector(":scope > .debrief-case-brief__track-title")
        : null;
      var trackState = summary
        ? summary.querySelector(":scope > .debrief-case-brief__track-state[aria-hidden='true']")
        : null;
      var stateExpand = trackState
        ? trackState.querySelector(":scope > .debrief-case-brief__track-state--expand")
        : null;
      var stateCollapse = trackState
        ? trackState.querySelector(":scope > .debrief-case-brief__track-state--collapse")
        : null;
      return disclosure.children.length === 2
        && !disclosure.hasAttribute("open")
        && !disclosure.hasAttribute("name")
        && summary
        && summary.matches("summary.debrief-case-brief__track-summary")
        && summary.children.length === 2
        && trackTitle
        && normalizedText(trackTitle)
        && trackState
        && trackState.children.length === 2
        && stateExpand
        && stateCollapse
        && normalizedText(stateExpand) === "Expand"
        && normalizedText(stateCollapse) === "Collapse"
        && trackList
        && trackList.matches("ol")
        && trackList.children.length > 0
        && Array.prototype.every.call(trackList.children, function (item) { return item.matches("li"); });
    });

    if (
      (trackChildren.length !== 3 && trackChildren.length !== 4)
      || !trackHeading
      || !trackHeading.matches("h4.debrief-case-brief__track-group-title")
      || !normalizedText(trackHeading)
      || (trackChildren.length === 4 && !trackIntro)
      || (trackIntro && !normalizedText(trackIntro))
      || disclosures.length !== 2
      || allDisclosures.length !== 2
      || nestedDisclosures.length !== 2
      || new Set(trackNames).size !== 2
      || trackNames.some(function (name) { return !/^[a-z][a-z0-9-]*$/.test(name); })
      || !completeDisclosures
    ) {
      return null;
    }

    return { title: title, content: content };
  }

  function routeLabel(card, route) {
    var cardTitle = normalizedText(card.querySelector(":scope > .debrief-card__heading > h2")) || "Selected reading";
    var routes = caseBriefRoutes(card);

    if (routes.length === 1) {
      return cardTitle;
    }

    var matchingLink = Array.prototype.find.call(card.querySelectorAll(".track-index a[href]"), function (link) {
      return link.getAttribute("href").split(/[?#]/)[0] === route;
    }) || Array.prototype.find.call(card.querySelectorAll("a[href]"), function (link) {
      return link.getAttribute("href").split(/[?#]/)[0] === route;
    });
    if (!matchingLink) {
      return cardTitle;
    }

    var label = matchingLink.cloneNode(true);
    Array.prototype.forEach.call(label.querySelectorAll("br"), function (breakNode) {
      breakNode.replaceWith(document.createTextNode(" "));
    });
    return normalizedText(label) || cardTitle;
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
    actions.append(createActionLink("debrief-preview-link", route, "Read the Full Debrief"));
    article.append(actions);
  }

  function createCaseBriefArticle(card, route, projection, index) {
    var article = document.createElement("article");
    var heading = document.createElement("h3");
    var headingId = card.id + "-case-brief-" + (index + 1);

    article.className = "debrief-card__case-brief";
    article.setAttribute("data-case-brief-route", route);
    article.setAttribute("aria-labelledby", headingId);
    heading.className = "txt-h3 debrief-card__case-brief-title";
    heading.id = headingId;
    heading.textContent = projection.title;
    article.append(heading, projection.content);
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
    if (existing.getAttribute("data-case-brief-complete") === "true") {
      existing.hidden = currentMode() !== "case-brief" || card.hidden;
      card.setAttribute("data-case-brief-state", "loaded");
      return { routes: caseBriefRoutes(card).length, displayed: caseBriefRoutes(card).length, failures: 0 };
    }

    var routes = caseBriefRoutes(card);
    var projections = routes.map(caseBriefProjection);
    var failures = projections.filter(function (projection) {
      return projection === null;
    }).length;

    existing.replaceChildren();
    existing.setAttribute("data-case-brief-count", String(routes.length));
    existing.setAttribute("data-case-brief-complete", failures === 0 ? "true" : "false");

    // A grouped catalog card changes presentation only after every named route is ready.
    if (failures === 0) {
      routes.forEach(function (route, index) {
        existing.append(createCaseBriefArticle(card, route, projections[index], index));
      });
      existing.hidden = currentMode() !== "case-brief" || card.hidden;
      card.setAttribute("data-case-brief-state", "loaded");
    } else {
      existing.hidden = true;
      card.removeAttribute("data-case-brief-state");
    }

    return { routes: routes.length, displayed: failures === 0 ? routes.length : 0, failures: failures };
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

  function showCaseBriefCatalog(visibleCards) {
    var expectedRoutes = routeCount(visibleCards);
    var results = visibleCards.map(ensureCaseBriefDisplay);
    var displayedRoutes = results.reduce(function (count, result) {
      return count + result.displayed;
    }, 0);
    var withheldRoutes = expectedRoutes - displayedRoutes;

    list.setAttribute("aria-busy", "false");
    if (withheldRoutes === 0) {
      status.textContent = statusForMode("case-brief", visibleCards);
    } else {
      var availableMessage = withheldRoutes === 1
        ? "One Full Debrief route remains available in its catalog card."
        : withheldRoutes + " Full Debrief routes remain available in their catalog cards.";
      status.textContent = displayedRoutes + " of " + expectedRoutes + " Case Briefs are displayed in the catalog. " + availableMessage;
    }
    list.dispatchEvent(new CustomEvent("canvas:page-rail-source-change", { bubbles: true }));
  }

  function applyFilters(historyMode) {
    var visibleCards = [];
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
      showCaseBriefCatalog(visibleCards);
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
    var title = card.querySelector(":scope > .debrief-card__heading > h2");
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
    var hasPreviewImage = card.hasAttribute("data-catalog-preview-src");
    var previewImageSrc = hasPreviewImage ? card.getAttribute("data-catalog-preview-src") : (image ? image.getAttribute("src") : "");
    var previewImageSrcset = hasPreviewImage ? card.getAttribute("data-catalog-preview-srcset") : (image ? image.getAttribute("srcset") : "");
    var previewImageSizes = hasPreviewImage ? card.getAttribute("data-catalog-preview-sizes") : (image ? image.getAttribute("sizes") : "");
    var previewImageWidth = hasPreviewImage ? card.getAttribute("data-catalog-preview-width") : (image ? image.getAttribute("width") : "");
    var previewImageHeight = hasPreviewImage ? card.getAttribute("data-catalog-preview-height") : (image ? image.getAttribute("height") : "");
    var previewImageAlt = card.getAttribute("data-catalog-preview-alt") || imageAlt;
    var previewImageCaption = card.getAttribute("data-catalog-preview-caption") || previewImageAlt;
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

    if (previewImageSrc) {
      var previewImage = preview.querySelector("[data-preview-image]");
      previewImage.removeAttribute("srcset");
      previewImage.removeAttribute("sizes");
      previewImage.removeAttribute("width");
      previewImage.removeAttribute("height");
      previewImage.setAttribute("src", previewImageSrc);
      previewImage.setAttribute("alt", previewImageAlt);
      if (previewImageSrcset) {
        previewImage.setAttribute("srcset", previewImageSrcset);
      }
      if (previewImageSizes) {
        previewImage.setAttribute("sizes", previewImageSizes);
      }
      if (previewImageWidth && previewImageHeight) {
        previewImage.setAttribute("width", previewImageWidth);
        previewImage.setAttribute("height", previewImageHeight);
      }
      preview.querySelector("[data-preview-caption]").textContent = previewImageCaption ? "Preview visual — " + previewImageCaption : "Preview visual from the selected reading.";
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
