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

// Clickable parts pulse until the reader first acts (or for 12 s); the hint button lights them on hover
// and performs the figure's main action (its key, Space by default) on click.
function hints(stage) {
  const button = stage.closest('.anatomy-plate')?.querySelector('.anatomy-hint');
  const settle = () => stage.removeAttribute('data-hint');
  const timer = setTimeout(settle, 12000);
  const acted = () => { clearTimeout(timer); settle(); };
  stage.addEventListener('pointerdown', acted, { once: true });
  stage.addEventListener('keydown', acted, { once: true });
  if (!button) return;
  const light = (on) => stage.toggleAttribute('data-hint-hover', on);
  button.addEventListener('pointerenter', () => light(true));
  button.addEventListener('pointerleave', () => light(false));
  button.addEventListener('focus', () => light(true));
  button.addEventListener('blur', () => light(false));
  button.addEventListener('click', () => {
    acted();
    stage.dispatchEvent(new KeyboardEvent('keydown', { key: button.dataset.key || ' ', bubbles: true }));
  });
}

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
