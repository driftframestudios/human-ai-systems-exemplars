import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function observeReading(page, { includeOrdinary = false, allHeadings = false } = {}) {
  return page.evaluate(({ includeOrdinary, allHeadings }) => {
    const rect = box => ({
      left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height,
    });
    const box = node => rect(node.getBoundingClientRect());
    const positive = value => value.width > 0 && value.height > 0;
    const fragments = root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const result = [];
      let node;
      while ((node = walker.nextNode())) {
        const cue = node.parentElement.closest(".fmi-link-cue");
        if (cue) {
          const cueStyle = getComputedStyle(cue);
          // This declared new-tab cue stays in the accessible link name. Its
          // fully clipped one-pixel carrier supplies no painted text bounds.
          // A changed hiding contract returns it to ordinary observation.
          if (cueStyle.position === "absolute" && cueStyle.clipPath === "inset(50%)"
            && cueStyle.overflowX === "hidden" && cueStyle.overflowY === "hidden"
            && Number.parseFloat(cueStyle.width) === 1 && Number.parseFloat(cueStyle.height) === 1) continue;
        }
        const start = node.textContent.search(/\S/u);
        if (start < 0) continue;
        const end = node.textContent.search(/\s*$/u);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const style = getComputedStyle(node.parentElement);
        // WebKit can return empty extra rectangles around a multicol spanner.
        // Only nonempty ranges establish text-fragment geometry.
        const boxes = [...range.getClientRects()].map(rect).filter(positive);
        result.push({
          text: node.textContent.slice(start, end), boxes,
          raised: Boolean(node.parentElement.closest("sup, sub")),
          visible: style.display !== "none" && style.visibility === "visible",
        });
      }
      return result;
    };
    const movementHeaders = [...document.querySelectorAll(".debrief-movement")].map(movement => {
      const header = movement.querySelector(":scope > .debrief-movement__header");
      const label = header?.querySelector(".debrief-track-label, .genomic-track-label, .fmi-track-marker, .field-inspection-track-label, .inspection-track-label");
      const title = header?.querySelector("h2");
      const flow = movement.querySelector(":scope > .reading-flow");
      if (!header || !label || !title || !flow) return { valid: false };
      return {
        valid: true,
        semantic: movement.matches("section, article"),
        id: title.id,
        named: movement.getAttribute("aria-labelledby")?.split(/\s+/u).includes(title.id),
        ordered: header.nextElementSibling === flow && label.nextElementSibling === title,
        box: box(header), labelBox: box(label), titleBox: box(title), flowBox: box(flow),
        label: fragments(label), title: fragments(title),
        parts: [...label.children].map(child => ({ tag: child.tagName, box: box(child) })),
        rail: Boolean(document.querySelector(`:is(.page-section-rail, [data-canvas-page-rail]) a[href="#${title.id}"]`)),
      };
    });

    const headingSelector = allHeadings ? "h1, h2, h3, h4, h5, h6, .beat-title" : "h1, h2, .beat-title";
    const wideSelector = `${allHeadings ? "h1, h2, h3, h4, h5, h6" : "h1, h2"}, figure, .table-figure, .table-span-all, .career-slide, .clean-list, .embed-slot, pre`;
    const isWide = node => node.matches(wideSelector) && !node.matches(".table-figure--column");
    const owners = [...document.querySelectorAll(includeOrdinary ? ".prose-flow" : ".reading-flow")].map(owner => {
      const children = [...owner.children];
      const flowBox = box(owner);
      // The nested selector also observes the negative control that puts an
      // opening heading back into columns, where a continuation can precede it.
      const headings = owner.querySelectorAll(`:scope > :is(${headingSelector}), :scope > .prose-flow > :is(${headingSelector})`);
      const regions = [...headings].map(heading => {
        const content = [];
        for (let sibling = heading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
          // An authored heading or wide evidence field ends this region. The
          // complete intervening prose supplies its actual continuation starts.
          if (sibling.matches(".beat-title") || isWide(sibling)) break;
          content.push(...fragments(sibling));
        }
        const body = content.flatMap(item => item.boxes);
        const midpoint = flowBox.left + flowBox.width / 2;
        const run = heading.parentElement.matches(".prose-flow")
          ? heading.parentElement : heading.nextElementSibling;
        return {
          id: heading.id || heading.textContent.trim(),
          beat: heading.matches(".beat-title"),
          level: heading.tagName,
          heading: fragments(heading),
          columns: run?.matches(".prose-flow") ? Number.parseInt(getComputedStyle(run).columnCount, 10) || 1 : 1,
          // Both column starts are derived from the complete region's text
          // fragments. This catches continuations far above a tall heading.
          starts: [
            body.filter(value => value.left < midpoint),
            body.filter(value => value.left >= midpoint),
          ].map(column => column.length ? Math.min(...column.map(value => value.top)) : null),
        };
      });
      const boundaries = children.filter(isWide).flatMap(wide => {
        const next = wide.nextElementSibling;
        if (!next) return [];
        const following = fragments(next).flatMap(part => part.boxes);
        return [{ id: wide.id || wide.tagName, box: box(wide), following }];
      });
      const title = owner.querySelector(":scope > h2");
      return {
        box: flowBox, regions, boundaries,
        titleNamed: !title || owner.getAttribute("aria-labelledby")?.split(/\s+/u).includes(title.id),
      };
    });
    const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const flows = [...document.querySelectorAll(".reading-flow > .prose-flow")].map(flow => {
      const container = flow.closest(".content");
      const style = getComputedStyle(container);
      const containerWidth = container.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      return {
        columns: Number.parseInt(getComputedStyle(flow).columnCount, 10) || 1,
        box: box(flow), ownerBox: box(flow.parentElement), paragraphs: [...flow.children].filter(child => child.matches("p")).flatMap(fragments),
        containerWidth, columnThreshold: 80 * rootFont,
        misplaced: [...flow.children].filter(child => child.matches(".beat-title") || isWide(child))
          .map(child => child.id || child.tagName),
      };
    });
    const orientations = [...document.querySelectorAll(".prose-flow > .debrief-quote--orientation")].map(orientation => {
      const style = getComputedStyle(orientation);
      const child = node => node ? { box: box(node), text: fragments(node) } : null;
      return {
        name: orientation.getAttribute("aria-label") || orientation.textContent.trim(),
        box: box(orientation),
        fragments: [...orientation.getClientRects()].map(rect).filter(positive),
        owner: box(orientation.parentElement),
        paragraph: child(orientation.querySelector(":scope > p")),
        footer: child(orientation.querySelector(":scope > :is(footer, cite)")),
        display: style.display,
        breakInside: style.breakInside,
        inlineSize: Number.parseFloat(style.inlineSize),
      };
    });
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      headers: movementHeaders, orientations,
      owners, flows, rootFont,
      principles: [...document.querySelectorAll('[aria-labelledby="doctrines-title"] > .beat-title')].flatMap(heading => {
        const next = heading.nextElementSibling;
        const paragraph = next?.matches("p") ? next
          : next?.matches(".prose-flow") && next.children.length === 1 && next.firstElementChild.matches("p") ? next.firstElementChild : null;
        return paragraph ? [{
          text: paragraph.textContent.trim(),
          direct: paragraph.parentElement === heading.parentElement,
          fragments: [...paragraph.getClientRects()].map(rect).filter(positive),
        }] : [];
      }),
      promises: [...document.querySelectorAll(".reading-flow .fmi-track-promise")].map(promise => ({
        fragments: [...promise.getClientRects()].map(rect).filter(positive),
        owner: box(promise.closest(".reading-flow")),
      })),
    };
  }, { includeOrdinary, allHeadings });
}

export function assertText(text, owner, context) {
  assert.ok(text.length, `${context}: has authored text`);
  for (const part of text) {
    assert.ok(part.visible && part.boxes.length, `${context}: visible text has nonempty layout bounds (${part.text.slice(0, 50)})`);
    for (const box of part.boxes) {
      assert.ok(box.left >= owner.left - 2 && box.right <= owner.right + 2
        && box.top >= owner.top - 2 && box.bottom <= owner.bottom + 2,
      `${context}: text fragment stays inside its visible owner`);
    }
  }
}

export function assertRegions(reading, label) {
  let count = 0;
  let paired = 0;
  for (const owner of reading.owners) {
    for (const region of owner.regions) {
      count += 1;
      const heading = region.heading.flatMap(part => part.boxes);
      assertText(region.heading, owner.box, `${label} ${region.id}: heading`);
      const bottom = Math.max(...heading.map(value => value.bottom));
      for (const start of region.starts.filter(value => value !== null)) {
        assert.ok(start >= bottom - 2,
          `${label} ${region.id}: heading precedes its first continuation (${start.toFixed(1)} < ${bottom.toFixed(1)})`);
      }
      if (region.columns === 2 && region.starts.every(value => value !== null)) paired += 1;
    }
  }
  assert.ok(count > 0, `${label}: observes authored title or beat regions`);
  return { count, paired };
}

export function assertWideBoundaries(reading, label) {
  for (const owner of reading.owners) {
    for (const boundary of owner.boundaries) {
      for (const fragment of boundary.following) {
        assert.ok(fragment.top >= boundary.box.bottom - 2,
          `${label} ${boundary.id}: wide evidence precedes the following text`);
      }
    }
  }
  assert.deepEqual(reading.flows.flatMap(flow => flow.misplaced), [],
    `${label}: continuous prose keeps authored headings and wide evidence at its outer boundary`);
}

export function assertColumnActivation(reading, route) {
  assert.ok(reading.flows.length > 0, `${route}: has continuous prose`);
  for (const flow of reading.flows) {
    assert.equal(flow.columns, flow.containerWidth >= flow.columnThreshold ? 2 : 1,
      `${route}: columns follow the actual reading container (${flow.containerWidth}px / ${flow.columnThreshold}px)`);
  }
}

export async function observeColumnMismatches(page) {
  return page.evaluate(() => {
    const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const flows = [...document.querySelectorAll(".reading-flow > .prose-flow")].map((flow, index) => {
      const container = flow.closest(".content");
      const style = getComputedStyle(container);
      const containerWidth = container.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      // Read the dependent formatting context before its computed column
      // state. Gecko may otherwise retain an offscreen multicol value after a
      // dynamic root-font transition even though the query container settled.
      const flowWidth = flow.getBoundingClientRect().width;
      const columns = Number.parseInt(getComputedStyle(flow).columnCount, 10) || 1;
      const columnThreshold = 80 * rootFont;
      const expected = containerWidth >= columnThreshold ? 2 : 1;
      return {
        index,
        owner: flow.closest(".reading-flow")?.getAttribute("aria-labelledby") || "unnamed-reading-flow",
        columns,
        expected,
        flowWidth,
        containerWidth,
        columnThreshold,
        rootFont,
      };
    });
    if (!flows.length) return [{ issue: "continuous prose flow is absent" }];
    return flows.filter(flow => flow.columns !== flow.expected);
  });
}

export async function settleColumns(page) {
  // Font-size and viewport changes invalidate both the container query and
  // multicolumn layout. Yield through the render boundary, then poll only the
  // state this synchronization helper owns; the complete geometry observer
  // runs once after settlement. This keeps CI load from consuming the poll
  // budget while preserving actionable mismatch data for every engine.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect.poll(() => observeColumnMismatches(page), {
    timeout: 7000,
    message: "responsive columns settle at the actual container boundary",
  }).toEqual([]);
}
