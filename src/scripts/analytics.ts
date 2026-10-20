// Web analytics after consent: Yandex Metrika on the Russian site, Google Analytics on the English one
// (src/data/analytics.ts). The choice is kept in this browser; «Cookie settings» in the footer asks again.
declare global {
  interface Window { ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

const notice = document.getElementById('cookie-notice');
const KEY = 'analytics-consent';
let loaded = false;

function addScript(src: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.append(script);
}

function load() {
  if (loaded || !notice) return;
  loaded = true;
  const id = notice.dataset.id!;
  if (notice.dataset.provider === 'metrika') {
    const ym = function (...args: unknown[]) { (ym.a = ym.a || []).push(args); } as NonNullable<Window['ym']>;
    ym.l = Date.now();
    window.ym = ym;
    addScript('https://mc.yandex.ru/metrika/tag.js');
    // Session recording (Webvisor) stays off: it would capture what visitors type into the form.
    ym(Number(id), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  } else {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  }
}

/** Counters' own cookies, removed when the visitor declines after accepting. */
function removeCounterCookies() {
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0].trim())) {
    if (!/^(_ym|_ga|_gid|_gat|yandexuid|yabs)/.test(name)) continue;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
  }
}

function saved(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/** Sends a goal to the counter, if the visitor allowed it: inquiry_open, inquiry_sent, phone_click, email_click, messenger_click, presentation_open. */
export function track(goal: string) {
  if (!loaded || !notice) return;
  if (notice.dataset.provider === 'metrika') window.ym?.(Number(notice.dataset.id), 'reachGoal', goal);
  else window.gtag?.('event', goal);
}

if (notice) {
  if (saved() === 'granted') load();
  else if (saved() !== 'denied') notice.hidden = false;
  notice.querySelectorAll<HTMLButtonElement>('[data-cookie]').forEach((button) =>
    button.addEventListener('click', () => {
      const choice = button.dataset.cookie!;
      try { localStorage.setItem(KEY, choice); } catch {}
      notice.hidden = true;
      if (choice === 'granted') load();
      else removeCounterCookies();
    }),
  );
  document.querySelectorAll<HTMLElement>('[data-cookie-settings]').forEach((button) =>
    button.addEventListener('click', () => {
      notice.hidden = false;
      notice.querySelector<HTMLButtonElement>('[data-cookie]')?.focus();
    }),
  );
  // Calls and emails started from the site are goals too.
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest?.('a[href]');
    const href = link?.getAttribute('href') ?? '';
    if (href.startsWith('tel:')) track('phone_click');
    else if (href.startsWith('mailto:')) track('email_click');
    else if (/^https:\/\/max\.ru\//.test(href)) track('messenger_click');
    else if (/\/docs\/[^/]+\.pdf$/.test(href)) track('presentation_open');
  });
}
