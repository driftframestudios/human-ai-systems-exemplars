(function () {
  "use strict";

  var visitorBoundaryContract = window.ContextCanvasVisitorBoundary;
  var professionalProfileRoute = "https://www.linkedin.com/in/vik-kudesia";

  var routes = {
    about: [
      ["About", "index.html#about-title"],
      ["Career and quality", "index.html#career-title"],
      ["AI Systems orientation", "index.html#ai-orientation-title"],
      ["Investment Studio", "index.html#studio-title"],
      ["Changed work", "index.html#how-title"],
      ["Methods and evidence", "index.html#deliver-title"]
    ],
    ai: [
      ["AI Systems", "ai-systems.html"],
      ["Shared Machinery", "shared-machinery.html"],
      ["PODA", "poda.html"],
      ["Metadata Blocks", "metadata-blocks.html"],
      ["Composable Readings", "grammar-family.html"],
      ["Skills as Working Affordances", "collaboration-skills.html"],
      ["Visualization Fidelity Atlas", "visualization-fidelity-atlas.html"],
      ["Core Architectures", "core-architectures-orientation-index.html"],
      ["Concept Nursery", "concept-nursery.html"],
      ["Resting Concepts", "resting-concepts.html"],
      ["Collaboration Cycle", "cross-platform-collaboration-cycle.html"],
      ["Planning Surface", "planning-surface.html"],
      ["Recovery and Re-entry", "registry-goal-fidelity-routing.html"],
      ["Conditioning Field", "conditioning-field.html"],
      ["Prompt-Side Practice", "prompt-side-conditions-practice.html"],
      ["Benchmark Orientation", "benchmark-orientation.html"],
      ["MAPS Evaluations", "maps-evaluations.html"],
      ["Hiring Surfaces", "hiring-surfaces-talent-agent-intake.html"]
    ],
    debriefs: [
      ["All Debriefs", "debriefs.html"],
      ["Genomic Viewer", "genomic-viewer-replatforming.html"],
      ["Clinical Trial Coordination", "fmi-clinical-trial-coordination.html"],
      ["EHR · Discrete Genomic Result", "ehr-discrete-genomic-result.html"],
      ["EHR · Two Charts, One Result", "ehr-two-charts-one-result.html"],
      ["EHR · Three Front Doors", "ehr-three-front-doors.html"],
      ["EHR · PGx Alert Failure", "ehr-pgx-alert-failure.html"],
      ["EHR · Interface Engine", "ehr-interface-engine-replatform.html"],
      ["FMI LIMS / ELN", "fmi-lims-eln-replatforming.html"],
      ["Who To Believe", "who-to-believe-reviews-platform.html"],
      ["Humatics", "choose-your-player-humatics.html"],
      ["Initiative Costing", "initiative-costing.html"],
      ["Field Inspection Harness", "field-inspection-harness-replatform.html"],
      ["Distributed Inspection Harness", "distributed-inspection-harness.html"],
      ["Three-Way Comparative & The Return", "three-way-comparative-return.html"],
      ["Narrative–Execution Gap Research Atlas", "narrative-execution-gap-research-atlas.html"],
      ["Prompt-Side Conditions Practice", "prompt-side-conditions-practice.html"],
      ["Benchmark Orientation", "benchmark-orientation.html"],
      ["MAPS Evaluations", "maps-evaluations.html"],
      ["Brief Exploration exemplar", "exemplar-brief-exploration.html"],
      ["Gallery List exemplar", "exemplar-gallery-list.html"]
    ]
  };

  function element(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function routeList(title, items) {
    var section = element("section", "super-footer__column");
    var heading = element("h2", "super-footer__heading", title);
    var list = element("ul", "super-footer__list");
    section.appendChild(heading);
    items.forEach(function (item) {
      var li = document.createElement("li");
      var link = element("a", "", item[0]);
      link.href = item[1];
      li.appendChild(link);
      list.appendChild(li);
    });
    section.appendChild(list);
    return section;
  }

  function installFooter() {
    var footer = document.querySelector("body > footer[role='contentinfo'], body > footer.footer__container, body > footer.about-footer, body > footer, .page-shell > footer[role='contentinfo'], .page-shell > footer.footer__container, .page-shell > footer.about-footer, .page-shell > footer");
    if (footer && footer.querySelector(".super-footer__grid")) return;
    if (!footer) {
      footer = element("footer", "");
      footer.setAttribute("role", "contentinfo");
      document.body.appendChild(footer);
    }
    if (footer.parentElement !== document.body) document.body.appendChild(footer);
    footer.classList.add("super-footer");
    footer.setAttribute("aria-label", "Context Canvas site map and page footer");

    var boundarySelector = visitorBoundaryContract ? visitorBoundaryContract.rootSelector : "[data-visitor-boundary]";
    var visitorBoundary = footer.querySelector(":scope > " + boundarySelector + ", :scope > * > " + boundarySelector);
    var attribution = footer.querySelector(":scope > .site-attribution, :scope > * > .site-attribution");
    if (visitorBoundary && visitorBoundaryContract) {
      var boundaryContext = visitorBoundary.querySelector(visitorBoundaryContract.contextSelector);
      var markers = Array.prototype.slice.call(visitorBoundary.querySelectorAll(visitorBoundaryContract.markerSelector));
      var exactContext = boundaryContext && boundaryContext.innerText.replace(/\r\n?/g, "\n").trim() === visitorBoundaryContract.contextText;
      var exact = exactContext && markers.length === visitorBoundaryContract.markers.length && markers.every(function (marker, index) {
        return marker.innerText.replace(/\r\n?/g, "\n").trim() === visitorBoundaryContract.markers[index].lines.join("\n");
      });
      visitorBoundary.dataset.visitorBoundaryState = exact ? "verified" : "authored";
    }
    if (visitorBoundary) visitorBoundary.remove();
    if (attribution) attribution.remove();

    if (footer.childNodes.length) {
      var local = element("div", "super-footer__local");
      while (footer.firstChild) local.appendChild(footer.firstChild);
      footer.appendChild(local);
    }

    var grid = element("div", "super-footer__grid");
    grid.appendChild(routeList("About", routes.about));
    grid.appendChild(routeList("AI Systems", routes.ai));
    grid.appendChild(routeList("Debriefs", routes.debriefs));
    footer.appendChild(grid);

    var closing = element("div", "super-footer__closing");
    var registry = document.createElement("p");
    registry.appendChild(document.createTextNode("The Enterprise Human–AI Practitioner Registry continues at "));
    var kindlight = element("a", "", "kindlight.systems");
    kindlight.href = "https://kindlight.systems/";
    kindlight.setAttribute("aria-label", "Visit kindlight.systems");
    registry.appendChild(kindlight);
    registry.appendChild(document.createTextNode(". This link leaves the Context Canvas."));

    var network = document.createElement("p");
    var github = element("a", "", "GitHub");
    github.href = "https://github.com/driftframestudios/human-ai-systems-exemplars";
    github.setAttribute("aria-label", "View human-ai-systems-exemplars on GitHub");
    network.appendChild(github);
    network.appendChild(document.createTextNode(" · "));
    if (professionalProfileRoute.indexOf("{{PUBLIC_URL_") === -1) {
      var professionalProfileLink = element("a", "", "Professional profile");
      professionalProfileLink.href = professionalProfileRoute;
      professionalProfileLink.setAttribute(
        "aria-label",
        "View the author's professional profile",
      );
      network.appendChild(professionalProfileLink);
    } else {
      network.appendChild(
        element(
          "span",
          "super-footer__reserved",
          "Professional profile available in the public build",
        ),
      );
    }
    closing.appendChild(registry);
    closing.appendChild(network);
    footer.appendChild(closing);

    if (visitorBoundary) footer.appendChild(visitorBoundary);
    if (attribution) footer.appendChild(attribution);
  }

  function uniqueMajorSections(main) {
    var candidates = Array.prototype.slice.call(main.querySelectorAll("section[aria-labelledby], article[aria-labelledby]"));
    return candidates.filter(function (candidate) {
      var parent = candidate.parentElement && candidate.parentElement.closest("section[aria-labelledby], article[aria-labelledby]");
      return !parent || parent === candidate;
    });
  }

  function pageRailSource(main) {
    var source = main.querySelector("[data-canvas-page-rail-source]");
    if (!source) {
      return { source: null, destinations: uniqueMajorSections(main) };
    }

    var destinations = Array.prototype.slice.call(source.children).filter(function (candidate) {
      return Boolean(candidate.id);
    });
    return { source: source, destinations: destinations };
  }

  function sectionLabel(section, index) {
    var labelledBy = section.getAttribute("aria-labelledby");
    var heading = labelledBy ? document.getElementById(labelledBy) : section.querySelector("h1, h2, h3");
    var text = heading ? heading.textContent.trim() : "Section " + (index + 1);
    return text.replace(/\s+/g, " ");
  }

  function conciseSectionLabel(label) {
    if (label.length <= 46) return label;
    var shortened = label.slice(0, 45);
    var lastSpace = shortened.lastIndexOf(" ");
    if (lastSpace > 30) shortened = shortened.slice(0, lastSpace);
    return shortened.replace(/[\s,;:–—-]+$/, "") + "…";
  }

  function sectionDestination(section) {
    if (section.id) return section.id;
    var labelledBy = section.getAttribute("aria-labelledby");
    if (labelledBy && document.getElementById(labelledBy)) return labelledBy;
    var heading = section.querySelector("h1[id], h2[id], h3[id]");
    return heading ? heading.id : "";
  }

  function installPageRail() {
    var main = document.querySelector("main");
    if (!main || document.querySelector(".page-section-rail, [data-canvas-page-rail]")) return;
    var railSource = pageRailSource(main);
    var sections = railSource.destinations.map(function (section, index) {
      return { section: section, id: sectionDestination(section), label: sectionLabel(section, index) };
    }).filter(function (entry) { return entry.id; });
    if (sections.length < 2) return;

    var nav = element("nav", "page-section-rail");
    nav.setAttribute("aria-label", railSource.source ? "Catalog entries" : "Page sections");
    if (railSource.source) nav.classList.add("page-section-rail--source");
    var list = document.createElement("ol");
    var readout = element("span", "page-section-rail__readout");
    readout.setAttribute("aria-hidden", "true");
    var links = [];
    sections.forEach(function (entry) {
      var id = entry.id;
      var label = entry.label;
      var slug = conciseSectionLabel(label);
      var li = document.createElement("li");
      var link = element("a", "page-section-rail__link");
      link.href = "#" + id;
      link.setAttribute("aria-label", label);
      link.dataset.sectionTarget = id;
      link.dataset.sectionSlug = slug;
      li.appendChild(link);
      list.appendChild(li);
      entry.railItem = li;
      links.push(link);
    });
    nav.appendChild(list);
    nav.appendChild(readout);
    main.parentNode.insertBefore(nav, main);

    function railLinkFromNode(node) {
      var link = node && node.closest && node.closest(".page-section-rail__link");
      return link && nav.contains(link) ? link : null;
    }

    function linkFromEvent(event) {
      return railLinkFromNode(event.target);
    }

    function linkIsAvailable(link) {
      var item = link && link.parentElement;
      return Boolean(link && item && !item.hidden);
    }

    function keepFocusPaintInsideList(link) {
      if (!linkIsAvailable(link)) return;
      var linkBox = link.getBoundingClientRect();
      var listBox = list.getBoundingClientRect();
      var linkStyle = getComputedStyle(link);
      var outlineWidth = parseFloat(linkStyle.outlineWidth) || 0;
      var outlineOffset = parseFloat(linkStyle.outlineOffset) || 0;
      var paintReserve = Math.max(0, outlineWidth + outlineOffset);
      var minimumTop = listBox.top + paintReserve;
      var maximumBottom = listBox.bottom - paintReserve;
      if (linkBox.top < minimumTop) list.scrollTop -= Math.ceil(minimumTop - linkBox.top);
      else if (linkBox.bottom > maximumBottom) list.scrollTop += Math.ceil(linkBox.bottom - maximumBottom);
    }

    function cssLengthInPixels(element, value) {
      var numericValue = parseFloat(value);
      if (!isFinite(numericValue)) return 0;
      if (/rem$/i.test(value)) {
        return numericValue * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      }
      if (/em$/i.test(value)) {
        return numericValue * (parseFloat(getComputedStyle(element).fontSize) || 16);
      }
      return numericValue;
    }

    function showReadout(link, prefix) {
      if (!linkIsAvailable(link)) {
        hideReadout();
        return;
      }
      var navBox = nav.getBoundingClientRect();
      var linkBox = link.getBoundingClientRect();
      var desiredCenter = linkBox.top - navBox.top + (linkBox.height / 2);
      readout.textContent = (prefix || "") + (link.dataset.sectionSlug || link.getAttribute("aria-label"));
      readout.style.insetBlockStart = desiredCenter + "px";
      readout.classList.add("is-visible");
      var readoutBox = readout.getBoundingClientRect();
      var paintReserve = cssLengthInPixels(
        readout,
        getComputedStyle(readout).getPropertyValue("--page-section-rail-readout-paint-reserve")
      );
      var minimumCenter = (readoutBox.height / 2) + paintReserve;
      var maximumCenter = navBox.height - (readoutBox.height / 2) - paintReserve;
      var availableCenter = maximumCenter >= minimumCenter
        ? Math.min(Math.max(desiredCenter, minimumCenter), maximumCenter)
        : navBox.height / 2;
      readout.style.insetBlockStart = availableCenter + "px";
    }

    function hideReadout() {
      readout.classList.remove("is-visible");
    }

    var currentLink = null;
    var focusedPreview = null;
    var pointerPreview = null;
    var disclosureDismissed = false;
    var dismissedPointerLink = null;
    var pointerDepartureTimer = null;

    function firstAvailableLink() {
      return links.find(function (link) { return linkIsAvailable(link); }) || null;
    }

    function syncReadout() {
      var previewLink = [focusedPreview, pointerPreview].find(function (link) {
        return linkIsAvailable(link);
      }) || null;

      if (disclosureDismissed || !previewLink) {
        hideReadout();
        return;
      }

      showReadout(
        previewLink,
        railSource.source
          ? previewLink === currentLink ? "Current · " : "Preview · "
          : ""
      );
    }

    function setCurrentLink(link) {
      if (!linkIsAvailable(link)) return;
      currentLink = link;

      var item = link.parentElement;
      var itemStart = item.offsetTop;
      var itemEnd = itemStart + item.offsetHeight;
      if (itemStart < list.scrollTop) list.scrollTop = itemStart;
      else if (itemEnd > list.scrollTop + list.clientHeight) list.scrollTop = itemEnd - list.clientHeight;
      syncReadout();
    }

    if (railSource.source) currentLink = firstAvailableLink();

    function cancelPointerDeparture() {
      if (pointerDepartureTimer === null) return;
      window.clearTimeout(pointerDepartureTimer);
      pointerDepartureTimer = null;
    }

    function schedulePointerDeparture(nextLink) {
      cancelPointerDeparture();
      pointerDepartureTimer = window.setTimeout(function () {
        pointerDepartureTimer = null;
        pointerPreview = nextLink;
        if (!nextLink) dismissedPointerLink = null;
        syncReadout();
      }, 120);
    }

    nav.addEventListener("pointerover", function (event) {
      var link = linkFromEvent(event);
      if (!link) {
        if (event.target === readout) cancelPointerDeparture();
        return;
      }
      cancelPointerDeparture();
      if (disclosureDismissed && link === dismissedPointerLink) {
        syncReadout();
        return;
      }
      disclosureDismissed = false;
      dismissedPointerLink = null;
      pointerPreview = link;
      syncReadout();
    });
    nav.addEventListener("pointerout", function (event) {
      var link = linkFromEvent(event);
      if (link && (!event.relatedTarget || !link.contains(event.relatedTarget))) {
        if (readout.contains(event.relatedTarget)) return;
        var nextLink = railLinkFromNode(event.relatedTarget);
        if (nextLink) {
          pointerPreview = nextLink;
          syncReadout();
        } else {
          schedulePointerDeparture(null);
        }
        return;
      }
      if (event.target === readout && (!event.relatedTarget || !readout.contains(event.relatedTarget))) {
        var relatedLink = railLinkFromNode(event.relatedTarget);
        if (relatedLink) {
          pointerPreview = relatedLink;
          syncReadout();
        } else {
          schedulePointerDeparture(null);
        }
      }
    });
    nav.addEventListener("focusin", function (event) {
      var link = linkFromEvent(event);
      if (!link) return;
      disclosureDismissed = false;
      dismissedPointerLink = null;
      keepFocusPaintInsideList(link);
      focusedPreview = link;
      syncReadout();
    });
    nav.addEventListener("focusout", function (event) {
      var link = linkFromEvent(event);
      if (link && (!event.relatedTarget || !link.contains(event.relatedTarget))) {
        focusedPreview = railLinkFromNode(event.relatedTarget);
        syncReadout();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !readout.classList.contains("is-visible")) return;
      cancelPointerDeparture();
      disclosureDismissed = true;
      dismissedPointerLink = pointerPreview;
      hideReadout();
    });

    function selectTarget() {
      var id = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
      var targetLink = null;
      links.forEach(function (link) {
        var active = linkIsAvailable(link) && link.dataset.sectionTarget === id;
        link.classList.toggle("is-target", active);
        if (active) {
          link.setAttribute("aria-current", "location");
          targetLink = link;
        }
        else link.removeAttribute("aria-current");
      });
      if (railSource.source && targetLink) {
        setCurrentLink(targetLink);
      }
    }
    selectTarget();
    window.addEventListener("hashchange", selectTarget);

    function syncSourceVisibility() {
      if (!railSource.source) return;

      sections.forEach(function (entry) {
        entry.railItem.hidden = entry.section.hidden;
      });
      nav.hidden = !firstAvailableLink();

      if (!linkIsAvailable(currentLink)) currentLink = firstAvailableLink();
      if (!linkIsAvailable(focusedPreview)) focusedPreview = null;
      if (!linkIsAvailable(pointerPreview)) pointerPreview = null;
      selectTarget();
      syncReadout();
    }

    if (railSource.source) {
      railSource.source.addEventListener("canvas:page-rail-source-change", syncSourceVisibility);
      syncSourceVisibility();
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var targetId = sectionDestination(entry.target);
          links.forEach(function (link) {
            if (link.dataset.sectionTarget === targetId) link.classList.toggle("is-in-view", entry.isIntersecting);
          });
        });
        if (railSource.source) {
          var inViewLink = links.find(function (link) {
            return linkIsAvailable(link) && link.classList.contains("is-in-view");
          });
          if (inViewLink) setCurrentLink(inViewLink);
          else syncReadout();
        }
      }, { rootMargin: "-16% 0px -68% 0px", threshold: [0, 0.01] });
      sections.forEach(function (entry) { observer.observe(entry.section); });
    }
  }

  function start() {
    installFooter();
    installPageRail();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}());
