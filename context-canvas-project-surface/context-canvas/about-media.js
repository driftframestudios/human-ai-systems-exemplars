/* About route media enhancement ------------------------------------------
   The authored poster and caption carry the complete baseline reading.
   Motion bytes enter only after a visitor activates the adjacent control. */

(() => {
  "use strict";

  const roots = document.querySelectorAll("[data-about-media]");

  for (const root of roots) {
    const image = root.querySelector("[data-about-media-image]");
    const button = root.querySelector("[data-about-media-toggle]");
    const label = root.querySelector("[data-about-media-toggle-label]");
    const stillSource = image?.dataset.stillSrc;
    const motionSource = image?.dataset.motionSrc;
    const motionDuration = Number(image?.dataset.motionDurationMs);

    if (
      !image || !button || !label || !stillSource || !motionSource
      || !Number.isFinite(motionDuration) || motionDuration <= 0
    ) continue;

    let motionIsActive = false;
    let motionEndTimer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const printMedia = window.matchMedia("print");

    const clearMotionEnd = () => {
      if (motionEndTimer === null) return;
      window.clearTimeout(motionEndTimer);
      motionEndTimer = null;
    };

    const setMotionState = (nextState) => {
      clearMotionEnd();
      motionIsActive = nextState;
      const nextSource = motionIsActive ? motionSource : stillSource;
      if (image.getAttribute("src") !== nextSource) image.setAttribute("src", nextSource);
      button.setAttribute("aria-pressed", String(motionIsActive));
      label.textContent = motionIsActive
        ? "Show still image"
        : "Play visual sequence";
    };

    const syncControlAvailability = () => {
      button.hidden = reducedMotion.matches || printMedia.matches;
    };

    const receiveMediaPreference = (event) => {
      if (event.matches && motionIsActive) setMotionState(false);
      syncControlAvailability();
    };

    const observeMediaPreference = (query) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", receiveMediaPreference);
      } else if (typeof query.addListener === "function") {
        query.addListener(receiveMediaPreference);
      }
    };

    syncControlAvailability();
    button.addEventListener("click", () => {
      if (reducedMotion.matches || printMedia.matches) return;
      setMotionState(!motionIsActive);
    });
    image.addEventListener("load", () => {
      if (!motionIsActive) return;
      clearMotionEnd();
      motionEndTimer = window.setTimeout(() => setMotionState(false), motionDuration);
    });
    image.addEventListener("error", () => {
      if (motionIsActive) setMotionState(false);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && motionIsActive) setMotionState(false);
    });
    window.addEventListener("beforeprint", () => setMotionState(false));
    observeMediaPreference(reducedMotion);
    observeMediaPreference(printMedia);
  }
})();
