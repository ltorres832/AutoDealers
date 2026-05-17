#!/usr/bin/env node
/**
 * Imprime dominios y referrers para Firebase Auth / API key.
 * Proyecto y backends alineados con firebase.json y .firebaserc.
 */
const PROJECT_ID = 'autodealers-7f62e';
const REGION = 'us-central1';
const BACKENDS = [
  'public-web-app',
  'admin-app',
  'dealer-app',
  'seller-app',
  'advertiser-app',
];

console.log(`\n=== Firebase Auth — Authorized domains (solo host, sin https) ===\n`);
for (const id of BACKENDS) {
  console.log(`${id}--${PROJECT_ID}.${REGION}.hosted.app`);
}
console.log('autodealers-7f62e.web.app');
console.log('autodealers-7f62e.firebaseapp.com');
console.log('localhost');
console.log('127.0.0.1');

console.log(`\n=== Google Cloud API key — HTTP referrers (con https y /*) ===\n`);
for (const id of BACKENDS) {
  console.log(`https://${id}--${PROJECT_ID}.${REGION}.hosted.app/*`);
}
console.log('https://autodealers-7f62e.web.app/*');
console.log('https://autodealers-7f62e.firebaseapp.com/*');
console.log('http://localhost:*/*');
console.log('\n(Opcional, más amplio: https://*.hosted.app/* — valorar seguridad.)\n');
