'use client';

import { useState, useEffect } from 'react';
import { FinancingCalculator, FinancingCalculationResult } from '@autodealers/crm';

interface FICalculatorProps {
  requestId: string;
  vehiclePrice: number;
  downPayment: number;
  monthlyIncome?: number;
  onCalculationComplete?: (result: FinancingCalculationResult) => void;
}

export default function FICalculator({
  requestId,
  vehiclePrice,
  downPayment,
  monthlyIncome,
  onCalculationComplete,
}: FICalculatorProps) {
  const [calculator, setCalculator] = useState<FinancingCalculator>({
    vehiclePrice,
    downPayment,
    interestRate: 5.5, // Tasa por defecto
    loanTerm: 60, // 5 años por defecto
    taxRate: 8.5, // Tax por defecto
    fees: 500, // Fees por defecto
    monthlyIncome,
  });
  
  const [calculation, setCalculation] = useState<FinancingCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculate();
  }, [calculator]);

  async function calculate() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fi/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          calculator: {
            ...calculator,
            vehiclePrice,
            downPayment,
            monthlyIncome,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al calcular');
      }

      const data = await response.json();
      setCalculation(data.calculation);
      if (onCalculationComplete) {
        onCalculationComplete(data.calculation);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error calculating:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Calculadora de Financiamiento</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio del Vehículo
          </label>
          <input
            type="number"
            value={vehiclePrice}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pronto Pago
          </label>
          <input
            type="number"
            value={downPayment}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tasa de Interés (APR %)
          </label>
          <input
            type="number"
            step="0.1"
            value={calculator.interestRate}
            onChange={(e) => setCalculator({ ...calculator, interestRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plazo (meses)
          </label>
          <select
            value={calculator.loanTerm}
            onChange={(e) => setCalculator({ ...calculator, loanTerm: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={36}>36 meses (3 años)</option>
            <option value={48}>48 meses (4 años)</option>
            <option value={60}>60 meses (5 años)</option>
            <option value={72}>72 meses (6 años)</option>
            <option value={84}>84 meses (7 años)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={calculator.taxRate}
            onChange={(e) => setCalculator({ ...calculator, taxRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fees Adicionales ($)
          </label>
          <input
            type="number"
            value={calculator.fees}
            onChange={(e) => setCalculator({ ...calculator, fees: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {calculation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Resultado del Cálculo</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm text-blue-700">Pago Mensual:</span>
              <p className="text-2xl font-bold text-blue-900">
                ${calculation.monthlyPayment.toLocaleString('es-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <span className="text-sm text-blue-700">Total a Pagar:</span>
              <p className="text-xl font-semibold text-blue-900">
                ${calculation.totalAmount.toLocaleString('es-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <span className="text-sm text-blue-700">Total de Intereses:</span>
              <p className="text-lg text-blue-800">
                ${calculation.totalInterest.toLocaleString('es-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            {calculation.dtiRatio && (
              <div>
                <span className="text-sm text-blue-700">DTI Ratio:</span>
                <p className={`text-lg font-semibold ${
                  calculation.affordability === 'affordable' ? 'text-green-700' :
                  calculation.affordability === 'tight' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {calculation.dtiRatio.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
          
          <div className="border-t border-blue-200 pt-3">
            <p className="text-sm text-blue-700 mb-2">Desglose:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Principal: ${calculation.breakdown.principal.toLocaleString()}</div>
              <div>Intereses: ${calculation.breakdown.interest.toLocaleString()}</div>
              <div>Tax: ${calculation.breakdown.tax.toLocaleString()}</div>
              <div>Fees: ${calculation.breakdown.fees.toLocaleString()}</div>
            </div>
          </div>
          
          {calculation.affordability !== 'affordable' && (
            <div className={`mt-3 p-2 rounded text-sm ${
              calculation.affordability === 'tight' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
            }`}>
              {calculation.affordability === 'tight' 
                ? 'El pago mensual es ajustado. Considera aumentar el pronto pago o extender el plazo.'
                : 'El pago mensual puede ser difícil de mantener. Se recomienda aumentar el pronto pago significativamente.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

