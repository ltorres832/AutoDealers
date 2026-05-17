'use client';

import { useState, type ReactNode } from 'react';
import type { VehicleListingAction } from '@autodealers/inventory/client';

type Mode = 'dispose' | 'sold_options';

interface VehicleListingDispositionModalProps {
  vehicleLabel: string;
  mode: Mode;
  onClose: () => void;
  onConfirm: (action: VehicleListingAction | 'keep_active', showPublicSoldBadge?: boolean) => void;
  /** Tras venta completa: textos y sin cancelar sin elegir opción */
  variant?: 'inventory' | 'after_sale';
}

export default function VehicleListingDispositionModal({
  vehicleLabel,
  mode,
  onClose,
  onConfirm,
  variant = 'inventory',
}: VehicleListingDispositionModalProps) {
  const afterSale = variant === 'after_sale';
  const [showPublicSoldBadge, setShowPublicSoldBadge] = useState(false);

  return (
    <ModalShell onClose={onClose} allowBackdropClose={!afterSale} zIndexClass={afterSale ? 'z-[60]' : 'z-50'}>
      {mode === 'sold_options' ? (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {afterSale ? 'Anuncio vendido' : 'Marcar como vendido'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">{vehicleLabel}</p>
          <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={showPublicSoldBadge}
              onChange={(e) => setShowPublicSoldBadge(e.target.checked)}
              className="mt-1"
            />
            <span>
              Seguir visible en la web con etiqueta <strong>SOLD</strong> (si tienes más unidades
              del mismo modelo)
            </span>
          </label>
          <div className="flex gap-2">
            {!afterSale ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onConfirm('sold', showPublicSoldBadge)}
              className={`py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 ${
                afterSale ? 'w-full' : 'flex-1'
              }`}
            >
              {afterSale ? 'Guardar y cerrar' : 'Confirmar vendido'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {afterSale ? 'Venta registrada' : '¿Qué hacer con este vehículo?'}
          </h2>
          <p className={`text-sm text-gray-600 ${afterSale ? 'mb-1' : 'mb-4'}`}>{vehicleLabel}</p>
          {afterSale ? (
            <p className="text-sm text-gray-500 mb-4">
              Elige qué hacer con el anuncio de este vehículo en inventario y en la web.
            </p>
          ) : null}
          <OptionButton
            className="border-red-200 bg-red-50 hover:bg-red-100"
            title="Vendido (SOLD)"
            subtitle={
              afterSale
                ? 'Marca SOLD en la tarjeta; puedes dejarlo visible en la web si tienes más stock'
                : 'Etiqueta SOLD en inventario; se quita de la web (puedes ajustar después)'
            }
            onClick={() => onConfirm('sold')}
          />
          <OptionButton
            className="border-slate-200 bg-slate-50 hover:bg-slate-100"
            title="Ocultar / desactivar"
            subtitle="No aparece en la web pública"
            onClick={() => onConfirm('hide')}
          />
          <OptionButton
            className="border-green-200 bg-green-50 hover:bg-green-100 mb-4"
            title="Seguir activo"
            subtitle={
              afterSale
                ? 'Sigue a la venta (útil si vendiste una unidad pero tienes más del mismo modelo)'
                : 'Sin cambios — sigue a la venta'
            }
            onClick={() => onConfirm('keep_active')}
          />
          {!afterSale ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
          ) : null}
        </>
      )}
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  allowBackdropClose = true,
  zIndexClass = 'z-50',
}: {
  children: ReactNode;
  onClose: () => void;
  allowBackdropClose?: boolean;
  zIndexClass?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/50`}
      onClick={allowBackdropClose ? onClose : undefined}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function OptionButton({
  className,
  title,
  subtitle,
  onClick,
}: {
  className: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border-2 mb-2 ${className}`}
    >
      <span className="font-semibold text-gray-900">{title}</span>
      <span className="block text-xs text-gray-600 mt-0.5">{subtitle}</span>
    </button>
  );
}
