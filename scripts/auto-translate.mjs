#!/usr/bin/env node
// Авто-переклад i18n-полів через Anthropic, DeepSeek або Google Translate.
// API-ключі читаються з локального .env або GitHub Secrets у CI.
//
// Режими:
//   --fill-todo                заповнити всі "[TODO] <nb-текст>" (переклад nb→локаль)
//   --source <l> --paths a.b   перекласти задані dot-шляхи з мови-джерела в інші
//   --base <sha>               diff base..HEAD → поширити змінені поля в інші мови
// Прапорці:
//   --targets uk,ar            обмежити цільові локалі (не чіпати решту)
//   --provider <id>            anthropic | deepseek | google
//   --model <id>               основна модель
//   --fallback-provider <id>   резервний провайдер при помилці
//   --fallback-model <id>      резервна модель при помилці
//   --dry                      показати пропозиції, не писати файли
//   --health-check             малий API-тест без запису файлів
//
// Для ручного запуску бажано спочатку --dry. У CI скрипт викликається
// лише з workflow, де bot-push не запускає новий workflow і не створює цикл.

import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Завантажуємо .env, якщо він є (API-ключ локальний, ніколи не в git/chat).
try {
  process.loadEnvFile('.env');
} catch {
  /* .env немає – нормально */
}

const DIR = 'src/i18n';
const LOCALES = ['nb', 'en', 'uk', 'ar', 'es', 'ti', 'tr'];
const REFERENCE = 'nb';
const LANG_NAME = {
  nb: 'Norwegian (Bokmål)',
  en: 'English',
  uk: 'Ukrainian',
  ar: 'Arabic',
  es: 'Spanish',
  ti: 'Tigrinya',
  tr: 'Turkish',
};

// Статичний style guide. Однаковий між викликами → cacheable prefix.
// Кеш реально вмикається лише коли префікс більший за мінімум моделі; для
// малих правок може не активуватися, і це нормально.
const STYLE_GUIDE = `You are a professional translator for the public information site of Vensmoen mottak, a Norwegian refugee reception centre. Readers are residents — asylum seekers and refugees, often with limited literacy.

Translate faithfully: convey the exact meaning, never add, drop or "improve" information. Use natural, clear phrasing in the target language, matching the source's plain, respectful public-sector tone; prefer common everyday words over rare synonyms, and address the reader directly with the standard polite form.

CRITICAL — script integrity: Every word in your output must use a single writing system. Never mix Latin and Cyrillic (or any two scripts) within the same word. Writing a hybrid like "мотtak" or "мотТak" is a critical error with zero tolerance.

Preserve exactly: all HTML tags and their structure — never add, remove or alter any tag, attribute or entity; translate only the plain-text content between tags. Also preserve email addresses, phone numbers, URLs and digits unchanged.

Proper nouns — never translate or transliterate: Vensmoen, Saltdal, Røkland, UDI, NAV, Mental Helse, sortere.no, and all personal names.

The word "mottak" and all its Norwegian grammatical forms (mottaket, mottaks, mottakets, asylmottaket, asylmottaks, asylmottak) must never be partially transliterated. When translating to non-Norwegian languages, use the natural target-language equivalent: "the reception centre" (English), "центр прийому" (Ukrainian), "el centro de acogida" (Spanish), "مركز الاستقبال" (Arabic), "ማቀባበያ ማዕከል" (Tigrinya), "kabul merkezi" (Turkish). Never write "mottak" or any hybrid — always use the full target-language phrase.`;

// ---- args -------------------------------------------------------------
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const PROVIDER =
  val('--provider') || process.env.TRANSLATE_PROVIDER || 'anthropic';
const DEFAULT_MODEL = {
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-v4-flash',
  google: 'nmt',
};
const PRIMARY_MODEL =
  val('--model') ||
  process.env.TRANSLATE_MODEL ||
  process.env.CLAUDE_MODEL ||
  DEFAULT_MODEL[PROVIDER] ||
  '';
const FALLBACK_PROVIDER =
  val('--fallback-provider') || process.env.TRANSLATE_FALLBACK_PROVIDER || '';
const FALLBACK_MODEL =
  val('--fallback-model') || process.env.TRANSLATE_FALLBACK_MODEL || '';
const DRY = has('--dry');
const HEALTH_CHECK = has('--health-check');
const FIXED_SOURCE = process.env.TRANSLATE_SOURCE_LOCALE || '';
const STRICT_SOURCE = process.env.TRANSLATE_STRICT_SOURCE === '1';
const TIMEOUT_MS = Number(process.env.TRANSLATE_TIMEOUT_MS || 60000);
const RETRIES = Number(process.env.TRANSLATE_RETRIES || 2);

// ---- helpers для JSON-шляхів ------------------------------------------
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

// Dot-шлях з [i] для масивів.
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

function jsonSchemaFor(map) {
  const properties = {};
  for (const k of Object.keys(map)) properties[k] = { type: 'string' };
  return {
    type: 'object',
    properties,
    required: Object.keys(map),
    additionalProperties: false,
  };
}

function parseJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Провайдер не повернув JSON');
    return JSON.parse(match[0]);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

function formatApiFailure(provider, model, status, text) {
  const raw = `${text || ''}`.slice(0, 2000);
  const lower = raw.toLowerCase();
  const modelProblem =
    lower.includes('model') &&
    (lower.includes('not found') ||
      lower.includes('not_found') ||
      lower.includes('does not exist') ||
      lower.includes('deprecated') ||
      lower.includes('unavailable') ||
      lower.includes('invalid'));

  if (modelProblem || [400, 404, 410].includes(status)) {
    return [
      `Модель ${provider}/${model} недоступна або більше не підтримується.`,
      'Що зробити: GitHub → Settings → Secrets and variables → Actions → Variables.',
      'Оновіть TRANSLATE_PROVIDER/TRANSLATE_MODEL або задайте TRANSLATE_FALLBACK_PROVIDER/TRANSLATE_FALLBACK_MODEL.',
      `Відповідь API: ${raw}`,
    ].join('\n');
  }

  if (status === 401 || status === 403) {
    return [
      `Ключ для ${provider} відсутній, неправильний або без доступу до моделі ${model}.`,
      'Що зробити: GitHub → Settings → Secrets and variables → Actions → Secrets.',
      `Перевірте ${providerKey(provider)} і доступ акаунта до моделі.`,
      `Відповідь API: ${raw}`,
    ].join('\n');
  }

  if (status === 402 || lower.includes('credit') || lower.includes('billing')) {
    return [
      `У ${provider} проблема з оплатою або кредитами.`,
      'Що зробити: поповніть баланс провайдера або тимчасово перемкніть TRANSLATE_PROVIDER на інший.',
      `Відповідь API: ${raw}`,
    ].join('\n');
  }

  if (status === 429) {
    return [
      `${provider} повернув rate limit для моделі ${model}.`,
      'Що зробити: зачекайте і перезапустіть workflow або зменшіть частоту правок.',
      `Відповідь API: ${raw}`,
    ].join('\n');
  }

  if (status >= 500) {
    return [
      `${provider} тимчасово недоступний.`,
      'Що зробити: перезапустіть workflow пізніше або перемкніть fallback provider.',
      `Відповідь API: ${raw}`,
    ].join('\n');
  }

  return `${provider} ${status}: ${raw}`;
}

async function fetchJson(url, options, context) {
  const { provider, model } =
    typeof context === 'string'
      ? { provider: context, model: '' }
      : { provider: context.provider, model: context.model };
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const text = await res.text();
      if (!res.ok) {
        const message = formatApiFailure(provider, model, res.status, text);
        if (attempt < RETRIES && isRetryableStatus(res.status)) {
          lastError = new Error(message);
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        throw new Error(message);
      }
      return text ? JSON.parse(text) : {};
    } catch (error) {
      lastError =
        error?.name === 'AbortError'
          ? new Error(
              `${provider} не відповів за ${TIMEOUT_MS} ms. Що зробити: збільште TRANSLATE_TIMEOUT_MS або задайте fallback provider.`,
            )
          : error;
      if (attempt >= RETRIES) break;
      await sleep(1000 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(Number.parseInt(n, 16)),
    );
}

function assertTranslationShape(source, translated, provider, from, to) {
  const expected = Object.keys(source).sort();
  const actual = Object.keys(translated || {}).sort();
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k));
  const badTypes = expected.filter((k) => typeof translated?.[k] !== 'string');
  const empty = expected.filter(
    (k) => typeof translated?.[k] === 'string' && !translated[k].trim(),
  );

  if (missing.length || extra.length || badTypes.length || empty.length) {
    throw new Error(
      [
        `${provider} повернув невалідний переклад ${from}->${to}`,
        missing.length ? `немає: ${missing.join(', ')}` : '',
        extra.length ? `зайві: ${extra.join(', ')}` : '',
        badTypes.length ? `не string: ${badTypes.join(', ')}` : '',
        empty.length ? `порожні: ${empty.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; '),
    );
  }
}

function providerKey(provider) {
  return {
    anthropic: 'ANTHROPIC_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    google: 'GOOGLE_TRANSLATE_API_KEY',
  }[provider];
}

function requireProvider(provider, model) {
  if (!['anthropic', 'deepseek', 'google'].includes(provider))
    throw new Error(
      `Ukjent TRANSLATE_PROVIDER "${provider}" (anthropic, deepseek, google)`,
    );
  if (!model) throw new Error(`TRANSLATE_MODEL не заданий для ${provider}`);
  const keyName = providerKey(provider);
  if (!process.env[keyName])
    throw new Error(`${keyName} не заданий (.env локально або GitHub Secret)`);
}

function validateRuntimeConfig() {
  requireProvider(PROVIDER, PRIMARY_MODEL);
  if (FALLBACK_PROVIDER || FALLBACK_MODEL) {
    const nextProvider = FALLBACK_PROVIDER || PROVIDER;
    const nextModel = FALLBACK_MODEL || DEFAULT_MODEL[nextProvider];
    requireProvider(nextProvider, nextModel);
  }
}

// ---- провайдери --------------------------------------------------------
async function anthropicTranslateBatch(map, from, to, model) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    throw new Error(
      'ANTHROPIC_API_KEY не заданий (.env локально або GitHub Secret)',
    );
  const userMsg =
    `Translate these values from ${LANG_NAME[from]} to ${LANG_NAME[to]}:\n\n` +
    JSON.stringify(map);
  // Structured outputs: примусово валідний JSON з точно тими самими ключами.
  // Потрібні additionalProperties:false + явні properties, тому schema
  // будується для кожного виклику з ключів map.
  const schema = jsonSchemaFor(map);
  const data = await fetchJson(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        // Style guide як cacheable prefix. Schema structured outputs змінюється
        // між викликами, але cache_control лишається безпечним.
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
    },
    { provider: 'anthropic', model },
  );
  if (data.stop_reason === 'refusal')
    throw new Error('Claude nektet forespørselen (refusal)');
  if (data.stop_reason === 'max_tokens')
    throw new Error('Відповідь обрізана (збільште max_tokens)');
  const u = data.usage || {};
  if (u.cache_creation_input_tokens || u.cache_read_input_tokens) {
    console.log(
      `     [cache: записано ${u.cache_creation_input_tokens || 0}, прочитано ${u.cache_read_input_tokens || 0} токенів]`,
    );
  }
  // Structured outputs гарантує валідний JSON → parse напряму.
  return JSON.parse(data.content?.[0]?.text ?? '{}');
}

async function deepseekTranslateBatch(map, from, to, model) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key)
    throw new Error(
      'DEEPSEEK_API_KEY не заданий (.env локально або GitHub Secret)',
    );
  const data = await fetchJson(
    'https://api.deepseek.com/chat/completions',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: STYLE_GUIDE },
          {
            role: 'user',
            content:
              `Translate these values from ${LANG_NAME[from]} to ${LANG_NAME[to]}.\n` +
              `Return ONLY a JSON object with exactly these keys: ${Object.keys(map).join(', ')}.\n\n` +
              JSON.stringify(map),
          },
        ],
      }),
    },
    { provider: 'deepseek', model },
  );
  return parseJsonObject(data.choices?.[0]?.message?.content ?? '{}');
}

const GOOGLE_LANG = {
  nb: 'no',
  en: 'en',
  uk: 'uk',
  ar: 'ar',
  es: 'es',
  ti: 'ti',
};

async function googleTranslateBatch(map, from, to, model) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key)
    throw new Error(
      'GOOGLE_TRANSLATE_API_KEY не заданий (.env локально або GitHub Secret)',
    );
  const keys = Object.keys(map);
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const body = {
    q: keys.map((k) => map[k]),
    source: GOOGLE_LANG[from] || from,
    target: GOOGLE_LANG[to] || to,
    format: 'text',
    model: model || 'nmt',
  };
  const data = await fetchJson(
    url,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    { provider: 'google', model },
  );
  const translations = data.data?.translations ?? [];
  if (translations.length !== keys.length)
    throw new Error('Google повернув неправильну кількість перекладів');
  return Object.fromEntries(
    keys.map((k, i) => [k, decodeHtmlEntities(translations[i].translatedText)]),
  );
}

// Перекладає { path: text } з однієї мови в іншу.
async function translateMap(map, from, to) {
  const providers = {
    anthropic: anthropicTranslateBatch,
    deepseek: deepseekTranslateBatch,
    google: googleTranslateBatch,
  };
  const runProvider = async (provider, model) => {
    requireProvider(provider, model);
    const translated = await providers[provider](map, from, to, model);
    assertTranslationShape(map, translated, provider, from, to);
    return translated;
  };

  try {
    return await runProvider(PROVIDER, PRIMARY_MODEL);
  } catch (e) {
    const nextProvider = FALLBACK_PROVIDER || PROVIDER;
    const nextModel = FALLBACK_MODEL || DEFAULT_MODEL[nextProvider];
    if (!FALLBACK_PROVIDER && !FALLBACK_MODEL) throw e;
    console.error(
      `Основний переклад упав (${PROVIDER}/${PRIMARY_MODEL}): ${e.message}. Пробую ${nextProvider}/${nextModel}.`,
    );
    return runProvider(nextProvider, nextModel);
  }
}

// ---- режими: будуємо список задач { targetLocale: { from, map } } ------
function jobsFillTodo() {
  // Для кожної мови: значення "[TODO] <nb-текст>" → перекласти nb-текст цією мовою.
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
  if (!src || !paths.length) throw new Error('--source і --paths обовʼязкові');
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
        execSync(`git show ${base}:${DIR}/${code}.json 2>/dev/null`).toString(),
      );
    } catch {
      oldObj = {};
    }
    const isNewLocaleFile = Object.keys(oldObj).length === 0;
    if (isNewLocaleFile && code !== REFERENCE) {
      console.log(`  [skip] ${code}.json — new locale file, not a CMS diff`);
      continue;
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

    // CMS-сценарій: визначаємо джерело. У проді джерело фіксується через
    // TRANSLATE_SOURCE_LOCALE=nb, щоб редактор не мав шість джерел правди.
    let srcLocale;
    if (FIXED_SOURCE) {
      if (!changedLocales.includes(FIXED_SOURCE)) {
        if (STRICT_SOURCE)
          throw new Error(
            `Endret ${path} i ${changedLocales.join(', ')}, men ikke i TRANSLATE_SOURCE_LOCALE=${FIXED_SOURCE}`,
          );
        continue;
      }
      srcLocale = FIXED_SOURCE;
    } else if (changedLocales.length === 1) {
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
  validateRuntimeConfig();

  if (HEALTH_CHECK) {
    console.log(`Health-check: ${PROVIDER}/${PRIMARY_MODEL}`);
    await translateMap({ healthcheck: 'Vensmoen mottak' }, 'nb', 'en');
    console.log('Translate health-check OK.');
    return;
  }

  let jobs;
  if (has('--fill-todo')) jobs = jobsFillTodo();
  else if (has('--source')) jobs = jobsSourcePaths();
  else if (has('--base')) jobs = jobsDiff();
  else {
    console.error(
      'Виберіть режим: --fill-todo | --source <l> --paths ... | --base <sha>',
    );
    process.exit(1);
  }

  // --targets uk,ar: обмежити цільові локалі (не чіпати готові переклади).
  const onlyTargets = (val('--targets') || '').split(',').filter(Boolean);
  if (onlyTargets.length)
    for (const k of Object.keys(jobs))
      if (!onlyTargets.includes(k)) delete jobs[k];

  const targets = Object.keys(jobs);
  if (!targets.length) {
    console.log('Нічого перекладати.');
    return;
  }
  console.log(
    `Провайдер: ${PROVIDER}; модель: ${PRIMARY_MODEL}${
      FALLBACK_PROVIDER || FALLBACK_MODEL
        ? `; fallback: ${FALLBACK_PROVIDER || PROVIDER}/${FALLBACK_MODEL || DEFAULT_MODEL[FALLBACK_PROVIDER || PROVIDER]}`
        : ''
    }${FIXED_SOURCE ? `; джерело: ${FIXED_SOURCE}` : ''}${DRY ? ' [DRY]' : ''}`,
  );

  const results = {};
  for (const code of targets) {
    const { from, map } = jobs[code];
    const n = Object.keys(map).length;
    if (!n) continue;
    console.log(`\n→ ${code} (${n} полів, з ${from})`);
    results[code] = {
      from,
      map,
      translated: await translateMap(map, from, code),
    };
  }

  for (const code of Object.keys(results)) {
    const { map, translated } = results[code];
    const obj = readLocale(code);
    for (const [path, text] of Object.entries(translated)) {
      console.log(
        `   ${path}\n     ${JSON.stringify(map[path])}\n  →  ${JSON.stringify(text)}`,
      );
      if (!DRY) setPath(obj, path, text);
    }
    if (!DRY) writeLocale(code, obj);
  }
  console.log(DRY ? '\n[DRY] файли не записано.' : '\nГотово.');
})().catch((e) => {
  console.error('ПОМИЛКА:', e.message);
  process.exit(1);
});
