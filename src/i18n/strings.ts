import nb from './nb.json';
import en from './en.json';
import uk from './uk.json';
import ar from './ar.json';
import es from './es.json';

export interface FractionStrings {
  name: string;
  /** Hvor det skal: dunk/pose – det viktigste for en nybegynner */
  bin: string;
  accepted: string[];
  rejected: string[];
  note?: string;
}

export interface Strings {
  meta: { title: string; description: string };
  ui: {
    siteTitle: string;
    tagline: string;
    intro: string;
    binLabel: string;
    accepted: string;
    rejected: string;
    note: string;
    farligTag: string;
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
  };
  fractions: Record<string, FractionStrings>;
}

const dictionaries: Record<string, Strings> = {
  nb: nb as Strings,
  en: en as Strings,
  uk: uk as Strings,
  ar: ar as Strings,
  es: es as Strings,
};

export function getStrings(locale: string): Strings {
  return dictionaries[locale] ?? dictionaries.nb;
}
