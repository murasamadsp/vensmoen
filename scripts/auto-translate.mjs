#!/usr/bin/env node
// Auto-oversettelse av i18n-felt via Claude (Anthropic API).
// Krever ANTHROPIC_API_KEY (med kreditt) i .env eller miljøet.
//
// Moduser:
//   --fill-todo                fyll alle "[TODO] <nb-tekst>" (oversetter nb→lokale)
//   --source <l> --paths a.b   oversett gitte dot-stier fra kildespråk til de andre
//   --base <sha>               diff base..HEAD → propager endrede felt til andre språk
// Flagg:
//   --targets uk,ar            begrens til gitte mållokaler (ikke rør resten)
//   --model <id>               claude-modell (default "claude-sonnet-4-6")
//   --dry                      vis forslag, skriv ikke filer
//
// Kjøres MANUELT, med gjennomsyn (--dry først). Bevisst IKKE koblet til deploy:
// auto-oversettelse skal aldri trigge ny auto-oversettelse (unngår drift-løkke).

import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Last inn .env hvis den finnes (API-nøkkel holdes lokalt, aldri i git/chat).
try {
  process.loadEnvFile('.env');
} catch {
  /* ingen .env – greit */
}

const DIR = 'src/i18n';
const LOCALES = ['nb', 'en', 'uk', 'ar', 'es', 'ti'];
const REFERENCE = 'nb';
const LANG_NAME = {
  nb: 'Norwegian (Bokmål)',
  en: 'English',
  uk: 'Ukrainian',
  ar: 'Arabic',
  es: 'Spanish',
  ti: 'Tigrinya',
};

// Statisk stilguide. Holdes identisk på tvers av kall → cache-bar prefiks.
// (Cacher først når prefikset > modellens minimum: Sonnet 4.6 = 1024 tok,
//  Haiku 4.5 = 4096. På små oppdateringer aktiveres ikke caching – det er ok.)
const STYLE_GUIDE = `You are a professional translator for the public information site of Vensmoen mottak, a Norwegian refugee reception centre. Readers are residents — asylum seekers and refugees, often with limited literacy.

Translate faithfully: convey the exact meaning, never add, drop or "improve" information. Use natural, clear phrasing in the target language, matching the source's plain, respectful public-sector tone; prefer common everyday words over rare synonyms, and address the reader directly with the standard polite form.

CRITICAL — script integrity: Every word in your output must use a single writing system. Never mix Latin and Cyrillic (or any two scripts) within the same word. Writing a hybrid like "мотtak" or "мотТak" is a critical error with zero tolerance.

Preserve exactly: all HTML tags and their structure — never add, remove or alter any tag, attribute or entity; translate only the plain-text content between tags. Also preserve email addresses, phone numbers, URLs and digits unchanged.

Proper nouns — never translate or transliterate: Vensmoen, Saltdal, Røkland, UDI, NAV, Mental Helse, sortere.no, and all personal names.

The word "mottak" and all its Norwegian grammatical forms (mottaket, mottaks, mottakets, asylmottaket, asylmottaks, asylmottak) must never be partially transliterated. When translating to non-Norwegian languages, use the natural target-language equivalent: "the reception centre" (English), "центр прийому" (Ukrainian), "el centro de acogida" (Spanish), "مركز الاستقبال" (Arabic), "ማቀባበያ ማዕከል" (Tigrinya). Never write "mottak" or any hybrid — always use the full target-language phrase.`;

// ---- args -------------------------------------------------------------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const MODEL = val('--model') || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const DRY = has('--dry');

// ---- json path helpers ------------------------------------------------
const readLocale = (code) =>
  JSON.parse(fs.readFileSync(`${DIR}/${code}.json`, 'utf8'));
const writeLocale = (code, obj) =>
  fs.writeFileSync(`${DIR}/${code}.json`, `${JSON.stringify(obj, null, 2)}\n`);

function flatten(obj, prefix = '', out = {}) {
  if (typeof obj === 'string') {
    out[prefix] = obj;
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      flatten(v, `${prefix}[${i}]`, out);
    });
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj))
      flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

// dot path med [i] for arrays
function setPath(root, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
  node[parts[parts.length - 1]] = value;
}
function getPath(root, path) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let node = root;
  for (const p of parts) node = node?.[p];
  return node;
}

// ---- Claude -----------------------------------------------------------
async function claudeTranslateBatch(map, from, to) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY mangler (.env i fork-mappa)');
  const userMsg =
    `Translate these values from ${LANG_NAME[from]} to ${LANG_NAME[to]}:\n\n` +
    JSON.stringify(map);
  // Structured outputs: tving gyldig JSON med nøyaktig samme nøkler (stiene).
  // SO krever additionalProperties:false + eksplisitte properties, så schema
  // bygges per kall fra nøklene i map.
  const properties = {};
  for (const k of Object.keys(map)) properties[k] = { type: 'string' };
  const schema = {
    type: 'object',
    properties,
    required: Object.keys(map),
    additionalProperties: false,
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      // Stilguiden som cache-bar prefiks. (NB: structured outputs-schema varierer
      // per kall → cachen invalideres uansett; men prefikset er < 1024 tok her,
      // så caching er likevel inaktiv. cache_control beholdes ufarlig.)
      system: [
        {
          type: 'text',
          text: STYLE_GUIDE,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMsg }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.stop_reason === 'refusal')
    throw new Error('Claude nektet forespørselen (refusal)');
  if (data.stop_reason === 'max_tokens')
    throw new Error('Svar avkuttet (øk max_tokens)');
  const u = data.usage || {};
  if (u.cache_creation_input_tokens || u.cache_read_input_tokens) {
    console.log(
      `     [cache: skrevet ${u.cache_creation_input_tokens || 0}, lest ${u.cache_read_input_tokens || 0} tok]`,
    );
  }
  // Structured outputs garanterer gyldig JSON → parse direkte.
  return JSON.parse(data.content?.[0]?.text ?? '{}');
}

// Oversett { path: text } fra ett språk til ett annet.
async function translateMap(map, from, to) {
  return claudeTranslateBatch(map, from, to);
}

// ---- modus: bygg jobb-liste { targetLocale: { from, map } } -----------
function jobsFillTodo() {
  // For hvert språk: verdier "[TODO] <nb-tekst>" → oversett nb-teksten til språket.
  const jobs = {};
  for (const code of LOCALES) {
    const flat = flatten(readLocale(code));
    for (const [path, v] of Object.entries(flat)) {
      const m = /^\[TODO\]\s?(.*)$/s.exec(v);
      if (m) {
        jobs[code] ||= { from: REFERENCE, map: {} };
        jobs[code].map[path] = m[1];
      }
    }
  }
  return jobs;
}

function jobsSourcePaths() {
  const src = val('--source');
  const paths = (val('--paths') || '').split(',').filter(Boolean);
  if (!src || !paths.length) throw new Error('--source og --paths kreves');
  const srcObj = readLocale(src);
  const jobs = {};
  for (const code of LOCALES) {
    if (code === src) continue;
    jobs[code] = { from: src, map: {} };
    for (const p of paths) jobs[code].map[p] = getPath(srcObj, p);
  }
  return jobs;
}

function jobsDiff() {
  const base = val('--base');
  if (!base) throw new Error('--base <sha> kreves');

  // Підрахунок: скільки мов змінило кожен path і яке значення кожна мова має.
  // { path → { locales: { code → value }, nbValue? } }
  const changedBy = {}; // path → Map<locale, newValue>
  for (const code of LOCALES) {
    let oldObj;
    try {
      oldObj = JSON.parse(
        execSync(`git show ${base}:${DIR}/${code}.json`).toString(),
      );
    } catch {
      oldObj = {};
    }
    const oldFlat = flatten(oldObj);
    const newFlat = flatten(readLocale(code));
    for (const [path, v] of Object.entries(newFlat)) {
      if (oldFlat[path] !== v && !/^\[TODO\]/.test(v)) {
        changedBy[path] ||= {};
        changedBy[path][code] = v;
      }
    }
  }

  // Масова програмна міграція: якщо ≥ (N-1) мов змінили той самий path —
  // це форматна/структурна зміна (plain-text→HTML тощо), не CMS-правка.
  // Такі path пропускаємо — перезапис коректних перекладів неприпустимий.
  const MASS_THRESHOLD = LOCALES.length - 1; // 5 з 6 або більше

  const jobs = {};
  for (const [path, localeMap] of Object.entries(changedBy)) {
    const changedLocales = Object.keys(localeMap);
    if (changedLocales.length >= MASS_THRESHOLD) {
      console.log(
        `  [skip] ${path} — ${changedLocales.length}/${LOCALES.length} мов (масова міграція)`,
      );
      continue;
    }

    // CMS-сценарій: визначаємо джерело.
    // Якщо тільки одна мова — вона і є джерелом.
    // Якщо кілька (рідкісний ручний випадок) — nb як резервне, інакше перша.
    let srcLocale;
    if (changedLocales.length === 1) {
      srcLocale = changedLocales[0];
    } else if (changedLocales.includes(REFERENCE)) {
      srcLocale = REFERENCE;
    } else {
      srcLocale = changedLocales[0];
    }
    const srcValue = localeMap[srcLocale];

    for (const code of LOCALES) {
      if (code === srcLocale) continue;
      // nb — еталон, ніколи не перезаписуємо перекладом з інших мов
      if (code === REFERENCE && srcLocale !== REFERENCE) continue;
      jobs[code] ||= { from: srcLocale, map: {} };
      jobs[code].map[path] = srcValue;
    }
  }
  return jobs;
}

// ---- main -------------------------------------------------------------
(async () => {
  let jobs;
  if (has('--fill-todo')) jobs = jobsFillTodo();
  else if (has('--source')) jobs = jobsSourcePaths();
  else if (has('--base')) jobs = jobsDiff();
  else {
    console.error(
      'Velg modus: --fill-todo | --source <l> --paths ... | --base <sha>',
    );
    process.exit(1);
  }

  // --targets uk,ar : begrens til gitte mållokaler (ikke rør gode oversettelser).
  const onlyTargets = (val('--targets') || '').split(',').filter(Boolean);
  if (onlyTargets.length)
    for (const k of Object.keys(jobs))
      if (!onlyTargets.includes(k)) delete jobs[k];

  const targets = Object.keys(jobs);
  if (!targets.length) {
    console.log('Ingenting å oversette.');
    return;
  }
  console.log(`Modell: ${MODEL}${DRY ? ' [DRY]' : ''}`);

  for (const code of targets) {
    const { from, map } = jobs[code];
    const n = Object.keys(map).length;
    if (!n) continue;
    console.log(`\n→ ${code} (${n} felt, fra ${from})`);
    const translated = await translateMap(map, from, code);
    const obj = readLocale(code);
    for (const [path, text] of Object.entries(translated)) {
      console.log(
        `   ${path}\n     ${JSON.stringify(map[path])}\n  →  ${JSON.stringify(text)}`,
      );
      if (!DRY) setPath(obj, path, text);
    }
    if (!DRY) writeLocale(code, obj);
  }
  console.log(DRY ? '\n[DRY] ingen filer skrevet.' : '\nFerdig.');
})().catch((e) => {
  console.error('FEIL:', e.message);
  process.exit(1);
});
