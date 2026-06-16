/** URLs de login de los paneles (para entregar credenciales al cliente). */
export function getDashboardLoginUrl(role: 'dealer' | 'seller' | 'admin' | string): string {
  const dealer =
    process.env.NEXT_PUBLIC_DEALER_APP_URL ||
    'https://dealer-app--autodealers-7f62e.us-central1.hosted.app';
  const seller =
    process.env.NEXT_PUBLIC_SELLER_APP_URL ||
    'https://seller-app--autodealers-7f62e.us-central1.hosted.app';
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
    'https://admin-app--autodealers-7f62e.us-central1.hosted.app';

  const base =
    role === 'dealer' || role === 'dealer_admin' || role === 'manager'
      ? dealer
      : role === 'seller'
        ? seller
        : role === 'admin'
          ? adminUrl
          : seller;

  return `${base.replace(/\/$/, '')}/login`;
}

export function getDashboardLabel(role: 'dealer' | 'seller' | string): string {
  if (role === 'dealer' || role === 'dealer_admin' || role === 'manager') return 'Panel dealer';
  if (role === 'seller') return 'Panel vendedor';
  return 'Panel';
}
