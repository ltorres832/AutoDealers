'use client';

import type { ReactNode } from 'react';
import {
  isSponsoredAdClickable,
  sponsoredAdOpensInNewTab,
  type SponsoredLinkType,
} from '@/lib/sponsored-ad-link';
import { resolveSponsoredContentHref } from '@/lib/sponsored-content-href';

type Props = {
  contentId: string;
  linkType?: SponsoredLinkType;
  linkUrl?: string;
  className?: string;
  children: ReactNode;
};

export function SponsoredAdShell({
  contentId,
  linkType,
  linkUrl,
  className = '',
  children,
}: Props) {
  const trackClick = () => {
    fetch(`/api/public/sponsored-content/${contentId}/click`, { method: 'POST' }).catch(
      console.error
    );
  };

  const href = resolveSponsoredContentHref(linkType, linkUrl);

  if (!isSponsoredAdClickable(linkType, linkUrl) || !href) {
    return <div className={className}>{children}</div>;
  }

  return (
    <a
      href={href}
      target={sponsoredAdOpensInNewTab(linkType) ? '_blank' : '_self'}
      rel={sponsoredAdOpensInNewTab(linkType) ? 'noopener noreferrer' : undefined}
      onClick={trackClick}
      className={className}
    >
      {children}
    </a>
  );
}
