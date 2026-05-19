/** Hosts donde la home `/` puede ser la web azul del vendedor (Firebase Hosting público). */
const FIREBASE_PUBLIC_ROOT_HOSTS = new Set([
  'autodealers-7f62e.web.app',
  'autodealers-7f62e.firebaseapp.com',
]);

/**
 * UID del vendedor cuya web azul (SubdomainSellerWebsite) se muestra en la raíz del dominio público.
 * Configurar en App Hosting: NEXT_PUBLIC_DEFAULT_ROOT_SELLER_ID
 */
export function getDefaultRootSellerId(): string | null {
  const id = process.env.NEXT_PUBLIC_DEFAULT_ROOT_SELLER_ID?.trim();
  return id || null;
}

export function isFirebasePublicRootHost(hostname: string): boolean {
  const host = (hostname || '').split(':')[0]?.toLowerCase() ?? '';
  return FIREBASE_PUBLIC_ROOT_HOSTS.has(host);
}

export function shouldServeSellerWebsiteAtRoot(hostname: string): boolean {
  return Boolean(getDefaultRootSellerId() && isFirebasePublicRootHost(hostname));
}
