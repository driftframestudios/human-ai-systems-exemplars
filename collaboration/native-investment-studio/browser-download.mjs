// Each receiver retains its latest dispatched URL until replacement or disposal,
// giving the browser time to read it. An unfinished attempt owns its own cleanup.
export function createDownloadOwner(host) {
  const document = host.ownerDocument, window = document.defaultView;
  let retainedUrl = null, disposed = false, requesting = false;

  function request({ text, type, filename }) {
    if (disposed || requesting) return false;
    requesting = true;
    let pendingUrl = null, link = null;
    try {
      pendingUrl = window.URL.createObjectURL(new window.Blob([text], { type }));
      link = document.createElement('a');
      link.hidden = true; link.href = pendingUrl; link.download = filename;
      host.append(link);
      if (disposed) return false;
      link.click();
      if (disposed) return false;
      link.remove(); link = null;
      const previous = retainedUrl;
      retainedUrl = pendingUrl; pendingUrl = null;
      if (previous !== null) window.URL.revokeObjectURL(previous);
      return true;
    } finally {
      try { link?.remove(); }
      finally {
        try { if (pendingUrl !== null) window.URL.revokeObjectURL(pendingUrl); }
        finally { requesting = false; }
      }
    }
  }

  return Object.freeze({ request, dispose() {
    if (disposed) return;
    disposed = true;
    const previous = retainedUrl; retainedUrl = null;
    if (previous !== null) window.URL.revokeObjectURL(previous);
  } });
}
