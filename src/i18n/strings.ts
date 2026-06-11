import ar from './ar.json';
import en from './en.json';
import es from './es.json';
import nb from './nb.json';
import ti from './ti.json';
import uk from './uk.json';

export interface FractionStrings {
  name: string;
  /** Hvor det skal: dunk/pose – det viktigste for en nybegynner */
  bin: string;
  accepted: string[];
  rejected: string[];
  note?: string;
}

export interface PageBlock {
  heading: string;
  /** Uten body viser siden ui-teksten site.comingSoon (ærlig plassholder). */
  body?: string;
}

export interface PageStrings {
  title: string;
  lead: string;
  /** Kort kortbeskrivelse til huben – 3–4 ord, deterministisk høyde. */
  cardDesc: string;
  blocks: PageBlock[];
}

/** Sidenøkler = URL-segmenter (samme på alle språk, kun locale varierer). */
export type PageKey = 'om' | 'regler' | 'guide';

/** Tekster for mottaks-huben (forsiden + infosidene). */
export interface SiteStrings {
  title: string;
  description: string;
  name: string;
  tagline: string;
  intro: string;
  sectionsLabel: string;
  backHome: string;
  comingSoon: string;
  mapTitle: string;
  emergencyTitle: string;
  emergencyNote: string;
  emergencyFire: string;
  emergencyPolice: string;
  emergencyAmbulance: string;
  emergencyDoctor: string;
}

export interface Strings {
  meta: { title: string; description: string; descriptionQuiz: string };
  site: SiteStrings;
  pages: Record<PageKey, PageStrings>;
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
