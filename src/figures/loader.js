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

// Clickable parts pulse until the reader first taps or presses a key (scrolling over the figure does
// not count). The hint button tints them while hovered and for two seconds after a press (there is no
// hover on a phone), and performs the figure's main action.
function hints(stage) {
  const button = stage.closest('.anatomy-plate')?.querySelector('.anatomy-hint');
  const acted = () => stage.removeAttribute('data-hint');
  stage.addEventListener('click', acted, { once: true });
  stage.addEventListener('keydown', acted, { once: true });
  spots(stage, acted);
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

// Hotspots: a dot with a ripple on every clickable part, placed where that part is really visible
// (found with elementFromPoint once the figure is on screen) and following it when it moves.
// Tapping a dot is the same as tapping its part.
const NS = 'http://www.w3.org/2000/svg';
const MAX_SPOTS = 12;

function spots(stage, acted) {
  const svg = stage.querySelector('svg');
  const hits = [...svg.querySelectorAll('[data-hit]')].filter((el) => !el.parentElement.closest('[data-hit]'));
  if (!hits.length) return;
  // Parts drawn in several pieces (a plate above and below the body) share their first data attribute.
  const keyOf = (el, index) => {
    for (const { name, value } of el.attributes) if (name.startsWith('data-') && name !== 'data-hit' && name !== 'data-on') return `${name}=${value}`;
    return `#${index}`;
  };
  const groups = new Map();
  hits.forEach((el, index) => { const key = keyOf(el, index); groups.set(key, [...(groups.get(key) || []), el]); });
  const layer = document.createElementNS(NS, 'g');
  layer.setAttribute('class', 'fig-spots');
  svg.append(layer);
  const list = [...groups.values()].map((els) => ({ els, el: null, anchor: null, node: null }));

  // The visible point of a part nearest the centre of its box.
  function place(spot) {
    let best = null;
    for (const el of spot.els) {
      const box = el.getBoundingClientRect();
      if (box.width < 3 || box.height < 3) continue;
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      for (let i = 0; i < 11; i++) for (let j = 0; j < 11; j++) {
        const x = box.left + ((i + 0.5) / 11) * box.width, y = box.top + ((j + 0.5) / 11) * box.height;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        const top = document.elementFromPoint(x, y);
        if (!top || !el.contains(top) || layer.contains(top)) continue;
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (!best || d < best.d) best = { d, x, y, el, area: box.width * box.height };
      }
    }
    if (!best) return false;
    spot.el = best.el;
    spot.area = best.area;
    spot.anchor = new DOMPoint(best.x, best.y).matrixTransform(best.el.getScreenCTM().inverse());
    return true;
  }

  function dot(spot) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'fig-spot');
    g.innerHTML = '<circle class="fig-spot-pad" r="24"/><circle class="fig-spot-halo" r="13"/><circle class="fig-spot-ring" r="10"/><circle class="fig-spot-dot" r="7"/>';
    g.addEventListener('click', (event) => {
      event.stopPropagation();
      acted();
      spot.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    const light = (on) => spot.els.forEach((el) => el.toggleAttribute('data-hl', on));
    g.addEventListener('pointerenter', () => light(true));
    g.addEventListener('pointerleave', () => light(false));
    layer.append(g);
    spot.node = g;
  }

  // Through the screen into the drawing's own units (getCTM stops at the viewport pixels, not the viewBox).
  const at = (spot) => spot.anchor.matrixTransform(spot.el.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());
  let placed = false, visible = false, frame = 0;
  function settle() {
    list.forEach((spot) => spot.anchor || place(spot));
    const ready = list.filter((spot) => spot.anchor).sort((a, b) => b.area - a.area);
    const kept = [];
    for (const spot of ready) {
      const p = at(spot);
      if (kept.length >= MAX_SPOTS || kept.some((other) => Math.hypot(other.p.x - p.x, other.p.y - p.y) < 40)) continue;
      kept.push({ spot, p });
    }
    kept.forEach(({ spot }) => spot.node || dot(spot));
    placed = list.every((spot) => spot.anchor);
  }
  function tick() {
    if (svg.lastElementChild !== layer) svg.append(layer);   // figures that re-stack their parts would cover the dots
    for (const spot of list) if (spot.node) {
      const p = at(spot);
      spot.node.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    }
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    visible = entry.isIntersecting;
    if (visible && entry.intersectionRatio > 0.5 && !placed) settle();
    if (visible && !frame) frame = requestAnimationFrame(tick);
  }, { threshold: [0, 0.5, 0.75, 1] }).observe(stage);
}

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
