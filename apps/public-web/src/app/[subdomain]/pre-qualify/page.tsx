'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PreQualificationResult {
  id: string;
  result: {
    status: 'pre_approved' | 'partially_approved' | 'not_qualified' | 'manual_review';
    score: number;
    approvedAmount?: number;
    interestRate?: number;
    reasons: string[];
    suggestedVehicles: string[];
  };
}

export default function PreQualifyPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params.subdomain as string;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreQualificationResult | null>(null);
  const [suggestedVehicles, setSuggestedVehicles] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    // Información Personal
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    identificationNumber: '',
    
    // Información Financiera
    monthlyIncome: '',
    monthlyExpenses: '',
    employmentType: 'employed' as 'employed' | 'self_employed' | 'retired' | 'unemployed',
    employmentDuration: '',
    creditHistory: 'good' as 'excellent' | 'good' | 'fair' | 'limited' | 'poor',
    
    // Preferencias
    desiredPriceMin: '',
    desiredPriceMax: '',
    vehicleType: 'both' as 'new' | 'used' | 'both',
    financingTerm: '60',
    interestedVehicleId: '',
  });

  useEffect(() => {
    if (result && result.result.suggestedVehicles.length > 0) {
      fetchSuggestedVehicles();
    }
  }, [result]);

  async function fetchSuggestedVehicles() {
    if (!result) return;
    
    try {
      const vehicleIds = result.result.suggestedVehicles;
      const vehicles = await Promise.all(
        vehicleIds.map(async (id) => {
          const response = await fetch(`/api/tenant/${subdomain}?vehicleId=${id}`);
          const data = await response.json();
          return data.vehicle;
        })
      );
      setSuggestedVehicles(vehicles.filter(Boolean));
    } catch (error) {
      console.error('Error fetching suggested vehicles:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/pre-qualification/${subdomain}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth,
            identificationNumber: formData.identificationNumber,
          },
          financial: {
            monthlyIncome: formData.monthlyIncome,
            monthlyExpenses: formData.monthlyExpenses,
            employmentType: formData.employmentType,
            employmentDuration: formData.employmentDuration,
            creditHistory: formData.creditHistory,
          },
          preferences: {
            desiredPriceRange: {
              min: formData.desiredPriceMin,
              max: formData.desiredPriceMax,
            },
            vehicleType: formData.vehicleType,
            financingTerm: formData.financingTerm,
            interestedVehicleId: formData.interestedVehicleId || undefined,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.preQualification);
        setStep(4); // Mostrar resultado
      } else {
        alert(data.error || 'Error al procesar la pre-cualificación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la pre-cualificación');
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step < 3) {
      setStep(step + 1);
    }
  }

  function prevStep() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  if (step === 4 && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Resultado */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {result.result.status === 'pre_approved' && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-green-600 mb-2">¡Felicitaciones! Estás Pre-Aprobado</h2>
                <p className="text-gray-600">Has sido pre-aprobado para financiamiento</p>
              </div>
            )}

            {result.result.status === 'partially_approved' && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-yellow-600 mb-2">Pre-Aprobado Parcialmente</h2>
                <p className="text-gray-600">Calificas para un monto menor al solicitado</p>
              </div>
            )}

            {result.result.status === 'not_qualified' && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-red-600 mb-2">No Calificas en este momento</h2>
                <p className="text-gray-600">Tu solicitud no cumple con los requisitos mínimos</p>
              </div>
            )}

            {result.result.status === 'manual_review' && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-blue-600 mb-2">Revisión Manual Requerida</h2>
                <p className="text-gray-600">Tu solicitud será revisada por nuestro equipo</p>
              </div>
            )}

            {/* Detalles del Resultado */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Detalles de tu Pre-Cualificación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Score de Cualificación</p>
                  <p className="text-2xl font-bold">{result.result.score}/100</p>
                </div>
                {result.result.approvedAmount && (
                  <div>
                    <p className="text-sm text-gray-600">Monto Aprobado</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${result.result.approvedAmount.toLocaleString()}
                    </p>
                  </div>
                )}
                {result.result.interestRate && (
                  <div>
                    <p className="text-sm text-gray-600">Tasa de Interés Estimada</p>
                    <p className="text-2xl font-bold">{result.result.interestRate.toFixed(2)}%</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="text-lg font-semibold capitalize">
                    {result.result.status === 'pre_approved' && 'Pre-Aprobado'}
                    {result.result.status === 'partially_approved' && 'Parcialmente Aprobado'}
                    {result.result.status === 'not_qualified' && 'No Califica'}
                    {result.result.status === 'manual_review' && 'Revisión Manual'}
                  </p>
                </div>
              </div>

              {result.result.reasons.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Razones de la Decisión:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {result.result.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Vehículos Sugeridos */}
            {suggestedVehicles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4">Vehículos que Califican</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedVehicles.map((vehicle) => (
                    <Link
                      key={vehicle.id}
                      href={`/${subdomain}?vehicle=${vehicle.id}`}
                      className="bg-white border rounded-lg p-4 hover:shadow-lg transition"
                    >
                      {vehicle.photos && vehicle.photos.length > 0 && (
                        <img
                          src={vehicle.photos[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-48 object-cover rounded mb-3"
                        />
                      )}
                      <h4 className="font-bold text-lg">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-2xl font-bold text-green-600">
                        ${vehicle.price.toLocaleString()}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4">
              {(result.result.status === 'pre_approved' || result.result.status === 'partially_approved') && (
                <>
                  <Link
                    href={`/${subdomain}/appointment`}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 text-center"
                  >
                    📅 Agendar Cita
                  </Link>
                  <Link
                    href={`/${subdomain}`}
                    className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 text-center"
                  >
                    Ver Inventario Completo
                  </Link>
                </>
              )}
              {result.result.status === 'not_qualified' && (
                <>
                  <Link
                    href={`/${subdomain}`}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 text-center"
                  >
                    Ver Inventario
                  </Link>
                  <button
                    onClick={() => {
                      setStep(1);
                      setResult(null);
                      setFormData({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        dateOfBirth: formData.dateOfBirth,
                        identificationNumber: formData.identificationNumber,
                        monthlyIncome: '',
                        monthlyExpenses: '',
                        employmentType: 'employed',
                        employmentDuration: '',
                        creditHistory: 'good',
                        desiredPriceMin: '',
                        desiredPriceMax: '',
                        vehicleType: 'both',
                        financingTerm: '60',
                        interestedVehicleId: '',
                      });
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Intentar Nuevamente
                  </button>
                </>
              )}
              {result.result.status === 'manual_review' && (
                <Link
                  href={`/${subdomain}/appointment`}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 text-center"
                >
                  Contactar con un Asesor
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Pre-Cualificación para Financiamiento</h1>
          <p className="text-gray-600 text-lg">
            Descubre si calificas para financiamiento en solo 2 minutos. Sin compromiso, 100% gratuito.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Paso {step} de 3</span>
            <span className="text-sm text-gray-500">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          {/* Paso 1: Información Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6">Información Personal</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Teléfono *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Número de Identificación *</label>
                <input
                  type="text"
                  value={formData.identificationNumber}
                  onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>
            </div>
          )}

          {/* Paso 2: Información Financiera */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6">Información Financiera</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ingresos Mensuales (USD) *</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gastos Mensuales (USD) *</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monthlyExpenses}
                  onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Empleo *</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                  className="w-full border rounded px-4 py-2"
                  required
                >
                  <option value="employed">Empleado</option>
                  <option value="self_employed">Independiente</option>
                  <option value="retired">Retirado</option>
                  <option value="unemployed">Desempleado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tiempo en el Trabajo Actual (meses) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.employmentDuration}
                  onChange={(e) => setFormData({ ...formData, employmentDuration: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Historial Crediticio *</label>
                <select
                  value={formData.creditHistory}
                  onChange={(e) => setFormData({ ...formData, creditHistory: e.target.value as any })}
                  className="w-full border rounded px-4 py-2"
                  required
                >
                  <option value="excellent">Excelente</option>
                  <option value="good">Bueno</option>
                  <option value="fair">Regular</option>
                  <option value="limited">Limitado</option>
                  <option value="poor">Pobre</option>
                </select>
              </div>
            </div>
          )}

          {/* Paso 3: Preferencias */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6">Preferencias de Financiamiento</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Precio Mínimo (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.desiredPriceMin}
                    onChange={(e) => setFormData({ ...formData, desiredPriceMin: e.target.value })}
                    className="w-full border rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Precio Máximo (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.desiredPriceMax}
                    onChange={(e) => setFormData({ ...formData, desiredPriceMax: e.target.value })}
                    className="w-full border rounded px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Vehículo</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                  className="w-full border rounded px-4 py-2"
                >
                  <option value="both">Nuevo o Usado</option>
                  <option value="new">Solo Nuevo</option>
                  <option value="used">Solo Usado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Plazo de Financiamiento (meses) *</label>
                <select
                  value={formData.financingTerm}
                  onChange={(e) => setFormData({ ...formData, financingTerm: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                  required
                >
                  <option value="36">36 meses</option>
                  <option value="48">48 meses</option>
                  <option value="60">60 meses</option>
                  <option value="72">72 meses</option>
                  <option value="84">84 meses</option>
                </select>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                ← Anterior
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Enviar Solicitud'}
              </button>
            )}
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>🔒 Tu información está protegida y será usada solo para el proceso de pre-cualificación.</p>
          <p className="mt-2">Esta pre-cualificación es preliminar y no garantiza la aprobación final del financiamiento.</p>
        </div>
      </div>
    </div>
  );
}


