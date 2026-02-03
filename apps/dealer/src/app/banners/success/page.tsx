'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function BannerSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [bannerInfo, setBannerInfo] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  async function verifyPayment() {
    try {
      const response = await fetch(`/api/banners/verify?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        setBannerInfo(data.banner);
      } else {
        setSuccess(false);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando pago...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {success ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Pago Exitoso!
            </h1>
            <p className="text-gray-600 mb-6">
              Tu banner premium ha sido pagado exitosamente. 
              Está pendiente de aprobación del administrador.
            </p>
            {bannerInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div className="text-sm text-gray-600 mb-2">Detalles del banner:</div>
                <div className="space-y-1 text-sm">
                  <div><strong>Título:</strong> {bannerInfo.title}</div>
                  <div><strong>Duración:</strong> {bannerInfo.duration} días</div>
                  {bannerInfo.expiresAt && (
                    <div><strong>Expira:</strong> {new Date(bannerInfo.expiresAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>⏳ Pendiente de Aprobación:</strong> El administrador revisará tu banner y lo activará si cumple con las políticas de la plataforma.
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/banners"
                className="block w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
              >
                Ver Mis Banners
              </Link>
              <Link
                href="/dashboard"
                className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium"
              >
                Ir al Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Procesando Pago
            </h1>
            <p className="text-gray-600 mb-6">
              Estamos procesando tu pago. Esto puede tomar unos momentos.
            </p>
            <Link
              href="/banners"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
            >
              Volver a Banners
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BannerSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    }>
      <BannerSuccessContent />
    </Suspense>
  );
}


