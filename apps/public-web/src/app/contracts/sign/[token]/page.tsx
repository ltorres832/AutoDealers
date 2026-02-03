'use client';

// Portal del cliente para firmar contratos remotamente

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DigitalSignatureCanvas from '../../../../components/DigitalSignatureCanvas';

export default function ContractSigningPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [contract, setContract] = useState<any>(null);
  const [signature, setSignature] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [step, setStep] = useState<'review' | 'sign' | 'complete'>('review');
  const [signerInfo, setSignerInfo] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchContract();
  }, [token]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/sign/${token}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data.contract);
        setSignature(data.signature);
        setSignerInfo({
          name: data.signature.signerName,
          email: data.signature.signerEmail || '',
        });
      } else {
        alert('Token inválido o expirado');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      alert('Error al cargar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureComplete = (data: string) => {
    setSignatureData(data);
  };

  const handleSign = async () => {
    if (!signatureData) {
      alert('Por favor, proporciona tu firma');
      return;
    }

    if (!signerInfo.name) {
      alert('Por favor, ingresa tu nombre');
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(`/api/contracts/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureData,
          signerName: signerInfo.name,
        }),
      });

      if (response.ok) {
        setStep('complete');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al firmar contrato');
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('Error al firmar contrato');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Contrato no encontrado o token inválido</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {step === 'review' && (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Firmar Contrato</h1>
              <p className="text-gray-600">Por favor, revisa el contrato antes de firmar</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Información del Contrato</h3>
              <p className="text-blue-800"><strong>Nombre:</strong> {contract.name}</p>
              <p className="text-blue-800"><strong>Tipo:</strong> <span className="capitalize">{contract.type}</span></p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Vista Previa del Contrato</h3>
              {contract.digitalizedDocumentUrl ? (
                <iframe
                  src={contract.digitalizedDocumentUrl}
                  className="w-full h-96 border border-gray-300 rounded"
                />
              ) : (
                <iframe
                  src={contract.originalDocumentUrl}
                  className="w-full h-96 border border-gray-300 rounded"
                />
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ Importante:</strong> Por favor, revisa cuidadosamente el contrato antes de firmar. 
                Al firmar, aceptas todos los términos y condiciones establecidos en el documento.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('sign')}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Continuar para Firmar
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Firma Digital</h2>
              <p className="text-gray-600">Firma en el área de abajo</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu Nombre Completo *
              </label>
              <input
                type="text"
                value={signerInfo.name}
                onChange={(e) => setSignerInfo({ ...signerInfo, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresa tu nombre completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma Digital
              </label>
              <DigitalSignatureCanvas
                onSignatureComplete={handleSignatureComplete}
                width={600}
                height={200}
              />
            </div>

            {signatureData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✓ Firma capturada correctamente. Haz clic en "Enviar Firma" para completar el proceso.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('review')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                ← Volver
              </button>
              <button
                onClick={handleSign}
                disabled={!signatureData || !signerInfo.name || signing}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {signing ? 'Enviando...' : '✓ Enviar Firma'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
            <div className="text-6xl">✅</div>
            <h2 className="text-3xl font-bold text-gray-900">Contrato Firmado Exitosamente</h2>
            <p className="text-gray-600">
              Tu firma ha sido registrada. Recibirás una copia del contrato firmado por email.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Volver al Inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

