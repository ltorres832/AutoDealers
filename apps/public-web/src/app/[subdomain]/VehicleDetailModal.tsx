'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos: string[];
  description: string;
  mileage?: number;
  condition: string;
  specifications?: {
    engine?: string;
    transmission?: string;
    fuelType?: string;
    color?: string;
    doors?: number;
    seats?: number;
  };
}

interface VehicleDetailModalProps {
  vehicle: Vehicle;
  subdomain: string;
  onClose: () => void;
}

export default function VehicleDetailModal({ vehicle, subdomain, onClose }: VehicleDetailModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Photos */}
          {vehicle.photos && vehicle.photos.length > 0 && (
            <div className="mb-6">
              <div className="relative h-96 bg-gray-200 rounded-lg overflow-hidden mb-4">
                <img
                  src={vehicle.photos[currentPhotoIndex]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
                {vehicle.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? vehicle.photos.length - 1 : prev - 1))}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                      aria-label="Foto anterior"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex((prev) => (prev === vehicle.photos.length - 1 ? 0 : prev + 1))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                      aria-label="Foto siguiente"
                    >
                      →
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                      {currentPhotoIndex + 1} / {vehicle.photos.length}
                    </div>
                  </>
                )}
              </div>
              {vehicle.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {vehicle.photos.slice(0, 4).map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`relative h-20 bg-gray-200 rounded overflow-hidden border-2 ${
                        currentPhotoIndex === index ? 'border-primary-600' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Vista ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Details */}
            <div>
              <div className="mb-6">
                <h3 className="text-3xl font-bold mb-2">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-4xl font-bold text-green-600 mb-4">
                  {vehicle.currency} {vehicle.price.toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${
                    vehicle.condition === 'new' 
                      ? 'bg-green-100 text-green-800'
                      : vehicle.condition === 'certified'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {vehicle.condition === 'new' ? 'Nuevo' : vehicle.condition === 'certified' ? 'Certificado' : 'Usado'}
                  </span>
                  {vehicle.mileage && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {vehicle.mileage.toLocaleString()} km
                    </span>
                  )}
                </div>
              </div>

              {/* Specifications */}
              {vehicle.specifications && (
                <div className="mb-6">
                  <h4 className="text-xl font-bold mb-4">Especificaciones</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {vehicle.specifications.engine && (
                      <div>
                        <p className="text-sm text-gray-600">Motor</p>
                        <p className="font-semibold">{vehicle.specifications.engine}</p>
                      </div>
                    )}
                    {vehicle.specifications.transmission && (
                      <div>
                        <p className="text-sm text-gray-600">Transmisión</p>
                        <p className="font-semibold">{vehicle.specifications.transmission}</p>
                      </div>
                    )}
                    {vehicle.specifications.fuelType && (
                      <div>
                        <p className="text-sm text-gray-600">Combustible</p>
                        <p className="font-semibold">{vehicle.specifications.fuelType}</p>
                      </div>
                    )}
                    {vehicle.specifications.color && (
                      <div>
                        <p className="text-sm text-gray-600">Color</p>
                        <p className="font-semibold">{vehicle.specifications.color}</p>
                      </div>
                    )}
                    {vehicle.specifications.doors && (
                      <div>
                        <p className="text-sm text-gray-600">Puertas</p>
                        <p className="font-semibold">{vehicle.specifications.doors}</p>
                      </div>
                    )}
                    {vehicle.specifications.seats && (
                      <div>
                        <p className="text-sm text-gray-600">Asientos</p>
                        <p className="font-semibold">{vehicle.specifications.seats}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {vehicle.description && (
                <div className="mb-6">
                  <h4 className="text-xl font-bold mb-4">Descripción</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {vehicle.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Actions */}
            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-4">
                <h4 className="text-xl font-bold mb-4">Interesado en este vehículo?</h4>
                <div className="space-y-3">
                  <Link
                    href={`/${subdomain}/appointment?vehicleId=${vehicle.id}`}
                    className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 text-center block transition"
                  >
                    📅 Agendar Cita de Prueba
                  </Link>
                  <Link
                    href={`/${subdomain}/pre-qualify?vehicleId=${vehicle.id}`}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 text-center block transition"
                  >
                    🚗 Pre-Cualificación para Financiamiento
                  </Link>
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url);
                      alert('¡Enlace copiado al portapapeles!');
                    }}
                    className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
                  >
                    📋 Compartir Vehículo
                  </button>
                </div>

                {/* Share on Social Media */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium mb-3">Compartir en:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = encodeURIComponent(window.location.href);
                        const text = encodeURIComponent(`Mira este ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
                    >
                      Facebook
                    </button>
                    <button
                      onClick={() => {
                        const url = encodeURIComponent(window.location.href);
                        const text = encodeURIComponent(`Mira este ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
                        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
                      }}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-sm"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


