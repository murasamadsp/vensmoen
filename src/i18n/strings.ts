import ar from './ar.json';
import en from './en.json';
import es from './es.json';
import nb from './nb.json';
import ti from './ti.json';
import uk from './uk.json';

export interface FractionStrings {
  name: string;
  /** Куди викидати: бак/пакет – найважливіше для новачка */
  bin: string;
  accepted: string[];
  rejected: string[];
  note?: string;
}

export interface PageBlock {
  heading: string;
  /** Без body сторінка показує ui-текст site.comingSoon (чесний placeholder). */
  body?: string;
}

export interface ContactInfo {
  role: string;
  email: string;
}

export interface AboutPageStrings extends PageStrings {
  contactsTitle: string;
  contactsIntro: string;
  contacts: ContactInfo[];
  transportTitle: string;
  transportIntro: string;
}

export interface PageStrings {
  title: string;
  lead: string;
  /** Короткий опис для хабу – 3–4 слова, детермінована висота. */
  cardDesc: string;
  blocks: PageBlock[];
}

/** Ключі сторінок = сегменти URL (однакові всіма мовами, змінюється лише locale). */
export type PageKey = 'about' | 'rules' | 'guide';

/** Тексти для хабу центру (головна + інфосторінки). */
export interface SiteStrings {
  title: string;
  description: string;
  name: string;
  tagline: string;
  intro: string;
  sectionsLabel: string;
  comingSoon: string;
  mapTitle: string;
  /** Черговий телефон центру – цілодобовий, показується на головній сторінці. */
  dutyTitle: string;
  dutyText: string;
  /** Психологічна підтримка (Mental Helse) – окрема картка на головній. */
  mentalTitle: string;
  mentalText: string;
  emergencyTitle: string;
  emergencyNote: string;
  emergencyFire: string;
  emergencyPolice: string;
  emergencyAmbulance: string;
  emergencyDoctor: string;
}

export interface Strings {
  site: SiteStrings;
  pages: {
    about: AboutPageStrings;
    rules: PageStrings;
    guide: PageStrings;
  };
  ui: {
    siteTitle: string;
    tagline: string;
    intro: string;
    binLabel: string;
    accepted: string;
    rejected: string;
    note: string;
    source: string;
    lastVerified: string;
    print: string;
    backToGuide: string;
    languagePicker: string;
    skipToContent: string;
    legalNote: string;
    sourcesTitle: string;
    scanHint: string;
    quizNav: string;
    quizTitle: string;
    quizIntro: string;
    quizStart: string;
    quizPrompt: string;
    quizOf: string;
    quizCorrect: string;
    quizWrong: string;
    quizAnswerWas: string;
    quizNext: string;
    quizFinish: string;
    quizResultTitle: string;
    quizScoreSuffix: string;
    quizAgain: string;
    opensInNewTab: string;
    quizYes: string;
    quizNo: string;
    quizBelongPrompt: string;
  };
  fractions: Record<string, FractionStrings>;
}

const dictionaries: Record<string, Strings> = {
  nb: nb satisfies Strings,
  en: en satisfies Strings,
  uk: uk satisfies Strings,
  ar: ar satisfies Strings,
  es: es satisfies Strings,
  ti: ti satisfies Strings,
};

export function getStrings(locale: string): Strings {
  return dictionaries[locale] ?? dictionaries.nb;
}
