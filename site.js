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

// Service finder: a visitor-controlled guide, not an automated diagnosis.
const serviceChoices = {
  technical: {title:'Technical SEO',description:'Review access, indexing signals, and the way your important pages connect. Start by understanding whether technical obstacles need investigation.',output:'Prioritized issue register and action plan',href:'technical-seo.html'},
  keywords: {title:'Keyword research',description:'Connect your services and audience questions to useful topics. Explore search intent, group related ideas, and identify where each topic belongs.',output:'Topic-to-page map and content roadmap',href:'keyword-research.html'},
  onpage: {title:'On-page SEO',description:'Review whether existing pages give visitors useful answers and a clear next step. Focus on content, titles, headings, and relevant internal links.',output:'Page recommendations and an edit brief',href:'on-page-seo.html'}
};
document.querySelectorAll('[data-service-choice]').forEach(button => {
  button.addEventListener('click', () => {
    const choice = serviceChoices[button.dataset.serviceChoice];
    if (!choice) return;
    document.querySelectorAll('[data-service-choice]').forEach(other => {
      const selected = other === button;
      other.classList.toggle('is-selected',selected);
      other.setAttribute('aria-pressed',String(selected));
    });
    document.getElementById('finder-title').textContent = choice.title;
    document.getElementById('finder-description').textContent = choice.description;
    document.getElementById('finder-output').textContent = choice.output;
    document.getElementById('finder-link').setAttribute('href',choice.href);
  });
});
