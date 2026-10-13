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
  const zoom = camera(stage);
  // Control buttons: each presses one of the figure's keys and flashes the part it acts on; a zoom button
  // moves the camera onto a part and back (its label switches between the two).
  for (const control of stage.closest('.anatomy-plate')?.querySelectorAll('.anatomy-control') || []) {
    if (control.dataset.zoom) {
      const there = control.textContent, back = control.dataset.labelBack || there;
      zoom.onChange((selector) => { control.textContent = selector === control.dataset.zoom ? back : there; control.toggleAttribute('aria-pressed', selector === control.dataset.zoom); });
      control.addEventListener('click', () => {
        acted();
        zoom.to(zoom.current() === control.dataset.zoom ? null : control.dataset.zoom);
        stage.dispatchEvent(new CustomEvent('anatomy-zoomed', { detail: { by: 'reader' } }));
      });
      continue;
    }
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

// Camera: eases the drawing's viewBox onto the box of a part (with some air, at the card's proportions)
// and back to the whole drawing. Figures can drive it too: dispatch "anatomy-zoom" with { selector }.
function camera(stage) {
  const svg = stage.querySelector('svg');
  const base = svg.viewBox.baseVal;
  const full = { x: base.x, y: base.y, w: base.width, h: base.height };
  let now = { ...full }, from = now, to = now, start = 0, frame = 0, current = null;
  const listeners = [];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const set = (r) => svg.setAttribute('viewBox', `${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}`);
  function boxOf(selector) {
    const back = svg.getScreenCTM().inverse();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of svg.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      for (const [cx, cy] of [[r.left, r.top], [r.right, r.bottom]]) {
        const p = new DOMPoint(cx, cy).matrixTransform(back);
        x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
      }
    }
    if (!isFinite(x0)) return null;
    let w = (x1 - x0) * 1.3, h = (y1 - y0) * 1.3;
    const ratio = full.w / full.h;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    w = Math.min(w, full.w); h = Math.min(h, full.h);
    const x = Math.min(Math.max((x0 + x1) / 2 - w / 2, full.x), full.x + full.w - w);
    const y = Math.min(Math.max((y0 + y1) / 2 - h / 2, full.y), full.y + full.h - h);
    return { x, y, w, h };
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  function tick(t) {
    const k = still.matches ? 1 : Math.min(1, (t - start) / 900);
    const e = ease(k);
    now = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
    set(now);
    frame = k < 1 ? requestAnimationFrame(tick) : 0;
  }
  function go(selector) {
    const box = selector ? boxOf(selector) : null;
    if (selector && !box) return;
    current = box ? selector : null;
    from = now; to = box || full; start = performance.now();
    cancelAnimationFrame(frame); frame = requestAnimationFrame(tick);
    listeners.forEach((fn) => fn(current));
  }
  stage.addEventListener('anatomy-zoom', (event) => go(event.detail?.selector || null));
  return { to: go, current: () => current, onChange: (fn) => listeners.push(fn) };
}

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
