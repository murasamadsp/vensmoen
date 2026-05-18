// Språkuavhengige metadata for hver avfallsfraksjon.
// Oversettbar tekst (navn, ja/nei-lister, merknad) ligger i src/i18n/<locale>.json.
// Kilde er verifisert mot Iris Salten (operatør i Saltdal) + sortere.no (nasjonal standard).

export interface SourceRef {
  label: string;
  url: string;
}

export interface Fraction {
  id: string;
  /** Hex-farge for fargeprikk/kant – knyttet til dunk/pose */
  binColor: string;
  /** Lesbar tekstfarge over binColor */
  onBin: string;
  /** Er dette en av hovedfraksjonene som sorteres hjemme? */
  home: boolean;
  sources: SourceRef[];
  /** ISO-dato da innholdet sist ble verifisert mot kilden */
  lastVerified: string;
}

const IRIS = (slug: string): SourceRef => ({
  label: 'iris-salten.no',
  url: `https://www.iris-salten.no/privat/sorteringsguide/${slug}/`,
});

const SORTERE: SourceRef = { label: 'sortere.no', url: 'https://sortere.no/' };

const VERIFIED = '2026-05-18';

export const fractions: Fraction[] = [
  {
    id: 'matavfall',
    binColor: '#2f7d3b',
    onBin: '#ffffff',
    home: true,
    sources: [IRIS('matavfall'), SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'papir',
    binColor: '#1f5fa8',
    onBin: '#ffffff',
    home: true,
    sources: [IRIS('papp-papir-og-kartong'), SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'plast',
    binColor: '#d98a00',
    onBin: '#1a1a1a',
    home: true,
    sources: [IRIS('plastemballasje'), SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'glassmetall',
    binColor: '#8a6a3a',
    onBin: '#ffffff',
    home: true,
    sources: [
      { label: 'iris-salten.no (glass)', url: 'https://www.iris-salten.no/privat/sorteringsguide/glassemballasje/' },
      { label: 'iris-salten.no (metall)', url: 'https://www.iris-salten.no/privat/sorteringsguide/metallemballasje-2/' },
      SORTERE,
    ],
    lastVerified: VERIFIED,
  },
  {
    id: 'restavfall',
    binColor: '#4a4a4a',
    onBin: '#ffffff',
    home: true,
    sources: [IRIS('restavfall'), SORTERE],
    lastVerified: VERIFIED,
  },
  {
    id: 'farlig',
    binColor: '#c0392b',
    onBin: '#ffffff',
    home: false,
    sources: [IRIS('farlig-avfall'), SORTERE],
    lastVerified: VERIFIED,
  },
];

export const homeFractions = fractions.filter((f) => f.home);
