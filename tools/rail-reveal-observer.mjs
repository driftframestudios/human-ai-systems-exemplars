export async function measureRailReveal(page, options = {}) {
  const links = page.locator(".page-section-rail__link");
  const count = await links.count();
  const settleMs = options.settleMs ?? 180;
  const departureSettleMs = options.departureSettleMs ?? Math.max(settleMs, 140);
  const requestedIndexes = options.linkIndexes ?? Array.from({ length: count }, (_, index) => index);
  const linkIndexes = Array.from(new Set(requestedIndexes)).filter((index) => (
    Number.isInteger(index) && index >= 0 && index < count
  ));
  const results = [];

  if (count > 0 && linkIndexes.length === 0) {
    throw new Error("Rail reveal observation received links but no valid link indexes to exercise.");
  }

  async function settleInteraction(duration = settleMs) {
    if (duration > 0) {
      await page.waitForTimeout(duration);
      return;
    }
    await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)));
  }

  async function observe(linkIndex) {
    return page.evaluate((index) => {
      function rectObject(rect) {
        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
      }

      function intersection(a, b) {
        const left = Math.max(a.left, b.left);
        const right = Math.min(a.right, b.right);
        const top = Math.max(a.top, b.top);
        const bottom = Math.min(a.bottom, b.bottom);
        return {
          left,
          right,
          top,
          bottom,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top)
        };
      }

      function clipsAxis(value) {
        return /(hidden|clip|auto|scroll)/.test(value);
      }

      function cssLengthInPixels(element, value) {
        const numericValue = Number.parseFloat(value);
        if (!Number.isFinite(numericValue)) return 0;
        if (/rem$/iu.test(value)) {
          return numericValue * (Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
        }
        if (/em$/iu.test(value)) {
          return numericValue * (Number.parseFloat(getComputedStyle(element).fontSize) || 16);
        }
        return numericValue;
      }

      function expectedLinkName(element, elementIndex) {
        const targetId = element?.dataset.sectionTarget || "";
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) return "";
        const labelledBy = target.getAttribute("aria-labelledby");
        const heading = target.matches("h1, h2, h3")
          ? target
          : labelledBy && document.getElementById(labelledBy)
            ? document.getElementById(labelledBy)
            : target.querySelector("h1, h2, h3");
        return heading?.textContent?.trim().replace(/\s+/gu, " ") || `Section ${elementIndex + 1}`;
      }

      function clippedRect(element, paintReserve = 0) {
        const elementRect = element.getBoundingClientRect();
        let visible = {
          left: elementRect.left - paintReserve,
          top: elementRect.top - paintReserve,
          right: elementRect.right + paintReserve,
          bottom: elementRect.bottom + paintReserve,
          width: elementRect.width + (paintReserve * 2),
          height: elementRect.height + (paintReserve * 2)
        };
        const clippingAncestors = [];
        visible = intersection(visible, {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        });

        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = window.getComputedStyle(ancestor);
          const clipsX = clipsAxis(style.overflowX);
          const clipsY = clipsAxis(style.overflowY);
          if (!clipsX && !clipsY) continue;
          const ancestorRect = rectObject(ancestor.getBoundingClientRect());
          const before = { ...visible };
          const left = clipsX ? Math.max(visible.left, ancestorRect.left) : visible.left;
          const right = clipsX ? Math.min(visible.right, ancestorRect.right) : visible.right;
          const top = clipsY ? Math.max(visible.top, ancestorRect.top) : visible.top;
          const bottom = clipsY ? Math.min(visible.bottom, ancestorRect.bottom) : visible.bottom;
          visible = {
            left,
            right,
            top,
            bottom,
            width: Math.max(0, right - left),
            height: Math.max(0, bottom - top)
          };
          if (visible.width < before.width || visible.height < before.height) {
            clippingAncestors.push({
              tagName: ancestor.tagName.toLowerCase(),
              className: ancestor.className || "",
              overflowX: style.overflowX,
              overflowY: style.overflowY,
              rect: ancestorRect
            });
          }
        }
        return { visible, clippingAncestors };
      }

      const link = document.querySelectorAll(".page-section-rail__link")[index];
      const rail = link?.closest(".page-section-rail") || null;
      const list = rail?.querySelector(":scope > ol") || null;
      const railMode = rail === null
        ? "missing"
        : rail.classList.contains("page-section-rail--source")
          ? "source"
          : "standard";
      const targetKind = railMode === "missing" ? null : "readout";
      const target = rail?.querySelector(":scope > .page-section-rail__readout") || null;
      const targetStyle = target ? window.getComputedStyle(target) : null;
      const targetRect = target ? target.getBoundingClientRect() : null;
      const railRect = rail ? rail.getBoundingClientRect() : null;
      const paintReserve = targetStyle
        ? cssLengthInPixels(target, targetStyle.getPropertyValue("--page-section-rail-readout-paint-reserve"))
        : 0;
      const targetClip = target ? clippedRect(target) : null;
      const paintedTargetClip = target ? clippedRect(target, paintReserve) : null;
      const linkRect = link ? link.getBoundingClientRect() : null;
      const linkClip = link ? clippedRect(link) : null;
      const listRect = list ? list.getBoundingClientRect() : null;
      const targetText = target?.textContent?.trim() || "";
      const targetVisible = Boolean(
        target &&
        targetRect.width > 0 &&
        targetRect.height > 0 &&
        targetStyle.display !== "none" &&
        targetStyle.visibility !== "hidden" &&
        Number(targetStyle.opacity) > 0.85
      );
      const clippedRatio = targetRect && targetRect.width > 0 && targetRect.height > 0
        ? (targetClip.visible.width * targetClip.visible.height) / (targetRect.width * targetRect.height)
        : 0;
      const paintedWidth = targetRect ? targetRect.width + (paintReserve * 2) : 0;
      const paintedHeight = targetRect ? targetRect.height + (paintReserve * 2) : 0;
      const paintedClippedRatio = paintedWidth > 0 && paintedHeight > 0
        ? (paintedTargetClip.visible.width * paintedTargetClip.visible.height) / (paintedWidth * paintedHeight)
        : 0;
      const linkVisibleRatio = linkRect && linkRect.width > 0 && linkRect.height > 0
        ? (linkClip.visible.width * linkClip.visible.height) / (linkRect.width * linkRect.height)
        : 0;
      const outlineWidth = link ? Number.parseFloat(window.getComputedStyle(link).outlineWidth) || 0 : 0;
      const outlineStyle = link ? window.getComputedStyle(link).outlineStyle : "";
      const outlineOffset = link ? Number.parseFloat(window.getComputedStyle(link).outlineOffset) || 0 : 0;
      const outlinePaintExtent = Math.max(0, outlineWidth + outlineOffset);
      const focusClip = link ? clippedRect(link, outlinePaintExtent) : null;
      const focusPaintedWidth = linkRect ? linkRect.width + (outlinePaintExtent * 2) : 0;
      const focusPaintedHeight = linkRect ? linkRect.height + (outlinePaintExtent * 2) : 0;
      const focusVisibleRatio = focusPaintedWidth > 0 && focusPaintedHeight > 0
        ? (focusClip.visible.width * focusClip.visible.height) / (focusPaintedWidth * focusPaintedHeight)
        : 0;

      return {
        index,
        compact: window.matchMedia("(max-width: 56rem)").matches,
        railMode,
        targetKind,
        slug: link?.dataset.sectionSlug || link?.getAttribute("aria-label") || "",
        accessibleName: link?.getAttribute("aria-label") || "",
        expectedAccessibleName: link ? expectedLinkName(link, index) : "",
        linkFocused: document.activeElement === link,
        escapeReachedWindow: Boolean(window.__contextCanvasRailEscapeObservation?.reachedWindow),
        escapeDefaultPrevented: Boolean(window.__contextCanvasRailEscapeObservation?.defaultPrevented),
        targetText,
        targetOutsideList: Boolean(target && list && !list.contains(target)),
        linkVisible: Boolean(linkRect && linkRect.width > 0 && linkRect.height > 0),
        targetVisible,
        targetDisplay: targetStyle?.display || "",
        targetVisibility: targetStyle?.visibility || "",
        targetOpacity: targetStyle ? Number(targetStyle.opacity) : 0,
        targetRect: targetRect ? rectObject(targetRect) : null,
        railRect: railRect ? rectObject(railRect) : null,
        targetClippedRect: targetClip?.visible || null,
        clippingAncestors: targetClip?.clippingAncestors || [],
        clippedRatio,
        paintReserve,
        paintedTargetClippedRect: paintedTargetClip?.visible || null,
        paintedClippingAncestors: paintedTargetClip?.clippingAncestors || [],
        paintedClippedRatio,
        linkRect: linkRect ? rectObject(linkRect) : null,
        linkVisibleRatio,
        focusIndicator: {
          outlineStyle,
          outlineWidth,
          outlineOffset,
          visible: outlineStyle !== "none" && outlineWidth > 0,
          visibleRatio: focusVisibleRatio,
          clippingAncestors: focusClip?.clippingAncestors || []
        },
        list: list && listRect ? {
          clientHeight: list.clientHeight,
          scrollHeight: list.scrollHeight,
          scrollTop: list.scrollTop,
          overflowX: window.getComputedStyle(list).overflowX,
          overflowY: window.getComputedStyle(list).overflowY,
          rect: rectObject(listRect)
        } : null
      };
    }, linkIndex);
  }

  async function focusOutsideRail() {
    await page.evaluate(() => {
      const target = document.querySelector("main") || document.body;
      if (!(target instanceof HTMLElement)) return;
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  }

  async function armEscapeCompositionObservation() {
    await page.evaluate(() => {
      const prior = window.__contextCanvasRailEscapeObserver;
      if (prior) window.removeEventListener("keydown", prior);
      window.__contextCanvasRailEscapeObservation = {
        defaultPrevented: false,
        reachedWindow: false
      };
      const observer = (event) => {
        if (event.key !== "Escape") return;
        window.__contextCanvasRailEscapeObservation = {
          defaultPrevented: event.defaultPrevented,
          reachedWindow: true
        };
        window.removeEventListener("keydown", observer);
        window.__contextCanvasRailEscapeObserver = null;
      };
      window.__contextCanvasRailEscapeObserver = observer;
      window.addEventListener("keydown", observer);
    });
  }

  const viewport = page.viewportSize();
  const neutralPoint = {
    x: Math.max(1, Math.floor((viewport?.width || 400) / 2)),
    y: 4
  };

  await focusOutsideRail();
  await page.mouse.move(neutralPoint.x, neutralPoint.y);
  await settleInteraction();
  const resting = count ? await observe(linkIndexes[0] ?? 0) : null;

  for (const index of linkIndexes) {
    await links.nth(index).hover();
    await settleInteraction();
    const hover = await observe(index);

    let pointerBridge = hover;
    if (hover.linkRect && hover.targetRect) {
      const linkCenterY = hover.linkRect.top + (hover.linkRect.height / 2);
      const bridgePoint = {
        x: hover.targetRect.left > hover.linkRect.right
          ? (hover.linkRect.right + hover.targetRect.left) / 2
          : (hover.targetRect.right + hover.linkRect.left) / 2,
        y: Math.min(
          Math.max(linkCenterY, hover.targetRect.top + 1),
          hover.targetRect.bottom - 1
        )
      };
      await page.mouse.move(bridgePoint.x, bridgePoint.y, { steps: 4 });
      await settleInteraction(departureSettleMs);
      pointerBridge = await observe(index);
    }

    await page.locator(".page-section-rail__readout").hover({ timeout: 2000 });
    await settleInteraction();
    const readoutHover = await observe(index);

    await page.mouse.move(neutralPoint.x, neutralPoint.y);
    await settleInteraction(departureSettleMs);
    const pointerDeparture = await observe(index);

    await links.nth(index).hover();
    await settleInteraction();
    await armEscapeCompositionObservation();
    await page.keyboard.press("Escape");
    await settleInteraction();
    const escapeDismissal = await observe(index);

    await page.keyboard.press("Tab");
    await links.nth(index).focus();
    await settleInteraction();
    const focus = await observe(index);

    await armEscapeCompositionObservation();
    await page.keyboard.press("Escape");
    await settleInteraction();
    const focusEscapeDismissal = await observe(index);

    await page.mouse.move(neutralPoint.x, neutralPoint.y);
    await settleInteraction(departureSettleMs);
    await links.nth(index).hover();
    await settleInteraction();
    await page.mouse.move(neutralPoint.x, neutralPoint.y);
    await settleInteraction(departureSettleMs);
    const pointerDepartureWithFocus = await observe(index);

    await focusOutsideRail();
    await settleInteraction();
    const focusDeparture = await observe(index);

    results.push({
      index: hover.index,
      compact: hover.compact,
      railMode: hover.railMode,
      targetKind: hover.targetKind,
      slug: hover.slug,
      accessibleName: hover.accessibleName,
      expectedAccessibleName: hover.expectedAccessibleName,
      targetOutsideList: hover.targetOutsideList,
      linkVisible: hover.linkVisible,
      list: hover.list,
      states: {
        hover,
        pointerBridge,
        readoutHover,
        escapeDismissal,
        pointerDeparture,
        focus,
        focusEscapeDismissal,
        pointerDepartureWithFocus,
        focusDeparture
      }
    });
  }

  if (count && options.leaveHover !== false) {
    await links.nth(linkIndexes[0] ?? 0).hover();
    await settleInteraction();
  }

  return {
    count,
    testedCount: linkIndexes.length,
    coverage: options.linkIndexes ? "sampled" : "all",
    resting,
    results
  };
}
