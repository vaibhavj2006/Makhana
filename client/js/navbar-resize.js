/*
  navbar-resize.js
  --------------------------------------------------------------
  Drives the "resizable navbar" scroll behavior for .site-nav.
  - Adds "has-hero" if the page has a #homeHero (or any element
    with data-nav-hero) so the nav starts transparent over it.
  - Adds "nav-scrolled" once the user scrolls past a threshold,
    triggering the floating-pill look defined in navbar-resize.css.

  Include this AFTER your other scripts, e.g. right before
  scroll-effects.js:
    <script src="js/navbar-resize.js"></script>
*/
(function () {
  "use strict";

  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const heroEl =
    document.getElementById("homeHero") ||
    document.querySelector("[data-nav-hero]");

  if (heroEl) nav.classList.add("has-hero");

  const SCROLL_THRESHOLD = 40; // px scrolled before nav shrinks
  let ticking = false;

  function updateNavState() {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    nav.classList.toggle("nav-scrolled", scrolled);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateNavState);
        ticking = true;
      }
    },
    { passive: true }
  );

  // Set correct initial state on load (e.g. if page loads already scrolled)
  updateNavState();
})();
