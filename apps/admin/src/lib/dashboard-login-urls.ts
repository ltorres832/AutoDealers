import {
  resolveAdminUrl,
  resolveBusinessUrl,
  resolveDealerUrl,
  resolvePublicWebUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';

/** URLs de login de los paneles (para entregar credenciales al cliente). */
export function getDashboardLoginUrl(role: 'dealer' | 'seller' | 'admin' | string): string {
  if (role === 'customer') {
    return `${resolvePublicWebUrl()}/mi-garage`;
  }
  const base =
    role === 'dealer' || role === 'dealer_admin' || role === 'manager'
      ? resolveDealerUrl()
      : role === 'seller'
        ? resolveSellerUrl()
        : role === 'automotive_business'
          ? resolveBusinessUrl()
          : role === 'admin'
            ? resolveAdminUrl()
            : resolveSellerUrl();

  return `${base}/login`;
}

export function getDashboardLabel(role: 'dealer' | 'seller' | string): string {
  if (role === 'dealer' || role === 'dealer_admin' || role === 'manager') return 'Panel dealer';
  if (role === 'seller') return 'Panel vendedor';
  if (role === 'automotive_business') return 'Panel de negocio';
  if (role === 'customer') return 'Mi garage';
  return 'Panel';
}
