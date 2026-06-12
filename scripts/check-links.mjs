// Перевірка внутрішніх посилань у зібраному dist/: кожен href/src,
// що вказує всередину сайту, має відповідати реальному файлу збірки.
// Ловить биті посилання після перейменувань сегментів URL ще в CI,
// до того, як вони потраплять у продакшен. Запускати ПІСЛЯ build.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = '/vensmoen';
const SITE = 'https://murasamadsp.github.io';

if (!existsSync(DIST)) {
  console.error(
    'check-links: каталог dist/ не знайдено — спочатку npm run build',
  );
  process.exit(1);
}

/** Рекурсивно збирає всі файли з розширенням ext у каталозі. */
function collectFiles(dir, ext) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...collectFiles(full, ext));
    else if (full.endsWith(ext)) found.push(full);
  }
  return found;
}

/** Чи існує ціль внутрішнього URL у dist (директорія → index.html). */
function targetExists(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const rel = clean.slice(BASE.length).replace(/^\//, '');
  const asFile = join(DIST, rel);
  if (clean.endsWith('/')) return existsSync(join(asFile, 'index.html'));
  return existsSync(asFile) || existsSync(join(asFile, 'index.html'));
}

const ATTR_RE = /(?:href|src)="([^"]+)"/g;
const errors = [];
let checked = 0;

for (const file of collectFiles(DIST, '.html')) {
  const html = readFileSync(file, 'utf8');
  const page = file.slice(DIST.length);
  for (const [, raw] of html.matchAll(ATTR_RE)) {
    // Зовнішні, поштові, телефонні та якірні посилання не перевіряємо.
    if (/^(https?:|mailto:|tel:|#|data:)/.test(raw)) continue;
    if (!raw.startsWith(`${BASE}/`)) {
      errors.push(`${page}: посилання поза base: "${raw}"`);
      continue;
    }
    checked++;
    if (!targetExists(raw)) errors.push(`${page}: бите посилання "${raw}"`);
  }
}

// Sitemap: кожен URL має вести на реальну сторінку збірки.
for (const file of collectFiles(DIST, '.xml')) {
  const xml = readFileSync(file, 'utf8');
  for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!loc.startsWith(SITE + BASE)) {
      errors.push(`${posix.basename(file)}: чужий URL у sitemap: ${loc}`);
      continue;
    }
    checked++;
    if (!targetExists(loc.slice(SITE.length)))
      errors.push(`${posix.basename(file)}: бите посилання у sitemap: ${loc}`);
  }
}

if (errors.length) {
  console.error(`check-links FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `check-links OK: ${checked} внутрішніх посилань, усі цілі існують.`,
);
