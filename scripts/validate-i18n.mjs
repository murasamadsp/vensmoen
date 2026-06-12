// Build-time i18n-validator: sammenligner hver lokale mot nb (referanse).
// Faller (exit 1) hvis en lokale mangler en ui-/meta-nøkkel eller en
// fraksjon, eller har feil form. Kjøres i CI før build, slik at en glemt
// oversettelse aldri når produksjon som tom/undefined.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n');
const REFERENCE = 'nb';
const FRACTION_REQUIRED = ['name', 'bin', 'accepted', 'rejected'];

const load = (code) =>
  JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8'));

const codes = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

const ref = load(REFERENCE);
const errors = [];

for (const code of codes) {
  if (code === REFERENCE) continue;
  const loc = load(code);

  for (const key of Object.keys(ref.meta)) {
    if (typeof loc.meta?.[key] !== 'string' || !loc.meta[key].trim())
      errors.push(`[${code}] meta.${key} mangler eller er tom`);
  }

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

  // Hub-tekster (site.*) – alle nøkler fra referansen må finnes og være satt.
  for (const key of Object.keys(ref.site)) {
    if (typeof loc.site?.[key] !== 'string' || !loc.site[key].trim())
      errors.push(`[${code}] site.${key} mangler eller er tom`);
  }

  // Infosider (pages.*) – samme sider, samme antall blokker som referansen.
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
      // body er valgfri, men ref og lokale må være enige (plassholder-logikk)
      const refHasBody = typeof refBlock.body === 'string';
      const locHasBody = typeof b?.body === 'string' && b.body.trim();
      if (refHasBody && !locHasBody)
        errors.push(`[${code}] pages.${pageKey}.blocks[${i}].body mangler`);
    });
  }

  // Om-siden har ekstra struktur: kontakter og transport. E-postadressene
  // er fakta og må være identiske med referansen i alle språk.
  for (const key of [
    'contactsTitle',
    'contactsIntro',
    'transportTitle',
    'transportIntro',
  ]) {
    if (typeof loc.pages?.om?.[key] !== 'string' || !loc.pages.om[key].trim())
      errors.push(`[${code}] pages.om.${key} mangler eller er tom`);
  }
  const refContacts = ref.pages.om.contacts ?? [];
  const locContacts = loc.pages?.om?.contacts ?? [];
  if (locContacts.length !== refContacts.length) {
    errors.push(
      `[${code}] pages.om.contacts: ${locContacts.length} kontakter, forventet ${refContacts.length}`,
    );
  } else {
    refContacts.forEach((refContact, i) => {
      const c = locContacts[i];
      for (const field of ['role', 'desc']) {
        if (typeof c?.[field] !== 'string' || !c[field].trim())
          errors.push(`[${code}] pages.om.contacts[${i}].${field} ugyldig`);
      }
      if (c?.email !== refContact.email)
        errors.push(
          `[${code}] pages.om.contacts[${i}].email avviker fra ${REFERENCE}`,
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
  `i18n OK: ${codes.length} lokaler, alle ui/meta/site/pages/fraksjon-nøkler synkronisert mot ${REFERENCE}.`,
);
