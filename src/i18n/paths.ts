// Будує URL-и з урахуванням Astro `base` (/vensmoen на GitHub Pages).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Головна сторінка = хаб центру. */
export function localeHome(code: string): string {
  return `${BASE}/${code}/`;
}

export function localeAbout(code: string): string {
  return `${BASE}/${code}/about/`;
}

export function localeRules(code: string): string {
  return `${BASE}/${code}/rules/`;
}

export function localeGuide(code: string): string {
  return `${BASE}/${code}/guide/`;
}

/** Гід із сортування – окремий підрозділ із квізом та друком. */
export function localeWaste(code: string): string {
  return `${BASE}/${code}/waste/`;
}

export function localePrint(code: string): string {
  return `${BASE}/${code}/waste/print/`;
}

export function localeQuiz(code: string): string {
  return `${BASE}/${code}/waste/quiz/`;
}

export function siteUrl(code: string): string {
  // Абсолютний URL веб-версії гіда із сортування – використовується в QR-коді.
  // Виводиться з astro.config (site + base) – без хардкоду хоста/шляху.
  const site = import.meta.env.SITE.replace(/\/$/, '');
  return `${site}${BASE}/${code}/waste/`;
}
