'use client';

import { normalizePromoVideoUrls } from '@autodealers/shared/promo-video-urls';
import { parsePromoVideoUrl } from '@/lib/promo-video';
import PublicPromoVideo from '@/components/PublicPromoVideo';

type Props = {
  urls?: string[] | null;
  /** Campo legacy (un solo video) */
  legacyUrl?: string | null;
  className?: string;
  titlePrefix?: string;
};

export default function PublicPromoVideoGrid({
  urls,
  legacyUrl,
  className = '',
  titlePrefix = 'Video promocional',
}: Props) {
  const list = normalizePromoVideoUrls(urls, legacyUrl).filter((u) => parsePromoVideoUrl(u));

  if (list.length === 0) return null;

  return (
    <section className={className} aria-label="Videos promocionales">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
        {list.map((url, index) => (
          <PublicPromoVideo
            key={`${url}-${index}`}
            url={url}
            title={`${titlePrefix} ${index + 1}`}
            compact
          />
        ))}
      </div>
    </section>
  );
}
