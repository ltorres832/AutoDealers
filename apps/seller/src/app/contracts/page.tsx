'use client';

// Página de gestión de contratos para sellers

import { useState, useEffect } from 'react';
import ContractUploadManager from '@/components/ContractUploadManager';
import ContractSigningModal from '@/components/ContractSigningModal';

interface Contract {
  id: string;
  name: string;
  type: string;
  status: string;
  saleId?: string;
  signatures: Array<{
    id: string;
    signer: string;
    signerName: string;
    status: string;
    signedAt?: Date;
  }>;
  createdAt: Date;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchContracts();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contracts', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInPerson = (contract: Contract) => {
    setSelectedContract(contract);
    setShowSigningModal(true);
  };

  const handleSign = async (signatureData: string) => {
    if (!selectedContract) return;

    const response = await fetch(`/api/contracts/${selectedContract.id}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        signatureData,
        signatureType: 'in_person',
      }),
    });

    if (!response.ok) {
      throw new Error('Error al firmar contrato');
    }

    await fetchContracts();
  };

  const handleSendForSignature = async (contract: Contract, signerEmail: string, signerName: string) => {
    const response = await fetch(`/api/contracts/${contract.id}/send-for-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        signerEmail,
        signerName,
      }),
    });

    if (response.ok) {
      alert('Contrato enviado para firma. El cliente recibirá un email con el enlace.');
      await fetchContracts();
    } else {
      const error = await response.json();
      alert(error.error || 'Error al enviar contrato');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: 'Borrador' },
      pending_signatures: { color: 'bg-yellow-500', label: 'Pendiente Firmas' },
      partially_signed: { color: 'bg-blue-500', label: 'Parcialmente Firmado' },
      fully_signed: { color: 'bg-green-600', label: 'Completamente Firmado' },
      completed: { color: 'bg-green-700', label: 'Completado' },
      cancelled: { color: 'bg-red-500', label: 'Cancelado' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-500', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
            <p className="mt-2 text-gray-600">
              Gestiona tus contratos, digitalízalos y obtén firmas digitales
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Subir Contrato
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Subir Nuevo Contrato</h2>
            <button
              onClick={() => setShowUpload(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <ContractUploadManager
            onContractCreated={(contractId) => {
              setShowUpload(false);
              fetchContracts();
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No hay contratos aún</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Subir Primer Contrato
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firmas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contract.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 capitalize">{contract.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(contract.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {contract.signatures?.filter(s => s.status === 'signed').length || 0} / {contract.signatures?.length || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleSignInPerson(contract)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Firmar en Persona
                    </button>
                    <button
                      onClick={() => {
                        const email = prompt('Email del firmante:');
                        const name = prompt('Nombre del firmante:');
                        if (email && name) {
                          handleSendForSignature(contract, email, name);
                        }
                      }}
                      className="text-green-600 hover:text-green-900"
                    >
                      Enviar para Firma
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSigningModal && selectedContract && (
        <ContractSigningModal
          contract={selectedContract}
          signer={{
            name: user?.name || 'Usuario',
            email: user?.email,
            role: 'seller',
          }}
          onSign={handleSign}
          onClose={() => {
            setShowSigningModal(false);
            setSelectedContract(null);
          }}
        />
      )}
    </div>
  );
}


