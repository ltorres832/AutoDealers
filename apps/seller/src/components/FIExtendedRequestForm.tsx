'use client';

import { FICosignerFields } from '@/components/FICosignerFullForm';
import { emptyCosignerFormInput, type CosignerFormInput } from '@autodealers/core/fi-cosigner-payload';

type IncomeType = 'salary' | 'self_employed' | 'business' | 'retirement' | 'other';

export interface EmploymentFormRow {
  employer: string;
  position: string;
  employerPhone: string;
  employerAddress: string;
  supervisorName: string;
  monthlyIncome: string;
  timeAtJob: string;
  incomeType: IncomeType;
  notes: string;
}

export interface ReferenceFormRow {
  name: string;
  relationship: string;
  phone: string;
  yearsKnown: string;
}

export interface OtherIncomeRow {
  source: string;
  monthlyAmount: string;
  notes: string;
}

export interface FIExtendedRequestFormData {
  primary: EmploymentFormRow;
  additionalJobs: EmploymentFormRow[];
  previousJob: EmploymentFormRow;
  hasPreviousJob: boolean;
  otherIncome: OtherIncomeRow[];
  references: ReferenceFormRow[];
  spouseName: string;
  spousePhone: string;
  spouseEmployer: string;
  spousePosition: string;
  spouseEmployerPhone: string;
  spouseMonthlyIncome: string;
  monthlyDebtPayments: string;
  bankruptcyHistory: boolean;
  bankruptcyNotes: string;
  yearsAtAddress: string;
  dateOfBirth: string;
  creditRange: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  creditNotes: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: string;
  housing: 'rent' | 'own' | 'family';
  monthlyHousingPayment: string;
  sellerNotes: string;
  hasCosigner: boolean;
  cosigner: CosignerFormInput;
}

export function emptyEmploymentRow(): EmploymentFormRow {
  return {
    employer: '',
    position: '',
    employerPhone: '',
    employerAddress: '',
    supervisorName: '',
    monthlyIncome: '',
    timeAtJob: '',
    incomeType: 'salary',
    notes: '',
  };
}

export function emptyReference(): ReferenceFormRow {
  return { name: '', relationship: '', phone: '', yearsKnown: '' };
}

export function emptyOtherIncome(): OtherIncomeRow {
  return { source: '', monthlyAmount: '', notes: '' };
}

export function employmentRowToPayload(row: EmploymentFormRow) {
  return {
    employer: row.employer || undefined,
    position: row.position || undefined,
    employerPhone: row.employerPhone || undefined,
    employerAddress: row.employerAddress || undefined,
    supervisorName: row.supervisorName || undefined,
    monthlyIncome: parseFloat(row.monthlyIncome) || 0,
    timeAtJob: parseInt(row.timeAtJob, 10) || 0,
    incomeType: row.incomeType,
    notes: row.notes || undefined,
  };
}

function EmploymentBlock({
  title,
  row,
  onChange,
  onRemove,
  requiredIncome,
}: {
  title: string;
  row: EmploymentFormRow;
  onChange: (r: EmploymentFormRow) => void;
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
        <input
          placeholder="Empleador *"
          value={row.employer}
          onChange={(e) => onChange({ ...row, employer: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          placeholder="Puesto / cargo"
          value={row.position}
          onChange={(e) => onChange({ ...row, position: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          placeholder="Teléfono del empleador"
          value={row.employerPhone}
          onChange={(e) => onChange({ ...row, employerPhone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          placeholder="Supervisor / contacto RRHH"
          value={row.supervisorName}
          onChange={(e) => onChange({ ...row, supervisorName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          placeholder="Dirección laboral"
          value={row.employerAddress}
          onChange={(e) => onChange({ ...row, employerAddress: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md md:col-span-2 text-sm"
        />
        <input
          type="number"
          placeholder="Ingreso mensual *"
          required={requiredIncome}
          value={row.monthlyIncome}
          onChange={(e) => onChange({ ...row, monthlyIncome: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <input
          type="number"
          placeholder="Meses en este empleo *"
          required={requiredIncome}
          value={row.timeAtJob}
          onChange={(e) => onChange({ ...row, timeAtJob: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <select
          value={row.incomeType}
          onChange={(e) => onChange({ ...row, incomeType: e.target.value as IncomeType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="salary">Salario</option>
          <option value="self_employed">Independiente</option>
          <option value="business">Negocio propio</option>
          <option value="retirement">Jubilación / pensión</option>
          <option value="other">Otro</option>
        </select>
        <input
          placeholder="Notas (opcional)"
          value={row.notes}
          onChange={(e) => onChange({ ...row, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
    </div>
  );
}

export default function FIExtendedRequestForm({
  data,
  onChange,
}: {
  data: FIExtendedRequestFormData;
  onChange: (d: FIExtendedRequestFormData) => void;
}) {
  const set = (patch: Partial<FIExtendedRequestFormData>) => onChange({ ...data, ...patch });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Empleos e ingresos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Captura el empleo principal y agrega empleos adicionales si el cliente tiene más de una fuente de ingreso.
        </p>
        <EmploymentBlock
          title="Empleo principal (actual)"
          row={data.primary}
          onChange={(primary) => set({ primary })}
          requiredIncome
        />
        <div className="mt-3 space-y-3">
          {data.additionalJobs.map((job, i) => (
            <EmploymentBlock
              key={i}
              title={`Empleo adicional ${i + 1}`}
              row={job}
              onChange={(row) => {
                const additionalJobs = [...data.additionalJobs];
                additionalJobs[i] = row;
                set({ additionalJobs });
              }}
              onRemove={() =>
                set({ additionalJobs: data.additionalJobs.filter((_, j) => j !== i) })
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => set({ additionalJobs: [...data.additionalJobs, emptyEmploymentRow()] })}
          className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          + Agregar otro empleo
        </button>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.hasPreviousJob}
            onChange={(e) => set({ hasPreviousJob: e.target.checked })}
          />
          Incluir empleo anterior
        </label>
        {data.hasPreviousJob && (
          <div className="mt-2">
            <EmploymentBlock
              title="Empleo anterior"
              row={data.previousJob}
              onChange={(previousJob) => set({ previousJob })}
            />
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-2">Otros ingresos mensuales</h3>
          {data.otherIncome.map((src, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                placeholder="Fuente (alquiler, pensión…)"
                value={src.source}
                onChange={(e) => {
                  const otherIncome = [...data.otherIncome];
                  otherIncome[i] = { ...src, source: e.target.value };
                  set({ otherIncome });
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Monto mensual"
                value={src.monthlyAmount}
                onChange={(e) => {
                  const otherIncome = [...data.otherIncome];
                  otherIncome[i] = { ...src, monthlyAmount: e.target.value };
                  set({ otherIncome });
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => set({ otherIncome: data.otherIncome.filter((_, j) => j !== i) })}
              >
                Quitar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ otherIncome: [...data.otherIncome, emptyOtherIncome()] })}
            className="text-sm text-primary-600"
          >
            + Otro ingreso
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información personal y hogar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => set({ dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Años en domicilio actual</label>
            <input
              type="number"
              min="0"
              value={data.yearsAtAddress}
              onChange={(e) => set({ yearsAtAddress: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado civil *</label>
            <select
              required
              value={data.maritalStatus}
              onChange={(e) => set({ maritalStatus: e.target.value as FIExtendedRequestFormData['maritalStatus'] })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="single">Soltero/a</option>
              <option value="married">Casado/a</option>
              <option value="divorced">Divorciado/a</option>
              <option value="widowed">Viudo/a</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dependientes *</label>
            <input
              type="number"
              required
              min="0"
              value={data.dependents}
              onChange={(e) => set({ dependents: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vivienda *</label>
            <select
              required
              value={data.housing}
              onChange={(e) => set({ housing: e.target.value as FIExtendedRequestFormData['housing'] })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="rent">Alquiler</option>
              <option value="own">Propia</option>
              <option value="family">Familiar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pago mensual vivienda</label>
            <input
              type="number"
              value={data.monthlyHousingPayment}
              onChange={(e) => set({ monthlyHousingPayment: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {data.maritalStatus === 'married' && (
          <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50/50 p-4">
            <h3 className="font-medium text-primary-900 mb-3">Cónyuge / pareja</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Nombre"
                value={data.spouseName}
                onChange={(e) => set({ spouseName: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                placeholder="Teléfono"
                value={data.spousePhone}
                onChange={(e) => set({ spousePhone: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                placeholder="Empleador"
                value={data.spouseEmployer}
                onChange={(e) => set({ spouseEmployer: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                placeholder="Puesto"
                value={data.spousePosition}
                onChange={(e) => set({ spousePosition: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                placeholder="Tel. empleador"
                value={data.spouseEmployerPhone}
                onChange={(e) => set({ spouseEmployerPhone: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Ingreso mensual cónyuge"
                value={data.spouseMonthlyIncome}
                onChange={(e) => set({ spouseMonthlyIncome: e.target.value })}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Crédito y deudas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crédito aproximado *</label>
            <select
              required
              value={data.creditRange}
              onChange={(e) => set({ creditRange: e.target.value as FIExtendedRequestFormData['creditRange'] })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="excellent">Excelente (750+)</option>
              <option value="good">Bueno (700-749)</option>
              <option value="fair">Regular (650-699)</option>
              <option value="poor">Bajo (600-649)</option>
              <option value="very_poor">Muy bajo (&lt;600)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagos mensuales de deudas</label>
            <input
              type="number"
              placeholder="Tarjetas, préstamos, etc."
              value={data.monthlyDebtPayments}
              onChange={(e) => set({ monthlyDebtPayments: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas sobre crédito</label>
            <textarea
              value={data.creditNotes}
              onChange={(e) => set({ creditNotes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <label className="flex items-center gap-2 md:col-span-2 text-sm">
            <input
              type="checkbox"
              checked={data.bankruptcyHistory}
              onChange={(e) => set({ bankruptcyHistory: e.target.checked })}
            />
            Historial de bancarrota o quiebra
          </label>
          {data.bankruptcyHistory && (
            <textarea
              placeholder="Detalle bancarrota (año, capítulo, etc.)"
              value={data.bankruptcyNotes}
              onChange={(e) => set({ bankruptcyNotes: e.target.value })}
              rows={2}
              className="md:col-span-2 w-full px-3 py-2 border rounded-md"
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Referencias</h2>
        {data.references.map((ref, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <input
              placeholder="Nombre"
              value={ref.name}
              onChange={(e) => {
                const references = [...data.references];
                references[i] = { ...ref, name: e.target.value };
                set({ references });
              }}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <input
              placeholder="Relación"
              value={ref.relationship}
              onChange={(e) => {
                const references = [...data.references];
                references[i] = { ...ref, relationship: e.target.value };
                set({ references });
              }}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <input
              placeholder="Teléfono"
              value={ref.phone}
              onChange={(e) => {
                const references = [...data.references];
                references[i] = { ...ref, phone: e.target.value };
                set({ references });
              }}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() => set({ references: data.references.filter((_, j) => j !== i) })}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set({ references: [...data.references, emptyReference()] })}
          className="text-sm text-primary-600"
        >
          + Agregar referencia
        </button>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Notas del vendedor</h2>
        <textarea
          value={data.sellerNotes}
          onChange={(e) => set({ sellerNotes: e.target.value })}
          rows={4}
          placeholder="Información adicional relevante para F&I o el banco…"
          className="w-full px-3 py-2 border rounded-md"
        />
      </section>

      <section className="border-t pt-8">
        <label className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
          <input
            type="checkbox"
            checked={data.hasCosigner}
            onChange={(e) =>
              set({
                hasCosigner: e.target.checked,
                cosigner: e.target.checked ? data.cosigner : emptyCosignerFormInput(),
              })
            }
          />
          El cliente utilizará un codeudor (co-signer)
        </label>
        {data.hasCosigner && (
          <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4">
            <FICosignerFields
              data={data.cosigner}
              onChange={(cosigner) => set({ cosigner })}
            />
          </div>
        )}
      </section>
    </div>
  );
}

export function buildRequestPayloadFromForm(data: FIExtendedRequestFormData) {
  const additionalEmployments = data.additionalJobs
    .filter((j) => j.employer || j.monthlyIncome)
    .map(employmentRowToPayload);

  const otherIncomeSources = data.otherIncome
    .filter((o) => o.source && o.monthlyAmount)
    .map((o) => ({
      source: o.source,
      monthlyAmount: parseFloat(o.monthlyAmount) || 0,
      notes: o.notes || undefined,
    }));

  const references = data.references
    .filter((r) => r.name && r.phone)
    .map((r) => ({
      name: r.name,
      relationship: r.relationship,
      phone: r.phone,
      yearsKnown: r.yearsKnown ? parseInt(r.yearsKnown, 10) : undefined,
    }));

  const spouseInfo =
    data.maritalStatus === 'married' &&
    (data.spouseName || data.spouseEmployer || data.spouseMonthlyIncome)
      ? {
          name: data.spouseName || undefined,
          phone: data.spousePhone || undefined,
          employer: data.spouseEmployer || undefined,
          position: data.spousePosition || undefined,
          employerPhone: data.spouseEmployerPhone || undefined,
          monthlyIncome: data.spouseMonthlyIncome
            ? parseFloat(data.spouseMonthlyIncome)
            : undefined,
        }
      : undefined;

  return {
    employment: employmentRowToPayload(data.primary),
    additionalEmployments: additionalEmployments.length ? additionalEmployments : undefined,
    previousEmployment:
      data.hasPreviousJob && data.previousJob.employer
        ? employmentRowToPayload(data.previousJob)
        : undefined,
    otherIncomeSources: otherIncomeSources.length ? otherIncomeSources : undefined,
    references: references.length ? references : undefined,
    spouseInfo,
    monthlyDebtPayments: data.monthlyDebtPayments
      ? parseFloat(data.monthlyDebtPayments)
      : undefined,
    bankruptcyHistory: data.bankruptcyHistory || undefined,
    bankruptcyNotes: data.bankruptcyNotes || undefined,
    creditInfo: {
      creditRange: data.creditRange,
      notes: data.creditNotes || undefined,
    },
    personalInfo: {
      maritalStatus: data.maritalStatus,
      dependents: parseInt(data.dependents, 10) || 0,
      housing: data.housing,
      monthlyHousingPayment: data.monthlyHousingPayment
        ? parseFloat(data.monthlyHousingPayment)
        : undefined,
      yearsAtAddress: data.yearsAtAddress ? parseInt(data.yearsAtAddress, 10) : undefined,
      dateOfBirth: data.dateOfBirth || undefined,
    },
    sellerNotes: data.sellerNotes || undefined,
  };
}
