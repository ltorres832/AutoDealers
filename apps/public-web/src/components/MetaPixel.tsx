'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { sendMetaCapiOnly, trackMetaEvent } from '@/lib/meta-pixel';

/** PageView extra en navegación del App Router (el PageView inicial lo dispara el código en <head>). */
export default function MetaPixel() {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!pathname) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      const initialId = typeof window !== 'undefined' ? window.__metaPixelEventId : undefined;
      if (initialId) sendMetaCapiOnly('PageView', initialId);
      return;
    }
    trackMetaEvent('PageView');
  }, [pathname]);

  return null;
}
