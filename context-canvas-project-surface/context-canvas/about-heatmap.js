/* About owns this native receiver; the standalone heatmap owns projected content. */
(function () {
  'use strict';
  const labels = Object.freeze({
    side: 'Side-by-side view · before and after are both visible',
    before: 'Before view · original interaction pattern is visible',
    after: 'After view · revised navigation pattern is visible',
  });
  for (const root of document.querySelectorAll('[data-about-heatmap]')) {
    const controls = root.querySelector('.about-heatmap__controls');
    const status = root.querySelector('.about-heatmap__status');
    const buttons = [...root.querySelectorAll('button[data-mode]')];
    if (!controls || !status || buttons.length !== 3) continue;
    controls.addEventListener('click', event => {
      const button = event.target.closest('button[data-mode]');
      if (!button || !buttons.includes(button) || !Object.hasOwn(labels, button.dataset.mode)) return;
      const mode = button.dataset.mode;
      root.dataset.mode = mode;
      for (const candidate of buttons) candidate.setAttribute('aria-pressed', String(candidate === button));
      status.textContent = labels[mode];
    });
    controls.hidden = false;
    status.hidden = false;
  }
})();
