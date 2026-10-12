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
  }).catch(() => stage.setAttribute('data-failed', ''));
  const watch = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { watch.disconnect(); go(); }
  }, { rootMargin: '600px 0px' });
  watch.observe(stage);
}

document.querySelectorAll('.anatomy-stage[data-figure-id]').forEach(load);
