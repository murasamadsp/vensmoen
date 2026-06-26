#!/usr/bin/env node
// Перевіряє, що Pages CMS експонує всі локалі і що схема .pages.yml покриває
// всі листові ключі nb.json. Інакше CMS може зрізати невідомі ключі.
import { readFileSync } from 'node:fs';

const schemaText = readFileSync('.pages.yml', 'utf8');
const nb = JSON.parse(readFileSync('src/i18n/nb.json', 'utf8'));
const localesText = readFileSync('src/i18n/locales.ts', 'utf8');
const expectedLocales = [
  ...localesText.matchAll(/\{\s*code:\s*'([a-z]+)'/g),
].map((m) => m[1]);

const localePaths = [
  ...schemaText.matchAll(/path:\s*src\/i18n\/([a-z]+)\.json/g),
].map((m) => m[1]);
const errors = [];
const missingLocales = expectedLocales.filter(
  (code) => !localePaths.includes(code),
);
const extraLocales = localePaths.filter(
  (code) => !expectedLocales.includes(code),
);
if (missingLocales.length) {
  errors.push(`Mangler språk i .pages.yml: ${missingLocales.join(', ')}`);
}
if (extraLocales.length) {
  errors.push(`Ukjente språk i .pages.yml: ${extraLocales.join(', ')}`);
}

function normalize(path) {
  return path.replace(/\[\d+\]/g, '');
}

function collectLeaves(value, path = '', out = new Set()) {
  if (typeof value === 'string') {
    out.add(normalize(path));
  } else if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'string')) out.add(normalize(path));
    else
      value.forEach((v, i) => {
        collectLeaves(v, `${path}[${i}]`, out);
      });
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value))
      collectLeaves(value[key], path ? `${path}.${key}` : key, out);
  }
  return out;
}

function lineIndent(line) {
  return line.match(/^ */)[0].length;
}

const schemaLeaves = new Set();
const parents = new Set();
const stack = [];
let inContentFields = false;

for (const line of schemaText.split('\n')) {
  if (/^\s*fields:\s*&fields\s*$/.test(line)) {
    inContentFields = true;
    continue;
  }
  if (inContentFields && /^ {2}- name:\s+/.test(line)) break;
  if (!inContentFields) continue;

  const indent = lineIndent(line);
  while (stack.length && indent <= stack.at(-1).indent) stack.pop();

  const nameMatch =
    line.match(/^\s*- name:\s*([A-Za-z0-9_-]+)/) ||
    line.match(/^\s*-\s*\{\s*name:\s*([A-Za-z0-9_-]+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    const path = [...stack.map((x) => x.name), name].join('.');
    schemaLeaves.add(path);
    for (const prefix of path
      .split('.')
      .slice(0, -1)
      .reduce((acc, part) => {
        acc.push(acc.length ? `${acc.at(-1)}.${part}` : part);
        return acc;
      }, [])) {
      parents.add(prefix);
    }
    stack.push({ indent, name });
    continue;
  }

  if (/^\s*fields:\s*\*fractionFields\s*$/.test(line) && stack.length) {
    const base = stack.map((x) => x.name).join('.');
    parents.add(base);
    for (const prefix of base
      .split('.')
      .slice(0, -1)
      .reduce((acc, part) => {
        acc.push(acc.length ? `${acc.at(-1)}.${part}` : part);
        return acc;
      }, [])) {
      parents.add(prefix);
    }
    for (const key of ['name', 'bin', 'accepted', 'rejected', 'note'])
      schemaLeaves.add(`${base}.${key}`);
  }
}

for (const parent of parents) schemaLeaves.delete(parent);

const expected = collectLeaves(nb);
for (const path of expected) {
  if (!schemaLeaves.has(path)) errors.push(`Mangler i .pages.yml: ${path}`);
}
for (const path of schemaLeaves) {
  if (!expected.has(path))
    errors.push(`Finnes i .pages.yml, men ikke nb.json: ${path}`);
}

if (errors.length) {
  console.error(`Pages CMS-schema FEILET (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `Pages CMS-schema OK: ${expected.size} nb.json-felt dekket, ${localePaths.length} språk eksponert.`,
);
