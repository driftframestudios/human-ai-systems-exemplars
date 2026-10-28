/* Canonical child layout adapter. Declared receivers include this source inline;
   sizing and explicit reveal requests share one current-document channel. */
(function () {
  "use strict";
  const CONNECT = "context-canvas:content-fit-connect";
  const HEIGHT = "context-canvas:content-fit-height";
  const REVEAL = "context-canvas:content-fit-reveal";
  const VERSION = 1;
  const MAX_HEIGHT = 100000;
  let port = null;
  let observer = null;
  let queued = false;
  let previousHeight = null;
  let fittedBefore = false;

  function measure() {
    queued = false;
    if (!port) return;
    // The body's natural box includes padding and the generated attribution footer.
    // Its height stays independent of the frame viewport, allowing shrinkage.
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height === previousHeight) return;
    previousHeight = height;
    port.postMessage({ type: HEIGHT, version: VERSION, height });
  }
  function schedule() {
    if (!port || queued) return;
    queued = true;
    const receiver = port;
    queueMicrotask(() => { if (port === receiver) measure(); });
  }
  function release() {
    queued = false;
    observer?.disconnect();
    observer = null;
    port?.close();
    port = null;
    previousHeight = null;
  }
  document.addEventListener(REVEAL, event => {
    const target = event.detail?.target;
    if (!port || !event.cancelable || !(target instanceof Element)
      || target.ownerDocument !== document || !target.isConnected || !target.getClientRects().length) return;
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    const rect = target.getBoundingClientRect();
    const top = Math.floor(rect.top + window.scrollY);
    const bottom = Math.ceil(rect.bottom + window.scrollY);
    if (!Number.isSafeInteger(height) || height < 1 || height > MAX_HEIGHT
      || !Number.isSafeInteger(top) || !Number.isSafeInteger(bottom)
      || top < 0 || bottom <= top || bottom > height) return;
    // The element stays inside this document; only its bounded geometry travels.
    port.postMessage({ type: REVEAL, version: VERSION, height, top, bottom });
    event.preventDefault();
  });
  window.addEventListener("message", event => {
    const message = event.data;
    if (window.parent === window || event.source !== window.parent
      || message === null || typeof message !== "object" || Array.isArray(message)
      || Object.keys(message).length !== 2 || message.type !== CONNECT
      || message.version !== VERSION || event.ports.length !== 1
      || typeof ResizeObserver !== "function") return;
    release();
    port = event.ports[0];
    document.documentElement.dataset.contentFit = "active";
    if (!fittedBefore) {
      fittedBefore = true;
      document.dispatchEvent(new Event("context-canvas:content-fit"));
    }
    observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    schedule();
  });
  window.addEventListener("resize", schedule);
  document.addEventListener("toggle", schedule, true);
  document.addEventListener("load", schedule, true);
  document.addEventListener("DOMContentLoaded", schedule);
  document.fonts?.ready.then(schedule);
  window.addEventListener("pagehide", release);
})();
