// Legg til et nytt språk: lag src/i18n/<code>.json og legg til én linje her.
export interface Locale {
  code: string;
  /** Navn på språket, skrevet på språket selv */
  label: string;
  dir: 'ltr' | 'rtl';
  /** lang-attributt for <html> */
  htmlLang: string;
}

export const locales: Locale[] = [
  { code: 'nb', label: 'Norsk', dir: 'ltr', htmlLang: 'nb' },
  { code: 'en', label: 'English', dir: 'ltr', htmlLang: 'en' },
  { code: 'uk', label: 'Українська', dir: 'ltr', htmlLang: 'uk' },
  { code: 'ar', label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
  { code: 'es', label: 'Español', dir: 'ltr', htmlLang: 'es' },
];

export const defaultLocale = 'nb';

export const localeCodes = locales.map((l) => l.code);

export function getLocale(code: string): Locale {
  return locales.find((l) => l.code === code) ?? locales[0];
}
