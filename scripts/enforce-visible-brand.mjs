#!/usr/bin/env node
/**
 * Refuerza branding visible: CTAs rojos, secciones oscuras con tinte marca.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const TARGET_DIRS = [
  'apps/public-web/src',
  'apps/admin/src',
  'apps/dealer/src',
  'apps/seller/src',
  'apps/advertiser/src',
  'packages/shared/src',
].map((d) => path.join(root, d));

const SKIP = /\.(bak|md|test\.|spec\.)/;

const REPLACEMENTS = [
  // CTAs: negro → rojo (default visible)
  [/bg-slate-900 text-white/g, 'bg-primary-600 text-white'],
  [/hover:bg-slate-800(?![^\n]*bg-slate)/g, 'hover:bg-primary-700'],
  // Botones que eran slate con hover primary ya correctos
  [/bg-primary-600 text-white([^"]*?)hover:bg-primary-600/g, 'bg-primary-600 text-white$1hover:bg-primary-700'],
  // Secciones oscuras → negro marca
  [/className="([^"]*?)bg-slate-900([^"]*?)"/g, (m, pre, post) => {
    if (/text-white|py-|px-|rounded|font-|block w-full|flex-1/.test(pre + post)) {
      return m; // likely a button, already handled above
    }
    return `className="${pre}bg-brand-black-deep${post}"`;
  }],
  // Pulse dot azul residual
  [/shadow-\[0_0_10px_rgba\(96,165,250,0\.8\)\]/g, 'shadow-[0_0_10px_rgba(225,6,0,0.8)]'],
  // gray-800 buttons → primary
  [/bg-gray-800 text-white/g, 'bg-primary-600 text-white'],
  [/hover:bg-gray-900/g, 'hover:bg-primary-700'],
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?|css)$/.test(name) && !SKIP.test(full)) {
      files.push(full);
    }
  }
  return files;
}

function safeWrite(file, content) {
  try {
    fs.writeFileSync(file, content, 'utf8');
    return true;
  } catch {
    return false;
  }
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of walk(dir)) {
    if (file.includes(`${path.sep}styles${path.sep}brand-surface.css`)) continue;
    let src = fs.readFileSync(file, 'utf8');
    let next = src;
    for (const [pattern, repl] of REPLACEMENTS) {
      next = next.replace(pattern, repl);
    }
    if (next !== src && safeWrite(file, next)) {
      changed++;
      console.log('updated:', path.relative(root, file));
    }
  }
}

console.log(`\nDone. ${changed} files updated.`);
