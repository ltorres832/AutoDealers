'use client';

import { useState, useEffect } from 'react';
import type { Cosigner } from '@autodealers/crm';
import {
  buildCosignerPayload,
  cosignerToFormInput,
  emptyCosignerEmploymentRow,
  emptyCosignerFormInput,
  type CosignerEmploymentInput,
  type CosignerFormInput,
} from '@autodealers/core/fi-cosigner-payload';
import { formatSsnInput, isValidSsn } from '@autodealers/core/fi-ssn';

export { emptyCosignerFormInput, type CosignerFormInput };

function EmploymentBlock({
  title,
  row,
  onChange,
  onRemove,
  requiredIncome,
}: {
  title: string;
  row: CosignerEmploymentInput;
  onChange: (r: CosignerEmploymentInput) => void;
  onRemove?: () => void;
  requiredIncome?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{title}</h3>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:text-red-800">
            Quitar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input placeholder="Empleador *" value={row.employer} onChange={(e) => onChange({ ...row, employer: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <input placeholder="Puesto / cargo" value={row.position} onChange={(e) => onChange({ ...row, position: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <input placeholder="Teléfono del empleador" value={row.employerPhone} onChange={(e) => onChange({ ...row, employerPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <input placeholder="Supervisor / contacto RRHH" value={row.supervisorName} onChange={(e) => onChange({ ...row, supervisorName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <input placeholder="Dirección laboral" value={row.employerAddress} onChange={(e) => onChange({ ...row, employerAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 text-sm" />
        <input type="number" placeholder="Ingreso mensual *" required={requiredIncome} value={row.monthlyIncome} onChange={(e) => onChange({ ...row, monthlyIncome: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <input type="number" placeholder="Meses en este empleo *" required={requiredIncome} value={row.timeAtJob} onChange={(e) => onChange({ ...row, timeAtJob: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        <select value={row.incomeType} onChange={(e) => onChange({ ...row, incomeType: e.target.value as CosignerEmploymentInput['incomeType'] })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
          <option value="salary">Salario</option>
          <option value="self_employed">Independiente</option>
          <option value="business">Negocio propio</option>
          <option value="retirement">Jubilación / pensión</option>
          <option value="other">Otro</option>
        </select>
        <input placeholder="Notas (opcional)" value={row.notes} onChange={(e) => onChange({ ...row, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
      </div>
    </div>
  );
}

export function FICosignerFields({ data, onChange }: { data: CosignerFormInput; onChange: (d: CosignerFormInput) => void }) {
  const set = (patch: Partial<CosignerFormInput>) => onChange({ ...data, ...patch });
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Identificación del codeudor</h2>
        <p className="text-sm text-gray-600 mb-4">Datos completos del codeudor (co-signer). Aparecerán en la solicitud de crédito y el paquete para el banco.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nombre completo *" required value={data.name} onChange={(e) => set({ name: e.target.value })} className="px-3 py-2 border rounded-md" />
          <select value={data.relationship} onChange={(e) => set({ relationship: e.target.value as Cosigner['relationship'] })} className="px-3 py-2 border rounded-md">
            <option value="spouse">Cónyuge</option>
            <option value="parent">Padre / Madre</option>
            <option value="sibling">Hermano / Hermana</option>
            <option value="other">Otro</option>
          </select>
          <input type="tel" placeholder="Teléfono principal *" required value={data.phone} onChange={(e) => set({ phone: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input type="tel" placeholder="Teléfono alterno" value={data.phoneAlternate} onChange={(e) => set({ phoneAlternate: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input type="email" placeholder="Correo electrónico *" required value={data.email} onChange={(e) => set({ email: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input type="date" value={data.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="SSN (XXX-XX-XXXX) *" required value={data.ssn} onChange={(e) => set({ ssn: formatSsnInput(e.target.value) })} className="px-3 py-2 border rounded-md" maxLength={11} autoComplete="off" />
          {data.ssn && !isValidSsn(data.ssn) && <p className="md:col-span-2 text-sm text-red-600">SSN inválido. Debe tener 9 dígitos (formato XXX-XX-XXXX).</p>}
          <input placeholder="Licencia de conducir" value={data.driversLicense} onChange={(e) => set({ driversLicense: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="Tipo de identificación" value={data.identificationType} onChange={(e) => set({ identificationType: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="Número de identificación" value={data.identificationNumber} onChange={(e) => set({ identificationNumber: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="Dirección" value={data.address} onChange={(e) => set({ address: e.target.value })} className="px-3 py-2 border rounded-md md:col-span-2" />
          <input placeholder="Ciudad" value={data.city} onChange={(e) => set({ city: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="Estado / provincia" value={data.state} onChange={(e) => set({ state: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input placeholder="Código postal" value={data.zipCode} onChange={(e) => set({ zipCode: e.target.value })} className="px-3 py-2 border rounded-md" />
          <input type="number" placeholder="Años en domicilio" value={data.yearsAtAddress} onChange={(e) => set({ yearsAtAddress: e.target.value })} className="px-3 py-2 border rounded-md" />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Empleos e ingresos del codeudor</h2>
        <EmploymentBlock title="Empleo principal (actual)" row={data.primary} onChange={(primary) => set({ primary })} requiredIncome />
        <div className="mt-3 space-y-3">
          {data.additionalJobs.map((job, i) => (
            <EmploymentBlock key={i} title={`Empleo adicional ${i + 1}`} row={job} onChange={(row) => { const additionalJobs = [...data.additionalJobs]; additionalJobs[i] = row; set({ additionalJobs }); }} onRemove={() => set({ additionalJobs: data.additionalJobs.filter((_, j) => j !== i) })} />
          ))}
        </div>
        <button type="button" onClick={() => set({ additionalJobs: [...data.additionalJobs, emptyCosignerEmploymentRow()] })} className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-800">+ Agregar otro empleo</button>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={data.hasPreviousJob} onChange={(e) => set({ hasPreviousJob: e.target.checked })} />Incluir empleo anterior</label>
        {data.hasPreviousJob && <div className="mt-2"><EmploymentBlock title="Empleo anterior" row={data.previousJob} onChange={(previousJob) => set({ previousJob })} /></div>}
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-2">Otros ingresos mensuales</h3>
          {data.otherIncome.map((src, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input placeholder="Fuente" value={src.source} onChange={(e) => { const otherIncome = [...data.otherIncome]; otherIncome[i] = { ...src, source: e.target.value }; set({ otherIncome }); }} className="px-3 py-2 border rounded-md text-sm" />
              <input type="number" placeholder="Monto mensual" value={src.monthlyAmount} onChange={(e) => { const otherIncome = [...data.otherIncome]; otherIncome[i] = { ...src, monthlyAmount: e.target.value }; set({ otherIncome }); }} className="px-3 py-2 border rounded-md text-sm" />
              <button type="button" className="text-sm text-red-600" onClick={() => set({ otherIncome: data.otherIncome.filter((_, j) => j !== i) })}>Quitar</button>
            </div>
          ))}
          <button type="button" onClick={() => set({ otherIncome: [...data.otherIncome, { source: '', monthlyAmount: '', notes: '' }] })} className="text-sm text-primary-600">+ Otro ingreso</button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Perfil crediticio y personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={data.creditRange} onChange={(e) => set({ creditRange: e.target.value as CosignerFormInput['creditRange'] })} className="px-3 py-2 border rounded-md">
            <option value="excellent">Excelente (750+)</option>
            <option value="good">Bueno (700-749)</option>
            <option value="fair">Regular (650-699)</option>
            <option value="poor">Bajo (600-649)</option>
            <option value="very_poor">Muy bajo (&lt;600)</option>
          </select>
          <input type="number" placeholder="Pagos mensuales de deudas" value={data.monthlyDebtPayments} onChange={(e) => set({ monthlyDebtPayments: e.target.value })} className="px-3 py-2 border rounded-md" />
          <textarea placeholder="Notas crediticias" value={data.creditNotes} onChange={(e) => set({ creditNotes: e.target.value })} rows={2} className="md:col-span-2 px-3 py-2 border rounded-md" />
          <select value={data.maritalStatus} onChange={(e) => set({ maritalStatus: e.target.value as CosignerFormInput['maritalStatus'] })} className="px-3 py-2 border rounded-md">
            <option value="single">Soltero/a</option>
            <option value="married">Casado/a</option>
            <option value="divorced">Divorciado/a</option>
            <option value="widowed">Viudo/a</option>
          </select>
          <input type="number" placeholder="Dependientes" value={data.dependents} onChange={(e) => set({ dependents: e.target.value })} className="px-3 py-2 border rounded-md" />
          <select value={data.housing} onChange={(e) => set({ housing: e.target.value as CosignerFormInput['housing'] })} className="px-3 py-2 border rounded-md">
            <option value="rent">Alquila</option>
            <option value="own">Propia</option>
            <option value="family">Familiar</option>
          </select>
          <input type="number" placeholder="Pago mensual vivienda" value={data.monthlyHousingPayment} onChange={(e) => set({ monthlyHousingPayment: e.target.value })} className="px-3 py-2 border rounded-md" />
          <label className="flex items-center gap-2 md:col-span-2 text-sm"><input type="checkbox" checked={data.bankruptcyHistory} onChange={(e) => set({ bankruptcyHistory: e.target.checked })} />Historial de bancarrota</label>
          {data.bankruptcyHistory && <textarea placeholder="Detalle bancarrota" value={data.bankruptcyNotes} onChange={(e) => set({ bankruptcyNotes: e.target.value })} rows={2} className="md:col-span-2 px-3 py-2 border rounded-md" />}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Referencias del codeudor</h2>
        {data.references.map((ref, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <input placeholder="Nombre" value={ref.name} onChange={(e) => { const references = [...data.references]; references[i] = { ...ref, name: e.target.value }; set({ references }); }} className="px-3 py-2 border rounded-md text-sm" />
            <input placeholder="Relación" value={ref.relationship} onChange={(e) => { const references = [...data.references]; references[i] = { ...ref, relationship: e.target.value }; set({ references }); }} className="px-3 py-2 border rounded-md text-sm" />
            <input placeholder="Teléfono" value={ref.phone} onChange={(e) => { const references = [...data.references]; references[i] = { ...ref, phone: e.target.value }; set({ references }); }} className="px-3 py-2 border rounded-md text-sm" />
            <button type="button" className="text-sm text-red-600" onClick={() => set({ references: data.references.filter((_, j) => j !== i) })}>Quitar</button>
          </div>
        ))}
        <button type="button" onClick={() => set({ references: [...data.references, { name: '', relationship: '', phone: '', yearsKnown: '' }] })} className="text-sm text-primary-600">+ Agregar referencia</button>
      </section>
    </div>
  );
}

export interface FICosignerFullFormProps {
  requestId: string;
  mode?: 'create' | 'edit';
  initialCosigner?: Cosigner;
  apiPath?: string;
  onCosignerAdded?: (cosigner: Cosigner) => void;
  onCosignerUpdated?: (cosigner: Cosigner) => void;
  onCancel?: () => void;
}

export default function FICosignerFullForm(props: FICosignerFullFormProps) {
  const { requestId, mode = 'create', initialCosigner, apiPath = '/api/fi/cosigner', onCosignerAdded, onCosignerUpdated, onCancel } = props;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CosignerFormInput>(emptyCosignerFormInput());

  useEffect(() => {
    if (mode === 'edit' && initialCosigner) setFormData(cosignerToFormInput(initialCosigner));
    else if (mode === 'create') setFormData(emptyCosignerFormInput());
  }, [mode, initialCosigner]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidSsn(formData.ssn)) {
      alert('Ingrese el SSN completo del codeudor (XXX-XX-XXXX).');
      return;
    }
    setLoading(true);
    try {
      const cosignerData = buildCosignerPayload(formData);
      const isEdit = mode === 'edit';
      const response = await fetch(apiPath, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, cosignerData }) });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || (isEdit ? 'Error al actualizar codeudor' : 'Error al agregar codeudor'));
      }
      const data = await response.json();
      if (isEdit) onCosignerUpdated?.(data.cosigner);
      else onCosignerAdded?.(data.cosigner);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Error al guardar codeudor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FICosignerFields data={formData} onChange={setFormData} />
      <div className="flex justify-end gap-4 pt-4 border-t">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancelar</button>}
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Agregar codeudor'}
        </button>
      </div>
    </form>
  );
}
