// Bygger URL-er som respekterer Astro `base` (/vensmoen på GitHub Pages).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Forsiden = mottakets hub. */
export function localeHome(code: string): string {
  return `${BASE}/${code}/`;
}

export function localeOm(code: string): string {
  return `${BASE}/${code}/om/`;
}

export function localeRegler(code: string): string {
  return `${BASE}/${code}/regler/`;
}

export function localeGuide(code: string): string {
  return `${BASE}/${code}/guide/`;
}

/** Kildesorteringsguiden – eget underområde med quiz og utskrift. */
export function localeAvfall(code: string): string {
  return `${BASE}/${code}/avfall/`;
}

export function localePrint(code: string): string {
  return `${BASE}/${code}/avfall/print/`;
}

export function localeQuiz(code: string): string {
  return `${BASE}/${code}/avfall/quiz/`;
}

export function siteUrl(code: string): string {
  // Absolutt URL til nettversjonen av sorteringsguiden – brukes i QR-koden.
  // Utledes fra astro.config (site + base) – ingen hardkodet host/sti.
  const site = import.meta.env.SITE.replace(/\/$/, '');
  return `${site}${BASE}/${code}/avfall/`;
}
