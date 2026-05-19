import SubdomainSellerWebsite from '@/components/SubdomainSellerWebsite';

/**
 * Ruta interna (rewrite desde `/` en autodealers-7f62e.web.app) para la web azul del vendedor.
 * La barra de direcciones sigue mostrando `/`.
 */
export default async function HomeSellerPage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  return <SubdomainSellerWebsite sellerId={sellerId} />;
}
