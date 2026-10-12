// Fetches a figure's drawing and its live script when the card comes near the viewport, then mounts it.
const modules = import.meta.glob('./*/live.js');

function load(stage) {
  const id = stage.dataset.figureId;
  const go = () => Promise.all([
    fetch(stage.dataset.src).then((response) => (response.ok ? response.text() : Promise.reject(response.status))),
    modules[`./${id}/live.js`](),
  ]).then(([markup, live]) => {
    stage.insertAdjacentHTML('afterbegin', markup);
    stage.removeAttribute('aria-busy');
    live.mount(stage, { text: JSON.parse(stage.dataset.text), data: JSON.parse(stage.dataset.figure) });
    hints(stage);
  }).catch(() => stage.setAttribute('data-failed', ''));
  const watch = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { watch.disconnect(); go(); }
  }, { rootMargin: '600px 0px' });
  watch.observe(stage);
}

// Figures with control buttons get them wired here; figures without fall back to the hint button, which
// tints the clickable parts and performs the main action. A pulse on the clickable parts (only where
// there are no buttons) stops at the first tap or key press; scrolling over the figure does not count.
function hints(stage) {
  const button = stage.closest('.anatomy-plate')?.querySelector('.anatomy-hint');
  const acted = () => stage.removeAttribute('data-hint');
  stage.addEventListener('click', acted, { once: true });
  stage.addEventListener('keydown', acted, { once: true });
  feedback(stage);
  // Control buttons: each presses one of the figure's keys and flashes the part it acts on.
  for (const control of stage.closest('.anatomy-plate')?.querySelectorAll('.anatomy-control') || []) {
    control.addEventListener('click', () => {
      acted();
      control.removeAttribute('data-fired'); void control.offsetWidth; control.setAttribute('data-fired', '');
      setTimeout(() => control.removeAttribute('data-fired'), 600);
      const parts = control.dataset.flash ? stage.querySelectorAll(control.dataset.flash) : [];
      parts.forEach((el) => { el.removeAttribute('data-pressed'); void el.getBoundingClientRect(); el.setAttribute('data-pressed', ''); });
      setTimeout(() => parts.forEach((el) => el.removeAttribute('data-pressed')), 900);
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: control.dataset.key, bubbles: true }));
    });
  }
  if (!button) return;
  let timer = 0;
  const flash = (on, ms = 0) => {
    clearTimeout(timer);
    stage.toggleAttribute('data-flash', on);
    if (on && ms) timer = setTimeout(() => stage.removeAttribute('data-flash'), ms);
  };
  button.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') flash(true); });
  button.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') flash(false); });
  button.addEventListener('focus', () => flash(true, 2000));
  button.addEventListener('click', () => {
    acted();
    flash(true, 2000);
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: button.dataset.key || ' ', bubbles: true }));
  });
}

// Press feedback, the same for every figure: a ripple where the reader pressed, a flash on the pressed
// part, and a toast over the drawing that says what changed (the figure's own announcement, or its
// readout) in large type for a few seconds. A mouse hovering over the drawing only tints the part under
// it (CSS): the figure never sees mouse hover, so its tour is not paused by a pointer resting there.
const TOAST_MS = 3800;
const NS = 'http://www.w3.org/2000/svg';

function feedback(stage) {
  const svg = stage.querySelector('svg');
  const plate = stage.closest('.anatomy-plate') || stage.parentElement;
  const readout = plate.querySelector('[data-readout]');
  const live = stage.querySelector('.anatomy-live');
  const toast = document.createElement('div');
  toast.className = 'anatomy-toast';
  toast.setAttribute('aria-hidden', 'true');
  toast.innerHTML = '<b></b><span></span>';
  stage.append(toast);
  const [title, detail] = toast.children;
  let actedAt = -1e9, phrase = '', phraseAt = -1e9, hideTimer = 0;

  for (const type of ['pointerover', 'pointerenter', 'pointermove', 'pointerout', 'pointerleave']) {
    stage.addEventListener(type, (event) => {
      if (event.pointerType === 'mouse') event.stopImmediatePropagation();
    }, true);
  }

  const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  function update() {
    if (performance.now() - actedAt > TOAST_MS) return;
    const text = readout ? readout.textContent.trim() : '';
    const said = phraseAt > actedAt ? phrase.trim() : '';   // only what the figure says after the press, not on focus
    title.textContent = cap(said || text);
    detail.textContent = said && text && text.toLowerCase() !== said.toLowerCase() ? text : '';
    if (!title.textContent) return;
    toast.setAttribute('data-show', '');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.removeAttribute('data-show'), Math.max(600, TOAST_MS - (performance.now() - actedAt)));
  }
  const act = () => { actedAt = performance.now(); setTimeout(update, 90); };
  if (live) new MutationObserver(() => { phrase = live.textContent; phraseAt = performance.now(); update(); }).observe(live, { childList: true, characterData: true, subtree: true });
  if (readout) new MutationObserver(() => {
    update();
    if (performance.now() - actedAt < 1200) { readout.removeAttribute('data-bump'); void readout.offsetWidth; readout.setAttribute('data-bump', ''); }
  }).observe(readout, { childList: true, characterData: true, subtree: true });

  // Ripple at the press point and a flash on every piece of the pressed part.
  stage.addEventListener('pointerdown', (event) => {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'fig-ripple');
    ring.setAttribute('cx', point.x.toFixed(1));
    ring.setAttribute('cy', point.y.toFixed(1));
    ring.setAttribute('r', '16');
    svg.append(ring);
    setTimeout(() => ring.remove(), 800);
  }, true);
  stage.addEventListener('click', (event) => {
    act();
    const hit = event.target.closest?.('[data-hit]');
    if (!hit) return;
    const key = [...hit.attributes].find(({ name }) => name.startsWith('data-') && !['data-hit', 'data-on', 'data-hl', 'data-pressed'].includes(name));
    const parts = key ? svg.querySelectorAll(`[${key.name}="${CSS.escape(key.value)}"]`) : [hit];
    parts.forEach((el) => { el.removeAttribute('data-pressed'); void el.getBoundingClientRect(); el.setAttribute('data-pressed', ''); });
    setTimeout(() => parts.forEach((el) => el.removeAttribute('data-pressed')), 900);
  }, true);
  stage.addEventListener('keydown', act, true);
  // A figure can put its own message in the toast (a step of a demo), whenever it happens.
  stage.addEventListener('anatomy-toast', (event) => {
    actedAt = performance.now();
    title.textContent = cap(event.detail.title || '');
    detail.textContent = event.detail.detail || '';
    phrase = event.detail.title || ''; phraseAt = actedAt + 1;
    toast.removeAttribute('data-show'); void toast.offsetWidth; toast.setAttribute('data-show', '');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.removeAttribute('data-show'), TOAST_MS);
  });
}

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
