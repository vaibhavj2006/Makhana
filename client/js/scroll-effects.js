// Smooth scroll + scroll-triggered fade/slide-in animations.
// Both respect prefers-reduced-motion — people who've asked their OS for less motion get instant, plain scrolling instead.

function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // respect accessibility setting
  if (typeof Lenis === 'undefined') return; // CDN script didn't load — fail silently, page still works fine
  new Lenis({ autoRaf: true, duration: 1.1, lerp: 0.1 });
}

// Fades/slides in any element with class="reveal" as it scrolls into view.
// Safe to call more than once — already-observed elements are skipped, so this
// can run again after new content (like product cards) gets added to the page.
let revealObserver;
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
  }
  document.querySelectorAll('.reveal:not(.reveal-observed)').forEach((el) => {
    el.classList.add('reveal-observed');
    revealObserver.observe(el);
  });
}

// On pages with a dark hero (currently just the homepage), the nav starts transparent
// and overlays it, then solidifies to the normal white bar once you scroll past.
function initHeroNav() {
  const hero = document.getElementById('homeHero');
  const nav = document.querySelector('.site-nav');
  if (!hero || !nav) return;

  const toggle = () => {
    const heroBottom = hero.getBoundingClientRect().bottom;
    nav.classList.toggle('nav-on-hero', heroBottom > nav.offsetHeight);
  };
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

// Shrinks the nav into a floating rounded pill once the page is scrolled past a
// small threshold. Runs on every page (not just the homepage) — works alongside
// nav-on-hero rather than replacing it.
function initNavScrollShrink() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const threshold = 60;
  const toggle = () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > threshold);
  };
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initScrollReveal();
  initHeroNav();
  initNavScrollShrink();
});
