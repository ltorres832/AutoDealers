'use client';

import { useState } from 'react';
import { Cosigner, CreditRange, IncomeType } from '@autodealers/crm';

interface FICosignerFormProps {
  requestId: string;
  onCosignerAdded?: (cosigner: Cosigner) => void;
  onCancel?: () => void;
}

export default function FICosignerForm({ requestId, onCosignerAdded, onCancel }: FICosignerFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: 'spouse' as Cosigner['relationship'],
    employment: {
      employer: '',
      monthlyIncome: '',
      timeAtJob: '',
      incomeType: 'salary' as IncomeType,
    },
    creditInfo: {
      creditRange: 'good' as CreditRange,
      notes: '',
    },
    personalInfo: {
      maritalStatus: 'single' as 'single' | 'married' | 'divorced' | 'widowed',
      address: '',
      identification: '',
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/fi/cosigner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          cosignerData: {
            ...formData,
            employment: {
              ...formData.employment,
              monthlyIncome: parseFloat(formData.employment.monthlyIncome) || 0,
              timeAtJob: parseInt(formData.employment.timeAtJob) || 0,
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar co-signer');
      }

      const data = await response.json();
      if (onCosignerAdded) {
        onCosignerAdded(data.cosigner);
      }
    } catch (error: any) {
      alert(error.message || 'Error al agregar co-signer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold">Agregar Co-signer</h3>

      {/* Datos Básicos */}
      <div>
        <h4 className="font-medium mb-3">Datos Básicos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relación *</label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value as Cosigner['relationship'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="spouse">Cónyuge</option>
              <option value="parent">Padre/Madre</option>
              <option value="sibling">Hermano/Hermana</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Información de Empleo */}
      <div>
        <h4 className="font-medium mb-3">Información de Empleo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleador</label>
            <input
              type="text"
              value={formData.employment.employer}
              onChange={(e) => setFormData({
                ...formData,
                employment: { ...formData.employment, employer: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ingreso Mensual *</label>
            <input
              type="number"
              required
              value={formData.employment.monthlyIncome}
              onChange={(e) => setFormData({
                ...formData,
                employment: { ...formData.employment, monthlyIncome: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo en Empleo (meses) *</label>
            <input
              type="number"
              required
              value={formData.employment.timeAtJob}
              onChange={(e) => setFormData({
                ...formData,
                employment: { ...formData.employment, timeAtJob: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ingreso *</label>
            <select
              value={formData.employment.incomeType}
              onChange={(e) => setFormData({
                ...formData,
                employment: { ...formData.employment, incomeType: e.target.value as IncomeType }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="salary">Salario</option>
              <option value="self_employed">Autoempleado</option>
              <option value="business">Negocio</option>
              <option value="retirement">Jubilación</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Información de Crédito */}
      <div>
        <h4 className="font-medium mb-3">Información de Crédito</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Crédito *</label>
            <select
              value={formData.creditInfo.creditRange}
              onChange={(e) => setFormData({
                ...formData,
                creditInfo: { ...formData.creditInfo, creditRange: e.target.value as CreditRange }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="excellent">Excelente (750+)</option>
              <option value="good">Bueno (700-749)</option>
              <option value="fair">Regular (650-699)</option>
              <option value="poor">Bajo (600-649)</option>
              <option value="very_poor">Muy Bajo (&lt;600)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formData.creditInfo.notes}
              onChange={(e) => setFormData({
                ...formData,
                creditInfo: { ...formData.creditInfo, notes: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Información Personal */}
      <div>
        <h4 className="font-medium mb-3">Información Personal</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
            <select
              value={formData.personalInfo.maritalStatus}
              onChange={(e) => setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, maritalStatus: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="single">Soltero</option>
              <option value="married">Casado</option>
              <option value="divorced">Divorciado</option>
              <option value="widowed">Viudo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.personalInfo.address}
              onChange={(e) => setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, address: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identificación</label>
            <input
              type="text"
              value={formData.personalInfo.identification}
              onChange={(e) => setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, identification: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Agregando...' : 'Agregar Co-signer'}
        </button>
      </div>
    </form>
  );
}


