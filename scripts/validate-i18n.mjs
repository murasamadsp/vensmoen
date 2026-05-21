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
}

if (errors.length) {
  console.error(`i18n-validering FEILET (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `i18n OK: ${codes.length} lokaler, alle ui/meta/fraksjon-nøkler synkronisert mot ${REFERENCE}.`,
);
