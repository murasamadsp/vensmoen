#!/usr/bin/env node
// Перевіряє конфіг авто-перекладу до запуску API, щоб CI падав зрозуміло.

try {
  process.loadEnvFile('.env');
} catch {
  /* .env необов'язковий у CI */
}

const args = process.argv.slice(2);
const allowMissingKeys = args.includes('--allow-missing-keys');
const providers = new Set(['anthropic', 'deepseek', 'google']);
const providerKeys = {
  anthropic: 'ANTHROPIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  google: 'GOOGLE_TRANSLATE_API_KEY',
};
const defaults = {
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-v4-flash',
  google: 'nmt',
};

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function fail(errors, message) {
  errors.push(message);
}

function warn(warnings, message) {
  warnings.push(message);
}

function validateProvider(errors, provider, label) {
  if (!provider) fail(errors, `${label} порожній`);
  else if (!providers.has(provider))
    fail(
      errors,
      `${label}="${provider}" має бути anthropic, deepseek або google`,
    );
}

function validateNumber(errors, name, min, max) {
  const raw = env(name);
  if (!raw) return;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max)
    fail(errors, `${name} має бути цілим числом ${min}..${max}`);
}

function validateDeepSeekModel(errors, warnings, model) {
  if (!model) return;
  if (!['deepseek-chat', 'deepseek-reasoner'].includes(model)) return;
  const cutoff = Date.parse('2026-07-24T15:59:00Z');
  if (Date.now() >= cutoff) {
    fail(
      errors,
      `${model} deprecated у DeepSeek; замініть на deepseek-v4-flash або deepseek-v4-pro`,
    );
  } else {
    warn(
      warnings,
      `${model} буде deprecated у DeepSeek 2026-07-24 15:59 UTC; краще вже перейти на deepseek-v4-flash/deepseek-v4-pro`,
    );
  }
}

const errors = [];
const warnings = [];

const primaryProvider = env('TRANSLATE_PROVIDER', 'anthropic');
const primaryModel = env('TRANSLATE_MODEL', defaults[primaryProvider] || '');
const fallbackProvider = env('TRANSLATE_FALLBACK_PROVIDER');
const fallbackModel = env('TRANSLATE_FALLBACK_MODEL');

validateProvider(errors, primaryProvider, 'TRANSLATE_PROVIDER');
if (!primaryModel) fail(errors, 'TRANSLATE_MODEL порожній');

if (fallbackProvider)
  validateProvider(errors, fallbackProvider, 'TRANSLATE_FALLBACK_PROVIDER');

const active = new Set([primaryProvider]);
if (fallbackProvider) active.add(fallbackProvider);
else if (fallbackModel) active.add(primaryProvider);

for (const provider of active) {
  if (!providers.has(provider)) continue;
  const keyName = providerKeys[provider];
  if (!allowMissingKeys && !env(keyName))
    fail(errors, `${keyName} не заданий для провайдера ${provider}`);
}

validateNumber(errors, 'TRANSLATE_TIMEOUT_MS', 1000, 300000);
validateNumber(errors, 'TRANSLATE_RETRIES', 0, 5);

if (
  env('TRANSLATE_SOURCE_LOCALE') &&
  !['nb', 'en', 'uk', 'ar', 'es', 'ti'].includes(env('TRANSLATE_SOURCE_LOCALE'))
)
  fail(
    errors,
    `TRANSLATE_SOURCE_LOCALE="${env('TRANSLATE_SOURCE_LOCALE')}" не входить у список мов`,
  );
if (
  env('TRANSLATE_STRICT_SOURCE') &&
  !['0', '1'].includes(env('TRANSLATE_STRICT_SOURCE'))
)
  fail(errors, 'TRANSLATE_STRICT_SOURCE має бути 0 або 1');

if (primaryProvider === 'deepseek')
  validateDeepSeekModel(errors, warnings, primaryModel);
if ((fallbackProvider || primaryProvider) === 'deepseek')
  validateDeepSeekModel(errors, warnings, fallbackModel);

for (const message of warnings) console.warn(`WARN: ${message}`);

if (errors.length) {
  console.error(`Translate env FAILED (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `Translate env OK: ${primaryProvider}/${primaryModel}` +
    (fallbackProvider || fallbackModel
      ? `; fallback ${fallbackProvider || primaryProvider}/${fallbackModel || defaults[fallbackProvider || primaryProvider]}`
      : ''),
);
