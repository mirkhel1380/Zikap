'use strict';
// Shared navigation: native disclosure controls keep keyboard and touch support.
const serviceMenu = document.querySelector('.service-menu');
const mobileMenu = document.querySelector('.mobile-menu');
const disclosures = [serviceMenu, mobileMenu].filter(Boolean);
disclosures.forEach(menu => {
  menu.addEventListener('toggle', () => {
    if (menu.open) disclosures.filter(other => other !== menu).forEach(other => { other.open = false; });
  });
});
document.addEventListener('click', event => {
  disclosures.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') disclosures.forEach(menu => {
    if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
});
disclosures.forEach(menu => menu.addEventListener('focusout', () => {
  requestAnimationFrame(() => { if (!menu.contains(document.activeElement)) menu.open = false; });
}));
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('header a[href]').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.setAttribute('aria-current', 'page');
});
const scene = document.querySelector('.hero-scene');
if (scene) {
  const toggle = scene.querySelector('.motion-toggle');
  const tilt = scene.querySelector('.scene-tilt');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let paused = false;
  let frame = 0;
  toggle.addEventListener('click', () => {
    paused = !paused;
    scene.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.replaceChildren();
    const symbol = document.createElement('span'); symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = paused ? '▷' : 'Ⅱ';
    toggle.append(symbol, document.createTextNode(paused ? ' Resume motion' : ' Pause motion'));
    tilt.style.removeProperty('--tilt-x'); tilt.style.removeProperty('--tilt-y');
  });
  scene.addEventListener('pointermove', event => {
    if (paused || reducedMotion.matches || !finePointer.matches) return;
    cancelAnimationFrame(frame);
    const bounds = scene.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 9;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * -7;
    frame = requestAnimationFrame(() => { tilt.style.setProperty('--tilt-y', x + 'deg'); tilt.style.setProperty('--tilt-x', y + 'deg'); });
  });
  scene.addEventListener('pointerleave', () => {
    cancelAnimationFrame(frame); tilt.style.removeProperty('--tilt-x'); tilt.style.removeProperty('--tilt-y');
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { scene.classList.toggle('is-offscreen', !entries[0].isIntersecting); }, {threshold:0}).observe(scene);
  }
}
