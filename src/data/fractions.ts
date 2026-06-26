// Мовонезалежні метадані для кожної фракції відходів.
// Перекладний текст (назва, списки так/ні, примітка) лежить у src/i18n/<locale>.json.
// Джерело звірене з національним стандартом sortere.no.
import settings from './site-settings.json';

export interface SourceRef {
  label: string;
  url: string;
}

export interface Fraction {
  id: string;
  /** Hex-колір для кольорової мітки/рамки – прив'язаний до бака/пакета */
  binColor: string;
  /** Читабельний колір тексту поверх binColor */
  onBin: string;
  /** Чи це одна з основних фракцій, які сортуються вдома? */
  home: boolean;
  sources: SourceRef[];
  /** ISO-дата останньої звірки контенту з джерелом */
  lastVerified: string;
}

const SORTERE: SourceRef = { label: 'sortere.no', url: 'https://sortere.no/' };

const VERIFIED = settings.wasteLastVerified;

export const fractions: Fraction[] = [
  {
    id: 'matavfall',
    binColor: '#2f7d3b',
    onBin: '#ffffff',
    home: true,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'papir',
    binColor: '#1f5fa8',
    onBin: '#ffffff',
    home: true,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'plast',
    binColor: '#d98a00',
    onBin: '#1a1a1a',
    home: true,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'glassmetall',
    binColor: '#8a6a3a',
    onBin: '#ffffff',
    home: true,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'restavfall',
    binColor: '#4a4a4a',
    onBin: '#ffffff',
    home: true,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'farlig',
    binColor: '#c0392b',
    onBin: '#ffffff',
    home: false,
    sources: [SORTERE],
    lastVerified: VERIFIED,
  },
];

export const homeFractions = fractions.filter((f) => f.home);
