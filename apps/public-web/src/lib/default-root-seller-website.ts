import {
  getDefaultRootSellerId,
  isPublicRootHost,
  PUBLIC_PRODUCTION_BASE_URL,
  PUBLIC_ROOT_HOSTS,
  resolvedPublicBaseUrl,
  isMarketplaceRootHost,
} from '@/lib/public-production-hosts';

export {
  getDefaultRootSellerId,
  isPublicRootHost,
  isMarketplaceRootHost,
  isPlatformAppSubdomain,
  PLATFORM_APP_URLS,
  PUBLIC_PRODUCTION_BASE_URL,
  PUBLIC_ROOT_HOSTS,
  resolvedPublicBaseUrl,
};

/** @deprecated use isPublicRootHost */
export { isPublicRootHost as isFirebasePublicRootHost };

export function shouldServeSellerWebsiteAtRoot(hostname: string): boolean {
  return Boolean(getDefaultRootSellerId() && isPublicRootHost(hostname));
}
