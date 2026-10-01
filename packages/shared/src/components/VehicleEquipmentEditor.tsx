'use client';

import { useState } from 'react';
import { EQUIPMENT_FIELDS, EQUIPMENT_GROUPS, type VehicleEquipment, type EquipmentGroup } from '../vehicle-equipment';
import { VehicleSpecificationTabs } from './VehicleSpecificationTabs';

export default function VehicleEquipmentEditor({ value, onChange, disabled = false }: { value: VehicleEquipment; onChange: (value: VehicleEquipment) => void; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [fieldId, setFieldId] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customGroup, setCustomGroup] = useState<EquipmentGroup>('mechanical');
  const [newValue, setNewValue] = useState('');
  const reported = Object.values(value.fields).filter(field => field.value.trim() && !/^(no aplica|not applicable)$/i.test(field.value));
  const fromVin = reported.filter(field => field.source === 'vin').length;
  const edit = (id: string, label: string, group: EquipmentGroup, text: string) => onChange({ ...value, fields: { ...value.fields, [id]: { label, group, value: text, source: 'manual' } } });
  const definition = EQUIPMENT_FIELDS.find(field => field.id === fieldId);
  return <section className="my-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Equipamiento y especificaciones">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-xl font-semibold text-slate-900">Especificaciones</h3>
        <p className="mt-1 text-sm text-slate-500">{reported.length ? `${reported.length} características registradas · ${fromVin} del VIN` : 'Consulta el VIN para cargar las características disponibles.'}</p>
      </div>
      <button type="button" disabled={disabled || !reported.length} onClick={() => setEditing(!editing)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">{editing ? 'Ver presentación' : 'Editar especificaciones'}</button>
    </div>
    <VehicleSpecificationTabs value={value} editing={editing} disabled={disabled} onEdit={(id, text) => { const field = value.fields[id]; edit(id, field.label, field.group, text); }} />
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="text-xs leading-5 text-slate-500">NHTSA aporta información básica; no confirma todos los paquetes, colores o extras de fábrica. Los elementos marcados como opcionales requieren confirmación.</p>
      <button type="button" disabled={disabled} onClick={() => setAdding(!adding)} className="mt-3 text-sm font-medium text-primary-700">{adding ? 'Cerrar' : '+ Agregar característica confirmada'}</button>
      {adding ? <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <label className="text-sm">Característica<select aria-label="Característica" value={fieldId} onChange={event => setFieldId(event.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2">
          <option value="">Personalizada</option>{EQUIPMENT_FIELDS.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}
        </select></label>
        {!definition ? <><label className="text-sm">Nombre<input aria-label="Nombre de característica" value={customLabel} onChange={event => setCustomLabel(event.target.value)} maxLength={120} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="text-sm">Categoría<select aria-label="Categoría de característica" value={customGroup} onChange={event => setCustomGroup(event.target.value as EquipmentGroup)} className="mt-1 w-full rounded border bg-white px-3 py-2">{EQUIPMENT_GROUPS.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label></> : null}
        <label className="text-sm">Detalle confirmado{definition?.unit ? ` (${definition.unit})` : ''}<input aria-label="Detalle confirmado" value={newValue} onChange={event => setNewValue(event.target.value)} maxLength={2000} placeholder="Escribe el dato verificado en este auto" className="mt-1 w-full rounded border px-3 py-2" /></label>
        <button type="button" disabled={disabled || !(definition || customLabel.trim()) || !newValue.trim()} onClick={() => { edit(definition?.id || `custom_${Date.now()}`, definition?.label || customLabel.trim(), definition?.group || customGroup, newValue.trim() + (definition?.unit ? ` ${definition.unit}` : '')); setNewValue(''); setCustomLabel(''); setAdding(false); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-40">Agregar a la ficha</button>
      </div> : null}
    </div>
  </section>;
}
