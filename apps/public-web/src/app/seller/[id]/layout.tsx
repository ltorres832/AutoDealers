import type { Metadata } from 'next';
import { getSellerOgProfile } from '@/lib/public-member-og';
import { isKnownDemoId } from '@/lib/demo-account';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getSellerOgProfile(id);

  if (!profile) {
    return {
      title: 'Vendedor no encontrado',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: profile.name,
    description: profile.description,
    robots: isKnownDemoId(id) ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/seller/${id}` },
    openGraph: {
      title: profile.name,
      description: profile.description,
      url: profile.url,
      type: 'profile',
      images: [
        {
          url: profile.imageUrl,
          width: 1200,
          height: 630,
          alt: profile.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: profile.name,
      description: profile.description,
      images: [profile.imageUrl],
    },
  };
}

export default function SellerPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
