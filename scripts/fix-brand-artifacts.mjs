#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = [
  'apps/admin/src',
  'apps/dealer/src',
  'apps/seller/src',
  'apps/advertiser/src',
  'apps/public-web/src',
  'packages/shared/src',
  'packages/core/src',
  'packages/billing/src',
];

const FIXES = [
  [/bg-brand-black50/g, 'bg-primary-50'],
  [/bg-brand-black100/g, 'bg-primary-100'],
  [/bg-brand-black400/g, 'bg-primary-400'],
  [/bg-brand-black600/g, 'bg-primary-600'],
  [/bg-brand-black700/g, 'bg-primary-700'],
  [/bg-brand-black900/g, 'bg-brand-black-deep'],
  [/from-brand-black50/g, 'from-primary-50'],
  [/from-brand-black500/g, 'from-primary-500'],
  [/from-brand-black600/g, 'from-primary-600'],
  [/from-brand-black700/g, 'from-primary-700'],
  [/from-brand-black900/g, 'from-brand-black-deep'],
  [/to-brand-black700/g, 'to-primary-700'],
  [/hover:to-brand-black700/g, 'hover:to-primary-700'],
  [/from-blue-600 to-indigo-700/g, 'from-primary-600 to-primary-800'],
  [/from-violet-600 to-purple-800/g, 'from-primary-600 to-brand-black-deep'],
  [/from-cyan-500 to-blue-700/g, 'from-primary-500 to-primary-800'],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(full, out);
    } else if (/\.(tsx|ts|css|js)$/.test(name) && !/\.bak/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function safeWrite(file, content) {
  try {
    fs.writeFileSync(file, content, 'utf8');
    return true;
  } catch {
    return false;
  }
}

let n = 0;
let failed = 0;
for (const rel of DIRS) {
  for (const file of walk(path.join(ROOT, rel))) {
    let content = fs.readFileSync(file, 'utf8');
    let next = content;
    for (const [a, b] of FIXES) next = next.replace(a, b);
    if (next !== content) {
      if (safeWrite(file, next)) n++;
      else failed++;
    }
  }
}
console.log(`Fixed ${n} files (${failed} skipped)`);
