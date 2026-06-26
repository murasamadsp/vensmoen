// Щоб додати нову мову: створіть src/i18n/<code>.json і додайте один рядок тут.
export interface Locale {
  code: string;
  /** Назва мови, написана самою мовою */
  label: string;
  dir: 'ltr' | 'rtl';
  /** lang-атрибут для <html> */
  htmlLang: string;
}

export const locales: Locale[] = [
  { code: 'nb', label: 'Norsk', dir: 'ltr', htmlLang: 'nb' },
  { code: 'en', label: 'English', dir: 'ltr', htmlLang: 'en' },
  { code: 'uk', label: 'Українська', dir: 'ltr', htmlLang: 'uk' },
  { code: 'ar', label: 'العربية', dir: 'rtl', htmlLang: 'ar' },
  { code: 'es', label: 'Español', dir: 'ltr', htmlLang: 'es' },
  { code: 'ti', label: 'ትግርኛ', dir: 'ltr', htmlLang: 'ti' },
];

export const defaultLocale = 'nb';

export const localeCodes = locales.map((l) => l.code);

export function getLocale(code: string): Locale {
  return locales.find((l) => l.code === code) ?? locales[0];
}
