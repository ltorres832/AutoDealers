'use client';

import { PlatformVisitTracker } from '@autodealers/shared/platform-visit-tracker';

export default function PublicVisitTracker() {
  return <PlatformVisitTracker app="public-web" endpoint="/api/public/analytics/visit" />;
}
