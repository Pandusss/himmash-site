const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Soft fade-in for content that changes in place (filters, galleries). */
function fadeIn(el: Element, delay = 0) {
  if (!motionOK) return;
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
}

// Mobile menu
const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mobileNav = $('mobile-nav');
function setMenu(open: boolean) {
  if (!menuButton || !mobileNav) return;
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', (open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel) ?? '');
  menuButton.textContent = open ? '×' : '☰';
}
menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
mobileNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

// Dialogs
const inquiry = $<HTMLDialogElement>('inquiry-dialog');
const media = $<HTMLDialogElement>('media-dialog');
function openDialog(dialog: HTMLDialogElement) {
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}
for (const dialog of [inquiry, media]) {
  if (!dialog) continue;
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
}
document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) =>
  b.addEventListener('click', () => $<HTMLDialogElement>(b.dataset.close!)?.close()),
);

// Image viewer; items sharing data-gallery can be paged with buttons or arrow keys.
let gallery: HTMLElement[] = [];
let galleryIndex = 0;
function setMedia(src: string, caption: string) {
  const img = $<HTMLImageElement>('media-photo')!;
  img.src = src;
  img.alt = caption;
  $('media-caption')!.textContent = caption;
  if (media?.open) fadeIn(img);
}
function showGalleryItem(index: number) {
  galleryIndex = (index + gallery.length) % gallery.length;
  const item = gallery[galleryIndex];
  setMedia(item.dataset.media!, item.dataset.caption ?? '');
  $('media-count')!.textContent = `${galleryIndex + 1} / ${gallery.length}`;
}
function showMedia(src: string, caption: string, trigger?: HTMLElement) {
  if (!media) return;
  const group = trigger?.dataset.gallery;
  gallery = group ? [...document.querySelectorAll<HTMLElement>(`[data-gallery="${group}"]`)] : [];
  $('media-nav')!.hidden = gallery.length < 2;
  if (gallery.length > 1) showGalleryItem(gallery.indexOf(trigger!));
  else setMedia(src, caption);
  openDialog(media);
}
document.querySelectorAll<HTMLElement>('[data-media]').forEach((b) =>
  b.addEventListener('click', () => showMedia(b.dataset.media!, b.dataset.caption ?? '', b)),
);
$('media-prev')?.addEventListener('click', () => showGalleryItem(galleryIndex - 1));
$('media-next')?.addEventListener('click', () => showGalleryItem(galleryIndex + 1));
media?.addEventListener('keydown', (event) => {
  if (gallery.length < 2) return;
  if (event.key === 'ArrowLeft') showGalleryItem(galleryIndex - 1);
  if (event.key === 'ArrowRight') showGalleryItem(galleryIndex + 1);
});

// Certificates page: RU / EN / ZH text of each document. Choosing a language switches every document.
const docTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-doc-lang]')];
function setDocLang(lang: string) {
  docTabs.forEach((tab) => {
    const on = tab.dataset.docLang === lang;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll<HTMLElement>('[data-doc-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.docPanel !== lang;
  });
}
docTabs.forEach((tab) => {
  tab.addEventListener('click', () => setDocLang(tab.dataset.docLang!));
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const siblings = [...tab.parentElement!.querySelectorAll<HTMLButtonElement>('[data-doc-lang]')];
    const next = siblings[(siblings.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + siblings.length) % siblings.length];
    setDocLang(next.dataset.docLang!);
    next.focus();
  });
});

// Sections below the first screen fade in once as they scroll into view.
// A plain scroll check (not IntersectionObserver) so nothing stays hidden where observers don't fire.
let pending: HTMLElement[] = [];
if (document.visibilityState === 'visible' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  pending = [...document.querySelectorAll<HTMLElement>('[data-reveal]')].filter((el) => el.getBoundingClientRect().top > innerHeight);
  const itemSelector = '.solution-card, .feedstock, .process-step, .product-card, .step, .cert-card, .article-card, .faq-item, .process-loop';
  pending.forEach((section) => {
    section.classList.add('reveal');
    // Items of one grid follow each other with a short delay.
    section.querySelectorAll<HTMLElement>(itemSelector).forEach((item, i) => {
      item.classList.add('stagger-item');
      item.style.setProperty('--i', String(item.classList.contains('process-step') ? i : Math.min(i, 7)));
    });
  });
}

// Key figures count up from zero while the first screen settles.
if (motionOK && document.visibilityState === 'visible') {
  document.querySelectorAll<HTMLElement>('[data-countup]').forEach((el, index) => {
    const target = el.textContent ?? '';
    const numbers = target.match(/\d+/g)?.map(Number);
    if (!numbers) return;
    const duration = 1400;
    const start = performance.now() + 450 + index * 100;
    const render = (progress: number) => {
      let n = 0;
      el.textContent = target.replace(/\d+/g, () => String(Math.round(numbers[n++] * progress)));
    };
    render(0);
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      if (t < 1) { render(1 - Math.pow(1 - t, 3)); requestAnimationFrame(tick); } else el.textContent = target;
    };
    requestAnimationFrame(tick);
    setTimeout(() => { el.textContent = target; }, 450 + index * 100 + duration + 400); // in case frames are throttled
  });
}

// Product page: a slim bar with the price and inquiry button once the main button scrolls away.
const stickyBar = $('product-bar');
const mainInquiry = $('product-inquiry');

const header = document.querySelector<HTMLElement>('.site-header');
const progressBar = $('read-progress-bar');
const prose = document.querySelector<HTMLElement>('.prose');

function onScroll() {
  header?.classList.toggle('is-scrolled', scrollY > 8);
  if (progressBar && prose) {
    const rect = prose.getBoundingClientRect();
    const total = rect.height - innerHeight * 0.6;
    const done = Math.min(1, Math.max(0, (innerHeight * 0.4 - rect.top) / total));
    progressBar.style.transform = `scaleX(${done})`;
  }
  if (pending.length) {
    const limit = innerHeight * 0.92;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top > limit) return true;
      el.classList.add('is-visible');
      return false;
    });
  }
  if (stickyBar && mainInquiry) stickyBar.classList.toggle('is-shown', mainInquiry.getBoundingClientRect().bottom < 0);
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();

// Product gallery
const productPhoto = $<HTMLImageElement>('product-photo');
document.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach((thumb, i, all) =>
  thumb.addEventListener('click', () => {
    if (!productPhoto) return;
    productPhoto.src = thumb.dataset.photo!;
    productPhoto.alt = thumb.dataset.alt ?? productPhoto.alt;
    fadeIn(productPhoto);
    all.forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
  }),
);
$('zoom-product')?.addEventListener('click', () => productPhoto && showMedia(productPhoto.currentSrc || productPhoto.src, productPhoto.alt));

// Catalog filters
// On phones the home catalog is a horizontal carousel, so it shows every card.
const phone = matchMedia('(max-width: 650px)');
document.querySelectorAll<HTMLElement>('[data-catalog]').forEach((catalog) => {
  const cards = [...catalog.querySelectorAll<HTMLElement>('.product-grid [data-category]')];
  const rows = [...catalog.querySelectorAll<HTMLElement>('.catalog-table [data-category]')];
  const buttons = [...catalog.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const count = catalog.querySelector<HTMLElement>('[data-count]');
  const more = catalog.querySelector<HTMLButtonElement>('[data-show-more]');
  const fromUrl = new URLSearchParams(location.search).get('category');
  let active = buttons.some((b) => b.dataset.filter === fromUrl) ? fromUrl! : 'all';
  let expanded = false;
  const matchesFilter = (el: HTMLElement) => active === 'all' || el.dataset.category === active;
  function render() {
    const limit = phone.matches ? Infinity : Number(catalog.dataset.limit) || Infinity;
    const matches = cards.filter(matchesFilter);
    const visible = expanded ? matches.length : Math.min(limit, matches.length);
    cards.forEach((c) => { c.hidden = true; });
    matches.slice(0, visible).forEach((c) => { c.hidden = false; });
    rows.forEach((r) => { r.hidden = !matchesFilter(r); });
    if (count) count.textContent = `${visible} / ${matches.length}`;
    if (more) more.hidden = expanded || matches.length <= limit;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === active)));
  }
  // Cards that appear after a click fade in one after another.
  function renderAnimated() {
    const before = new Set(cards.filter((c) => !c.hidden));
    render();
    cards.filter((c) => !c.hidden && !before.has(c)).forEach((c, i) => fadeIn(c, Math.min(i, 8) * 45));
    if (!before.size) return;
    cards.filter((c) => !c.hidden && before.has(c)).forEach((c, i) => fadeIn(c, Math.min(i, 8) * 45));
  }
  buttons.forEach((b) => b.addEventListener('click', () => { active = b.dataset.filter!; expanded = false; renderAnimated(); }));
  more?.addEventListener('click', () => { expanded = true; renderAnimated(); });
  phone.addEventListener('change', render);
  render();

  // Cards / table view on the catalog page; the choice is remembered in this browser.
  const viewButtons = [...catalog.querySelectorAll<HTMLButtonElement>('[data-view]')];
  if (!viewButtons.length) return;
  function setView(view: string) {
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    catalog.querySelectorAll<HTMLElement>('[data-view-panel]').forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== view; });
    try { localStorage.setItem('catalog-view', view); } catch {}
  }
  viewButtons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view!)));
  let saved: string | null = new URLSearchParams(location.search).get('view');
  if (!saved) try { saved = localStorage.getItem('catalog-view'); } catch {}
  if (saved === 'table') setView('table');
});

// Inquiry form
const form = $<HTMLFormElement>('inquiry-form');
const contactField = $<HTMLInputElement>('contact-value');
const contactError = $('contact-error');
const sendError = $('send-error');
const views = { form: $('form-view'), success: $('success-view'), mailto: $('mailto-view') };

function showView(name: keyof typeof views) {
  for (const [key, el] of Object.entries(views)) if (el) el.hidden = key !== name;
}
function openInquiry(subject: string) {
  if (!inquiry || !form) return;
  form.reset();
  $('inquiry-subject')!.textContent = subject;
  $<HTMLInputElement>('inquiry-subject-field')!.value = subject;
  $<HTMLInputElement>('inquiry-page-field')!.value = location.href;
  contactError!.textContent = '';
  contactField!.removeAttribute('aria-invalid');
  sendError!.hidden = true;
  showView('form');
  openDialog(inquiry);
}
document.querySelectorAll<HTMLElement>('[data-inquiry]').forEach((b) =>
  b.addEventListener('click', () => openInquiry(b.dataset.inquiry!)),
);
contactField?.addEventListener('input', () => {
  contactError!.textContent = '';
  contactField.removeAttribute('aria-invalid');
});

function isValidContact(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || (/^[+\d\s()\-]+$/.test(value) && digits.length >= 10 && digits.length <= 15);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = contactField!.value.trim();
  if (!isValidContact(value)) {
    contactError!.textContent = value ? form.dataset.errorInvalid! : form.dataset.errorEmpty!;
    contactField!.setAttribute('aria-invalid', 'true');
    contactField!.focus();
    return;
  }
  const data = new FormData(form);
  if (data.get('website')) return; // bot filled the honeypot
  data.delete('website');
  sendError!.hidden = true;

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    const labels = JSON.parse(form.dataset.labels!);
    const subject = String(data.get('subject') ?? '');
    const body = [
      `${labels.name}: ${data.get('name') || '—'}`,
      `${labels.contact}: ${data.get('contact')}`,
      `${labels.message}: ${data.get('message') || '—'}`,
      '',
      String(data.get('page') ?? ''),
    ].join('\n');
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(`${form.dataset.mailSubject}: ${subject}`)}&body=${encodeURIComponent(body)}`;
    showView('mailto');
    return;
  }

  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const label = button.querySelector('.btn-label')!;
  const original = label.textContent;
  button.disabled = true;
  label.textContent = form.dataset.sending!;
  try {
    const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(String(response.status));
    showView('success');
    views.success?.querySelector('button')?.focus();
  } catch {
    sendError!.hidden = false;
  } finally {
    button.disabled = false;
    label.textContent = original;
  }
});
