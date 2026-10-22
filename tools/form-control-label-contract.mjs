import './node-runtime-admission.mjs';
import assert from "node:assert/strict";

export async function observeFormControlLabels(rootLocator, width) {
  return await rootLocator.evaluate((root, viewportWidth) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const text = (element) => (element?.innerText ?? "").replace(/\s+/gu, " ").trim();
    const controls = [...root.querySelectorAll('input:not([type="hidden"]), select, textarea')];
    return {
      width: viewportWidth,
      controls: controls.map((control, index) => {
        const labelledBy = (control.getAttribute("aria-labelledby") ?? "")
          .split(/\s+/u)
          .filter(Boolean)
          .map((id) => root.ownerDocument.getElementById(id))
          .filter(Boolean);
        const labels = [...(control.labels ?? [])];
        const associated = [...new Set([...labels, ...labelledBy])];
        const ariaLabel = (control.getAttribute("aria-label") ?? "").trim();
        const associatedText = associated.map(text).filter(Boolean);
        return {
          key: control.id
            ? `#${control.id}`
            : [
                control.tagName.toLowerCase(),
                control.getAttribute("name") ?? "",
                control.dataset.kind ?? "",
                control.dataset.index ?? "",
                control.dataset.field ?? "",
                control.dataset.staff ?? "",
                control.dataset.staffField ?? "",
                control.dataset.frameworkStatus ?? "",
                control.dataset.frameworkMap ?? "",
                index,
              ].join(":"),
          visible: visible(control),
          accessibleText: ariaLabel || labelledBy.map(text).filter(Boolean).join(" ") || associatedText.join(" "),
          visibleAssociatedLabels: associated.filter(visible).map(text).filter(Boolean),
        };
      }),
    };
  }, width);
}

export function assertFormControlLabelRetention(observations, label) {
  const states = observations.map((observation) => ({
    width: observation.width,
    controls: new Map(observation.controls.map((control) => [control.key, control])),
  }));
  const keys = new Set(states.flatMap(({ controls }) => [...controls.keys()]));

  for (const key of keys) {
    const visibleStates = states
      .map((state) => ({ ...state, control: state.controls.get(key) }))
      .filter(({ control }) => control?.visible)
      .sort((a, b) => b.width - a.width);
    const baseline = visibleStates[0];
    if (!baseline) continue;
    for (const { width, control } of visibleStates.slice(1)) {
      const baselineControl = baseline.control;
      if (baselineControl.accessibleText) {
        assert.ok(
          control.accessibleText,
          `${label} ${key} retains its programmatic label at ${width}px`,
        );
      }
      if (baselineControl.visibleAssociatedLabels.length > 0) {
        assert.ok(
          control.visibleAssociatedLabels.length > 0,
          `${label} ${key} retains a visible associated label at ${width}px`,
        );
      }
    }
  }
}

export async function observeInvestmentStudioRowLabels(page) {
  return await page.locator("html").evaluate((root) => {
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const readRows = (selector) => [...root.querySelectorAll(selector)].map((row) => ({
      fields: [...row.querySelectorAll(".row-control")].map((label) => {
        const control = label.querySelector("input, select, textarea");
        const caption = label.querySelector(".row-control__label");
        return {
          field: label.dataset.rowField ?? "",
          caption: (caption?.textContent ?? "").trim(),
          captionVisible: visible(caption),
          accessibleText: (control?.getAttribute("aria-label") ?? "").trim(),
          controlLabelCount: control?.labels?.length ?? 0,
          labelOwnsControl: Boolean(control && [...control.labels].includes(label)),
        };
      }),
      orderCaption: (row.querySelector(".row-actions .row-control__label")?.textContent ?? "").trim(),
      orderCaptionVisible: visible(row.querySelector(".row-actions .row-control__label")),
    }));
    return {
      activityHeaderVisible: visible(root.querySelector(".activity-head")),
      disruptionHeaderVisible: visible(root.querySelector(".disruption-head")),
      activities: readRows(".activity-row"),
      disruptions: readRows(".disruption-row"),
    };
  });
}

export function assertInvestmentStudioRowLabels(observed, width, label) {
  const narrow = width <= 700;
  assert.equal(
    observed.activityHeaderVisible,
    !narrow,
    `${label} activity header follows the 700px presentation seam at ${width}px`,
  );
  assert.equal(
    observed.disruptionHeaderVisible,
    !narrow,
    `${label} disruption header follows the 700px presentation seam at ${width}px`,
  );

  for (const [kind, rows, expectedCaptions] of [
    ["activity", observed.activities, ["Use", "Activity", "Tasks", "Effort / task"]],
    ["disruption", observed.disruptions, ["Use", "Disruption", "Events", "Recovery hrs"]],
  ]) {
    assert.ok(rows.length > 0, `${label} exposes at least one ${kind} row at ${width}px`);
    for (const [index, row] of rows.entries()) {
      assert.deepEqual(
        row.fields.map(({ caption }) => caption),
        expectedCaptions,
        `${label} ${kind} row ${index + 1} keeps its field captions at ${width}px`,
      );
      assert.equal(
        row.fields.every(({ controlLabelCount, labelOwnsControl }) => controlLabelCount > 0 && labelOwnsControl),
        true,
        `${label} ${kind} row ${index + 1} keeps implicit input labels at ${width}px`,
      );
      assert.equal(
        row.fields.every(({ captionVisible }) => captionVisible === narrow),
        true,
        `${label} ${kind} row ${index + 1} exposes compact captions exactly when the header rests at ${width}px`,
      );
      if (narrow) {
        assert.equal(
          row.fields.every(({ accessibleText, caption }) =>
            accessibleText.toLocaleLowerCase().includes(caption.toLocaleLowerCase()),
          ),
          true,
          `${label} ${kind} row ${index + 1} includes each visible caption in its accessible name at ${width}px`,
        );
      }
      assert.equal(row.orderCaption, "Order", `${label} ${kind} row ${index + 1} names reordering`);
      assert.equal(
        row.orderCaptionVisible,
        narrow,
        `${label} ${kind} row ${index + 1} exposes the compact Order caption at ${width}px`,
      );
    }
  }
}
