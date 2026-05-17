'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';
import {
  PublishVehicleToSocialModal,
  type PublishSocialVehicle,
} from '@autodealers/shared/client';

export default function VehiclesList() {
  const { auth } = useAuth();
  const { vehicles, loading } = useRealtimeInventory({
    tenantId: auth?.tenantId,
    status: 'available',
  });
  const [socialPublishVehicle, setSocialPublishVehicle] = useState<PublishSocialVehicle | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-8">
            No hay vehículos disponibles
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              {vehicle.photos && vehicle.photos.length > 0 && (
                <div className="relative h-48 bg-gray-200">
                  <Image
                    src={vehicle.photos[0]}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-lg">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-2xl font-bold text-primary-600 mt-2">
                  {vehicle.currency} {vehicle.price.toLocaleString()}
                </p>
                {vehicle.photos && vehicle.photos.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    📷 {vehicle.photos.length} foto{vehicle.photos.length !== 1 ? 's' : ''}
                  </p>
                )}
                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                    vehicle.status === 'available'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {vehicle.status}
                </span>

                {vehicle.status === 'available' && (vehicle.photos?.length ?? 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSocialPublishVehicle({
                        id: vehicle.id,
                        tenantId: vehicle.tenantId,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        price: vehicle.price,
                        currency: vehicle.currency,
                        status: vehicle.status,
                        photos: vehicle.photos,
                      })
                    }
                    className="mt-4 w-full px-4 py-2 rounded font-medium text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                  >
                    📱 Publicar en redes
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {socialPublishVehicle ? (
        <PublishVehicleToSocialModal
          vehicle={socialPublishVehicle}
          onClose={() => setSocialPublishVehicle(null)}
          mode="admin"
        />
      ) : null}
    </>
  );
}
