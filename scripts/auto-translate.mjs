#!/usr/bin/env node
// Auto-oversettelse av i18n-felt mellom språk.
// Providere:  google (gratis, ingen nøkkel)  |  claude (API-nøkkel, beste kvalitet)
//
// Moduser:
//   --fill-todo                fyll alle "[TODO] <nb-tekst>" ved å oversette nb→lokale
//   --source <l> --paths a.b   oversett gitte dot-stier fra kildespråk til de andre
//   --base <sha>               CI: diff base..HEAD, propager endrede felt til andre språk
// Flagg:
//   --provider google|claude   (default: env TRANSLATE_PROVIDER || "google")
//   --model <id>               claude-modell (default "claude-sonnet-4-6"; IKKE haiku)
//   --dry                      skriv ikke filer, bare vis
//
// Eksempel test:  npm run translate -- --fill-todo --dry

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
// Google bruker "no" for norsk; resten matcher.
const GOOGLE_CODE = { nb: 'no', en: 'en', uk: 'uk', ar: 'ar', es: 'es', ti: 'ti' };
const LANG_NAME = {
  nb: 'Norwegian (Bokmål)',
  en: 'English',
  uk: 'Ukrainian',
  ar: 'Arabic',
  es: 'Spanish',
  ti: 'Tigrinya',
};

// ---- args -------------------------------------------------------------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const PROVIDER = val('--provider') || process.env.TRANSLATE_PROVIDER || 'google';
const MODEL = val('--model') || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const DRY = has('--dry');

// ---- json path helpers ------------------------------------------------
const readLocale = (code) => JSON.parse(fs.readFileSync(`${DIR}/${code}.json`, 'utf8'));
const writeLocale = (code, obj) =>
  fs.writeFileSync(`${DIR}/${code}.json`, `${JSON.stringify(obj, null, 2)}\n`);

function flatten(obj, prefix = '', out = {}) {
  if (typeof obj === 'string') {
    out[prefix] = obj;
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
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

// ---- providers --------------------------------------------------------
async function googleTranslate(text, from, to) {
  const sl = GOOGLE_CODE[from];
  const tl = GOOGLE_CODE[to];
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx` +
    `&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = await res.json();
  // data[0] = liste av [oversatt, original, ...]; sett sammen.
  return (data[0] || []).map((seg) => seg[0]).join('');
}

async function claudeTranslateBatch(map, from, to) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY mangler');
  const system =
    `You are a professional translator for a Norwegian refugee-reception ` +
    `info site. Translate the JSON VALUES from ${LANG_NAME[from]} to ${LANG_NAME[to]}. ` +
    `Keep keys identical. Preserve line breaks (\\n), bullet "•" characters, ` +
    `email addresses, phone numbers and proper nouns. Return ONLY a JSON object, no prose.`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: JSON.stringify(map) }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const txt = data.content?.[0]?.text ?? '{}';
  return JSON.parse(txt.replace(/^```json\n?|```$/g, '').trim());
}

// Oversett { path: text } fra ett språk til ett annet.
async function translateMap(map, from, to) {
  if (PROVIDER === 'claude') return claudeTranslateBatch(map, from, to);
  // google: én og én streng
  const out = {};
  for (const [path, text] of Object.entries(map)) {
    out[path] = await googleTranslate(text, from, to);
    await new Promise((r) => setTimeout(r, 250)); // vær snill mot gratis-endepunktet
  }
  return out;
}

// ---- modus: bygg jobb-liste { targetLocale: { path: sourceText, srcLocale } } ----
function jobsFillTodo() {
  // For hvert språk: verdier "[TODO] <nb-tekst>" → oversett nb-teksten til språket.
  const jobs = {};
  for (const code of LOCALES) {
    const flat = flatten(readLocale(code));
    for (const [path, v] of Object.entries(flat)) {
      const m = /^\[TODO\]\s?(.*)$/s.exec(v);
      if (m) (jobs[code] ||= { from: REFERENCE, map: {} }).map[path] = m[1];
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
  // Finn endrede string-stier per språk mellom base og HEAD.
  const changed = {}; // path -> { locale, value }
  for (const code of LOCALES) {
    let oldObj;
    try {
      oldObj = JSON.parse(execSync(`git show ${base}:${DIR}/${code}.json`).toString());
    } catch {
      oldObj = {};
    }
    const oldFlat = flatten(oldObj);
    const newFlat = flatten(readLocale(code));
    for (const [path, v] of Object.entries(newFlat)) {
      if (oldFlat[path] !== v && !/^\[TODO\]/.test(v)) {
        // Konflikt: prioriter referansespråket som kilde.
        if (!changed[path] || code === REFERENCE) changed[path] = { locale: code, value: v };
      }
    }
  }
  const jobs = {};
  for (const [path, { locale, value }] of Object.entries(changed)) {
    for (const code of LOCALES) {
      if (code === locale) continue;
      (jobs[code] ||= { from: locale, map: {} }).map[path] = value;
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
    console.error('Velg modus: --fill-todo | --source <l> --paths ... | --base <sha>');
    process.exit(1);
  }

  // --targets uk,ar : begrens til gitte mållokaler (ikke rør gode oversettelser).
  const onlyTargets = (val('--targets') || '').split(',').filter(Boolean);
  if (onlyTargets.length)
    for (const k of Object.keys(jobs)) if (!onlyTargets.includes(k)) delete jobs[k];

  const targets = Object.keys(jobs);
  if (!targets.length) {
    console.log('Ingenting å oversette.');
    return;
  }
  console.log(`Provider: ${PROVIDER}${PROVIDER === 'claude' ? ` (${MODEL})` : ''}${DRY ? ' [DRY]' : ''}`);

  for (const code of targets) {
    const { from, map } = jobs[code];
    const n = Object.keys(map).length;
    if (!n) continue;
    console.log(`\n→ ${code} (${n} felt, fra ${from})`);
    const translated = await translateMap(map, from, code);
    const obj = readLocale(code);
    for (const [path, text] of Object.entries(translated)) {
      console.log(`   ${path}\n     ${JSON.stringify(map[path])}\n  →  ${JSON.stringify(text)}`);
      if (!DRY) setPath(obj, path, text);
    }
    if (!DRY) writeLocale(code, obj);
  }
  console.log(DRY ? '\n[DRY] ingen filer skrevet.' : '\nFerdig.');
})().catch((e) => {
  console.error('FEIL:', e.message);
  process.exit(1);
});
