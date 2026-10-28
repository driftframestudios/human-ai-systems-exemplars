/* About accepts bounded sizing and reveal geometry on one channel per document. */
(function (root, factory) {
  const contract = factory();
  if (typeof module === "object" && module.exports) module.exports = contract;
  if (!root.document) return;

  let controllers = [];
  const start = () => {
    if (controllers.length) return;
    controllers = [...root.document.querySelectorAll("iframe[data-about-content-fit]")]
      .map(frame => contract.attach(frame, root));
  };
  const stop = () => {
    controllers.forEach(controller => controller.destroy());
    controllers = [];
  };
  root.addEventListener("pagehide", stop);
  root.addEventListener("pageshow", start);
  start();
})(globalThis, function () {
  "use strict";

  const CONNECT = "context-canvas:content-fit-connect";
  const HEIGHT = "context-canvas:content-fit-height";
  const REVEAL = "context-canvas:content-fit-reveal";
  const VERSION = 1;
  const MAX_HEIGHT = 100000;

  function acceptsHeight(message) {
    return message !== null && typeof message === "object" && !Array.isArray(message)
      && Object.keys(message).length === 3
      && message.type === HEIGHT && message.version === VERSION
      && Number.isSafeInteger(message.height) && message.height > 0
      && message.height <= MAX_HEIGHT;
  }

  function acceptsReveal(message) {
    return message !== null && typeof message === "object" && !Array.isArray(message)
      && Object.keys(message).length === 5
      && message.type === REVEAL && message.version === VERSION
      && Number.isSafeInteger(message.height) && message.height > 0 && message.height <= MAX_HEIGHT
      && Number.isSafeInteger(message.top) && Number.isSafeInteger(message.bottom)
      && message.top >= 0 && message.bottom > message.top && message.bottom <= message.height;
  }

  function reveal(frame, message, environment) {
    const viewportHeight = environment.innerHeight;
    if (!Number.isFinite(viewportHeight) || viewportHeight <= 0 || frame.isConnected === false) return;
    const navigation = environment.document?.querySelector?.(".nav__top--sticky");
    const navigationBottom = navigation?.getBoundingClientRect().bottom ?? 0;
    const clearance = Math.max(0, Math.min(viewportHeight, navigationBottom));
    const available = viewportHeight - clearance;
    const targetHeight = message.bottom - message.top;
    const targetTop = frame.getBoundingClientRect().top + (frame.clientTop || 0) + message.top;
    const placement = targetHeight <= available ? clearance + (available - targetHeight) / 2 : clearance;
    environment.scrollTo({ top: Math.max(0, environment.scrollY + targetTop - placement), behavior: "instant" });
  }

  function attach(frame, environment) {
    let port = null;
    let generation = 0;
    let pendingFrame = null;
    let latestHeight = null;
    let appliedHeight = null;
    let latestReveal = null;
    let destroyed = false;

    function reset() {
      generation += 1;
      if (port) {
        port.onmessage = null;
        port.close();
        port = null;
      }
      if (pendingFrame !== null) environment.cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
      latestHeight = null;
      appliedHeight = null;
      latestReveal = null;
      delete frame.dataset.contentFit;
      frame.style.removeProperty("--about-content-block-size");
    }

    function connect() {
      if (destroyed) return;
      reset();
      if (!environment.MessageChannel || !frame.contentWindow) return;
      const session = generation;
      const channel = new environment.MessageChannel();
      port = channel.port1;
      port.onmessage = event => {
        if (destroyed || session !== generation) return;
        const message = event.data;
        if (acceptsReveal(message)) {
          latestHeight = message.height;
          latestReveal = message;
        } else if (acceptsHeight(message)) {
          latestHeight = message.height;
          if (latestReveal?.height !== latestHeight) latestReveal = null;
        } else {
          // An excessive or malformed report restores the ordinary readable frame.
          reset();
          return;
        }
        if (pendingFrame !== null || (latestHeight === appliedHeight && !latestReveal)) return;
        pendingFrame = environment.requestAnimationFrame(() => {
          pendingFrame = null;
          if (destroyed || session !== generation) return;
          if (appliedHeight !== latestHeight) {
            frame.style.setProperty("--about-content-block-size", `${latestHeight}px`);
            frame.dataset.contentFit = "ready";
            appliedHeight = latestHeight;
          }
          const request = latestReveal;
          latestReveal = null;
          if (request) reveal(frame, request, environment);
        });
      };
      port.start();
      try {
        // Opaque sandbox recipients require '*'; this transfer contains layout only.
        frame.contentWindow.postMessage({ type: CONNECT, version: VERSION }, "*", [channel.port2]);
      } catch {
        channel.port2.close();
        reset();
      }
    }

    frame.addEventListener("load", connect);
    connect();
    return Object.freeze({
      destroy() {
        destroyed = true;
        frame.removeEventListener("load", connect);
        reset();
      },
    });
  }

  return Object.freeze({ acceptsHeight, acceptsReveal, attach });
});
