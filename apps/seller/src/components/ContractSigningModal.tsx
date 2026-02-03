'use client';

// Modal para firmar contratos en persona (versión seller)

import { useState } from 'react';
import DigitalSignatureCanvas from './DigitalSignatureCanvas';

interface ContractSigningModalProps {
  contract: any;
  signer: {
    name: string;
    email?: string;
    phone?: string;
    role: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
  };
  onSign: (signatureData: string) => Promise<void>;
  onClose: () => void;
}

export default function ContractSigningModal({
  contract,
  signer,
  onSign,
  onClose,
}: ContractSigningModalProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [step, setStep] = useState<'review' | 'sign'>('review');

  const handleSignatureComplete = (data: string) => {
    setSignatureData(data);
  };

  const handleSign = async () => {
    if (!signatureData) {
      alert('Por favor, proporciona tu firma');
      return;
    }

    setSigning(true);
    try {
      await onSign(signatureData);
      alert('Contrato firmado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error signing contract:', error);
      alert('Error al firmar contrato');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Firmar Contrato</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Información del Firmante</h3>
                <p className="text-blue-800"><strong>Nombre:</strong> {signer.name}</p>
                {signer.email && <p className="text-blue-800"><strong>Email:</strong> {signer.email}</p>}
                {signer.phone && <p className="text-blue-800"><strong>Teléfono:</strong> {signer.phone}</p>}
                <p className="text-blue-800"><strong>Rol:</strong> <span className="capitalize">{signer.role}</span></p>
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
                  <strong>⚠️ Importante:</strong> Por favor, revisa el contrato antes de firmar. 
                  Al firmar, aceptas todos los términos y condiciones establecidos en el documento.
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep('sign')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continuar para Firmar
                </button>
              </div>
            </div>
          )}

          {step === 'sign' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Firma Digital</h3>
                <DigitalSignatureCanvas
                  onSignatureComplete={handleSignatureComplete}
                  width={600}
                  height={200}
                />
              </div>

              {signatureData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    ✓ Firma capturada correctamente. Haz clic en "Confirmar Firma" para completar el proceso.
                  </p>
                </div>
              )}

              <div className="flex justify-between space-x-4">
                <button
                  onClick={() => setStep('review')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <div className="flex space-x-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!signatureData || signing}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {signing ? 'Firmando...' : '✓ Confirmar Firma'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


