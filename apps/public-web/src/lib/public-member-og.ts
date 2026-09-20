import { getFirestore } from '@autodealers/core';
import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';
import { DEFAULT_PLATFORM_BRAND_ASSET } from '@autodealers/shared/platform-branding-client';
import { resolvePublicMediaUrl } from '@/lib/resolve-media-url';

export type PublicMemberOgProfile = {
  name: string;
  description: string;
  imageUrl: string;
  url: string;
};

function absoluteMedia(url: string | undefined | null): string | undefined {
  return resolvePublicMediaUrl(url, { origin: resolvePublicWebUrl() });
}

function platformFallbackImage(): string {
  return absoluteMedia(DEFAULT_PLATFORM_BRAND_ASSET) || DEFAULT_PLATFORM_BRAND_ASSET;
}

export async function getSellerOgProfile(sellerId: string): Promise<PublicMemberOgProfile | null> {
  const db = getFirestore();
  const sellerSnap = await db.collection('users').doc(sellerId).get();
  if (!sellerSnap.exists) return null;

  const sellerData = sellerSnap.data();
  if (sellerData?.role !== 'seller' || sellerData?.status === 'inactive') return null;

  const name = String(sellerData.name || 'Vendedor').trim();
  const title = String(sellerData.title || sellerData.jobTitle || 'Vendedor profesional').trim();
  let imageUrl =
    absoluteMedia(sellerData.photo) ||
    absoluteMedia(sellerData.photoUrl) ||
    absoluteMedia(sellerData.profilePhoto);

  const tenantId = sellerData.tenantId as string | undefined;
  if (!imageUrl && tenantId) {
    const tenantSnap = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantSnap.data();
    const logo = (tenantData?.branding as { logo?: string } | undefined)?.logo;
    imageUrl = absoluteMedia(logo);
  }

  if (!imageUrl) {
    imageUrl = platformFallbackImage();
  }

  const base = resolvePublicWebUrl();
  return {
    name,
    description: `Conoce a ${name}, ${title}. Inventario, contacto y reseñas en AutoDealersOnline.`,
    imageUrl,
    url: `${base}/seller/${sellerId}`,
  };
}

export async function getDealerOgProfile(dealerId: string): Promise<PublicMemberOgProfile | null> {
  const db = getFirestore();
  const dealerSnap = await db.collection('users').doc(dealerId).get();
  if (!dealerSnap.exists) return null;

  const dealerData = dealerSnap.data();
  if (dealerData?.role !== 'dealer' || dealerData?.status !== 'active') return null;

  const tenantId = dealerData.tenantId as string | undefined;
  if (!tenantId) return null;

  const tenantSnap = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantSnap.data();

  const companyName = String(
    tenantData?.companyName || tenantData?.name || dealerData.name || 'Concesionario'
  ).trim();
  const name = String(dealerData.name || companyName).trim();

  let imageUrl =
    absoluteMedia(dealerData.photo) ||
    absoluteMedia(dealerData.photoUrl) ||
    absoluteMedia((tenantData?.branding as { logo?: string } | undefined)?.logo) ||
    absoluteMedia(tenantData?.photo) ||
    absoluteMedia(tenantData?.photoUrl);

  if (!imageUrl) {
    imageUrl = platformFallbackImage();
  }

  const base = resolvePublicWebUrl();
  return {
    name: companyName,
    description: `Inventario, vendedores y contacto de ${companyName} en AutoDealersOnline.`,
    imageUrl,
    url: `${base}/dealer/${dealerId}`,
  };
}
