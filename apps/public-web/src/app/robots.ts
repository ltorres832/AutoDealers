import type { MetadataRoute } from 'next';
import { getPublicSeoBaseUrl } from '@/lib/public-seo';

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSeoBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/login',
        '/setup-firebase',
        '/contracts/',
        '/fi/',
        '/upload-documents/',
        '/evaluar/',
        '/review/',
        '/survey/',
        '/ads-preview',
        '/home-seller/',
        '/partners/',
        '/promo/',
        '/sales',
        '/sales/',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
