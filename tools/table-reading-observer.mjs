/** Browser-side observations; geometry signals invite source-owner review. */
export function observeTableReading({ selector = "table" } = {}) {
  const normalized = (value) => value.replace(/\s+/gu, " ").trim();
  const visible = (element) => !element.closest("details:not([open])")
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden";
  const tables = Array.from(document.querySelectorAll(selector));
  return tables.map((table, tableIndex) => {
    const rows = Array.from(table.rows);
    const cells = rows.flatMap((row) => Array.from(row.cells));
    const fragments = [];
    let inspectedTokens = 0;
    let owner = table.parentElement;
    while (owner && !["auto", "scroll"].includes(getComputedStyle(owner).overflowX)) {
      owner = owner.parentElement;
    }
    if (visible(table)) {
      rows.forEach((row, rowIndex) => Array.from(row.cells).forEach((cell, columnIndex) => {
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!visible(node.parentElement)) continue;
          const literal = node.parentElement.closest("code, pre");
          const tokens = [];
          for (const chunk of node.textContent.matchAll(/\S+/gu)) {
            if (literal || /^(?:https?:|urn:)|[_=]|^[a-f\d]{32,}$/iu.test(chunk[0])) {
              tokens.push({ value: chunk[0], index: chunk.index, kind: "identifier-review" });
            } else {
              for (const part of chunk[0].matchAll(/[+\-−]?\d[\d,.]*%?|[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)) {
                tokens.push({ value: part[0], index: chunk.index + part.index,
                  kind: /^[+\-−]?[\d.,]+%?$/u.test(part[0]) ? "numeric" : "word" });
              }
            }
          }
          for (const token of tokens) {
            if (token.value.length < 2) continue;
            inspectedTokens += 1;
            const range = document.createRange();
            range.setStart(node, token.index);
            range.setEnd(node, token.index + token.value.length);
            const tops = [];
            for (const rect of range.getClientRects()) {
              if (rect.width > 0 && !tops.some((top) => Math.abs(top - rect.top) < 2)) tops.push(rect.top);
            }
            if (tops.length < 2) continue;
            fragments.push({ row: rowIndex, column: columnIndex, token: token.value, lines: tops.length, kind: token.kind });
          }
        }
      }));
    }
    const caption = normalized(table.caption?.textContent || "");
    const columnHeaders = cells.filter((cell) => cell.getAttribute("scope") === "col");
    const complex = cells.some((cell) => cell.colSpan > 1 || cell.rowSpan > 1);
    const records = rows.filter((row) => Array.from(row.cells).some((cell) => cell.tagName === "TD"))
      .map((row) => ({
        topic: caption,
        identity: normalized(row.querySelector('th[scope="row"]')?.textContent || row.cells[0]?.textContent || ""),
        label: row.getAttribute("data-label"),
        fields: Array.from(row.cells).map((cell, index) => ({
          label: cell.getAttribute("data-label") || normalized(columnHeaders[index]?.textContent || ""),
          value: normalized(cell.textContent),
        })),
      }));
    return {
      tableIndex, caption, visible: visible(table), rows: rows.length, cells: cells.length,
      columns: Math.max(0, ...rows.map((row) => row.cells.length)), inspectedTokens,
      width: table.getBoundingClientRect().width,
      headers: { columns: columnHeaders.length,
        rows: cells.filter((cell) => cell.getAttribute("scope") === "row").length,
        supplemental: cells.filter((cell) => cell.hasAttribute("data-label")).length,
        disposition: complex ? "complex-owner-review" : caption && columnHeaders.length ? "simple" : "orientation-owner-review" },
      scroll: owner ? { clientWidth: owner.clientWidth, scrollWidth: owner.scrollWidth,
        overflow: owner.scrollWidth > owner.clientWidth + 1,
        focusable: owner.tabIndex >= 0,
        name: owner.getAttribute("aria-label") || owner.getAttribute("aria-labelledby") || "" } : null,
      fragments, records,
    };
  });
}

/** Same geometry classifier for surrounding labels, kept separate from tables. */
export function observeControlReading({ selector = ".zone-heading button, .zone-heading .pill, .toolbar button, .toolbar .button-label" } = {}) {
  return Array.from(document.querySelectorAll(selector)).filter((element) => element.getClientRects().length)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const fragments = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        for (const token of node.textContent.matchAll(/[\p{L}\p{N}]+/gu)) {
          const range = document.createRange();
          range.setStart(node, token.index);
          range.setEnd(node, token.index + token[0].length);
          const tops = [];
          for (const box of range.getClientRects()) {
            if (box.width && !tops.some((top) => Math.abs(top - box.top) < 2)) tops.push(box.top);
          }
          if (tops.length > 1) fragments.push(token[0]);
        }
      }
      return { label: element.textContent.replace(/\s+/gu, " ").trim(), width: rect.width, height: rect.height,
        clipped: element.scrollWidth > element.clientWidth + 2, fragments };
    });
}

/** Required dimensions aggregate independently of the token geometry signal. */
export function tableCaseVerdict(observation, errors = []) {
  const fragments = observation.tables.flatMap((table) => table.fragments);
  const wordFragments = fragments.filter((item) => item.kind === "word").length;
  const numericFragments = fragments.filter((item) => item.kind === "numeric").length;
  const controlFragments = observation.controls.reduce((sum, item) => sum + item.fragments.length, 0);
  const reasons = [];
  if (wordFragments) reasons.push("ordinary-word-fragmentation");
  if (numericFragments) reasons.push("numeric-fragmentation");
  if (controlFragments) reasons.push("control-word-fragmentation");
  if (observation.controls.some((item) => item.clipped)) reasons.push("clipped-control");
  if (observation.keyboard.some((item) => item.standing !== "pass")) reasons.push("keyboard-review");
  if (observation.tables.some((item) => !item.visible)) reasons.push("table-state-unobserved");
  if (observation.viewport.pageWidth > observation.viewport.clientWidth + 1) reasons.push("page-overflow");
  if (errors.length) reasons.push("runtime-error");
  return { standing: reasons.length ? "review" : "pass", reasons, wordFragments, numericFragments, controlFragments };
}
