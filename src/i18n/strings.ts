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

export interface Strings {
  meta: { title: string; description: string; descriptionQuiz: string };
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
