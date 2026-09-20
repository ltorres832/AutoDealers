'use client';

import {
  getAllPlacementDimensionSummaries,
  getPlacementDimensionSummary,
  type AdPlacement,
} from '@/lib/ad-placement-preview';
import { AdPlacementPageMap } from '@/components/AdPlacementPageMap';

interface AdPlacementDimensionsPanelProps {
  placement: AdPlacement;
  /** Muestra tabla con los tamaños oficiales de cada ubicación */
  showReferenceTable?: boolean;
  /** compact = una línea; full = caja destacada */
  variant?: 'full' | 'compact';
}

export function AdPlacementDimensionsPanel({
  placement,
  showReferenceTable = true,
  variant = 'full',
}: AdPlacementDimensionsPanelProps) {
  const current = getPlacementDimensionSummary(placement);
  const all = getAllPlacementDimensionSummaries();

  if (variant === 'compact') {
    return (
      <p className="text-sm text-gray-700">
        Tamaño exacto para esta ubicación:{' '}
        <strong className="text-gray-900">{current.pixelSize}</strong>
        <span className="text-gray-500"> · proporción {current.aspectRatio}</span>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-primary-200 bg-primary-50/80 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-2">
          Tamaño exacto de imagen — {current.label}
        </p>
        <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          {current.pixelSize}
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Proporción recomendada: <strong>{current.aspectRatio}</strong> · Ancho {current.width}px ·
          Alto {current.height}px · Máx. {current.maxUploadMb}MB · JPG, PNG o WebP
        </p>
        <ul className="mt-3 text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>
            Diseña o exporta tu banner en <strong>exactamente {current.pixelSize}</strong> para que
            se vea perfecto sin barras negras.
          </li>
          <li>
            Si subes otro tamaño, el sistema escala sin recortar (nunca corta tu imagen) y guarda en
            alta calidad.
          </li>
        </ul>
      </div>

      <AdPlacementPageMap placement={placement} />

      {showReferenceTable && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900">
              Referencia — tamaños exactos por ubicación
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Usa estas medidas al preparar tus creativos en Canva, Photoshop u otra herramienta.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
                  <th className="px-4 py-2 font-medium">Ubicación</th>
                  <th className="px-4 py-2 font-medium">Tamaño exacto</th>
                  <th className="px-4 py-2 font-medium">Proporción</th>
                  <th className="px-4 py-2 font-medium hidden sm:table-cell">Ancho × Alto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {all.map((row) => {
                  const isSelected = row.placement === placement;
                  return (
                    <tr
                      key={row.placement}
                      className={isSelected ? 'bg-primary-50/60' : 'bg-white'}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.label}
                        {isSelected && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-primary-700">
                            seleccionada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                        {row.pixelSize}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.aspectRatio}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap hidden sm:table-cell">
                        {row.width} × {row.height}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
