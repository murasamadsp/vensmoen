// Bygger URL-er som respekterer Astro `base` (/avfallssortering på GitHub Pages).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function localeHome(code: string): string {
  return `${BASE}/${code}/`;
}

export function localePrint(code: string): string {
  return `${BASE}/${code}/print/`;
}

export function localeQuiz(code: string): string {
  return `${BASE}/${code}/quiz/`;
}

export function localeModule(code: string, moduleId: string): string {
  return `${BASE}/${code}/${moduleId}/`;
}

export function siteUrl(code: string): string {
  // Absolutt URL til nettversjonen – brukes i QR-koden.
  return `https://murasamadsp.github.io/avfallssortering/${code}/`;
}
