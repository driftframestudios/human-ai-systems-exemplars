// Rack readings borrow the session editor's identity and visibility. Updating
// attributes in place preserves each reading's focus and horizontal position.
export function syncSessionControls(root, { selectedId, expanded, controlsId }) {
  for (const control of root.querySelectorAll('[data-studio-session-id]')) {
    const selected = control.dataset.studioSessionId === selectedId;
    control.setAttribute('aria-pressed', String(selected));
    control.setAttribute('aria-expanded', String(selected && expanded));
    control.setAttribute('aria-controls', controlsId);
  }
}
