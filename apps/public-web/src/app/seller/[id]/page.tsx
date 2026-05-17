'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PublicBackButton from '@/components/PublicBackButton';
import SellerPublicWebsite, {
  type SellerPublicWebsiteBranding,
  type SellerPublicWebsiteProfile,
  type SellerPublicWebsiteSeller,
  type SellerPublicWebsiteSettings,
  type SellerPublicWebsiteVehicle,
} from '@/components/SellerPublicWebsite';
import { type PublicReviewItem } from '@/components/PublicReviewsList';

const DEFAULT_BRANDING: SellerPublicWebsiteBranding = {
  primaryColor: '#2563EB',
  secondaryColor: '#1E40AF',
};

export default function SellerPublicPage() {
  const params = useParams();
  const sellerId = params.id as string;
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
      setError('ID de vendedor no válido');
      return;
    }
    void fetchSellerData();
  }, [sellerId]);

  async function fetchSellerData() {
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
        setError((body as { error?: string }).error || 'No se pudo cargar el vendedor');
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
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
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
        setError('Error al cargar los datos del vendedor');
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!seller || error) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || 'Vendedor no encontrado'}</h1>
          <PublicBackButton className="text-blue-600 hover:underline font-medium">
            ← Volver
          </PublicBackButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <PublicBackButton className="text-gray-700 hover:text-gray-900 hover:underline flex items-center gap-1 font-medium text-sm">
            ← Volver
          </PublicBackButton>
        </div>
      </nav>
      <SellerPublicWebsite
        seller={seller}
        vehicles={vehicles}
        reviews={reviews}
        websiteSettings={websiteSettings}
        branding={branding}
        profile={profile}
      />
    </>
  );
}
