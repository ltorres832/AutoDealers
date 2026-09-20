import { PLATFORM_APP_SUBDOMAINS } from './public-production-hosts';

export const RESERVED_SUBDOMAINS = new Set<string>(PLATFORM_APP_SUBDOMAINS);

export function membershipIncludesSubdomain(
  features?: Record<string, unknown> | null
): boolean {
  return features?.customSubdomain === true;
}
