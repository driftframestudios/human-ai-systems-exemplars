/* Canonical Strategy Canvas controller v0.2.2 — safe DOM rendering over StrategyCanvasCore. */
(function exposeStrategyCanvasCanonical(global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SERIES_LABELS = Object.freeze({
    current: 'Current support',
    goodEnough: 'Good-enough threshold',
    desired: 'Desired support'
  });
  const ACTION_LABELS = Object.freeze({
    eliminate: 'Eliminate',
    reduce: 'Reduce',
    raise: 'Raise',
    create: 'Create',
    hold: 'Hold',
    open: 'Open'
  });
  const IMPORT_LIMITS = Object.freeze({ bytes: 512 * 1024, depth: 32, nodes: 20000 });

  function parseBoundedImport(rawText) {
    const text = String(rawText || '');
    const byteLength = new TextEncoder().encode(text).byteLength;
    if (byteLength > IMPORT_LIMITS.bytes) throw new Error('Import exceeds the 512 KiB local review boundary.');
    const parsed = JSON.parse(text);
    const stack = [{ value: parsed, depth: 0 }];
    let nodeCount = 0;
    while (stack.length) {
      const { value, depth } = stack.pop();
      nodeCount += 1;
      if (nodeCount > IMPORT_LIMITS.nodes) throw new Error('Import exceeds the 20,000-value local review boundary.');
      if (!value || typeof value !== 'object') continue;
      if (depth >= IMPORT_LIMITS.depth && Object.keys(value).length) throw new Error('Import exceeds the 32-level local review boundary.');
      for (const child of Object.values(value)) stack.push({ value: child, depth: depth + 1 });
    }
    return parsed;
  }

  function element(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (name === 'className') node.className = value;
      else if (name === 'text') node.textContent = String(value);
      else if (name === 'value') node.value = value;
      else if (name === 'checked') node.checked = Boolean(value);
      else if (name === 'disabled') node.disabled = Boolean(value);
      else if (name === 'selected') node.selected = Boolean(value);
      else if (name.startsWith('data-')) node.setAttribute(name, String(value));
      else node.setAttribute(name, String(value));
    });
    const childList = Array.isArray(children) ? children : [children];
    childList.forEach((child) => {
      if (child === undefined || child === null) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function svgElement(tag, attributes = {}, children = []) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    });
    const childList = Array.isArray(children) ? children : [children];
    childList.forEach((child) => {
      if (child === undefined || child === null) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function field(labelText, control, helpText) {
    const label = element('label', { className: 'sc-field' });
    label.append(element('span', { className: 'sc-label', text: labelText }), control);
    if (helpText) label.append(element('span', { className: 'sc-help', text: helpText }));
    return label;
  }

  function mount(root, options = {}) {
    const core = global.StrategyCanvasCore;
    if (!core) throw new Error('StrategyCanvasCore must load before StrategyCanvasCanonical.');
    if (!(root instanceof Element)) throw new Error('A Strategy Canvas root element is required.');

    const initialState = options.initialState || core.defaultState;
    const store = core.createStore(initialState, { historyLimit: 80 });
    const controller = new AbortController();
    const { signal } = controller;
    let drag = null;
    let chartGeometry = null;

    const find = (role) => root.querySelector(`[data-sc-role="${role}"]`);
    const announce = (message) => {
      const live = find('live');
      if (!live) return;
      live.textContent = '';
      global.requestAnimationFrame(() => { live.textContent = message; });
    };
    const locked = () => store.getState().lifecycle.status === 'reviewed';

    function seriesPath(dimensions, series, geometry, preview) {
      return dimensions.map((dimension, index) => {
        const score = preview && preview.dimensionId === dimension.id && preview.series === series
          ? preview.value
          : dimension.scores[series];
        const x = geometry.x(index);
        const y = geometry.y(score);
        return `${index ? 'L' : 'M'} ${x} ${y}`;
      }).join(' ');
    }

    function renderChart(state) {
      const container = find('chart');
      if (!container) return;
      const dimensions = core.selectors.orderedDimensions(state);
      const width = Math.max(980, 180 + dimensions.length * 150);
      const height = 650;
      const margin = { top: 92, right: 118, bottom: 138, left: 238 };
      const plotWidth = width - margin.left - margin.right;
      const plotHeight = height - margin.top - margin.bottom;
      const columnWidth = plotWidth / dimensions.length;
      const columnStart = (index) => margin.left + columnWidth * index;
      const columnEnd = (index) => margin.left + columnWidth * (index + 1);
      const x = (index) => margin.left + columnWidth * (index + 0.5);
      const y = (value) => margin.top + plotHeight - ((value - state.scale.min) / (state.scale.max - state.scale.min)) * plotHeight;
      const valueForY = (position) => {
        const raw = state.scale.min + ((margin.top + plotHeight - position) / plotHeight) * (state.scale.max - state.scale.min);
        return core.clamp(Math.round(raw / state.scale.step) * state.scale.step, state.scale.min, state.scale.max);
      };
      chartGeometry = { width, height, margin, columnWidth, columnStart, columnEnd, x, y, valueForY, dimensions };

      const titleId = `sc-chart-title-${state.meta.id}`;
      const descriptionId = `sc-chart-description-${state.meta.id}`;
      const svg = svgElement('svg', {
        class: 'sc-chart',
        viewBox: `0 0 ${width} ${height}`,
        width,
        height,
        role: 'group',
        'aria-labelledby': `${titleId} ${descriptionId}`,
        'data-sc-chart': 'true'
      });
      svg.append(
        svgElement('title', { id: titleId }, state.meta.title),
        svgElement('desc', { id: descriptionId }, `Interactive Strategy Canvas with ${dimensions.length} dimensions. Each large marker is a vertical slider. Native score controls follow the chart.`)
      );

      dimensions.forEach((dimension, index) => {
        const actionGroup = svgElement('g', {
          class: 'sc-action-cell',
          'data-action': dimension.action,
          'data-action-band': dimension.id,
          'aria-label': `${dimension.label}: ${ACTION_LABELS[dimension.action]}`
        });
        actionGroup.append(
          svgElement('rect', {
            x: columnStart(index),
            y: 8,
            width: columnEnd(index) - columnStart(index),
            height: 32
          }),
          svgElement('text', {
            class: 'sc-action-label',
            x: x(index),
            y: 29,
            'text-anchor': 'middle',
            'data-action-label': dimension.id
          }, ACTION_LABELS[dimension.action])
        );
        svg.append(actionGroup);
      });

      const tickCount = Math.max(2, Math.round((state.scale.max - state.scale.min) / state.scale.step));
      const visibleTickStep = tickCount > 10 ? Math.ceil(tickCount / 10) : 1;
      for (let tick = 0; tick <= tickCount; tick += visibleTickStep) {
        const value = state.scale.min + tick * state.scale.step;
        const tickY = y(value);
        const major = value === state.scale.min || value === state.scale.max || Math.abs(value - (state.scale.min + state.scale.max) / 2) < state.scale.step / 2;
        svg.append(
          svgElement('line', { class: 'sc-grid-line', 'data-major': major, x1: margin.left, x2: width - margin.right, y1: tickY, y2: tickY }),
          svgElement('text', { class: 'sc-axis-label', x: margin.left - 18, y: tickY + 5, 'text-anchor': 'end' }, String(Number(value.toFixed(4))))
        );
      }
      dimensions.forEach((dimension, index) => {
        const columnX = x(index);
        svg.append(svgElement('line', {
          class: 'sc-grid-line',
          'data-dimension-guide': dimension.id,
          x1: columnX,
          x2: columnX,
          y1: margin.top,
          y2: margin.top + plotHeight
        }));
      });
      svg.append(
        svgElement('line', { class: 'sc-axis', x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + plotHeight }),
        svgElement('line', { class: 'sc-axis', x1: margin.left, x2: width - margin.right, y1: margin.top + plotHeight, y2: margin.top + plotHeight }),
        svgElement('text', {
          class: 'sc-axis-label',
          x: 22,
          y: margin.top + plotHeight / 2,
          transform: `rotate(-90 22 ${margin.top + plotHeight / 2})`,
          'text-anchor': 'middle'
        }, 'Relative level of support'),
        svgElement('text', { class: 'sc-axis-label sc-scale-anchor', x: margin.left - 38, y: margin.top + 18, 'text-anchor': 'end', 'data-scale-anchor': 'high' }, state.scale.highLabel),
        svgElement('text', { class: 'sc-axis-label sc-scale-anchor', x: margin.left - 38, y: y((state.scale.min + state.scale.max) / 2) + 22, 'text-anchor': 'end', 'data-scale-anchor': 'middle' }, state.scale.middleLabel),
        svgElement('text', { class: 'sc-axis-label sc-scale-anchor', x: margin.left - 38, y: margin.top + plotHeight - 12, 'text-anchor': 'end', 'data-scale-anchor': 'low' }, state.scale.lowLabel)
      );

      core.series.forEach((series) => {
        svg.append(svgElement('path', {
          class: 'sc-series-line',
          d: seriesPath(dimensions, series, chartGeometry),
          'data-series': series,
          'data-series-line': series,
          'aria-hidden': 'true'
        }));
      });

      dimensions.forEach((dimension, index) => {
        const selected = state.view.selectedDimensionId === dimension.id;
        core.series.forEach((series) => {
          const score = dimension.scores[series];
          const group = svgElement('g', {
            class: 'sc-handle',
            transform: `translate(${x(index)} ${y(score)})`,
            tabindex: '0',
            role: 'slider',
            'aria-orientation': 'vertical',
            'aria-valuemin': state.scale.min,
            'aria-valuemax': state.scale.max,
            'aria-valuenow': score,
            'aria-valuetext': `${score} of ${state.scale.max}, ${SERIES_LABELS[series]}`,
            'aria-label': `${dimension.label} — ${SERIES_LABELS[series]}`,
            'data-handle': 'true',
            'data-dimension-id': dimension.id,
            'data-series': series,
            'data-index': index,
            'data-selected': selected
          });
          group.append(svgElement('circle', { class: 'sc-hit', r: 32 }));
          if (series === 'goodEnough') {
            group.append(svgElement('rect', { class: 'sc-marker', x: -16, y: -16, width: 32, height: 32, transform: 'rotate(45)' }));
          } else {
            group.append(svgElement('circle', { class: 'sc-marker', r: 22 }));
          }
          group.append(
            svgElement('circle', { class: 'sc-selection-ring', r: 29 }),
            svgElement('line', { class: 'sc-center', x1: -5, x2: 5, y1: 0, y2: 0 }),
            svgElement('line', { class: 'sc-center', x1: 0, x2: 0, y1: -5, y2: 5 }),
            svgElement('text', { class: 'sc-value-label', x: 0, y: -36, 'text-anchor': 'middle', 'data-handle-value': 'true' }, String(score))
          );
          svg.append(group);
        });

        const label = svgElement('text', {
          class: 'sc-dimension-label sc-dimension-hit',
          x: x(index),
          y: margin.top + plotHeight + 42,
          'text-anchor': 'middle',
          tabindex: '0',
          role: 'button',
          'aria-label': `Inspect ${dimension.label}`,
          'data-select-dimension': dimension.id,
          'data-factor-label': dimension.id
        });
        const words = dimension.label.split(/\s+/);
        const lines = [];
        words.forEach((word) => {
          const current = lines.at(-1);
          if (current && `${current} ${word}`.length <= 12) lines[lines.length - 1] = `${current} ${word}`;
          else lines.push(word);
        });
        const visibleLines = lines.slice(0, 5);
        if (lines.length > visibleLines.length) visibleLines[visibleLines.length - 1] += ' …';
        visibleLines.forEach((line, lineIndex) => label.append(svgElement('tspan', {
          x: x(index),
          dy: lineIndex ? '1.15em' : 0
        }, line)));
        svg.append(label);
      });
      container.replaceChildren(svg);
    }

    function scoreControl(state, dimension, series) {
      const wrapper = element('div', { className: 'sc-score-control' });
      const decrement = element('button', {
        type: 'button',
        className: 'sc-stepper',
        'data-action': 'step-score',
        'data-dimension-id': dimension.id,
        'data-series': series,
        'data-delta': -state.scale.step,
        'aria-label': `Decrease ${dimension.label} — ${SERIES_LABELS[series]}`,
        disabled: locked(),
        text: '−'
      });
      const input = element('input', {
        type: 'number',
        min: state.scale.min,
        max: state.scale.max,
        step: state.scale.step,
        value: dimension.scores[series],
        'data-score-input': 'true',
        'data-dimension-id': dimension.id,
        'data-series': series,
        'aria-label': `${dimension.label} — ${SERIES_LABELS[series]} (${state.scale.min} to ${state.scale.max})`,
        disabled: locked()
      });
      const increment = element('button', {
        type: 'button',
        className: 'sc-stepper',
        'data-action': 'step-score',
        'data-dimension-id': dimension.id,
        'data-series': series,
        'data-delta': state.scale.step,
        'aria-label': `Increase ${dimension.label} — ${SERIES_LABELS[series]}`,
        disabled: locked(),
        text: '+'
      });
      wrapper.append(decrement, input, increment);
      return wrapper;
    }

    function renderScoreMatrix(state) {
      const container = find('score-matrix');
      if (!container) return;
      const table = element('table', { className: 'sc-score-table' });
      const head = element('thead');
      const headerRow = element('tr');
      ['Dimension', 'Current', 'Good enough', 'Desired', 'Consequence weight'].forEach((label, index) => {
        headerRow.append(element('th', { scope: 'col', text: label, id: index ? undefined : 'sc-dimension-column' }));
      });
      head.append(headerRow);
      const body = element('tbody');
      core.selectors.orderedDimensions(state).forEach((dimension) => {
        const row = element('tr', { 'data-selected': state.view.selectedDimensionId === dimension.id });
        const dimensionHead = element('th', { scope: 'row' });
        dimensionHead.append(
          element('button', {
            type: 'button',
            className: 'sc-button-small sc-quiet',
            'data-action': 'select',
            'data-dimension-id': dimension.id,
            text: dimension.label
          }),
          element('div', { className: 'sc-help', text: dimension.definition })
        );
        row.append(dimensionHead);
        core.series.forEach((series) => row.append(element('td', {}, scoreControl(state, dimension, series))));
        const weightCell = element('td');
        const weightInput = element('input', {
          type: 'number', min: 0, max: 5, step: 1, value: dimension.consequenceWeight,
          'data-dimension-field': 'consequenceWeight',
          'data-dimension-id': dimension.id,
          'aria-label': `${dimension.label} — consequence weight (0 to 5)`,
          disabled: locked()
        });
        const meter = element('span', { className: 'sc-weight-meter', 'aria-hidden': 'true' });
        for (let index = 1; index <= 5; index += 1) meter.append(element('span', { 'data-active': index <= dimension.consequenceWeight }));
        weightCell.append(weightInput, meter);
        row.append(weightCell);
        body.append(row);
      });
      table.append(head, body);
      container.replaceChildren(table);
    }

    function renderInspector(state) {
      const container = find('inspector');
      if (!container) return;
      const dimension = core.selectors.selectedDimension(state);
      const disabled = locked();
      const fields = element('div', { className: 'sc-inspector-fields' });
      fields.append(
        field('Dimension label', element('input', {
          type: 'text', value: dimension.label,
          maxlength: 120, 'data-dimension-field': 'label', 'data-dimension-id': dimension.id, disabled
        }), 'This label appears on the chart, table, export, and prompt capsule.'),
        field('Local definition', element('textarea', {
          maxlength: 900, 'data-dimension-field': 'definition', 'data-dimension-id': dimension.id, disabled
        }, dimension.definition), 'A shared definition makes a score interpretable across participants.')
      );
      const anchorGroup = element('fieldset');
      anchorGroup.append(element('legend', { className: 'sc-label', text: 'Scale anchors' }));
      const anchors = element('div', { className: 'sc-anchor-grid' });
      ['low', 'middle', 'high'].forEach((anchor) => anchors.append(field(
        `${anchor[0].toUpperCase()}${anchor.slice(1)} anchor`,
        element('textarea', {
          'data-anchor-field': anchor,
          'data-dimension-id': dimension.id,
          maxlength: 600,
          disabled
        }, dimension.anchors[anchor])
      )));
      anchorGroup.append(anchors, element('p', { className: 'sc-help', text: 'Anchors describe observable conditions. They give the same number a shared local meaning.' }));
      const actionSelect = element('select', {
        'data-dimension-field': 'action', 'data-dimension-id': dimension.id, disabled
      });
      Object.entries(ACTION_LABELS).forEach(([value, label]) => actionSelect.append(element('option', {
        value, selected: dimension.action === value, text: label
      })));
      fields.append(
        anchorGroup,
        field('Action lens', actionSelect, 'Apply this after the curve is visible. The action changes the facilitation lens and leaves each score unchanged.'),
        field('Evidence basis', element('textarea', {
          maxlength: 1200, 'data-dimension-field': 'evidenceBasis', 'data-dimension-id': dimension.id, disabled
        }, dimension.evidenceBasis), 'Name the material or observation that gives the current reading its standing.')
      );
      const actionsRow = element('div', { className: 'sc-toolbar' });
      actionsRow.append(
        element('button', { type: 'button', className: 'sc-button-small', 'data-action': 'move', 'data-dimension-id': dimension.id, 'data-delta': -1, disabled, text: 'Move earlier' }),
        element('button', { type: 'button', className: 'sc-button-small', 'data-action': 'move', 'data-dimension-id': dimension.id, 'data-delta': 1, disabled, text: 'Move later' }),
        element('button', { type: 'button', className: 'sc-button-small sc-danger', 'data-action': 'remove', 'data-dimension-id': dimension.id, disabled: disabled || state.dimensions.length <= 1, text: 'Remove dimension' })
      );
      const heading = element('h3', { text: `Inspect · ${dimension.label}` });
      container.replaceChildren(heading, fields, actionsRow);
    }

    function renderTextEquivalent(state) {
      const container = find('text-equivalent');
      if (!container) return;
      const table = element('table', { className: 'sc-score-table' });
      const head = element('thead');
      const headerRow = element('tr');
      ['Dimension and anchors', 'Current', 'Good enough', 'Desired', 'Action', 'Evidence basis'].forEach((label) => headerRow.append(element('th', { scope: 'col', text: label })));
      head.append(headerRow);
      const body = element('tbody');
      core.selectors.orderedDimensions(state).forEach((dimension) => {
        const row = element('tr');
        const dimensionCell = element('th', { scope: 'row' });
        dimensionCell.append(
          element('strong', { text: dimension.label }),
          element('p', { text: dimension.definition }),
          element('p', { className: 'sc-help', text: `Low: ${dimension.anchors.low} Middle: ${dimension.anchors.middle} High: ${dimension.anchors.high}` })
        );
        row.append(
          dimensionCell,
          element('td', { text: dimension.scores.current }),
          element('td', { text: dimension.scores.goodEnough }),
          element('td', { text: dimension.scores.desired }),
          element('td', { text: ACTION_LABELS[dimension.action] }),
          element('td', { text: dimension.evidenceBasis || 'Open for the next review.' })
        );
        body.append(row);
      });
      table.append(head, body);
      container.replaceChildren(table);
    }

    function renderLifecycle(state) {
      const container = find('lifecycle');
      if (!container) return;
      if (state.lifecycle.status === 'reviewed') {
        const summary = element('div', { className: 'sc-lifecycle-summary' });
        summary.append(
          element('h3', { text: `Reviewed revision ${state.meta.revision}` }),
          element('p', { text: state.lifecycle.reviewedBy ? `Reviewed by ${state.lifecycle.reviewedBy}.` : 'Reviewer identity remains open for this artifact.' }),
          element('p', { text: state.lifecycle.reviewNote || 'The visible revision is the reviewed snapshot.' }),
          element('p', { className: 'sc-help', text: state.lifecycle.reviewedAt ? `Review recorded ${state.lifecycle.reviewedAt}.` : '' }),
          element('button', { type: 'button', 'data-action': 'reopen', text: 'Create the next working revision' })
        );
        container.replaceChildren(summary);
        return;
      }
      const form = element('div', { className: 'sc-lifecycle-form' });
      form.append(
        element('h3', { text: 'Mark this revision reviewed' }),
        element('p', { className: 'sc-help', text: 'Reviewing stores an inspectable snapshot. A later edit begins a new working revision while the reviewed snapshot remains available in the export.' }),
        field('Reviewer or reviewing group', element('input', { type: 'text', maxlength: 160, 'data-reviewer': 'true', autocomplete: 'off' })),
        field('Review note', element('textarea', { maxlength: 1200, 'data-review-note': 'true' })),
        element('button', { type: 'button', className: 'sc-primary', 'data-action': 'review', text: 'Mark revision reviewed' })
      );
      container.replaceChildren(form);
    }

    function renderOutputs(state) {
      const json = find('json');
      const prompt = find('prompt');
      const validation = find('validation');
      if (json) json.textContent = core.serialize(state);
      if (prompt) prompt.textContent = core.promptCapsule(state);
      if (validation) {
        const result = core.validateState(state);
        validation.dataset.valid = String(result.valid);
        validation.textContent = result.valid
          ? `Valid ${core.schemaVersion} state · ${state.dimensions.length} stable dimensions · ${state.lifecycle.status} revision ${state.meta.revision}`
          : `State needs attention · ${result.errors.join(' ')}`;
      }
      const jsonLd = root.querySelector('script[data-sc-jsonld]');
      if (jsonLd) jsonLd.textContent = JSON.stringify(core.toJSONLD(state), null, 2);
    }

    function renderMeta(state) {
      root.dataset.viewMode = state.view.mode;
      root.dataset.lifecycle = state.lifecycle.status;
      const status = find('status');
      if (status) {
        status.dataset.status = state.lifecycle.status;
        status.textContent = `${state.lifecycle.status === 'reviewed' ? 'Reviewed' : 'Working'} · revision ${state.meta.revision}`;
      }
      const mode = root.querySelector('[data-action="toggle-mode"]');
      if (mode) mode.textContent = state.view.mode === 'presentation' ? 'Return to working view' : 'Enter presentation view';
      const undo = root.querySelector('[data-action="undo"]');
      const redo = root.querySelector('[data-action="redo"]');
      if (undo) undo.disabled = !store.canUndo();
      if (redo) redo.disabled = !store.canRedo();
      const dimensionCount = find('dimension-count');
      if (dimensionCount) dimensionCount.textContent = `${state.dimensions.length} dimensions`;
    }

    function renderAll() {
      const state = store.getState();
      renderMeta(state);
      renderChart(state);
      renderScoreMatrix(state);
      renderInspector(state);
      renderTextEquivalent(state);
      renderLifecycle(state);
      renderOutputs(state);
      if (typeof options.onStateChange === 'function') options.onStateChange(state);
    }

    async function copyText(value, description) {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
        else {
          const fallback = element('textarea', { 'aria-hidden': 'true' }, value);
          fallback.style.position = 'fixed';
          fallback.style.opacity = '0';
          document.body.append(fallback);
          fallback.select();
          document.execCommand('copy');
          fallback.remove();
        }
        announce(`${description} copied.`);
      } catch (error) {
        announce(`${description} remains visible for manual copy.`);
      }
    }

    function commitDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const value = drag.value;
      const { dimensionId, series, target } = drag;
      drag = null;
      root.removeAttribute('data-dragging');
      try { target.releasePointerCapture(event.pointerId); } catch (error) { /* capture may already be released */ }
      store.dispatch(core.actions.scoreSet(dimensionId, series, value));
      const dimension = core.selectors.selectedDimension(store.getState());
      announce(`${dimension.label}, ${SERIES_LABELS[series]}, ${value} of ${store.getState().scale.max}.`);
    }

    root.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest?.('[data-handle="true"]');
      if (!handle || locked() || event.button !== 0 || !chartGeometry) return;
      const svg = handle.ownerSVGElement;
      const rectangle = svg.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        target: handle,
        svg,
        rectangle,
        dimensionId: handle.dataset.dimensionId,
        series: handle.dataset.series,
        index: Number(handle.dataset.index),
        value: Number(handle.getAttribute('aria-valuenow'))
      };
      root.dataset.dragging = 'true';
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    }, { signal });

    root.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId || !chartGeometry) return;
      const localY = ((event.clientY - drag.rectangle.top) / drag.rectangle.height) * chartGeometry.height;
      const value = chartGeometry.valueForY(localY);
      drag.value = value;
      const pointX = chartGeometry.x(drag.index);
      const pointY = chartGeometry.y(value);
      drag.target.setAttribute('transform', `translate(${pointX} ${pointY})`);
      drag.target.setAttribute('aria-valuenow', value);
      drag.target.setAttribute('aria-valuetext', `${value} of ${store.getState().scale.max}, ${SERIES_LABELS[drag.series]}`);
      const label = drag.target.querySelector('[data-handle-value]');
      if (label) label.textContent = String(value);
      const line = drag.svg.querySelector(`[data-series-line="${drag.series}"]`);
      if (line) line.setAttribute('d', seriesPath(chartGeometry.dimensions, drag.series, chartGeometry, drag));
      event.preventDefault();
    }, { signal });

    root.addEventListener('pointerup', commitDrag, { signal });
    root.addEventListener('pointercancel', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      root.removeAttribute('data-dragging');
      renderChart(store.getState());
      announce('Marker movement cancelled; the previous value remains active.');
    }, { signal });

    root.addEventListener('keydown', (event) => {
      const handle = event.target.closest?.('[data-handle="true"]');
      if (handle && !locked()) {
        const state = store.getState();
        const dimension = state.dimensions.find((candidate) => candidate.id === handle.dataset.dimensionId);
        const series = handle.dataset.series;
        const current = dimension?.scores?.[series];
        let next = current;
        if (event.key === 'ArrowUp' || event.key === 'ArrowRight') next += state.scale.step;
        else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') next -= state.scale.step;
        else if (event.key === 'PageUp') next += state.scale.step * 2;
        else if (event.key === 'PageDown') next -= state.scale.step * 2;
        else if (event.key === 'Home') next = state.scale.min;
        else if (event.key === 'End') next = state.scale.max;
        else return;
        event.preventDefault();
        store.dispatch(core.actions.scoreSet(dimension.id, series, next));
        const replacement = root.querySelector(`[data-handle="true"][data-dimension-id="${CSS.escape(dimension.id)}"][data-series="${series}"]`);
        replacement?.focus();
        announce(`${dimension.label}, ${SERIES_LABELS[series]}, ${core.clamp(next, state.scale.min, state.scale.max)} of ${state.scale.max}.`);
        return;
      }
      const selectable = event.target.closest?.('[data-select-dimension]');
      if (selectable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        store.dispatch(core.actions.viewSelect(selectable.dataset.selectDimension));
      }
    }, { signal });

    root.addEventListener('click', (event) => {
      const selectable = event.target.closest?.('[data-select-dimension]');
      if (selectable) store.dispatch(core.actions.viewSelect(selectable.dataset.selectDimension));
      const trigger = event.target.closest?.('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;
      const state = store.getState();
      if (action === 'undo') store.undo();
      else if (action === 'redo') store.redo();
      else if (action === 'toggle-mode') store.dispatch(core.actions.viewModeSet(state.view.mode === 'presentation' ? 'working' : 'presentation'));
      else if (action === 'select') store.dispatch(core.actions.viewSelect(trigger.dataset.dimensionId));
      else if (action === 'add' && !locked()) store.dispatch(core.actions.dimensionAdd());
      else if (action === 'move' && !locked()) store.dispatch(core.actions.dimensionMove(trigger.dataset.dimensionId, Number(trigger.dataset.delta)));
      else if (action === 'remove' && !locked()) store.dispatch(core.actions.dimensionRemove(trigger.dataset.dimensionId));
      else if (action === 'step-score' && !locked()) {
        const dimension = state.dimensions.find((candidate) => candidate.id === trigger.dataset.dimensionId);
        if (dimension) store.dispatch(core.actions.scoreSet(dimension.id, trigger.dataset.series, dimension.scores[trigger.dataset.series] + Number(trigger.dataset.delta)));
      } else if (action === 'review' && !locked()) {
        const reviewer = root.querySelector('[data-reviewer]')?.value || '';
        const note = root.querySelector('[data-review-note]')?.value || '';
        store.dispatch(core.actions.lifecycleReview(reviewer, note));
        announce(`Revision ${state.meta.revision} marked reviewed.`);
      } else if (action === 'reopen') {
        store.dispatch(core.actions.lifecycleReopen());
        announce(`Working revision ${store.getState().meta.revision} created from the reviewed state.`);
      } else if (action === 'copy-json') copyText(core.serialize(state), 'Strategy Canvas JSON');
      else if (action === 'copy-prompt') copyText(core.promptCapsule(state), 'AI collaboration capsule');
      else if (action === 'import') {
        const input = find('import');
        try {
          const parsed = parseBoundedImport(input?.value || '');
          if (parsed.schemaVersion === core.schemaVersion) {
            const sourceValidation = core.validateState(parsed);
            if (!sourceValidation.valid) throw new Error(sourceValidation.errors.join(' '));
          }
          const normalized = parsed.schemaVersion === core.schemaVersion ? core.normalizeState(parsed) : core.migrateV1(parsed);
          const validation = core.validateState(normalized);
          if (!validation.valid) throw new Error(validation.errors.join(' '));
          store.dispatch(core.actions.stateReplace(normalized));
          announce('Strategy Canvas JSON imported and normalized to schema 2.0.');
        } catch (error) {
          announce(`Import needs attention: ${error.message}`);
        }
      }
    }, { signal });

    root.addEventListener('change', (event) => {
      const scoreInput = event.target.closest?.('[data-score-input="true"]');
      if (scoreInput && !locked()) {
        store.dispatch(core.actions.scoreSet(scoreInput.dataset.dimensionId, scoreInput.dataset.series, Number(scoreInput.value)));
        return;
      }
      const dimensionInput = event.target.closest?.('[data-dimension-field]');
      if (dimensionInput && !locked()) {
        const fieldName = dimensionInput.dataset.dimensionField;
        const value = fieldName === 'consequenceWeight' ? Number(dimensionInput.value) : dimensionInput.value;
        store.dispatch(core.actions.dimensionUpdate(dimensionInput.dataset.dimensionId, { [fieldName]: value }));
        return;
      }
      const anchorInput = event.target.closest?.('[data-anchor-field]');
      if (anchorInput && !locked()) {
        store.dispatch(core.actions.dimensionUpdate(anchorInput.dataset.dimensionId, {
          anchors: { [anchorInput.dataset.anchorField]: anchorInput.value }
        }));
      }
    }, { signal });

    store.subscribe(renderAll);
    renderAll();

    const staticBaseline = find('static-baseline');
    const skipLink = find('skip-link');
    if (staticBaseline) staticBaseline.hidden = true;
    if (skipLink) {
      skipLink.href = '#strategy-canvas-chart';
      skipLink.textContent = 'Skip to the interactive Strategy Canvas';
    }
    root.dataset.scEnhancementState = 'mounted';

    return Object.freeze({
      version: '0.2.2',
      schemaVersion: core.schemaVersion,
      getState: () => core.clone(store.getState()),
      getValidation: () => core.validateState(store.getState()),
      serialize: () => core.serialize(store.getState()),
      toJSONLD: () => core.clone(core.toJSONLD(store.getState())),
      promptCapsule: () => core.promptCapsule(store.getState())
    });
  }

  global.StrategyCanvasCanonical = Object.freeze({ version: '0.2.2', mount });
})(typeof window !== 'undefined' ? window : globalThis);
