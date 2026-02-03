'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  isDefault: boolean;
}

interface PaymentMethodSelectorProps {
  selectedPaymentMethodId: string | null;
  onSelect: (paymentMethodId: string | null) => void;
  showAddNew?: boolean;
}

export function PaymentMethodSelector({
  selectedPaymentMethodId,
  onSelect,
  showAddNew = true,
}: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  async function fetchPaymentMethods() {
    try {
      const response = await fetch('/api/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  }

  const getCardBrandIcon = (brand: string) => {
    const icons: Record<string, string> = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      jcb: '💳',
      diners: '💳',
    };
    return icons[brand.toLowerCase()] || '💳';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium mb-2">
        Método de Pago
      </label>
      
      {/* Opción: Usar nueva tarjeta */}
      <div
        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
          selectedPaymentMethodId === null
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => onSelect(null)}
      >
        <div className="flex items-center gap-3">
          <input
            type="radio"
            checked={selectedPaymentMethodId === null}
            onChange={() => onSelect(null)}
            className="w-4 h-4 text-primary-600"
          />
          <div className="flex-1">
            <div className="font-medium">Nueva Tarjeta</div>
            <div className="text-sm text-gray-600">
              Ingresar nueva información de pago
            </div>
          </div>
        </div>
      </div>

      {/* Métodos guardados */}
      {paymentMethods.map((method) => (
        <div
          key={method.id}
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            selectedPaymentMethodId === method.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelect(method.id)}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              checked={selectedPaymentMethodId === method.id}
              onChange={() => onSelect(method.id)}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-2xl">{getCardBrandIcon(method.card?.brand || '')}</span>
            <div className="flex-1">
              <div className="font-medium">
                {method.card?.brand.toUpperCase() || 'Tarjeta'} •••• {method.card?.last4}
              </div>
              <div className="text-sm text-gray-600">
                Expira {method.card?.expMonth}/{method.card?.expYear}
              </div>
            </div>
            {method.isDefault && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                Por Defecto
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Link para agregar nuevo método */}
      {showAddNew && (
        <div className="pt-2">
          <Link
            href="/settings/membership/payment-methods"
            target="_blank"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Agregar nuevo método de pago
          </Link>
        </div>
      )}
    </div>
  );
}

