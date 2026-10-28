/* The About carrier accepts one bounded height channel per opted-in document. */
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
  const VERSION = 1;
  const MAX_HEIGHT = 100000;

  function acceptsHeight(message) {
    return message !== null && typeof message === "object" && !Array.isArray(message)
      && Object.keys(message).length === 3
      && message.type === HEIGHT && message.version === VERSION
      && Number.isSafeInteger(message.height) && message.height > 0
      && message.height <= MAX_HEIGHT;
  }

  function attach(frame, environment) {
    let port = null;
    let generation = 0;
    let pendingFrame = null;
    let latestHeight = null;
    let appliedHeight = null;
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
        if (!acceptsHeight(event.data)) {
          // An excessive or malformed report restores the ordinary readable frame.
          reset();
          return;
        }
        latestHeight = event.data.height;
        if (pendingFrame !== null || latestHeight === appliedHeight) return;
        pendingFrame = environment.requestAnimationFrame(() => {
          pendingFrame = null;
          if (destroyed || session !== generation) return;
          frame.style.setProperty("--about-content-block-size", `${latestHeight}px`);
          frame.dataset.contentFit = "ready";
          appliedHeight = latestHeight;
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

  return Object.freeze({ acceptsHeight, attach });
});
