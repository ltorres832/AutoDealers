'use client';

import { useState } from 'react';

export default function FinanceCalculator() {
  const [vehiclePrice, setVehiclePrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [interestRate, setInterestRate] = useState('5.5');
  const [loanTerm, setLoanTerm] = useState('60');
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [totalInterest, setTotalInterest] = useState<number | null>(null);

  const calculatePayment = () => {
    const price = parseFloat(vehiclePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly rate
    const term = parseInt(loanTerm);
    const principal = price - down;

    if (principal <= 0 || term <= 0) {
      setMonthlyPayment(null);
      setTotalInterest(null);
      return;
    }

    if (rate === 0) {
      const monthly = principal / term;
      setMonthlyPayment(monthly);
      setTotalInterest(0);
    } else {
      const monthly = (principal * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
      setMonthlyPayment(monthly);
      setTotalInterest(monthly * term - principal);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            💰 Calculadora de Financiamiento
          </h2>
          <p className="text-xl text-gray-600">
            Calcula tu pago mensual estimado
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Precio del Vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio del Vehículo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={vehiclePrice}
                  onChange={(e) => setVehiclePrice(e.target.value)}
                  placeholder="30,000"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Enganche */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enganche
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="5,000"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tasa de Interés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasa de Interés Anual (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Plazo del Préstamo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plazo del Préstamo (meses)
              </label>
              <select
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="36">36 meses</option>
                <option value="48">48 meses</option>
                <option value="60">60 meses</option>
                <option value="72">72 meses</option>
                <option value="84">84 meses</option>
              </select>
            </div>
          </div>

          <button
            onClick={calculatePayment}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-bold text-lg transition-all transform hover:scale-105 mb-6"
          >
            Calcular Pago Mensual
          </button>

          {/* Resultados */}
          {monthlyPayment !== null && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Resultados del Cálculo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Pago Mensual</p>
                  <p className="text-3xl font-bold text-green-600">
                    ${monthlyPayment.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${(monthlyPayment * parseInt(loanTerm)).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Interés Total</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ${totalInterest?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                * Este cálculo es una estimación. Las tasas reales pueden variar según tu historial crediticio.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

