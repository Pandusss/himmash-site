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

// Clickable parts pulse until the reader first acts. The hint button tints them while hovered and for
// two seconds after a press (there is no hover on a phone), and performs the figure's main action.
function hints(stage) {
  const button = stage.closest('.anatomy-plate')?.querySelector('.anatomy-hint');
  const acted = () => stage.removeAttribute('data-hint');
  stage.addEventListener('pointerdown', acted, { once: true });
  stage.addEventListener('keydown', acted, { once: true });
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

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
