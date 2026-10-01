'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import type { EquipmentGroup, VehicleEquipment } from '../vehicle-equipment';

export const SPECIFICATION_TABS: Array<{ id: string; label: string; groups: EquipmentGroup[] }> = [
  { id: 'mechanical', label: 'Mecánica', groups: ['mechanical', 'efficiency', 'dimensions'] },
  { id: 'exterior', label: 'Exterior', groups: ['exterior'] },
  { id: 'entertainment', label: 'Entretenimiento', groups: ['entertainment'] },
  { id: 'interior', label: 'Interior', groups: ['interior'] },
  { id: 'safety', label: 'Seguridad', groups: ['safety'] },
  { id: 'other', label: 'Otros datos', groups: ['identity', 'other'] },
];
const readable: Record<string, string> = {
  automatic: 'Automática', manual: 'Manual', gasoline: 'Gasolina', diesel: 'Diésel', electric: 'Eléctrico',
  'sedan/saloon': 'Sedán', 'sport utility vehicle (suv)/multi-purpose vehicle (mpv)': 'SUV',
  '1st row (driver and passenger)': 'Primera fila: conductor y pasajero', '1st and 2nd rows': 'Primera y segunda fila',
  'all rows': 'Todas las filas', 'v-shaped': 'En V', 'in-line': 'En línea',
  'fwd/front-wheel drive': 'Delantera (FWD)', 'rwd/rear-wheel drive': 'Trasera (RWD)', 'awd/all-wheel drive': 'Integral (AWD)',
};
export function VehicleSpecificationTabs({ value, editing = false, disabled = false, onEdit }: {
  value: VehicleEquipment; editing?: boolean; disabled?: boolean;
  onEdit?: (id: string, text: string) => void;
}) {
  const uid = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const rows = Object.entries(value.fields).filter(([, field]) => (editing || field.value.trim()) && !/^(no aplica|not applicable|unknown|n\/a)$/i.test(field.value.trim()));
  const tabs = SPECIFICATION_TABS.filter(tab => tab.id !== 'other' || rows.some(([, field]) => tab.groups.includes(field.group)));
  const active = tabs.find(tab => tab.id === selected) || tabs.find(tab => rows.some(([, field]) => tab.groups.includes(field.group))) || tabs[0];
  const visible = rows.filter(([, field]) => active.groups.includes(field.group));
  const shown = editing || expanded ? visible : visible.slice(0, 12);
  function change(id: string) { setSelected(id); setExpanded(false); }
  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target = index;
    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    else return;
    event.preventDefault(); change(tabs[target].id);
    document.getElementById(`${uid}-tab-${tabs[target].id}`)?.focus();
  }
  return <div>
    <div role="tablist" aria-label="Categorías de especificaciones" className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab, index) => <button key={tab.id} id={`${uid}-tab-${tab.id}`} type="button" role="tab" aria-selected={active.id === tab.id} aria-controls={`${uid}-panel`} tabIndex={active.id === tab.id ? 0 : -1} onClick={() => change(tab.id)} onKeyDown={event => keydown(event, index)} className={`min-w-[120px] flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600 ${active.id === tab.id ? 'bg-primary-600 text-white' : 'bg-primary-50 text-slate-900 hover:bg-primary-100'}`}>
        {tab.label}
      </button>)}
    </div>
    <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${active.id}`} tabIndex={0} className="min-h-[100px] focus-visible:outline-primary-600">
      {!visible.length ? <p className="py-4 text-sm text-slate-500">No hay información disponible de {active.label.toLocaleLowerCase()} para este vehículo.</p> : editing ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {shown.map(([id, field]) => <label key={id} className="block text-sm text-slate-700">{field.label}
          <input aria-label={field.label} value={field.value} disabled={disabled} maxLength={2000} onChange={event => onEdit?.(id, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <span className="mt-1 block text-xs text-slate-500">{field.source === 'manual' ? 'Informado por el anunciante' : 'Dato del VIN'}</span>
        </label>)}
      </div> : <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800 md:columns-2 md:gap-10">
        {shown.map(([id, field]) => <li key={id} className="break-inside-avoid pr-4" style={{overflowWrap:'anywhere'}}>{field.label}{/^(sí|de serie|standard|yes)$/i.test(field.value) ? '' : `: ${readable[field.value.toLowerCase()] || field.value}`}</li>)}
      </ul>}
      {!editing && visible.length > 12 ? <button type="button" onClick={() => setExpanded(!expanded)} className="mt-4 text-sm font-medium text-primary-700 hover:underline">{expanded ? 'Ver menos' : `Ver todas (${visible.length})`}</button> : null}
    </div>
  </div>;
}
