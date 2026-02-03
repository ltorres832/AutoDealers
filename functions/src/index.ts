/**
 * Cloud Functions para AutoDealersPR
 *
 * Funciones principales según el documento maestro.
 * Los servidores Next.js (nextjsServer*) se definen en index.js en la raíz de functions.
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export { createPurchaseIntent } from './purchase/createPurchaseIntent';

