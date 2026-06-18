// Generer Sveltia CMS-konfigurasjon automatisk fra nb.json.
//
// Hvorfor: i18n-tekstene har mange felt (meta, ui, sider, avfallstyper).
// I stedet for å vedlikeholde et stort CMS-skjema for hånd, leser vi
// strukturen fra referansespråket (nb.json) og bygger feltene rekursivt.
// Legger du til en nøkkel i nb.json og kjører `npm run gen:cms`, dukker
// feltet opp i redigeringsverktøyet automatisk.
//
// Output: public/admin/config.generated.json (lastes av public/admin/index.html)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nb = JSON.parse(
  readFileSync(join(root, 'src', 'i18n', 'nb.json'), 'utf8'),
);

// --- Innstillinger som ikke kan utledes fra dataene ------------------------
const REPO = 'murasamadsp/vensmoen';
const BRANCH = 'main';
const LOCALES = ['nb', 'en', 'uk', 'ar', 'es', 'ti'];
const DEFAULT_LOCALE = 'nb';
const LONG_TEXT = 70; // strenger lengre enn dette redigeres som tekstområde

// Vennlige etiketter for kjente grupper (resten utledes fra nøkkelnavnet).
const LABELS = {
  meta: 'SEO / metadata',
  site: 'Nettsted (navn, nødnumre, kart)',
  ui: 'Grensesnitt-tekster',
  pages: 'Sider',
  about: 'Om mottaket',
  rules: 'Husregler',
  guide: 'Praktisk guide',
  contacts: 'Kontaktpersoner',
  blocks: 'Tekstblokker',
  fractions: 'Avfallstyper',
};

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const humanize = (key) =>
  LABELS[key] ??
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

// Første streng-nøkkel i et objekt – brukes som sammendrag i lister.
const summaryKey = (obj) =>
  Object.keys(obj).find((k) => typeof obj[k] === 'string');

const buildField = (key, value) => {
  const base = { name: key, label: humanize(key), i18n: true };

  if (typeof value === 'string') {
    const long = value.length > LONG_TEXT || value.includes('\n');
    return { ...base, widget: long ? 'text' : 'string' };
  }
  if (typeof value === 'number') return { ...base, widget: 'number' };
  if (typeof value === 'boolean') return { ...base, widget: 'boolean' };

  if (Array.isArray(value)) {
    const first = value[0];
    if (isObject(first)) {
      const fields = buildFields(first);
      const sum = summaryKey(first);
      return {
        ...base,
        widget: 'list',
        collapsed: true,
        ...(sum ? { summary: `{{fields.${sum}}}` } : {}),
        fields,
      };
    }
    // liste av enkle strenger (f.eks. "Ja takk"/"Nei takk")
    return {
      ...base,
      widget: 'list',
      field: { name: 'item', label: 'Linje', widget: 'string', i18n: true },
    };
  }

  if (isObject(value)) {
    return {
      ...base,
      widget: 'object',
      collapsed: true,
      fields: buildFields(value),
    };
  }

  return { ...base, widget: 'string' };
};

const buildFields = (obj) =>
  Object.keys(obj).map((key) => buildField(key, obj[key]));

const config = {
  // Vi sender konfig direkte via CMS.init(); ikke prøv å hente config.yml.
  load_config_file: false,
  backend: {
    name: 'github',
    repo: REPO,
    branch: BRANCH,
    // Kun innlogging med personlig token (PAT). Ingen OAuth-app,
    // ingen server/worker. Redaktøren limer inn et GitHub-token én gang.
    auth_methods: ['token'],
  },
  // Tekstnettsted uten mediebibliotek, men Decap/Sveltia krever feltene.
  media_folder: 'public/uploads',
  public_folder: '/vensmoen/uploads',
  i18n: {
    structure: 'multiple_files',
    locales: LOCALES,
    default_locale: DEFAULT_LOCALE,
  },
  collections: [
    {
      name: 'i18n',
      label: 'Tekster',
      i18n: true,
      files: [
        {
          name: 'strings',
          label: 'Nettstedstekster (alle språk)',
          file: 'src/i18n/{{locale}}.json',
          i18n: true,
          fields: buildFields(nb),
        },
      ],
    },
  ],
};

const out = join(root, 'public', 'admin', 'config.generated.json');
writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`);
console.log(`✓ CMS-konfig generert: public/admin/config.generated.json`);
console.log(
  `  ${buildFields(nb).length} toppfelt, språk: ${LOCALES.join(', ')}`,
);
