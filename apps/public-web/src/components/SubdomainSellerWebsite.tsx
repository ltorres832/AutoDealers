'use client';

import { useEffect, useState } from 'react';
import SellerPublicWebsite, {
  type SellerPublicWebsiteBranding,
  type SellerPublicWebsiteProfile,
  type SellerPublicWebsiteSeller,
  type SellerPublicWebsiteSettings,
  type SellerPublicWebsiteVehicle,
} from '@/components/SellerPublicWebsite';
import { type PublicReviewItem } from '@/components/PublicReviewsList';
import { filterVerifiablePublicReviews } from '@/lib/public-review-filters';

const DEFAULT_BRANDING: SellerPublicWebsiteBranding = {
  primaryColor: '#E10600',
  secondaryColor: '#0A0A0A',
};

/** Página web azul del vendedor en su subdominio (no el catálogo /seller/…). */
export default function SubdomainSellerWebsite({ sellerId }: { sellerId: string }) {
  const [seller, setSeller] = useState<SellerPublicWebsiteSeller | null>(null);
  const [vehicles, setVehicles] = useState<SellerPublicWebsiteVehicle[]>([]);
  const [reviews, setReviews] = useState<PublicReviewItem[]>([]);
  const [websiteSettings, setWebsiteSettings] = useState<SellerPublicWebsiteSettings | null>(null);
  const [branding, setBranding] = useState<SellerPublicWebsiteBranding>(DEFAULT_BRANDING);
  const [profile, setProfile] = useState<SellerPublicWebsiteProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      setError('Vendedor no configurado');
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const response = await fetch(`/api/public/seller/${sellerId}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError((body as { error?: string }).error || 'No se pudo cargar la página web');
          return;
        }
        const data = await response.json();
        if (!data.seller) {
          setError('Vendedor no encontrado');
          return;
        }
        setSeller({
          ...data.seller,
          socialMedia:
            data.seller.socialMedia && typeof data.seller.socialMedia === 'object'
              ? data.seller.socialMedia
              : undefined,
        });
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
        setReviews(
          filterVerifiablePublicReviews(Array.isArray(data.reviews) ? data.reviews : [])
        );
        setWebsiteSettings(
          data.websiteSettings && typeof data.websiteSettings === 'object'
            ? (data.websiteSettings as SellerPublicWebsiteSettings)
            : null
        );
        if (data.branding && typeof data.branding === 'object') {
          setBranding({
            primaryColor: data.branding.primaryColor || DEFAULT_BRANDING.primaryColor,
            secondaryColor: data.branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          });
        }
        if (data.profile && typeof data.profile === 'object') {
          setProfile(data.profile as SellerPublicWebsiteProfile);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('La solicitud tardó demasiado. Intenta de nuevo.');
        } else {
          setError('Error al cargar la página web');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [sellerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!seller || error) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <p className="text-gray-700 text-center">{error || 'Página web no disponible'}</p>
      </div>
    );
  }

  return (
    <SellerPublicWebsite
      seller={seller}
      vehicles={vehicles}
      reviews={reviews}
      websiteSettings={websiteSettings}
      branding={branding}
      profile={profile}
    />
  );
}
