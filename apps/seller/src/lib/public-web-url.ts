import type { NextRequest } from 'next/server';
import {
  buildReviewInvitePublicUrl as buildReviewInviteUrl,
  getPublicWebBaseUrl as resolvePublicWebBaseUrl,
} from '@autodealers/shared/platform-urls';

/** @deprecated request is ignored — public web is always www.autodealers-online.com */
export function getPublicWebBaseUrl(_request?: NextRequest): string {
  return resolvePublicWebBaseUrl();
}

export function buildReviewInvitePublicUrl(_request: NextRequest, token: string): string {
  return buildReviewInviteUrl(token);
}
