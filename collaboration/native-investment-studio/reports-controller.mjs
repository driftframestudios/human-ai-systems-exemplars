import { captureStudioReport } from './reports.mjs';
import { createDownloadOwner } from './browser-download.mjs';

const FORMATS = new Map([
  ['html', Object.freeze({ label: 'Download report', type: 'text/html;charset=utf-8', suffix: 'report.html' })],
  ['capsule', Object.freeze({ label: 'Download collaboration brief', type: 'text/plain;charset=utf-8', suffix: 'brief.txt' })],
]);

export function mountStudioReports(root, { studio }) {
  const document = root.ownerDocument;
  const host = document.createElement('section');
  host.className = 'native-investment__reports'; host.dataset.studioReports = '';
  const title = document.createElement('h4'); title.textContent = 'Take the plan with you';
  const note = document.createElement('p');
  note.textContent = 'Download a readable report or a collaboration brief with the exact accepted plan. Your unfinished entries stay in their editors.';
  const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
  for (const [kind, format] of FORMATS) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.studioReport = kind; button.textContent = format.label;
    actions.append(button);
  }
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  host.append(title, note, actions, status); root.append(host);
  const downloads = createDownloadOwner(host);
  let disposed = false;
  function click(event) {
    const button = event.target.closest('button[data-studio-report]');
    if (disposed || !button || !host.contains(button) || button.disabled) return;
    const kind = button.dataset.studioReport, format = FORMATS.get(kind);
    if (!format) return;
    try {
      const captured = captureStudioReport(studio.read(), studio.readBaseline()?.projection ?? null);
      if (downloads.request({ text: captured[kind], type: format.type, filename: `${captured.planId}-${format.suffix}` }) && !disposed)
        status.textContent = `Prepared the accepted plan at revision ${captured.revision} for download.`;
    } catch { if (!disposed) status.textContent = 'The download could not be prepared. Try again from the accepted plan.'; }
  }
  host.addEventListener('click', click);
  return Object.freeze({ dispose() {
    if (disposed) return;
    disposed = true; host.removeEventListener('click', click); downloads.dispose(); host.remove();
  } });
}
