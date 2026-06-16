'use client';

import Link from 'next/link';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';
import { buildPublicVehicleDetailHref, vehicleCatalogTenantId } from '@/lib/public-vehicle-detail-href';
import type { SellerPublicWebsiteSeller, SellerPublicWebsiteVehicle } from '@/components/SellerPublicWebsite';

export default function SellerPublicVehicleCard({
  vehicle,
  seller,
}: {
  vehicle: SellerPublicWebsiteVehicle;
  seller: SellerPublicWebsiteSeller;
}) {
  const showSold =
    vehicle.status === 'sold' ||
    vehicle.showSoldBadge === true ||
    vehicle.showPublicSoldBadge === true;

  const catalogTenantId = vehicleCatalogTenantId(vehicle, seller.tenantId);
  const detailHref = buildPublicVehicleDetailHref({
    vehicleId: vehicle.id,
    tenantId: catalogTenantId,
    sellerId: seller.id,
  });

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden flex flex-col">
      <Link
        href={detailHref}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() =>
          pingCatalogVehicleClick({
            vehicleId: vehicle.id,
            tenantId: catalogTenantId,
            surface: 'seller_inventory',
          })
        }
      >
        {getFirstPhoto(vehicle) ? (
          <div className="relative h-48 bg-white overflow-hidden border-b border-gray-100">
            <img
              src={getFirstPhoto(vehicle)!}
              alt={`${vehicle.make} ${vehicle.model}`}
              className={`w-full h-full object-contain object-center transition group-hover:scale-[1.02] ${
                showSold ? 'opacity-70' : ''
              }`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
            {showSold ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-3xl font-black tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-4 border-white/90 px-4 py-1 rotate-[-6deg]">
                  SOLD
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative h-48 bg-white flex items-center justify-center border-b border-gray-100">
            <span className="text-6xl">🚗</span>
          </div>
        )}
        <div className="p-4 pb-2">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary-700 transition-colors">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-2xl font-bold text-primary-600 mb-2">
            {vehicle.currency} {vehicle.price.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Millaje: {(vehicle.mileage ?? 0).toLocaleString()}{' '}
            {(vehicle.mileage ?? 0) === 1 ? 'milla' : 'millas'}
          </p>
          {vehicle.description ? (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{vehicle.description}</p>
          ) : null}
          <span className="inline-flex items-center text-sm font-semibold text-primary-600 group-hover:underline">
            Ver detalle del vehículo
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
      <div className="p-4 pt-2 mt-auto border-t border-gray-100">
        <div className="flex gap-2 flex-wrap">
          <a
            href={
              seller.whatsapp || seller.phone
                ? `https://wa.me/${(seller.whatsapp || seller.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hola, estoy interesado en el vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency} ${vehicle.price.toLocaleString()}`
                  )}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!seller.whatsapp && !seller.phone) {
                e.preventDefault();
                alert('Número de WhatsApp no disponible');
              }
            }}
            className={`flex-1 min-w-[7rem] px-4 py-2 rounded font-medium text-sm text-center flex items-center justify-center gap-1 ${
              seller.whatsapp || seller.phone
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
            }`}
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openChat', { detail: { vehicleId: vehicle.id } }));
            }}
            className="flex-1 min-w-[7rem] bg-gradient-to-r from-primary-600 to-brand-red-bright600 text-white px-4 py-2 rounded hover:from-primary-700 hover:to-brand-red-bright700 font-medium text-sm"
          >
            Chat
          </button>
          {seller.email ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = `mailto:${seller.email}?subject=${encodeURIComponent(
                  `Consulta sobre ${vehicle.year} ${vehicle.make} ${vehicle.model}`
                )}`;
              }}
              className="flex-1 min-w-[7rem] bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-medium text-sm"
            >
              Email
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
