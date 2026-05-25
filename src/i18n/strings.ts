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
    // WikiHub navigation
    wikiHubTitle: string;
    wikiHubSubtitle: string;
    modules: string;
    searchPlaceholder: string;
    quickLinks: string;
    // Module names (display names for navigation)
    moduleFractions: string;
    moduleHealth: string;
    moduleLegal: string;
    moduleEducation: string;
    moduleCamp: string;
    // Generic article UI
    readMore: string;
    lastUpdated: string;
    relatedArticles: string;
    faqTitle: string;
    resourcesTitle: string;
  };
  fractions: Record<string, FractionStrings>;
  // Modular content namespaces (populated per module)
  health?: {
    articles: Record<string, ArticleStrings>;
    faqs?: Array<{ q: string; a: string }>;
  };
  legal?: {
    articles: Record<string, ArticleStrings>;
    faqs?: Array<{ q: string; a: string }>;
  };
  education?: {
    articles: Record<string, ArticleStrings>;
    faqs?: Array<{ q: string; a: string }>;
  };
  camp?: {
    articles: Record<string, ArticleStrings>;
    faqs?: Array<{ q: string; a: string }>;
  };
}

export interface ArticleStrings {
  title: string;
  excerpt?: string;
  content?: string;
  note?: string;
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
