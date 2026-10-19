/* About route media enhancement ------------------------------------------
   Native video controls own playback, pause, seeking, and replay. The page
   starts on a local poster, uses a preload hint that favors visitor-triggered
   playback, and keeps a local GIF as an explicit recovery path. */

(() => {
  "use strict";

  const roots = document.querySelectorAll("[data-about-media]");

  for (const root of roots) {
    const video = root.querySelector("[data-about-media-video]");
    const source = video?.querySelector("source");
    const status = root.querySelector("[data-about-media-status]");
    if (!video || !source || !status) continue;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const printMedia = window.matchMedia("print");

    const pauseMotion = () => {
      if (!video.paused) video.pause();
    };

    const syncPresentation = () => {
      root.dataset.motionPreference = reducedMotion.matches
        ? "reduced"
        : "visitor-controlled";
      if (reducedMotion.matches || printMedia.matches) pauseMotion();
    };

    const observeMediaPreference = (query) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", syncPresentation);
      } else if (typeof query.addListener === "function") {
        query.addListener(syncPresentation);
      }
    };

    const revealRecovery = () => {
      status.hidden = false;
    };

    // A child <source> reports selection failures directly; the event does not
    // consistently bubble through <video> across browser engines.
    source.addEventListener("error", revealRecovery);
    video.addEventListener("error", revealRecovery);
    video.addEventListener("loadedmetadata", () => {
      status.hidden = true;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseMotion();
    });
    window.addEventListener("beforeprint", pauseMotion);

    syncPresentation();
    observeMediaPreference(reducedMotion);
    observeMediaPreference(printMedia);
  }
})();
