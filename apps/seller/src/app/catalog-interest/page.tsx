import CatalogInterestClient from './CatalogInterestClient';

type CatalogInterestSearchParams = {
  vehicleId?: string;
  from?: string;
  to?: string;
};

export default async function CatalogInterestPage({
  searchParams,
}: {
  searchParams: Promise<CatalogInterestSearchParams>;
}) {
  const sp = await searchParams;

  return (
    <CatalogInterestClient
      initialVehicleId={(sp.vehicleId || '').trim()}
      initialFrom={(sp.from || '').trim()}
      initialTo={(sp.to || '').trim()}
    />
  );
}
