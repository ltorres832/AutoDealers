'use client';

import Link from 'next/link';
import { getFirstPhoto, handleImageError } from '@/lib/vehicle-image';
import { pingCatalogVehicleClick } from '@/lib/catalog-vehicle-click';
import { buildPublicVehicleDetailHref, vehicleCatalogTenantId } from '@/lib/public-vehicle-detail-href';
import { buildWhatsAppHref } from '@/lib/contact-links';
import type { SellerPublicWebsiteSeller, SellerPublicWebsiteVehicle } from '@/components/SellerPublicWebsite';
import VehicleImageFrame from '@/components/VehicleImageFrame';

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
  const whatsappHref = buildWhatsAppHref(
    seller.whatsapp || seller.phone,
    `Hola, estoy interesado en el vehículo: ${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.currency} ${vehicle.price.toLocaleString()}`
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link
        href={detailHref}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-t-xl"
        onClick={() =>
          pingCatalogVehicleClick({
            vehicleId: vehicle.id,
            tenantId: catalogTenantId,
            surface: 'seller_inventory',
          })
        }
      >
        {getFirstPhoto(vehicle) ? (
          <VehicleImageFrame
              src={getFirstPhoto(vehicle)!}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="h-32 border-b border-slate-100"
              imageClassName={`transition group-hover:scale-[1.02] ${
                showSold ? 'opacity-60' : ''
              }`}
              onError={handleImageError}
          >
            {showSold ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-black tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] border-[3px] border-white/90 px-3 py-0.5 rotate-[-6deg]">
                  SOLD
                </span>
              </div>
            ) : null}
          </VehicleImageFrame>
        ) : (
          <div className="relative h-32 bg-slate-50 flex items-center justify-center border-b border-slate-100">
            <span className="text-4xl">🚗</span>
          </div>
        )}
        <div className="p-2.5 pb-2">
          <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary-700 transition-colors line-clamp-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-base font-extrabold text-primary-600 mb-1">
            {vehicle.currency} {vehicle.price.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mb-1">
            {(vehicle.mileage ?? 0).toLocaleString()}{' '}
            {(vehicle.mileage ?? 0) === 1 ? 'milla' : 'millas'}
          </p>
          <span className="inline-flex items-center text-[11px] font-semibold text-primary-600 group-hover:underline">
            Ver detalle
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 mt-auto border-t border-slate-100 pt-2">
        <div className="flex gap-1.5">
          <a
            href={whatsappHref || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!whatsappHref) {
                e.preventDefault();
                alert('Número de WhatsApp no disponible');
              }
            }}
            className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] text-center ${
              whatsappHref
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-white cursor-not-allowed opacity-50'
            }`}
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openChat', { detail: { vehicleId: vehicle.id } }));
            }}
            className="flex-1 bg-primary-600 text-white py-1.5 rounded-lg hover:bg-primary-700 font-semibold text-[11px]"
          >
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
