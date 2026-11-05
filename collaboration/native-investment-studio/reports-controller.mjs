import { captureStudioReport } from './reports.mjs';

export function mountStudioReports(root, { studio }) {
  const document = root.ownerDocument, window = document.defaultView;
  const host = document.createElement('section');
  host.className = 'native-investment__reports'; host.dataset.studioReports = '';
  const title = document.createElement('h4'); title.textContent = 'Take the plan with you';
  const note = document.createElement('p');
  note.textContent = 'Download a readable report or a collaboration brief with the exact accepted plan. Your unfinished entries stay in their editors.';
  const actions = document.createElement('div'); actions.className = 'native-coordination__actions';
  for (const [kind, label] of [['html', 'Download report'], ['capsule', 'Download collaboration brief']]) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.studioReport = kind; button.textContent = label;
    actions.append(button);
  }
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  host.append(title, note, actions, status); root.append(host);
  let downloadUrl = null, disposed = false;
  function click(event) {
    const kind = event.target.closest('[data-studio-report]')?.dataset.studioReport;
    if (disposed || !kind) return;
    try {
      const captured = captureStudioReport(studio.read(), studio.readBaseline()?.projection ?? null);
      const url = window.URL.createObjectURL(new window.Blob([captured[kind]], { type: kind === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' }));
      if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
      downloadUrl = url;
      const link = document.createElement('a'); link.hidden = true; link.href = url;
      link.download = `${captured.planId}-${kind === 'html' ? 'report.html' : 'brief.txt'}`;
      host.append(link); try { link.click(); } finally { link.remove(); }
      status.textContent = `Downloaded the accepted plan at revision ${captured.revision}.`;
    } catch { status.textContent = 'The download could not be prepared. Try again from the accepted plan.'; }
  }
  host.addEventListener('click', click);
  return Object.freeze({ dispose() { disposed = true; host.removeEventListener('click', click); if (downloadUrl) window.URL.revokeObjectURL(downloadUrl); host.remove(); } });
}
