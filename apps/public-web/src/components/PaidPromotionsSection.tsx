'use client';

import { AdCreativeMedia } from '@/components/AdCreativeMedia';
import { SponsoredAdShell } from '@/components/SponsoredAdShell';
import { usePublicPlacementCreatives } from '@/hooks/usePublicPlacementCreatives';
import { clickEndpointForCreative } from '@/lib/public-placement-creatives';
import { hasSponsoredAdText } from '@/lib/sponsored-ad-text';
import { SPONSORED_CTA_LABEL } from '@/lib/sponsored-content-href';

export default function PaidPromotionsSection() {
  const { content: items, loading } = usePublicPlacementCreatives('promotions_section', 12);

  if (loading || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-slate-50 py-16 sm:py-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">Promociones</span>
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Ofertas y anuncios activos
          </h2>
          <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
            Slideshow, video y animaciones contratadas por concesionarios, vendedores y anunciantes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const showText = hasSponsoredAdText(item);
            return (
              <SponsoredAdShell
                key={item.id}
                contentId={item.id}
                linkType={item.linkType as any}
                linkUrl={item.linkUrl}
                clickEndpoint={clickEndpointForCreative(item)}
                className="group block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative h-56 min-h-[14rem] overflow-hidden bg-slate-900">
                  <AdCreativeMedia
                    images={item.images}
                    imageUrl={item.imageUrl}
                    videoUrl={item.videoUrl}
                    videos={item.videos}
                    mediaType={item.mediaType}
                    animation={item.animation}
                    alt={item.title || 'Promoción'}
                  />
                  {item.mediaType === 'video' || item.videoUrl ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Video
                    </span>
                  ) : item.images.length > 1 ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Slideshow · {item.images.length}
                    </span>
                  ) : null}
                </div>
                {showText && (
                  <div className="p-5">
                    {item.title?.trim() && (
                      <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-primary-600">
                        {item.title}
                      </h3>
                    )}
                    {item.description?.trim() && (
                      <p className="mb-3 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                    )}
                    <span className="text-sm font-semibold text-primary-600">{SPONSORED_CTA_LABEL}</span>
                  </div>
                )}
              </SponsoredAdShell>
            );
          })}
        </div>
      </div>
    </section>
  );
}
