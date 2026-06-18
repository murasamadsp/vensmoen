// Synkroniser oversettelsesfiler mot nb.json (referanse).
//
// Hvorfor: med flere språk er det lett å glemme en ny nøkkel i ett av dem,
// og da faller build (validate-i18n.mjs). Dette skriptet gjør at du kun
// trenger å redigere nb.json. Kjør så `npm run sync:i18n`, og alle andre
// språk får:
//   - nye nøkler fylt med "[TODO] <norsk tekst>" (lett å finne med søk)
//   - fjernet nøkler som ikke lenger finnes i nb
// Eksisterende oversettelser beholdes alltid uendret.
//
// Bruk:  node scripts/sync-i18n.mjs            (skriv endringer)
//        node scripts/sync-i18n.mjs --check    (feil hvis noe ville endres)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n');
const REFERENCE = 'nb';
const TODO = '[TODO] ';

const checkOnly = process.argv.includes('--check');

const load = (code) =>
  JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8'));

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Bygg en verdi for et språk som matcher referansens struktur.
 * - string:  behold oversettelsen hvis den finnes, ellers "[TODO] <ref>"
 * - object:  rekursivt; nøkler som ikke finnes i ref blir fjernet (prune)
 * - array av strenger:  behold hvis lik lengde, ellers fyll hver med TODO
 * - array av objekter:  rekursivt element for element, kuttet til ref-lengde
 */
const syncValue = (refVal, locVal) => {
  if (Array.isArray(refVal)) {
    const allStrings = refVal.every((x) => typeof x === 'string');
    if (allStrings) {
      if (Array.isArray(locVal) && locVal.length === refVal.length)
        return locVal;
      return refVal.map((s) => `${TODO}${s}`);
    }
    return refVal.map((item, i) =>
      syncValue(item, Array.isArray(locVal) ? locVal[i] : undefined),
    );
  }

  if (isObject(refVal)) {
    const out = {};
    for (const key of Object.keys(refVal)) {
      out[key] = syncValue(
        refVal[key],
        isObject(locVal) ? locVal[key] : undefined,
      );
    }
    return out;
  }

  if (typeof refVal === 'string') {
    return typeof locVal === 'string' ? locVal : `${TODO}${refVal}`;
  }

  // tall / boolean: behold eksisterende, ellers ta fra referansen
  return locVal !== undefined ? locVal : refVal;
};

const ref = load(REFERENCE);
const codes = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .filter((c) => c !== REFERENCE);

let changed = 0;
for (const code of codes) {
  const before = JSON.stringify(load(code));
  const synced = syncValue(ref, load(code));
  const after = `${JSON.stringify(synced, null, 2)}\n`;

  if (after.trim() === before.trim()) continue;
  changed++;

  if (checkOnly) {
    console.error(`✗ ${code}.json er ikke synkronisert med ${REFERENCE}.json`);
  } else {
    writeFileSync(join(dir, `${code}.json`), after);
    console.log(`✓ ${code}.json synkronisert`);
  }
}

if (checkOnly && changed > 0) {
  console.error(
    '\nKjør `npm run sync:i18n` og oversett strengene merket [TODO].',
  );
  process.exit(1);
}
if (changed === 0)
  console.log('Alle språk er allerede synkronisert med nb.json.');
