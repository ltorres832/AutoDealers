'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MultiDealerMembership {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxDealers?: number | null;
    maxCorporateEmails?: number | null;
    corporateEmailEnabled: boolean;
    emailAliases: boolean;
  };
}

export default function MultiDealerRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');
  const [memberships, setMemberships] = useState<MultiDealerMembership[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<string>('');
  const [formData, setFormData] = useState({
    // Información básica
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Información de la empresa
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyCountry: '',
    taxId: '', // Número de identificación fiscal
    // Información del negocio
    businessType: '', // Tipo de negocio
    numberOfLocations: '', // Número de ubicaciones
    yearsInBusiness: '', // Años en el negocio
    currentInventory: '', // Inventario actual aproximado
    expectedDealers: '', // Número de dealers que espera gestionar
    // Información adicional
    reasonForMultiDealer: '', // Razón para necesitar Multi Dealer
    additionalInfo: '', // Información adicional
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchMultiDealerMemberships();
  }, []);

  async function fetchMultiDealerMemberships() {
    try {
      // IMPORTANTE: Las membresías Multi Dealer NO se muestran hasta que el admin apruebe
      // Por ahora, obtenemos todas las membresías dealer y las filtramos manualmente
      // En producción, esto debería venir del backend con la lógica de aprobación
      const response = await fetch('/api/public/memberships?type=dealer');
      const data = await response.json();
      
      // Filtrar solo membresías Multi Dealer
      // NOTA: Estas membresías solo serán visibles después de la aprobación del admin
      // El usuario debe completar el formulario primero para solicitar acceso
      const multiDealerMemberships = (data.memberships || []).filter(
        (m: any) => m.features?.multiDealerEnabled === true
      );
      
      // Si no hay membresías Multi Dealer visibles, mostrar un mensaje
      if (multiDealerMemberships.length === 0) {
        // Esto es normal: las membresías Multi Dealer requieren aprobación previa
        // El usuario puede completar el formulario y luego el admin las aprobará
        console.log('No hay membresías Multi Dealer visibles (requieren aprobación)');
      }
      
      setMemberships(multiDealerMemberships);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    }
  }

  const selectedMembershipData = memberships.find((m) => m.id === selectedMembership);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!selectedMembership) {
      setError('Debes seleccionar una membresía Multi Dealer');
      return;
    }

    // Validaciones de campos requeridos
    if (!formData.companyName || !formData.companyAddress || !formData.companyCity) {
      setError('Debes completar todos los campos de información de la empresa');
      return;
    }

    if (!formData.reasonForMultiDealer) {
      setError('Debes explicar la razón para necesitar Multi Dealer');
      return;
    }

    setLoading(true);

    try {
      // Crear solicitud de Multi Dealer (pendiente de aprobación)
      const response = await fetch('/api/public/register/multi-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          membershipId: selectedMembership,
          referralCode: referralCodeFromUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar');
      }

      // Redirigir a página de confirmación
      router.push('/register/multi-dealer/success');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Registro Multi Dealer
            </h1>
            <p className="text-gray-600">
              Solicita acceso para gestionar múltiples dealers desde una sola cuenta
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ Esta membresía requiere aprobación del administrador
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Membresía */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona tu Plan Multi Dealer *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    onClick={() => setSelectedMembership(membership.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMembership === membership.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-bold text-lg mb-2">{membership.name}</h3>
                    <p className="text-2xl font-bold text-primary-600 mb-2">
                      ${membership.price}
                      <span className="text-sm text-gray-600">
                        /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
                      </span>
                    </p>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="font-semibold text-blue-900">
                          🏢 Dealers Permitidos:{' '}
                          {membership.features.maxDealers === null || membership.features.maxDealers === undefined
                            ? 'Ilimitados'
                            : membership.features.maxDealers}
                        </p>
                      </div>
                      {membership.features.corporateEmailEnabled && (
                        <p>
                          📧 Emails:{' '}
                          {membership.features.maxCorporateEmails === null || membership.features.maxCorporateEmails === undefined
                            ? 'Ilimitados'
                            : membership.features.maxCorporateEmails}
                        </p>
                      )}
                      <p className="text-xs text-yellow-600 mt-2">
                        ⚠️ Requiere aprobación del administrador
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Información Personal */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Información Personal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Información de la Empresa */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Información de la Empresa</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, companyAddress: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={formData.companyCity}
                    onChange={(e) =>
                      setFormData({ ...formData, companyCity: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado/Provincia
                  </label>
                  <input
                    type="text"
                    value={formData.companyState}
                    onChange={(e) =>
                      setFormData({ ...formData, companyState: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={formData.companyZip}
                    onChange={(e) =>
                      setFormData({ ...formData, companyZip: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    País *
                  </label>
                  <input
                    type="text"
                    value={formData.companyCountry}
                    onChange={(e) =>
                      setFormData({ ...formData, companyCountry: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Identificación Fiscal (Tax ID)
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Información del Negocio */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Información del Negocio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Negocio
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) =>
                      setFormData({ ...formData, businessType: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="dealer_group">Grupo de Concesionarios</option>
                    <option value="franchise">Franquicia</option>
                    <option value="corporation">Corporación</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Ubicaciones
                  </label>
                  <input
                    type="number"
                    value={formData.numberOfLocations}
                    onChange={(e) =>
                      setFormData({ ...formData, numberOfLocations: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Años en el Negocio
                  </label>
                  <input
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) =>
                      setFormData({ ...formData, yearsInBusiness: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inventario Actual Aproximado
                  </label>
                  <input
                    type="number"
                    value={formData.currentInventory}
                    onChange={(e) =>
                      setFormData({ ...formData, currentInventory: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Dealers que Espera Gestionar *
                  </label>
                  <input
                    type="number"
                    value={formData.expectedDealers}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedDealers: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Razón para Multi Dealer */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Información Adicional</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón para Necesitar Multi Dealer *
                </label>
                <textarea
                  value={formData.reasonForMultiDealer}
                  onChange={(e) =>
                    setFormData({ ...formData, reasonForMultiDealer: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                  placeholder="Explica por qué necesitas gestionar múltiples dealers..."
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Información Adicional
                </label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalInfo: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Cualquier información adicional que consideres relevante..."
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-6 border-t">
              <Link
                href="/register"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Enviando Solicitud...' : 'Enviar Solicitud de Aprobación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

