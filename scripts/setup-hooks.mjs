#!/usr/bin/env node
// Встановлює git hooks з scripts/git-hooks/ → .git/hooks/
// Запускається через: npm run setup

import fs from 'node:fs';
import path from 'node:path';

const src = 'scripts/git-hooks';
const dst = '.git/hooks';

if (!fs.existsSync(dst)) {
  console.log('Не в git-репо — хуки не встановлено.');
  process.exit(0);
}

for (const file of fs.readdirSync(src)) {
  const from = path.join(src, file);
  const to = path.join(dst, file);
  fs.copyFileSync(from, to);
  fs.chmodSync(to, 0o755);
  console.log(`✓ ${to}`);
}
console.log('Git hooks встановлено.');
