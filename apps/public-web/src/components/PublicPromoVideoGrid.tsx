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

  const count = list.length;
  const single = count === 1;

  return (
    <section className={className} aria-label="Videos promocionales">
      {single ? (
        <PublicPromoVideo
          url={list[0]}
          title={titlePrefix}
          compact={false}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
          {list.map((url, index) => {
            const loneLast = count > 2 && count % 2 === 1 && index === count - 1;
            return (
              <div key={`${url}-${index}`} className={loneLast ? 'sm:col-span-2' : undefined}>
                <PublicPromoVideo
                  url={url}
                  title={`${titlePrefix} ${index + 1}`}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
