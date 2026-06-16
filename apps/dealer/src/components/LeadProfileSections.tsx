'use client';

import type { Lead, TradeInVehicleProfile } from '@autodealers/crm';
import type { VehicleStockSnapshot } from '@autodealers/inventory';
import Link from 'next/link';

function toTimeMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    return (value as { _seconds: number })._seconds * 1000;
  }
  return 0;
}

function formatAnyDate(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return '—';
    }
  }
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    const s = (value as { _seconds: number })._seconds;
    const d = new Date(s * 1000);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
  return '—';
}

function formatMoney(amount: number | undefined, currency = 'MXN'): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(amount);
  }
}

function formatKm(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('es-MX').format(Math.round(n))} millas`;
}

const TITLE_STATUS_LABEL: Record<NonNullable<TradeInVehicleProfile['titleStatus']>, string> = {
  clean: 'Título limpio',
  salvage: 'Salvage',
  rebuilt: 'Reconstruido',
  unknown: 'Desconocido',
};

function tradeInHeadline(t?: TradeInVehicleProfile): string | null {
  if (!t || typeof t !== 'object') return null;
  const parts = [t.year, t.make, t.model, t.trim].filter(Boolean).join(' ').trim();
  const bits: string[] = [];
  if (parts) bits.push(parts);
  if (t.mileage != null) bits.push(formatKm(t.mileage));
  if (t.estimatedValue != null) bits.push(`~${formatMoney(t.estimatedValue)}`);
  return bits.length ? bits.join(' · ') : null;
}

function tradeInRows(t: TradeInVehicleProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, v: unknown, fmt?: (x: unknown) => string) => {
    if (v === undefined || v === null || v === '') return;
    if (typeof v === 'boolean') {
      rows.push({ label, value: v ? 'Sí' : 'No' });
      return;
    }
    const s = fmt ? fmt(v) : String(v);
    if (!s || s === '—') return;
    rows.push({ label, value: s });
  };

  add('Marca', t.make);
  add('Modelo', t.model);
  add('Año', t.year);
  add('Versión / trim', t.trim);
  add('VIN', t.vin);
  add('Millaje', t.mileage, (x) => formatKm(Number(x)));
  add('Stock', t.stockNumber);
  add('Color exterior', t.color);
  add('Color interior', t.interiorColor);
  add('Transmisión', t.transmission);
  add('Combustible', t.fuelType);
  add('Motor', t.engine);
  add('Carrocería', t.bodyType);
  add('Condición', t.condition);
  add('Valor estimado', t.estimatedValue, (x) => formatMoney(Number(x)));
  add('Saldo a liquidar', t.payoffBalance, (x) => formatMoney(Number(x)));
  add('Acreedor', t.lienholder);
  if (t.titleStatus) add('Estado del título', TITLE_STATUS_LABEL[t.titleStatus] || t.titleStatus);
  add('Historial de accidentes', t.accidentHistory);
  add('Registros de servicio', t.serviceRecords);
  add('Vinculado a inventario (ID)', t.linkedVehicleId);
  add('Notas', t.notes);
  return rows;
}

function snapshotRows(s: VehicleStockSnapshot): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  rows.push({ label: 'Vehículo', value: [s.year, s.make, s.model].filter(Boolean).join(' ') });
  rows.push({ label: 'Stock', value: s.stockNumber || '—' });
  rows.push({ label: 'Precio al capturar', value: formatMoney(s.price, s.currency) });
  rows.push({ label: 'Estado en inventario', value: String(s.status || '—') });
  rows.push({ label: 'Condición', value: String(s.condition || '—') });
  if (s.mileage != null) rows.push({ label: 'Millaje (snapshot)', value: formatKm(s.mileage) });
  if (s.vin) rows.push({ label: 'VIN', value: s.vin });
  if (s.bodyType) rows.push({ label: 'Carrocería', value: String(s.bodyType) });
  rows.push({ label: 'Capturado', value: s.capturedAt ? formatAnyDate(s.capturedAt) : '—' });
  if (s.description) rows.push({ label: 'Descripción (snapshot)', value: s.description });
  return rows;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DefGrid({ rows }: { rows: { label: string; value: string }[] }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">Sin datos registrados.</p>;
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="sm:contents">
          <dt className="text-gray-500 font-medium pt-1 sm:py-1 border-t sm:border-t-0 border-gray-100 first:border-t-0 first:pt-0">
            {r.label}
          </dt>
          <dd className="text-gray-900 pb-2 sm:py-1 border-b sm:border-b-0 border-gray-100 sm:border-t-0 sm:pb-0 whitespace-pre-wrap break-words">
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Resumen compacto bajo la fila principal en listas */
export function LeadRowExtras({ lead }: { lead: Lead }) {
  const chips: { key: string; text: string; className: string }[] = [];
  if (lead.vehicleStockSnapshot) {
    const s = lead.vehicleStockSnapshot;
    chips.push({
      key: 'stock',
      text: `Interés: ${[s.year, s.make, s.model].filter(Boolean).join(' ')}${s.stockNumber ? ` · ${s.stockNumber}` : ''}`,
      className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    });
  } else if (lead.vehicleInterest) {
    const t = lead.vehicleInterest.trim();
    chips.push({
      key: 'int',
      text: t.length > 90 ? `Interés: ${t.slice(0, 87)}…` : `Interés: ${t}`,
      className: 'bg-primary-50 text-primary-900 border border-sky-200',
    });
  }
  if (lead.budget != null && String(lead.budget).trim()) {
    chips.push({
      key: 'bud',
      text: `Presupuesto: ${String(lead.budget)}`,
      className: 'bg-amber-50 text-amber-900 border border-amber-200',
    });
  }
  const th = tradeInHeadline(lead.tradeIn);
  if (th) {
    chips.push({
      key: 'ti',
      text: `Trade-in: ${th}`,
      className: 'bg-primary-50 text-primary-900 border border-primary-200',
    });
  } else if (lead.tradeIn && Object.keys(lead.tradeIn).length > 0) {
    chips.push({ key: 'ti2', text: 'Trade-in (detalle en ficha)', className: 'bg-primary-50 text-primary-800 border border-primary-200' });
  }

  if (!chips.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
      {chips.map((c) => (
        <span key={c.key} className={`inline-flex text-xs px-2 py-1 rounded-md max-w-full ${c.className}`}>
          <span className="truncate">{c.text}</span>
        </span>
      ))}
    </div>
  );
}

/** Una línea bajo la tarjeta del kanban */
export function LeadKanbanFootnote({ lead }: { lead: Lead }) {
  const parts: string[] = [];
  const hi = tradeInHeadline(lead.tradeIn);
  if (hi) parts.push(`Trade-in: ${hi}`);
  if (lead.vehicleStockSnapshot) {
    const s = lead.vehicleStockSnapshot;
    parts.push(`Stock: ${[s.year, s.make, s.model].filter(Boolean).join(' ')}`);
  } else if (lead.vehicleInterest) {
    const t = lead.vehicleInterest.trim();
    parts.push(t.length > 60 ? `${t.slice(0, 57)}…` : t);
  }
  if (!parts.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
      {parts.map((p, i) => (
        <p key={i} className="line-clamp-2">
          {p}
        </p>
      ))}
    </div>
  );
}

export function LeadFullProfile({ lead }: { lead: Lead }) {
  const snap = lead.vehicleStockSnapshot;
  const trade = lead.tradeIn;
  const photos = snap?.photos?.filter(Boolean) || [];

  const contactRows = [
    { label: 'Nombre', value: lead.contact?.name || '—' },
    { label: 'Teléfono', value: lead.contact?.phone || '—' },
    { label: 'Email', value: lead.contact?.email || '—' },
    {
      label: 'Canal preferido',
      value: lead.contact?.preferredChannel ? String(lead.contact.preferredChannel) : '—',
    },
  ];

  const metaRows = [
    { label: 'ID lead', value: lead.id },
    { label: 'Fuente', value: String(lead.source || '—') },
    { label: 'Estado', value: String(lead.status || '—') },
    { label: 'Creado', value: formatAnyDate(lead.createdAt) },
    { label: 'Actualizado', value: formatAnyDate(lead.updatedAt) },
    { label: 'Último contacto', value: formatAnyDate(lead.lastContactDate as unknown) },
    { label: 'Próximo seguimiento', value: formatAnyDate(lead.nextFollowUpDate as unknown) },
  ];
  if (lead.assignedTo) metaRows.push({ label: 'Asignado a (userId)', value: lead.assignedTo });
  if (lead.vehicleId) metaRows.push({ label: 'vehicleId (inventario)', value: lead.vehicleId });
  if (lead.vehicleStockNumber) metaRows.push({ label: 'Número de stock', value: lead.vehicleStockNumber });
  if (lead.publicTrackingToken) metaRows.push({ label: 'Token seguimiento público', value: lead.publicTrackingToken });

  const interestRows: { label: string; value: string }[] = [];
  if (lead.vehicleInterest?.trim()) {
    interestRows.push({ label: 'Texto de interés', value: lead.vehicleInterest.trim() });
  }
  if (lead.budget != null && String(lead.budget).trim()) {
    interestRows.push({ label: 'Presupuesto', value: String(lead.budget) });
  }
  if (lead.interestedVehicles?.length) {
    interestRows.push({ label: 'IDs vehículos (lista)', value: lead.interestedVehicles.join(', ') });
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Contacto" subtitle="Datos de comunicación">
        <DefGrid rows={contactRows} />
      </SectionCard>

      <SectionCard title="Lead / CRM" subtitle="Metadatos del registro">
        <DefGrid rows={metaRows} />
      </SectionCard>

      <SectionCard title="Interés comercial" subtitle="Qué busca el cliente y presupuesto">
        {interestRows.length ? <DefGrid rows={interestRows} /> : <p className="text-sm text-gray-500">Sin texto de interés ni presupuesto guardado.</p>}
      </SectionCard>

      {snap ? (
        <SectionCard title="Vehículo de inventario (captura)" subtitle="Copia al momento de vincular el lead">
          {photos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {photos.slice(0, 12).map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-28 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          <DefGrid rows={snapshotRows(snap)} />
          <p className="mt-4 text-xs text-gray-500">
            <Link href="/inventory" className="text-primary-600 hover:underline">
              Ir al inventario
            </Link>
            {' · ID capturado: '}
            <span className="font-mono">{snap.vehicleId}</span>
          </p>
        </SectionCard>
      ) : null}

      {trade && Object.keys(trade).length > 0 ? (
        <SectionCard title="Trade-in" subtitle="Vehículo a entregar / datos de tasación">
          {trade.photoUrls && trade.photoUrls.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {trade.photoUrls.slice(0, 12).map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-28 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          <DefGrid rows={tradeInRows(trade)} />
        </SectionCard>
      ) : (
        <SectionCard title="Trade-in" subtitle="Vehículo a entregar">
          <p className="text-sm text-gray-500">Este lead no tiene datos de trade-in.</p>
        </SectionCard>
      )}

      <SectionCard title="Notas internas" subtitle="Texto libre">
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes?.trim() ? lead.notes : 'Sin notas.'}</p>
      </SectionCard>

      {lead.score ? (
        <SectionCard title="Puntuación" subtitle="Scoring del lead">
          <DefGrid
            rows={[
              { label: 'Combinado', value: String(lead.score.combined ?? '—') },
              { label: 'Automático', value: String(lead.score.automatic ?? '—') },
              { label: 'Manual', value: lead.score.manual != null ? String(lead.score.manual) : '—' },
              { label: 'Última actualización', value: formatAnyDate(lead.score.lastUpdated) },
            ]}
          />
        </SectionCard>
      ) : null}

      {lead.aiClassification ? (
        <SectionCard title="Clasificación IA" subtitle="Automática al crear / actualizar">
          <DefGrid
            rows={[
              { label: 'Prioridad', value: String(lead.aiClassification.priority || '—') },
              { label: 'Sentimiento', value: String(lead.aiClassification.sentiment || '—') },
              { label: 'Intención', value: String(lead.aiClassification.intent || '—') },
            ]}
          />
        </SectionCard>
      ) : null}

      {lead.clientAppointmentNotification ? (
        <SectionCard title="Notificación al cliente (cita)" subtitle="Último aviso visible en seguimiento público">
          <DefGrid
            rows={[
              { label: 'Título', value: lead.clientAppointmentNotification.headline || '—' },
              { label: 'Mensaje', value: lead.clientAppointmentNotification.body || '—' },
              { label: 'Confirmado por', value: lead.clientAppointmentNotification.confirmedByName || '—' },
              {
                label: 'Cita',
                value: lead.clientAppointmentNotification.scheduledAt || '—',
              },
            ]}
          />
        </SectionCard>
      ) : null}

      {lead.tags && lead.tags.length > 0 ? (
        <SectionCard title="Etiquetas" subtitle="">
          <div className="flex flex-wrap gap-2">
            {lead.tags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">
                {tag}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {lead.interactions && lead.interactions.length > 0 ? (
        <SectionCard title="Historial de interacciones" subtitle={`${lead.interactions.length} registro(s)`}>
          <ul className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {[...lead.interactions]
              .sort((a, b) => toTimeMs(b.createdAt) - toTimeMs(a.createdAt))
              .map((it, idx) => (
                <li key={it.id || `int-${idx}`} className="text-sm border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700 capitalize">{it.type}</span>
                    <span>{formatAnyDate(it.createdAt)}</span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">{it.content}</p>
                  {it.userId ? <p className="text-xs text-gray-500 mt-1">Usuario: {it.userId}</p> : null}
                </li>
              ))}
          </ul>
        </SectionCard>
      ) : null}

      {lead.documents && lead.documents.length > 0 ? (
        <SectionCard title="Documentos" subtitle="">
          <ul className="divide-y divide-gray-100">
            {lead.documents.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium">{d.name}</span>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    Abrir
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
