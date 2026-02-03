'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  status: string;
  photos: string[];
  videos?: string[];
}

export default function VehiclesList() {
  const { auth } = useAuth();
  const { vehicles, loading } = useRealtimeInventory({
    tenantId: auth?.tenantId,
    status: 'available',
  });

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
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
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {vehicle.photos && vehicle.photos.length > 0 && (
                  <span>📷 {vehicle.photos.length} foto{vehicle.photos.length !== 1 ? 's' : ''}</span>
                )}
                {(vehicle as any).videos && (vehicle as any).videos.length > 0 && (
                  <span>🎥 {(vehicle as any).videos.length} video{(vehicle as any).videos.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <span
                className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                  vehicle.status === 'available'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {vehicle.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}




