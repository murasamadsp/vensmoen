// Build-time i18n-валідатор: порівнює кожну локаль з nb (референсом).
// Падає (exit 1), якщо локаль не має ui/meta-ключа або фракції, чи має
// неправильну форму. Запускається в CI до build, щоб забутий переклад
// ніколи не потрапив у production як порожній/undefined.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n');
const REFERENCE = 'nb';
const FRACTION_REQUIRED = ['name', 'bin', 'accepted', 'rejected', 'note'];

const load = (code) =>
  JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8'));

const codes = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

const ref = load(REFERENCE);
const errors = [];

// [TODO]-плейсхолдери не повинні потрапляти на прод — перевіряємо всі рядки.
function collectTodos(obj, path, out) {
  if (typeof obj === 'string') {
    if (obj.startsWith('[TODO]')) out.push(path);
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++)
      collectTodos(obj[i], `${path}[${i}]`, out);
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj))
      collectTodos(obj[k], path ? `${path}.${k}` : k, out);
  }
}

for (const code of codes) {
  if (code === REFERENCE) continue;
  const loc = load(code);

  for (const key of Object.keys(ref.ui)) {
    if (typeof loc.ui?.[key] !== 'string' || !loc.ui[key].trim())
      errors.push(`[${code}] ui.${key} mangler eller er tom`);
  }

  const refIds = Object.keys(ref.fractions);
  const locIds = Object.keys(loc.fractions ?? {});
  for (const id of refIds) {
    if (!loc.fractions?.[id]) {
      errors.push(`[${code}] fraksjon "${id}" mangler`);
      continue;
    }
    const fr = loc.fractions[id];
    for (const field of FRACTION_REQUIRED) {
      const val = fr[field];
      const ok =
        field === 'accepted' || field === 'rejected'
          ? Array.isArray(val) && val.length > 0
          : typeof val === 'string' && val.trim().length > 0;
      if (!ok) errors.push(`[${code}] fractions.${id}.${field} ugyldig`);
    }
  }
  for (const id of locIds)
    if (!refIds.includes(id))
      errors.push(`[${code}] ukjent fraksjon "${id}" (ikke i ${REFERENCE})`);

  // Тексти хабу (site.*) – усі ключі з референсу мають існувати й бути заповнені.
  for (const key of Object.keys(ref.site)) {
    if (typeof loc.site?.[key] !== 'string' || !loc.site[key].trim())
      errors.push(`[${code}] site.${key} mangler eller er tom`);
  }

  // Інфосторінки (pages.*) – ті самі сторінки й така сама кількість блоків, що в референсі.
  for (const pageKey of Object.keys(ref.pages)) {
    const refPage = ref.pages[pageKey];
    const locPage = loc.pages?.[pageKey];
    if (!locPage) {
      errors.push(`[${code}] pages.${pageKey} mangler`);
      continue;
    }
    for (const field of ['title', 'lead', 'cardDesc']) {
      if (typeof locPage[field] !== 'string' || !locPage[field].trim())
        errors.push(`[${code}] pages.${pageKey}.${field} mangler eller er tom`);
    }
    const refBlocks = refPage.blocks ?? [];
    const locBlocks = locPage.blocks ?? [];
    if (locBlocks.length !== refBlocks.length) {
      errors.push(
        `[${code}] pages.${pageKey}.blocks: ${locBlocks.length} blokker, forventet ${refBlocks.length}`,
      );
      continue;
    }
    refBlocks.forEach((refBlock, i) => {
      const b = locBlocks[i];
      if (typeof b?.heading !== 'string' || !b.heading.trim())
        errors.push(`[${code}] pages.${pageKey}.blocks[${i}].heading ugyldig`);
      // body опційний, але ref і локаль мають збігатися (логіка placeholder).
      const refHasBody = typeof refBlock.body === 'string';
      const locHasBody = typeof b?.body === 'string' && b.body.trim();
      if (refHasBody && !locHasBody)
        errors.push(`[${code}] pages.${pageKey}.blocks[${i}].body mangler`);
    });
  }

  // [TODO] у будь-якому рядку — блокує деплой (auto-translate не запустився або впав)
  const todos = [];
  collectTodos(loc, code, todos);
  for (const path of todos)
    errors.push(
      `[${code}] [TODO] плейсхолдер у ${path} — переклад не завершено`,
    );

  // Сторінка about має додаткову структуру: контакти й транспорт. E-mail —
  // це факти, тому мають бути ідентичні референсу в усіх мовах.
  for (const key of [
    'contactsTitle',
    'contactsIntro',
    'transportTitle',
    'transportIntro',
  ]) {
    if (
      typeof loc.pages?.about?.[key] !== 'string' ||
      !loc.pages.about[key].trim()
    )
      errors.push(`[${code}] pages.about.${key} mangler eller er tom`);
  }
  const refContacts = ref.pages.about.contacts ?? [];
  const locContacts = loc.pages?.about?.contacts ?? [];
  if (locContacts.length !== refContacts.length) {
    errors.push(
      `[${code}] pages.about.contacts: ${locContacts.length} kontakter, forventet ${refContacts.length}`,
    );
  } else {
    refContacts.forEach((refContact, i) => {
      const c = locContacts[i];
      for (const field of ['role']) {
        if (typeof c?.[field] !== 'string' || !c[field].trim())
          errors.push(`[${code}] pages.about.contacts[${i}].${field} ugyldig`);
      }
      if (c?.email !== refContact.email)
        errors.push(
          `[${code}] pages.about.contacts[${i}].email avviker fra ${REFERENCE}`,
        );
    });
  }
}

if (errors.length) {
  console.error(`i18n-validering FEILET (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `i18n OK: ${codes.length} lokaler, alle ui/site/pages/fraksjon-nøkler synkronisert mot ${REFERENCE}.`,
);
