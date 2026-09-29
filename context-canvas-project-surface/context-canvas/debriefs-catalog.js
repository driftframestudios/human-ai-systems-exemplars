(function () {
  "use strict";

  var controls = document.querySelector("[data-debrief-filters]");
  var list = document.querySelector("[data-debrief-list]");
  var preview = document.querySelector("[data-debrief-preview]");

  if (!controls || !list || !preview) {
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
  var caseBriefPanel = preview.querySelector("[data-preview-case-brief]");
  var caseBriefStatus = preview.querySelector("[data-preview-case-brief-status]");
  var caseBriefContent = preview.querySelector("[data-preview-case-brief-content]");
  var previewCardId = "";
  var previewCaseBriefRoute = "";
  var previewCaseBriefLabel = "";
  var previewRequestId = 0;
  var caseBriefCache = new Map();
  var activeSelection = { format: [], topic: [] };
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

  function syncPreviewScroller() {
    var canScroll = previewScroller.scrollHeight > previewScroller.clientHeight + 1;
    previewScroller.tabIndex = canScroll ? 0 : -1;
    previewScroller.setAttribute("aria-label", canScroll ? "Reading preview; scroll for the complete preview" : "Reading preview");
  }

  function selectionsFromLocation() {
    var url = new URL(window.location.href);
    var hasModernSelection = url.searchParams.has("format") || url.searchParams.has("topic");
    var selection = {
      format: unique(url.searchParams.getAll("format")).filter(function (value) {
        return Object.prototype.hasOwnProperty.call(labels.format, value);
      }),
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
      if (alias && selection[alias.kind].indexOf(alias.value) === -1) {
        selection[alias.kind].push(alias.value);
      }
    });

    var legacyKinds = unique(recognizedLegacyTypes.map(function (type) {
      return legacyTypeAliases[type].kind;
    }));
    var legacyOrMode = !hasModernSelection && legacyKinds.length > 1;

    return {
      selection: selection,
      legacyOrMode: legacyOrMode,
      shouldCanonicalize: recognizedLegacyTypes.length > 0 && !legacyOrMode
    };
  }

  function setSelections(selection) {
    filters.forEach(function (input) {
      var kind = input.getAttribute("data-filter-kind");
      input.checked = selection[kind].indexOf(input.value) !== -1;
    });
  }

  function readSelections() {
    var selection = { format: [], topic: [] };

    filters.forEach(function (input) {
      if (input.checked) {
        selection[input.getAttribute("data-filter-kind")].push(input.value);
      }
    });

    return selection;
  }

  function hasSelections() {
    return activeSelection.format.length > 0 || activeSelection.topic.length > 0;
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
    activeSelection.format.forEach(function (format) {
      url.searchParams.append("format", format);
    });
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
      return "format or topic: " + activeSelection.format.concat(activeSelection.topic).map(function (value) {
        return labels.format[value] || labels.topic[value];
      }).join(", ");
    }

    if (activeSelection.format.length > 0) {
      clauses.push("format: " + activeSelection.format.map(function (value) {
        return labels.format[value];
      }).join(", "));
    }
    if (activeSelection.topic.length > 0) {
      clauses.push("topics or tools: " + activeSelection.topic.map(function (value) {
        return labels.topic[value];
      }).join(", "));
    }

    return clauses.join("; ");
  }

  function showCollectionSummary(visibleCount) {
    previewRequestId += 1;
    removePreviewState();
    previewCardId = "";
    previewCaseBriefRoute = "";
    previewCaseBriefLabel = "";
    previewScroller.scrollTop = 0;
    entryPanel.hidden = true;
    defaultPanel.hidden = false;

    if (!hasSelections()) {
      summary.textContent = "All " + cards.length + " catalog entries are in view. Focus an entry to bring its primary visual and continuation routes into this panel.";
      syncPreviewScroller();
      return;
    }

    summary.textContent = visibleCount + " of " + cards.length + " entries match the selected " + selectionSummary() + ". Focus an entry to inspect its available reading routes.";
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

  function cloneForPreview(node, className, route) {
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
      caseBriefCache.set(route, window.fetch(route, { credentials: "same-origin" }).then(function (response) {
        if (!response.ok) {
          throw new Error("Case Brief source returned " + response.status);
        }
        return response.text();
      }).then(function (source) {
        var parsed = new DOMParser().parseFromString(source, "text/html");
        var section = parsed.querySelector("#case-brief[data-content-form='case-brief']");
        var orientation = section ? section.querySelector(":scope > h2 + p") : null;
        var fields = section ? section.querySelector(":scope > dl.debrief-at-glance") : null;
        var evidence = section ? Array.prototype.find.call(section.querySelectorAll(":scope > p"), function (paragraph) {
          var label = paragraph.querySelector(":scope > strong:first-child");
          return label && label.textContent.trim() === "Evidence standing:";
        }) : null;

        if (!section || !orientation || !fields || !evidence) {
          throw new Error("Case Brief source is missing its orientation, fields, or evidence standing");
        }

        return { orientation: orientation, fields: fields, evidence: evidence };
      }));
    }

    return caseBriefCache.get(route);
  }

  function showCaseBrief(route, routeLabel, requestId, cardId) {
    caseBriefPanel.hidden = false;
    caseBriefPanel.setAttribute("aria-busy", "true");
    caseBriefContent.replaceChildren();
    caseBriefStatus.textContent = "Loading the Case Brief.";
    syncPreviewScroller();

    loadCaseBrief(route).then(function (source) {
      if (requestId !== previewRequestId || cardId !== previewCardId) {
        return;
      }
      caseBriefContent.replaceChildren(
        cloneForPreview(source.orientation, "debrief-preview-slug", route),
        cloneForPreview(source.fields, "debrief-preview-facts", route),
        cloneForPreview(source.evidence, "debrief-preview-note", route)
      );
      caseBriefPanel.setAttribute("aria-busy", "false");
      caseBriefStatus.textContent = "Case Brief loaded: " + routeLabel + ".";
      syncPreviewScroller();
    }).catch(function () {
      if (requestId !== previewRequestId || cardId !== previewCardId) {
        return;
      }
      caseBriefContent.replaceChildren();
      caseBriefPanel.setAttribute("aria-busy", "false");
      caseBriefStatus.textContent = "The source page carries the complete Case Brief. Use the direct route below to read it now.";
      syncPreviewScroller();
    });
  }

  function matchesAny(selected, available) {
    return selected.length === 0 || selected.some(function (value) {
      return available.indexOf(value) !== -1;
    });
  }

  function applyFilters(historyMode) {
    var visibleCount = 0;

    activeSelection = readSelections();

    cards.forEach(function (card) {
      var availableFormats = cardValues(card, "data-formats");
      var availableTopics = cardValues(card, "data-topics");
      var formatMatch = matchesAny(activeSelection.format, availableFormats);
      var topicMatch = matchesAny(activeSelection.topic, availableTopics);
      var legacyMatch = activeSelection.format.some(function (value) {
        return availableFormats.indexOf(value) !== -1;
      }) || activeSelection.topic.some(function (value) {
        return availableTopics.indexOf(value) !== -1;
      });
      var isVisible = legacyOrActive ? legacyMatch : formatMatch && topicMatch;

      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    clear.disabled = !hasSelections();
    zeroResults.hidden = visibleCount !== 0;

    if (visibleCount === 0) {
      status.textContent = "No catalog entries match the selected formats and topics.";
    } else if (!hasSelections()) {
      status.textContent = "Showing all " + cards.length + " catalog entries.";
    } else {
      status.textContent = "Showing " + visibleCount + " of " + cards.length + " entries for " + selectionSummary() + ".";
    }

    var currentPreviewCard = document.getElementById(previewCardId);
    var firstVisibleCaseBrief = cards.find(function (card) {
      return !card.hidden && cardValues(card, "data-formats").indexOf("case-brief") !== -1;
    });
    var keepCurrentCaseBrief = currentPreviewCard && !currentPreviewCard.hidden &&
      cardValues(currentPreviewCard, "data-formats").indexOf("case-brief") !== -1;

    if (activeSelection.format.indexOf("case-brief") !== -1 && firstVisibleCaseBrief) {
      showEntry(keepCurrentCaseBrief ? currentPreviewCard : firstVisibleCaseBrief);
    } else {
      showCollectionSummary(visibleCount);
    }
    list.dispatchEvent(new CustomEvent("canvas:page-rail-source-change", { bubbles: true }));
    if (historyMode) {
      syncLocation(historyMode);
    }
  }

  function routeSelection(card, target, routes, fallbackLabel) {
    var canRetainRoute = card.id === previewCardId && routes.indexOf(previewCaseBriefRoute) !== -1;
    var selection = {
      route: canRetainRoute ? previewCaseBriefRoute : routes[0],
      label: canRetainRoute ? previewCaseBriefLabel : fallbackLabel
    };
    var link = target && target.closest ? target.closest("a[href]") : null;

    if (!link || !card.contains(link)) {
      return selection;
    }

    var linkedRoute = link.getAttribute("href").split(/[?#]/)[0];
    if (routes.indexOf(linkedRoute) !== -1) {
      selection.route = linkedRoute;
      if (routes.length > 1) {
        var linkLabel = typeof link.innerText === "string" ? link.innerText : link.textContent;
        var normalizedLinkLabel = linkLabel.replace(/\s+/g, " ").trim();
        if (normalizedLinkLabel) {
          selection.label = normalizedLinkLabel;
        }
      }
    }

    return selection;
  }

  function showEntry(card, target) {
    var requestId = ++previewRequestId;
    var cardChanged = previewCardId !== card.id;
    var title = card.querySelector(":scope > h2");
    var slug = card.querySelector(".project--slug");
    var image = card.querySelector(".project__upfront");
    var route = card.querySelector(".img__anchor") || card.querySelector("a[href]");
    var routeHref = route ? route.getAttribute("href") : "";
    var formats = Array.prototype.map.call(card.querySelectorAll(".debrief-card__types li"), function (item) {
      return item.textContent.trim();
    });
    var topics = Array.prototype.map.call(card.querySelectorAll(".debrief-card__topics li"), function (item) {
      return item.textContent.trim();
    });
    var catalogFacts = card.querySelectorAll(".debrief-card__catalog-meta dd");
    var surfacesText = catalogFacts.length > 0 ? catalogFacts[0].textContent.replace(/\s+/g, " ").trim() : "Primary visual and worked account";
    var usefulText = catalogFacts.length > 1 ? catalogFacts[1].textContent.replace(/\s+/g, " ").trim() : (slug ? slug.textContent.trim() : "Enterprise collaboration and implementation review");
    var imageAlt = image ? image.getAttribute("alt") : "";
    var hasCaseBrief = cardValues(card, "data-formats").indexOf("case-brief") !== -1;
    var caseBriefRoutes = card.hasAttribute("data-case-brief-routes") ? cardValues(card, "data-case-brief-routes") : [];
    var fallbackLabel = title ? title.textContent.trim() : "Selected reading";
    var caseBriefSelection = hasCaseBrief && caseBriefRoutes.length > 0 ?
      routeSelection(card, target, caseBriefRoutes, fallbackLabel) : null;
    var primaryLink = preview.querySelector("[data-preview-link]");
    var primaryLinkLabel = preview.querySelector("[data-preview-link-label]");
    var fullLink = preview.querySelector("[data-preview-full-link]");

    removePreviewState();
    card.setAttribute("data-preview-active", "true");
    previewCardId = card.id;
    defaultPanel.hidden = true;
    entryPanel.hidden = false;

    preview.querySelector("[data-preview-title]").textContent = caseBriefSelection ? caseBriefSelection.label : fallbackLabel;
    preview.querySelector("[data-preview-slug]").textContent = slug ? slug.textContent.trim() : "Open the complete reading for its evidence and implementation route.";
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

    if (hasCaseBrief && caseBriefRoutes.length > 0) {
      previewCaseBriefRoute = caseBriefSelection.route;
      previewCaseBriefLabel = caseBriefSelection.label;
      primaryLink.setAttribute("href", caseBriefSelection.route + "#case-brief");
      primaryLinkLabel.textContent = "Read the Case Brief";
      fullLink.setAttribute("href", caseBriefSelection.route);
      fullLink.hidden = false;
      showCaseBrief(caseBriefSelection.route, caseBriefSelection.label, requestId, card.id);
    } else {
      previewCaseBriefRoute = "";
      previewCaseBriefLabel = "";
      primaryLink.setAttribute("href", routeHref);
      primaryLinkLabel.textContent = "Open the complete reading";
      fullLink.hidden = true;
      caseBriefPanel.hidden = true;
      caseBriefPanel.setAttribute("aria-busy", "false");
      caseBriefStatus.textContent = "";
      caseBriefContent.replaceChildren();
    }

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
    setSelections({ format: [], topic: [] });
    applyFilters("push");
  });

  zeroClear.addEventListener("click", function () {
    legacyOrActive = false;
    setSelections({ format: [], topic: [] });
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
      showEntry(card);
    });
  });

  var initial = selectionsFromLocation();
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
