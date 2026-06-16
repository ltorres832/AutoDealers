export type SponsoredLinkType =
  | 'external'
  | 'landing_page'
  | 'marketplace'
  | 'inventory'
  | 'contact'
  | 'none'
  | string;

export function isSponsoredAdClickable(
  linkType?: SponsoredLinkType,
  linkUrl?: string
): boolean {
  if (linkType === 'none') return false;
  return Boolean(linkUrl?.trim());
}

export function sponsoredAdOpensInNewTab(linkType?: SponsoredLinkType): boolean {
  return linkType === 'external';
}
