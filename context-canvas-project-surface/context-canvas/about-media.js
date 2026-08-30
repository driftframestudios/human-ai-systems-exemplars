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

    if (!image || !button || !label || !stillSource || !motionSource) continue;

    let motionIsActive = false;

    const setMotionState = (nextState) => {
      motionIsActive = nextState;
      const nextSource = motionIsActive ? motionSource : stillSource;
      if (image.getAttribute("src") !== nextSource) image.setAttribute("src", nextSource);
      button.setAttribute("aria-pressed", String(motionIsActive));
      label.textContent = motionIsActive
        ? "Show still image"
        : "Play visual sequence";
    };

    button.hidden = false;
    button.addEventListener("click", () => setMotionState(!motionIsActive));
    image.addEventListener("error", () => {
      if (motionIsActive) setMotionState(false);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && motionIsActive) setMotionState(false);
    });
    window.addEventListener("beforeprint", () => setMotionState(false));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const receiveMotionPreference = (event) => {
      if (event.matches && motionIsActive) setMotionState(false);
    };
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", receiveMotionPreference);
    }
  }
})();
