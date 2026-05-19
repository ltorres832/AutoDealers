'use client';

import {
  catalogReferrerHost,
  catalogSurfaceLabel,
  parseCatalogUserAgent,
} from '@/lib/catalog-interest-helpers';

export type CatalogInterestTableRow = {
  id: string;
  vehicleId: string | null;
  vehicleSummary?: {
    label: string;
    stockNumber: string | null;
  } | null;
  surface: string | null;
  path: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  userAgent: string | null;
  hasExplicitContact: boolean;
  createdAt: string | null;
};

/** table-fixed + max-w-0 en celdas: evita que URLs largas se superpongan. */
const CELL =
  'max-w-0 overflow-hidden px-3 py-2 align-top text-sm text-gray-800';
const CELL_MUTED = `${CELL} text-gray-600`;
const ELLIPSIS = 'block overflow-hidden text-ellipsis whitespace-nowrap';

function trunc(s: string | null | undefined, max: number): string {
  if (s == null || s === '') return '—';
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function CellLines({
  lines,
}: {
  lines: Array<{ text: string; title?: string; className?: string }>;
}) {
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <span
          key={i}
          className={`${ELLIPSIS} ${line.className || ''}`}
          title={line.title || line.text}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}

export function CatalogInterestSignalsTable({
  rows,
  formatCreatedAt,
}: {
  rows: CatalogInterestTableRow[];
  formatCreatedAt: (iso: string | null) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: '11%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-600">
            <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
            <th className="px-3 py-2">Vehículo</th>
            <th className="px-3 py-2">Superficie</th>
            <th className="px-3 py-2">Path</th>
            <th className="px-3 py-2">Referrer</th>
            <th className="px-3 py-2">UTM</th>
            <th className="px-3 py-2">Agente</th>
            <th className="px-3 py-2">Tipo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, index) => {
            const ua = parseCatalogUserAgent(row.userAgent);
            const utm = [row.utmSource, row.utmMedium, row.utmCampaign]
              .filter(Boolean)
              .join(' · ');
            const referrerLabel = catalogReferrerHost(row.referrer);
            const pathLabel = row.path?.trim() ? row.path : '—';

            return (
              <tr key={`${row.id}-${index}`} className="hover:bg-gray-50/80">
                <td className={`${CELL} whitespace-nowrap`} style={{ maxWidth: 0 }}>
                  {formatCreatedAt(row.createdAt)}
                </td>

                <td className={CELL} style={{ maxWidth: 0 }}>
                  <CellLines
                    lines={[
                      {
                        text:
                          row.vehicleSummary?.label ||
                          (row.vehicleId ? trunc(row.vehicleId, 26) : '—'),
                        className: 'font-medium text-gray-900',
                      },
                      ...(row.vehicleSummary?.stockNumber
                        ? [
                            {
                              text: `Stock #${row.vehicleSummary.stockNumber}`,
                              className: 'text-xs text-blue-800',
                            },
                          ]
                        : []),
                      ...(row.vehicleId && row.vehicleSummary?.label
                        ? [
                            {
                              text: trunc(row.vehicleId, 28),
                              title: row.vehicleId,
                              className: 'font-mono text-[11px] text-gray-500',
                            },
                          ]
                        : []),
                    ]}
                  />
                </td>

                <td className={CELL} style={{ maxWidth: 0 }}>
                  <CellLines
                    lines={[
                      {
                        text: catalogSurfaceLabel(row.surface),
                      },
                      ...(row.surface
                        ? [
                            {
                              text: row.surface,
                              className: 'font-mono text-[11px] text-gray-400',
                            },
                          ]
                        : []),
                    ]}
                  />
                </td>

                <td className={CELL_MUTED} style={{ maxWidth: 0 }}>
                  <span className={`${ELLIPSIS} font-mono text-[11px]`} title={pathLabel}>
                    {pathLabel}
                  </span>
                </td>

                <td className={CELL_MUTED} style={{ maxWidth: 0 }}>
                  <span
                    className={ELLIPSIS}
                    title={row.referrer?.trim() ? row.referrer : undefined}
                  >
                    {referrerLabel}
                  </span>
                </td>

                <td className={`${CELL_MUTED} text-xs`} style={{ maxWidth: 0 }}>
                  <span className={ELLIPSIS} title={utm || undefined}>
                    {utm ? trunc(utm, 36) : '—'}
                  </span>
                </td>

                <td className={`${CELL} text-xs text-gray-500`} style={{ maxWidth: 0 }}>
                  <CellLines
                    lines={[
                      { text: ua.browser, className: 'font-medium text-gray-700' },
                      {
                        text: `${ua.os} · ${ua.device}`,
                        className: 'text-[11px] text-gray-500',
                      },
                    ]}
                  />
                </td>

                <td className={`${CELL} whitespace-nowrap`} style={{ maxWidth: 0 }}>
                  {row.hasExplicitContact ? (
                    <span className="text-green-700 font-medium">Con formulario</span>
                  ) : (
                    <span className="text-gray-500">Anónimo</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
