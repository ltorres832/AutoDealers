'use client';

import { useState } from 'react';
import { FinancingOption } from '@autodealers/crm';

interface FIFinancingComparisonProps {
  requestId: string;
  vehiclePrice: number;
  downPayment: number;
  onOptionSelected?: (optionId: string) => void;
}

export default function FIFinancingComparison({
  requestId,
  vehiclePrice,
  downPayment,
  onOptionSelected,
}: FIFinancingComparisonProps) {
  const [options, setOptions] = useState<FinancingOption[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState({
    lender: '',
    lenderType: 'bank' as 'internal' | 'bank' | 'credit_union' | 'captive' | 'other',
    type: 'purchase' as 'purchase' | 'lease',
    interestRate: '',
    term: '60',
    downPayment: downPayment.toString(),
    requirements: '',
    features: '',
  });

  async function handleCompare() {
    if (options.length === 0) {
      alert('Agrega al menos una opción de financiamiento');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/fi/financing-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          options: options.map(opt => ({
            ...opt,
            monthlyPayment: calculateMonthlyPayment(opt),
            totalAmount: calculateTotalAmount(opt),
            approvalProbability: 0.8, // Por defecto, se puede mejorar con scoring
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al comparar opciones');
      }

      const data = await response.json();
      setComparison(data.comparison);
    } catch (error: any) {
      alert(error.message || 'Error al comparar opciones');
    } finally {
      setLoading(false);
    }
  }

  function calculateMonthlyPayment(option: Partial<FinancingOption>): number {
    const principal = vehiclePrice - (parseFloat(option.downPayment?.toString() || '0'));
    const monthlyRate = (parseFloat(option.interestRate?.toString() || '0') / 100) / 12;
    const term = parseInt(option.term?.toString() || '60');
    
    if (monthlyRate === 0) {
      return principal / term;
    }
    
    return principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1);
  }

  function calculateTotalAmount(option: Partial<FinancingOption>): number {
    const monthlyPayment = calculateMonthlyPayment(option);
    const term = parseInt(option.term?.toString() || '60');
    return monthlyPayment * term;
  }

  function handleAddOption() {
    const parsedOption: Partial<FinancingOption> = {
      interestRate: parseFloat(newOption.interestRate) || 0,
      term: parseInt(newOption.term) || 60,
      downPayment: parseFloat(newOption.downPayment) || downPayment,
    };
    const option: FinancingOption = {
      id: Date.now().toString(),
      lender: newOption.lender,
      lenderType: newOption.lenderType,
      type: newOption.type,
      interestRate: parsedOption.interestRate || 0,
      monthlyPayment: calculateMonthlyPayment(parsedOption),
      totalAmount: calculateTotalAmount(parsedOption),
      term: parsedOption.term || 60,
      downPayment: parsedOption.downPayment || downPayment,
      requirements: newOption.requirements.split(',').map(r => r.trim()).filter(r => r),
      approvalProbability: 0.8,
      isRecommended: false,
      features: newOption.features.split(',').map(f => f.trim()).filter(f => f),
      createdAt: new Date(),
    };

    setOptions([...options, option]);
    setNewOption({
      lender: '',
      lenderType: 'bank',
      type: 'purchase',
      interestRate: '',
      term: '60',
      downPayment: downPayment.toString(),
      requirements: '',
      features: '',
    });
    setShowAddOption(false);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Comparación de Opciones de Financiamiento</h2>
        <button
          onClick={() => setShowAddOption(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Agregar Opción
        </button>
      </div>

      {options.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Opciones Agregadas ({options.length})</h3>
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.id} className="border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-medium">{opt.lender}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {opt.interestRate}% APR - {opt.term} meses
                  </span>
                </div>
                <button
                  onClick={() => setOptions(options.filter(o => o.id !== opt.id))}
                  className="text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || options.length === 0}
            className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Comparando...' : 'Comparar Opciones'}
          </button>
        </div>
      )}

      {comparison && (
        <div className="mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-green-900 mb-2">💡 Recomendación</h3>
            <p className="text-green-800">{comparison.recommendation}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plazo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago Mensual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prob. Aprobación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparison.comparison.map((opt: FinancingOption & { calculatedMonthlyPayment?: number; calculatedTotalAmount?: number; affordability?: string }) => (
                  <tr key={opt.id} className={opt.id === comparison.bestOption.id ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{opt.lender}</div>
                      {opt.id === comparison.bestOption.id && (
                        <span className="text-xs text-green-600 font-semibold">⭐ Recomendado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{opt.interestRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{opt.term} meses</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      ${(opt.calculatedMonthlyPayment || opt.monthlyPayment).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ${(opt.calculatedTotalAmount || opt.totalAmount).toLocaleString('es-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        opt.approvalProbability >= 0.8 ? 'bg-green-100 text-green-700' :
                        opt.approvalProbability >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(opt.approvalProbability * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          if (onOptionSelected) {
                            onOptionSelected(opt.id);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">Agregar Opción de Financiamiento</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lender *</label>
                  <input
                    type="text"
                    required
                    value={newOption.lender}
                    onChange={(e) => setNewOption({ ...newOption, lender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Lender</label>
                  <select
                    value={newOption.lenderType}
                    onChange={(e) => setNewOption({ ...newOption, lenderType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="internal">Interno</option>
                    <option value="bank">Banco</option>
                    <option value="credit_union">Cooperativa</option>
                    <option value="captive">Captive</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Interés (APR %) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newOption.interestRate}
                    onChange={(e) => setNewOption({ ...newOption, interestRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (meses) *</label>
                  <select
                    value={newOption.term}
                    onChange={(e) => setNewOption({ ...newOption, term: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="36">36 meses</option>
                    <option value="48">48 meses</option>
                    <option value="60">60 meses</option>
                    <option value="72">72 meses</option>
                    <option value="84">84 meses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos (separados por comas)</label>
                  <input
                    type="text"
                    value={newOption.requirements}
                    onChange={(e) => setNewOption({ ...newOption, requirements: e.target.value })}
                    placeholder="Ej: Ingreso mínimo $3000, Crédito 650+"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Características (separadas por comas)</label>
                  <input
                    type="text"
                    value={newOption.features}
                    onChange={(e) => setNewOption({ ...newOption, features: e.target.value })}
                    placeholder="Ej: Sin penalización por pago anticipado, Seguro incluido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowAddOption(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

