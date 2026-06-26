// Синхронізує файли перекладів з nb.json (референсом).
//
// Навіщо: коли мов кілька, легко забути новий ключ в одній із них,
// і тоді build падає (validate-i18n.mjs). Після `npm run sync:i18n` усі інші
// мови отримують:
//   - нові ключі зі значенням "[TODO] <норвезький текст>" (легко знайти пошуком)
//   - видалені ключі, яких більше немає в nb
// Наявні переклади завжди лишаються без змін.
//
// Використання: node scripts/sync-i18n.mjs          (записати зміни)
//               node scripts/sync-i18n.mjs --check  (помилка, якщо щось змінилось би)
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

// Поля, які є фактами, а не перекладом (email-адреси однакові в усіх мовах).
// validate-i18n вимагає точного збігу email з nb — не можна ставити [TODO].
const IDENTITY_FIELDS = new Set(['email']);

/**
 * Будує значення для мови, яке відповідає структурі референсу.
 * - string: лишити переклад, якщо він є, інакше "[TODO] <ref>"
 * - object: рекурсивно; ключі, яких немає в ref, видаляються
 * - array рядків: лишити за однакової довжини, інакше заповнити TODO
 * - array об'єктів: рекурсивно поелементно, обрізано до довжини ref
 */
const syncValue = (refVal, locVal) => {
  if (Array.isArray(refVal)) {
    const allStrings = refVal.every((x) => typeof x === 'string');
    if (allStrings) {
      // Зберігаємо наявні переклади поелементно; [TODO] лише для нових позицій.
      // Якщо locVal довший — зайві елементи автоматично зрізаються (ітерація по refVal).
      return refVal.map((s, i) => {
        const existing =
          Array.isArray(locVal) && i < locVal.length ? locVal[i] : undefined;
        if (typeof existing === 'string' && !existing.startsWith(TODO))
          return existing;
        return `${TODO}${s}`;
      });
    }
    return refVal.map((item, i) =>
      syncValue(item, Array.isArray(locVal) ? locVal[i] : undefined),
    );
  }

  if (isObject(refVal)) {
    const out = {};
    for (const key of Object.keys(refVal)) {
      if (IDENTITY_FIELDS.has(key)) {
        // Копіюємо як є — validate-i18n вимагає збігу з nb
        out[key] = refVal[key];
      } else {
        out[key] = syncValue(
          refVal[key],
          isObject(locVal) ? locVal[key] : undefined,
        );
      }
    }
    return out;
  }

  if (typeof refVal === 'string') {
    return typeof locVal === 'string' ? locVal : `${TODO}${refVal}`;
  }

  // number / boolean: лишаємо наявне, інакше беремо з референсу.
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
