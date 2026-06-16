#!/usr/bin/env node
/**
 * Sincroniza la paleta AutoDealers en todo el monorepo web.
 * Reemplaza azul/morado/índigo (UI genérica) por primary-* / brand-* oficiales.
 * No toca verde (éxito), ámbar (alertas) ni archivos de backup/docs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_DIRS = [
  'apps/admin/src',
  'apps/dealer/src',
  'apps/seller/src',
  'apps/advertiser/src',
  'apps/public-web/src',
  'packages/shared/src',
  'packages/billing/src',
  'packages/core/src',
  'functions/src',
];

const SKIP_DIR_NAMES = new Set(['node_modules', '.next', 'dist', '.git']);
const SKIP_FILE = /\.(bak|md|html|json|jsonl|map)$/i;
const ALLOW_EXT = new Set(['.tsx', '.ts', '.css', '.jsx', '.js']);

/** Orden: patrones más específicos primero */
const REPLACEMENTS = [
  [/hover:from-blue-/g, 'hover:from-primary-'],
  [/hover:to-blue-/g, 'hover:to-primary-'],
  [/hover:from-indigo-/g, 'hover:from-primary-'],
  [/hover:to-indigo-/g, 'hover:to-brand-black'],
  [/hover:from-purple-/g, 'hover:from-primary-'],
  [/hover:to-purple-/g, 'hover:to-primary-'],
  [/hover:to-pink-/g, 'hover:to-brand-red-bright'],
  [/group-hover:text-blue-/g, 'group-hover:text-primary-'],
  [/group-hover:text-purple-/g, 'group-hover:text-primary-'],
  [/group-hover:text-indigo-/g, 'group-hover:text-primary-'],
  [/group-hover:border-blue-/g, 'group-hover:border-primary-'],
  [/group-hover:border-purple-/g, 'group-hover:border-primary-'],
  [/group-hover:bg-blue-/g, 'group-hover:bg-primary-'],
  [/group-focus-within:text-blue-/g, 'group-focus-within:text-primary-'],
  [/focus-within:ring-blue-/g, 'focus-within:ring-primary-'],
  [/focus:ring-blue-/g, 'focus:ring-primary-'],
  [/focus:border-blue-/g, 'focus:border-primary-'],
  [/hover:text-blue-/g, 'hover:text-primary-'],
  [/hover:text-purple-/g, 'hover:text-primary-'],
  [/hover:text-indigo-/g, 'hover:text-primary-'],
  [/hover:text-violet-/g, 'hover:text-primary-'],
  [/hover:bg-blue-/g, 'hover:bg-primary-'],
  [/hover:bg-purple-/g, 'hover:bg-primary-'],
  [/hover:bg-indigo-/g, 'hover:bg-primary-'],
  [/hover:border-blue-/g, 'hover:border-primary-'],
  [/hover:border-purple-/g, 'hover:border-primary-'],
  [/hover:border-indigo-/g, 'hover:border-primary-'],
  [/hover:shadow-blue-/g, 'hover:shadow-primary-'],
  [/hover:shadow-purple-/g, 'hover:shadow-primary-'],
  [/hover:shadow-indigo-/g, 'hover:shadow-primary-'],
  [/from-blue-/g, 'from-primary-'],
  [/via-blue-/g, 'via-primary-'],
  [/to-blue-/g, 'to-primary-'],
  [/from-purple-/g, 'from-primary-'],
  [/via-purple-/g, 'via-primary-'],
  [/to-purple-/g, 'to-primary-'],
  [/from-indigo-/g, 'from-primary-'],
  [/via-indigo-/g, 'via-primary-'],
  [/to-indigo-/g, 'to-primary-'],
  [/from-violet-/g, 'from-primary-'],
  [/via-violet-/g, 'via-primary-'],
  [/to-violet-/g, 'to-brand-black-deep'],
  [/from-pink-/g, 'from-primary-'],
  [/via-pink-/g, 'via-primary-'],
  [/to-pink-/g, 'to-brand-red-bright'],
  [/from-sky-/g, 'from-primary-'],
  [/to-sky-/g, 'to-primary-'],
  [/from-cyan-/g, 'from-primary-'],
  [/to-cyan-/g, 'to-primary-'],
  [/text-blue-/g, 'text-primary-'],
  [/text-purple-/g, 'text-primary-'],
  [/text-indigo-/g, 'text-primary-'],
  [/text-violet-/g, 'text-primary-'],
  [/text-pink-/g, 'text-primary-'],
  [/text-sky-/g, 'text-primary-'],
  [/text-cyan-/g, 'text-primary-'],
  [/bg-blue-/g, 'bg-primary-'],
  [/bg-purple-/g, 'bg-primary-'],
  [/bg-indigo-/g, 'bg-primary-'],
  [/bg-violet-/g, 'bg-primary-'],
  [/bg-pink-/g, 'bg-primary-'],
  [/bg-sky-/g, 'bg-primary-'],
  [/bg-cyan-/g, 'bg-primary-'],
  [/border-blue-/g, 'border-primary-'],
  [/border-purple-/g, 'border-primary-'],
  [/border-indigo-/g, 'border-primary-'],
  [/border-violet-/g, 'border-primary-'],
  [/border-pink-/g, 'border-primary-'],
  [/ring-blue-/g, 'ring-primary-'],
  [/ring-purple-/g, 'ring-primary-'],
  [/ring-indigo-/g, 'ring-primary-'],
  [/shadow-blue-/g, 'shadow-primary-'],
  [/shadow-purple-/g, 'shadow-primary-'],
  [/shadow-indigo-/g, 'shadow-primary-'],
  [/decoration-blue-/g, 'decoration-primary-'],
  [/accent-blue-/g, 'accent-primary-'],
  [/fill-blue-/g, 'fill-primary-'],
  [/stroke-blue-/g, 'stroke-primary-'],
  [/#2563[Ee][Bb]/g, '#E10600'],
  [/#1[Ee]40[Aa][Ff]/g, '#0A0A0A'],
  [/#3[Bb]82[Ff]6/g, '#E10600'],
  [/#1[Dd]4[Ee]8/g, '#b80500'],
  [/#1[Ee]3[Aa]8[Aa]/g, '#5c0300'],
  [/#007[Bb][Ff][Ff]/g, '#E10600'],
  [/#6366[Ff]1/g, '#E10600'],
  [/#4[Ff]46[Ee]5/g, '#b80500'],
  [/#eff6ff/g, '#fff1f1'],
  [/#dbeafe/g, '#ffe0df'],
  [/#bfdbfe/g, '#ffb8b6'],
  [/rgba\(37,\s*99,\s*235/g, 'rgba(225, 6, 0'],
];

/** Corrige artefactos de migraciones anteriores */
const POST_FIX = [
  [/bg-brand-black50/g, 'bg-primary-50'],
  [/bg-brand-black100/g, 'bg-primary-100'],
  [/bg-brand-black600/g, 'bg-primary-600'],
  [/bg-brand-black700/g, 'bg-primary-700'],
  [/from-brand-black600/g, 'from-primary-600'],
  [/from-brand-black500/g, 'from-primary-500'],
  [/to-brand-black700/g, 'to-primary-700'],
  [/to-brand-black600/g, 'to-primary-600'],
  [/hover:to-brand-black700/g, 'hover:to-primary-700'],
  [/hover:to-brand-black/g, 'hover:to-brand-black-deep'],
];

const GLOBALS_CSS_ROOT = `    --brand-black: #0A0A0A;
    --brand-black-deep: #050505;
    --brand-red: #E10600;
    --brand-red-bright: #FF1A1A;
    --brand-silver: #C0C0C0;
    --brand-white: #FFFFFF;
    --primary-50: #fff1f1;
    --primary-100: #ffe0df;
    --primary-200: #ffb8b6;
    --primary-300: #ff8a86;
    --primary-400: #FF1A1A;
    --primary-500: #f01510;
    --primary-600: #E10600;
    --primary-700: #b80500;
    --primary-800: #8a0400;
    --primary-900: #5c0300;`;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      walk(full, files);
    } else if (ALLOW_EXT.has(path.extname(name)) && !SKIP_FILE.test(name)) {
      files.push(full);
    }
  }
  return files;
}

function applyReplacements(content) {
  let out = content;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of POST_FIX) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function syncGlobalsCss(content) {
  if (!content.includes('--primary-600')) return content;
  return content.replace(
    /:root\s*\{[^}]*--primary-600:[^;]+;[^}]*\}/s,
    `:root {\n${GLOBALS_CSS_ROOT}\n  }`
  );
}

let changedFiles = 0;
let totalReplacements = 0;

for (const rel of SCAN_DIRS) {
  const dir = path.join(ROOT, rel);
  for (const file of walk(dir)) {
    const before = fs.readFileSync(file, 'utf8');
    let after = applyReplacements(before);
    if (file.endsWith('globals.css')) {
      after = syncGlobalsCss(after);
    }
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changedFiles += 1;
    }
  }
}

// Flutter móvil
const flutterTheme = path.join(ROOT, 'apps/mobile/lib/core/theme/app_theme.dart');
if (fs.existsSync(flutterTheme)) {
  let ft = fs.readFileSync(flutterTheme, 'utf8');
  const ftBefore = ft;
  ft = ft
    .replace(/Color\(0xFF2563EB\)/g, 'Color(0xFFE10600)')
    .replace(/Color\(0xFF1E40AF\)/g, 'Color(0xFF0A0A0A)');
  if (ft !== ftBefore) {
    fs.writeFileSync(flutterTheme, ft, 'utf8');
    changedFiles += 1;
  }
}

console.log(`Brand colors applied. Files updated: ${changedFiles}`);
