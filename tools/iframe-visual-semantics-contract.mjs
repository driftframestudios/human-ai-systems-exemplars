import assert from "node:assert/strict";

function assertVisibleReading(observation, label) {
  assert.equal(observation.bodyVisible, true, `${label} keeps its document visible`);
  assert.ok(observation.bodyHeight > 0, `${label} retains measurable document content`);
}

export async function assertReducedMotionReading(scope, label) {
  const observation = await scope.locator("html").evaluate(() => ({
    activeAnimations: document.getAnimations()
      .filter(({ playState }) => playState === "running")
      .map((animation) => ({
        duration: animation.effect?.getComputedTiming().duration ?? null,
        iterations: animation.effect?.getComputedTiming().iterations ?? null,
      })),
    preferred: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  assert.equal(observation.preferred, true, `${label} receives reduced-motion preference`);
  assert.equal(
    observation.activeAnimations.some(({ duration, iterations }) =>
      duration === Infinity || iterations === Infinity
    ),
    false,
    `${label} has no continuously running animation under reduced motion`,
  );
  return observation.activeAnimations.length;
}

export async function assertAlternateMediaReadings(page, scope, label) {
  await page.emulateMedia({
    media: "print",
    forcedColors: "none",
    reducedMotion: "reduce",
  });
  const print = await scope.locator("html").evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    return {
      bodyHeight: document.body.getBoundingClientRect().height,
      bodyVisible: bodyStyle.display !== "none" && bodyStyle.visibility !== "hidden",
      print: matchMedia("print").matches,
    };
  });
  assert.equal(print.print, true, `${label} enters print media`);
  assertVisibleReading(print, `${label} print reading`);

  await page.emulateMedia({
    media: "screen",
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const forcedColors = await scope.locator("html").evaluate(() => {
    const bodyStyle = getComputedStyle(document.body);
    return {
      bodyHeight: document.body.getBoundingClientRect().height,
      bodyVisible: bodyStyle.display !== "none" && bodyStyle.visibility !== "hidden",
      forcedColors: matchMedia("(forced-colors: active)").matches,
    };
  });
  assert.equal(forcedColors.forcedColors, true, `${label} enters forced-colors media`);
  assertVisibleReading(forcedColors, `${label} forced-colors reading`);

  await page.emulateMedia({
    media: "screen",
    forcedColors: "none",
    reducedMotion: "reduce",
  });
}

export async function assertRenderedSvgSemantics(scope, label) {
  const observations = await scope.locator("svg:visible").evaluateAll((svgs) => {
    const idCounts = new Map();
    for (const element of document.querySelectorAll("[id]")) {
      idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
    }
    const referencedText = (element, attribute) =>
      (element.getAttribute(attribute) ?? "")
        .split(/\s+/u)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    const explicitName = (element) =>
      element.getAttribute("aria-label")?.trim() ||
      referencedText(element, "aria-labelledby") ||
      element.querySelector(":scope > title")?.textContent?.trim() ||
      "";

    return svgs.map((svg, index) => {
      const bounds = svg.getBoundingClientRect();
      const viewBox = svg.viewBox?.baseVal;
      const namedImageAncestor = svg.parentElement?.closest(
        '[role="img"][aria-label], [role="img"][aria-labelledby]',
      );
      const decorativeAncestor = svg.closest('[aria-hidden="true"]');
      const role = svg.getAttribute("role");
      const decorative = Boolean(decorativeAncestor) ||
        role === "none" ||
        role === "presentation";
      const description = referencedText(svg, "aria-describedby") ||
        (namedImageAncestor ? referencedText(namedImageAncestor, "aria-describedby") : "");
      const figure = svg.closest("figure");
      const textEquivalent = svg.querySelector("text")?.textContent?.trim() ||
        description ||
        figure?.querySelector("figcaption")?.textContent?.trim() ||
        (namedImageAncestor ? explicitName(namedImageAncestor) : "") ||
        "";
      const svgIds = [...svg.querySelectorAll("[id]")]
        .map((element) => element.id)
        .filter(Boolean);
      return {
        bounds: { height: bounds.height, width: bounds.width },
        decorative,
        duplicateIds: [...new Set(svgIds.filter((id) => idCounts.get(id) > 1))],
        index,
        name: explicitName(svg) || (namedImageAncestor ? explicitName(namedImageAncestor) : ""),
        textEquivalent,
        viewBox: viewBox
          ? { height: viewBox.height, width: viewBox.width }
          : null,
      };
    });
  });

  for (const observation of observations) {
    const svgLabel = `${label} rendered SVG ${observation.index + 1}`;
    assert.ok(
      observation.viewBox?.width > 0 && observation.viewBox?.height > 0,
      `${svgLabel} has a usable viewBox`,
    );
    assert.ok(
      observation.bounds.width > 0 && observation.bounds.height > 0,
      `${svgLabel} has intentional rendered bounds`,
    );
    assert.deepEqual(observation.duplicateIds, [], `${svgLabel} uses unique instance IDs`);
    assert.ok(
      observation.decorative || observation.name.length > 0,
      `${svgLabel} is decorative or has an accessible name`,
    );
    assert.ok(
      observation.decorative || observation.textEquivalent.length > 0,
      `${svgLabel} keeps a readable text equivalent`,
    );
  }
  return observations.length;
}

export async function assertZoomedFixedFocus(scope, label) {
  const observations = await scope.locator("html").evaluate(async (root) => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        bounds.width > 0 &&
        bounds.height > 0;
    };
    const interactiveSelector =
      'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const candidates = [...document.querySelectorAll(interactiveSelector)]
      .filter(isVisible)
      .filter((element) => {
        for (let current = element; current; current = current.parentElement) {
          const position = getComputedStyle(current).position;
          if (position === "fixed" || position === "sticky") return true;
        }
        return false;
      });
    const priorZoom = root.style.zoom;
    root.style.zoom = "2";
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const results = [];
    for (const element of candidates) {
      element.scrollIntoView({ block: "center", inline: "nearest" });
      element.focus({ preventScroll: true });
      const focusAnimations = element.getAnimations({ subtree: true });
      if (focusAnimations.length > 0) {
        await Promise.race([
          Promise.all(focusAnimations.map((animation) => animation.finished.catch(() => {}))),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const bounds = element.getBoundingClientRect();
      const x = Math.min(Math.max(bounds.left + bounds.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(bounds.top + bounds.height / 2, 0), innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      results.push({
        bounds: {
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
        },
        focused: document.activeElement === element,
        name: element.getAttribute("aria-label")?.trim() ||
          element.textContent?.trim() ||
          element.getAttribute("name") ||
          element.id,
        unobscured: Boolean(top && (top === element || element.contains(top) || top.contains(element))),
        visible: bounds.bottom > 0 &&
          bounds.right > 0 &&
          bounds.left < innerWidth &&
          bounds.top < innerHeight,
        viewport: { height: innerHeight, width: innerWidth },
      });
    }
    root.style.zoom = priorZoom;
    return results;
  });

  for (const [index, observation] of observations.entries()) {
    const focusLabel = `${label} zoomed fixed or sticky control ${index + 1} ` +
      `(${observation.name || "unnamed"})`;
    const geometry = `bounds ${JSON.stringify(observation.bounds)} within ` +
      `viewport ${JSON.stringify(observation.viewport)}`;
    assert.ok(observation.name, `${focusLabel} retains a visible or programmatic label`);
    assert.equal(observation.focused, true, `${focusLabel} remains keyboard reachable`);
    assert.equal(
      observation.visible,
      true,
      `${focusLabel} remains inside the visible viewport; ${geometry}`,
    );
    assert.equal(observation.unobscured, true, `${focusLabel} keeps an unobscured focus target`);
  }
  return observations.length;
}
