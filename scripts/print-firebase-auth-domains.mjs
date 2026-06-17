#!/usr/bin/env node
/**
 * Imprime dominios y referrers para Firebase Auth / API key.
 * Proyecto y backends alineados con firebase.json y scripts/platform-domains.mjs
 */
import {
  APP_HOSTING_BACKENDS,
  listCustomAuthHosts,
  listCustomAuthReferrers,
  PLATFORM_APEX,
} from './platform-domains.mjs';

const PROJECT_ID = 'autodealers-7f62e';
const REGION = 'us-central1';

console.log(`\n=== Mapa de apps (${PLATFORM_APEX}) ===\n`);
for (const [backend, host] of Object.entries(APP_HOSTING_BACKENDS)) {
  console.log(`${backend.padEnd(18)} → https://${host}`);
}

console.log(`\n=== Firebase Auth — Authorized domains (solo host, sin https) ===\n`);
for (const id of Object.keys(APP_HOSTING_BACKENDS)) {
  console.log(`${id}--${PROJECT_ID}.${REGION}.hosted.app`);
}
console.log('autodealers-7f62e.web.app');
console.log('autodealers-7f62e.firebaseapp.com');
for (const host of listCustomAuthHosts()) {
  console.log(host);
}
console.log('localhost');
console.log('127.0.0.1');

console.log(`\n=== Google Cloud API key — HTTP referrers (con https y /*) ===\n`);
for (const id of Object.keys(APP_HOSTING_BACKENDS)) {
  console.log(`https://${id}--${PROJECT_ID}.${REGION}.hosted.app/*`);
}
console.log('https://autodealers-7f62e.web.app/*');
console.log('https://autodealers-7f62e.firebaseapp.com/*');
for (const ref of listCustomAuthReferrers()) {
  console.log(ref);
}
console.log('http://localhost:*/*');
console.log('\nGuía completa: docs/MULTI_APP_DOMAINS.md\n');
