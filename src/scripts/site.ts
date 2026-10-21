import { track } from './analytics';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Soft fade-in for content that changes in place (filters, galleries). */
function fadeIn(el: Element, delay = 0) {
  if (!motionOK) return;
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
}

// Theme: light / dark, remembered in this browser; follows the system until chosen.
const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')];
function syncThemeButtons() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(dark)));
}
function setTheme(theme: 'light' | 'dark', remember: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  syncThemeButtons();
  if (remember) try { localStorage.setItem('theme', theme); } catch {}
  setTimeout(() => root.classList.remove('theme-switching'), 350);
}
themeButtons.forEach((b) => b.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true)));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  let saved: string | null = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (!saved) setTheme(event.matches ? 'dark' : 'light', false);
});
syncThemeButtons();

// Mobile menu: a full-screen sheet; the page underneath does not scroll.
const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mobileNav = $('mobile-nav');
function setMenu(open: boolean) {
  if (!menuButton || !mobileNav) return;
  mobileNav.hidden = !open;
  document.documentElement.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', (open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel) ?? '');
}
menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
mobileNav?.querySelectorAll('a, [data-inquiry]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !mobileNav?.hidden) { setMenu(false); menuButton?.focus(); } });
matchMedia('(min-width: 1101px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });

/** Horizontal swipe on touch screens; calls back with -1 (previous) or 1 (next). */
function onSwipe(el: HTMLElement, callback: (direction: number) => void) {
  let startX = 0, startY = 0, tracking = false;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; startX = e.clientX; startY = e.clientY; tracking = true; });
  el.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      el.dataset.swiped = '1';
      callback(dx < 0 ? 1 : -1);
      setTimeout(() => delete el.dataset.swiped, 400);
    }
  });
  el.addEventListener('pointercancel', () => { tracking = false; });
}

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
const mediaPhoto = $('media-photo');
if (mediaPhoto) onSwipe(mediaPhoto, (direction) => { if (gallery.length > 1) showGalleryItem(galleryIndex + direction); });
media?.addEventListener('keydown', (event) => {
  if (gallery.length < 2) return;
  if (event.key === 'ArrowLeft') showGalleryItem(galleryIndex - 1);
  if (event.key === 'ArrowRight') showGalleryItem(galleryIndex + 1);
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

// On phones the header slides away while scrolling down and returns on the way up.
const phoneWidth = matchMedia('(max-width: 650px)');
let lastY = scrollY;

function onScroll() {
  const y = scrollY;
  header?.classList.toggle('is-scrolled', y > 8);
  if (header) {
    const menuOpen = document.documentElement.classList.contains('menu-open');
    if (!phoneWidth.matches || menuOpen || y < 120 || y < lastY - 6) header.classList.remove('is-hidden');
    else if (y > lastY + 6) header.classList.add('is-hidden');
  }
  lastY = y;
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
const zoomButton = $('zoom-product');
zoomButton?.addEventListener('click', () => {
  if (zoomButton.dataset.swiped) return; // the tap was a swipe between photos
  if (productPhoto) showMedia(productPhoto.currentSrc || productPhoto.src, productPhoto.alt);
});
// Swipe through product photos on touch screens.
const thumbs = [...document.querySelectorAll<HTMLButtonElement>('[data-photo]')];
if (zoomButton && thumbs.length > 1) {
  onSwipe(zoomButton, (direction) => {
    const current = thumbs.findIndex((t) => t.getAttribute('aria-pressed') === 'true');
    thumbs[(current + direction + thumbs.length) % thumbs.length].click();
  });
}

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
    // Touch only cards whose visibility changes: re-showing visible cards would delay their paint (LCP).
    const shown = new Set(matches.slice(0, visible));
    cards.forEach((c) => { if (c.hidden === shown.has(c)) c.hidden = !shown.has(c); });
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
const sendError = $('send-error');
const fileInput = $<HTMLInputElement>('inquiry-files');
const fileList = $('inquiry-file-list');
const views = { form: $('form-view'), success: $('success-view'), mailto: $('mailto-view') };
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function showView(name: keyof typeof views) {
  for (const [key, el] of Object.entries(views)) if (el) el.hidden = key !== name;
}
/** Each checked field names its error box first in aria-describedby. */
function errorBox(field: Element) {
  const id = field.getAttribute('aria-describedby')?.split(' ')[0];
  return id ? $(id) : null;
}
function clearError(field: Element) {
  const box = errorBox(field);
  if (!box) return;
  box.textContent = '';
  form?.querySelectorAll(`[aria-describedby^="${box.id}"]`).forEach((el) => el.removeAttribute('aria-invalid'));
}
function clearErrors() {
  form?.querySelectorAll('.field-error:not(.send-error)').forEach((box) => { box.textContent = ''; });
  form?.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}
form?.addEventListener('input', (event) => clearError(event.target as Element));
form?.addEventListener('change', (event) => { if (event.target !== fileInput) clearError(event.target as Element); });

const formatSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const chosenFiles = () => [...(fileInput?.files ?? [])];
const filesOk = () => chosenFiles().length <= MAX_FILES && chosenFiles().every((file) => file.size <= MAX_FILE_BYTES);
function renderFiles() {
  if (!fileInput || !fileList) return;
  const files = chosenFiles();
  fileList.hidden = !files.length;
  fileList.querySelector('ul')!.replaceChildren(...files.map((file) => {
    const li = document.createElement('li');
    li.textContent = `${file.name} · ${formatSize(file.size)}`;
    if (file.size > MAX_FILE_BYTES) li.dataset.tooBig = '';
    return li;
  }));
  clearError(fileInput);
  if (!filesOk()) {
    errorBox(fileInput)!.textContent = JSON.parse(form!.dataset.errors!).files;
    fileInput.setAttribute('aria-invalid', 'true');
  }
}
fileInput?.addEventListener('change', renderFiles);
$('inquiry-files-clear')?.addEventListener('click', () => { fileInput!.value = ''; renderFiles(); fileInput!.focus(); });

function openInquiry(subject: string, need?: string) {
  if (!inquiry || !form) return;
  form.reset();
  $('inquiry-subject')!.textContent = subject;
  $<HTMLInputElement>('inquiry-subject-field')!.value = subject;
  $<HTMLInputElement>('inquiry-page-field')!.value = location.href;
  // Product pages and section buttons suggest what the visitor most likely needs.
  const suggested = need ? form.querySelector<HTMLInputElement>(`input[name=need][data-key="${need}"]`) : null;
  if (suggested) suggested.checked = true;
  clearErrors();
  renderFiles();
  sendError!.hidden = true;
  showView('form');
  openDialog(inquiry);
  track('inquiry_open');
  inquiry.querySelector('.inquiry-main')?.scrollTo(0, 0);
  inquiry.scrollTo(0, 0);
}
document.querySelectorAll<HTMLElement>('[data-inquiry]').forEach((b) =>
  b.addEventListener('click', () => openInquiry(b.dataset.inquiry!, b.dataset.need)),
);

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function isPhone(value: string) {
  const digits = value.replace(/\D/g, '').length;
  return /^[+\d\s()\-.]+$/.test(value) && digits >= 10 && digits <= 15;
}

/** Marks every problem at once and returns the first field to fix. */
function validate(): HTMLElement | null {
  const errors = JSON.parse(form!.dataset.errors!);
  let first: HTMLElement | null = null;
  const fail = (field: HTMLElement, message: string) => {
    errorBox(field)!.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    first ??= field;
  };
  clearErrors();
  const name = $<HTMLInputElement>('inquiry-name')!;
  const phone = $<HTMLInputElement>('inquiry-phone')!;
  const email = $<HTMLInputElement>('inquiry-email')!;
  for (const input of [name, phone, email]) input.value = input.value.trim();
  if (!name.value) fail(name, errors.name);
  if (!phone.value) fail(phone, errors.phone);
  else if (!isPhone(phone.value)) fail(phone, errors.phoneInvalid);
  if (email.value && !isEmail(email.value)) fail(email, errors.email);
  const needs = [...form!.querySelectorAll<HTMLInputElement>('input[name=need]')];
  if (!needs.some((r) => r.checked)) {
    fail(needs[0], errors.need);
    needs.forEach((r) => r.setAttribute('aria-invalid', 'true'));
  }
  if (!filesOk()) fail(fileInput!, errors.files);
  // Consent to personal data processing is a separate, unticked checkbox (152-FZ).
  const consent = $<HTMLInputElement>('consent-check')!;
  if (!consent.checked) fail(consent, errors.consent);
  return first;
}

/** The request as plain text, for the mail app when there is no form endpoint. */
function mailBody(data: FormData) {
  const l = JSON.parse(form!.dataset.labels!);
  const line = (label: string, value: string) => `${label}: ${value || '—'}`;
  const get = (name: string) => String(data.get(name) ?? '').trim();
  const files = chosenFiles().map((file) => file.name).join(', ');
  return [
    line(l.topic, get('subject')),
    '',
    `— ${l.contacts} —`,
    line(l.name, get('name')),
    line(l.company, get('company')),
    line(l.phone, get('phone')),
    line(l.email, get('email')),
    '',
    `— ${l.task} —`,
    line(l.need, get('need')),
    line(l.feedstock, get('feedstock')),
    line(l.volume, get('volume')),
    line(l.message, get('message')),
    ...(files ? [line(l.files, `${files} (${l.filesMail})`)] : []),
    '',
    `${form!.dataset.consentText}, ${get('consent_at')}`,
    get('page'),
  ].join('\n');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const invalid = validate();
  if (invalid) {
    invalid.focus();
    (invalid.closest('.field') ?? invalid).scrollIntoView({ block: 'center', behavior: motionOK ? 'smooth' : 'auto' });
    return;
  }
  $<HTMLInputElement>('consent-at-field')!.value = new Date().toISOString();
  const data = new FormData(form);
  if (data.get('website')) return; // bot filled the honeypot
  data.delete('website');
  if (!chosenFiles().length) data.delete('files[]');
  sendError!.hidden = true;

  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    const subject = `${form.dataset.mailSubject}: ${data.get('subject') ?? ''}`;
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody(data))}`;
    const files = chosenFiles().map((file) => file.name).join(', ');
    const reminder = $('mailto-files');
    if (reminder) {
      reminder.hidden = !files;
      reminder.querySelector('b')!.textContent = files;
    }
    showView('mailto');
    track('inquiry_sent');
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
    track('inquiry_sent');
    views.success?.querySelector('button')?.focus();
  } catch {
    sendError!.hidden = false;
  } finally {
    button.disabled = false;
    label.textContent = original;
  }
});
