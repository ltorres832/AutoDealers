/**
 * Extracción de campos completos para PDFs F&I (cliente, empleos, referencias, trade-in).
 */

import type {
  FIClient,
  FIRequest,
  FIEmploymentRecord,
  Cosigner,
  TradeInVehicleProfile,
} from '@autodealers/crm';
import {
  getFITotalMonthlyIncome,
  getCosignerTotalMonthlyIncome,
  getFIHouseholdMonthlyIncome,
} from '@autodealers/crm';
import { ssnForPdf } from './fi-ssn';
import type { ProfessionalPdfBuilder } from './pdf-layout';
import { formatMoney, formatDate, sanitize } from './pdf-layout';

const CREDIT_LABELS: Record<string, string> = {
  excellent: 'Excelente (750+)',
  good: 'Bueno (700-749)',
  fair: 'Regular (650-699)',
  poor: 'Bajo (600-649)',
  very_poor: 'Muy bajo (<600)',
  unknown: 'Por verificar',
};

const MARITAL_LABELS: Record<string, string> = {
  single: 'Soltero/a',
  married: 'Casado/a',
  divorced: 'Divorciado/a',
  widowed: 'Viudo/a',
};

const HOUSING_LABELS: Record<string, string> = {
  own: 'Propia',
  rent: 'Alquiler',
  family: 'Familiar',
  other: 'Otro',
};

const INCOME_LABELS: Record<string, string> = {
  salary: 'Salario fijo',
  hourly: 'Por hora',
  self_employed: 'Trabajo por cuenta propia',
  business: 'Negocio propio',
  commission: 'Comisiones',
  retirement: 'Jubilación / pensión',
  other: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  under_review: 'En revisión',
  pre_approved: 'Pre-aprobada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending_info: 'Info pendiente',
  pending_documents: 'Documentos pendientes',
  cancelled: 'Cancelada',
};

const TITLE_STATUS_LABELS: Record<string, string> = {
  clean: 'Limpio',
  salvage: 'Salvage',
  rebuilt: 'Reconstruido',
  unknown: 'Por verificar',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'Cónyuge',
  parent: 'Padre / Madre',
  sibling: 'Hermano / Hermana',
  other: 'Otro',
};

function vehicleLabel(client: FIClient): string {
  const parts = [client.vehicleYear, client.vehicleMake, client.vehicleModel].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

function fullAddress(client: FIClient, personal?: FIRequest['personalInfo']): string {
  const parts = [
    client.address,
    personal?.city || client.city,
    personal?.state || client.state,
    personal?.zipCode || client.zipCode,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : client.address || '—';
}

export function clientIdentityFields(
  client: FIClient,
  request?: FIRequest
): Array<{ label: string; value: string }> {
  const p = request?.personalInfo;
  const dob = p?.dateOfBirth || client.dateOfBirth;
  return [
    { label: 'Nombre completo', value: client.name },
    { label: 'Teléfono principal', value: client.phone },
    { label: 'Teléfono alterno', value: client.phoneAlternate || '—' },
    { label: 'Correo electrónico', value: client.email || '—' },
    {
      label: 'Identificación',
      value: client.identificationType
        ? `${client.identificationType}: ${client.identification || '—'}`
        : client.identification || '—',
    },
    { label: 'Licencia de conducir', value: client.driversLicense || '—' },
    { label: 'Fecha de nacimiento', value: dob || '—' },
    { label: 'SSN', value: ssnForPdf(client) },
    { label: 'Dirección actual', value: fullAddress(client, p) },
    {
      label: 'Tiempo en domicilio',
      value:
        p?.yearsAtAddress != null
          ? `${p.yearsAtAddress} años`
          : client.yearsAtAddress != null
            ? `${client.yearsAtAddress} años`
            : client.timeAtAddressMonths != null
              ? `${client.timeAtAddressMonths} meses`
              : '—',
    },
    { label: 'Dirección anterior', value: client.previousAddress || '—' },
  ];
}

export function vehicleDetailFields(client: FIClient): Array<{ label: string; value: string }> {
  const financed =
    client.vehiclePrice != null && client.downPayment != null
      ? Math.max(0, client.vehiclePrice - client.downPayment)
      : undefined;
  const tradeNet =
    client.tradeInDetails?.estimatedValue != null
      ? client.tradeInDetails.estimatedValue - (client.tradeInDetails.payoffBalance || 0)
      : undefined;

  return [
    { label: 'Vehículo', value: vehicleLabel(client) },
    { label: 'Precio de venta', value: formatMoney(client.vehiclePrice) },
    { label: 'Enganche / inicial', value: formatMoney(client.downPayment) },
    { label: 'Monto a financiar (est.)', value: formatMoney(financed) },
    { label: 'Trade-in', value: client.hasTradeIn ? 'Sí' : 'No' },
    ...(tradeNet != null
      ? [{ label: 'Equity neto trade-in (est.)', value: formatMoney(tradeNet) }]
      : []),
  ];
}

export function tradeInFields(trade?: TradeInVehicleProfile): Array<{ label: string; value: string }> {
  if (!trade) return [];
  return [
    { label: 'Marca / modelo', value: [trade.year, trade.make, trade.model].filter(Boolean).join(' ') || '—' },
    { label: 'VIN', value: trade.vin || '—' },
    { label: 'Millaje', value: trade.mileage != null ? `${trade.mileage.toLocaleString()} mi` : '—' },
    { label: 'Color', value: trade.color || '—' },
    { label: 'Valor estimado', value: formatMoney(trade.estimatedValue) },
    { label: 'Saldo pendiente', value: formatMoney(trade.payoffBalance) },
    { label: 'Acreedor (lienholder)', value: trade.lienholder || '—' },
    {
      label: 'Estado del título',
      value: TITLE_STATUS_LABELS[trade.titleStatus || ''] || sanitize(trade.titleStatus),
    },
    { label: 'Historial accidentes', value: trade.accidentHistory || '—' },
    { label: 'Notas trade-in', value: trade.notes || '—' },
  ];
}

export function employmentRecordFields(
  job: FIEmploymentRecord,
  prefix = ''
): Array<{ label: string; value: string }> {
  const p = prefix ? `${prefix} — ` : '';
  return [
    { label: `${p}Empleador`, value: job.employer || '—' },
    { label: `${p}Puesto / cargo`, value: job.position || '—' },
    { label: `${p}Tel. empleador`, value: job.employerPhone || '—' },
    { label: `${p}Dirección laboral`, value: job.employerAddress || '—' },
    { label: `${p}Supervisor`, value: job.supervisorName || '—' },
    { label: `${p}Ingreso mensual`, value: formatMoney(job.monthlyIncome) },
    { label: `${p}Antigüedad`, value: job.timeAtJob ? `${job.timeAtJob} meses` : '—' },
    {
      label: `${p}Tipo de ingreso`,
      value: INCOME_LABELS[job.incomeType] || sanitize(job.incomeType),
    },
    { label: `${p}Notas`, value: job.notes || '—' },
  ];
}

export function drawAllEmploymentSections(b: ProfessionalPdfBuilder, request: FIRequest): void {
  b.drawSection('Empleo principal (actual)');
  b.drawFieldGrid(employmentRecordFields(request.employment as FIEmploymentRecord));

  const extras = request.additionalEmployments || [];
  extras.forEach((job, i) => {
    b.drawSection(`Empleo adicional ${i + 1}`);
    b.drawFieldGrid(employmentRecordFields(job));
  });

  if (request.previousEmployment) {
    b.drawSection('Empleo anterior');
    b.drawFieldGrid(employmentRecordFields(request.previousEmployment));
  }

  const other = request.otherIncomeSources || [];
  if (other.length) {
    b.drawSection('Otros ingresos mensuales');
    b.drawFieldGrid(
      other.flatMap((src, i) => [
        { label: `Fuente ${i + 1}`, value: src.source },
        { label: `Monto ${i + 1}`, value: formatMoney(src.monthlyAmount) },
        ...(src.notes ? [{ label: `Notas ${i + 1}`, value: src.notes }] : []),
      ])
    );
  }

  if (request.spouseInfo && Object.values(request.spouseInfo).some(Boolean)) {
    b.drawSection('Información del cónyuge / pareja');
    const s = request.spouseInfo;
    b.drawFieldGrid([
      { label: 'Nombre', value: s.name || '—' },
      { label: 'Teléfono', value: s.phone || '—' },
      { label: 'Empleador', value: s.employer || '—' },
      { label: 'Puesto', value: s.position || '—' },
      { label: 'Tel. empleador', value: s.employerPhone || '—' },
      { label: 'Ingreso mensual', value: formatMoney(s.monthlyIncome) },
    ]);
  }

  const total = getFITotalMonthlyIncome(request);
  b.drawHighlightBox('Resumen de ingresos declarados', [
    `Empleo principal: ${formatMoney(request.employment?.monthlyIncome)}`,
    ...(extras.length
      ? [`Empleos adicionales: ${formatMoney(extras.reduce((s, j) => s + (j.monthlyIncome || 0), 0))}`]
      : []),
    ...(other.length
      ? [`Otros ingresos: ${formatMoney(other.reduce((s, o) => s + (o.monthlyAmount || 0), 0))}`]
      : []),
    ...(request.spouseInfo?.monthlyIncome
      ? [`Cónyuge: ${formatMoney(request.spouseInfo.monthlyIncome)}`]
      : []),
    `TOTAL MENSUAL: ${formatMoney(total)}`,
  ]);
}

export function personalDetailFields(request: FIRequest): Array<{ label: string; value: string }> {
  const p = request.personalInfo || ({} as FIRequest['personalInfo']);
  return [
    {
      label: 'Estado civil',
      value: MARITAL_LABELS[p.maritalStatus] || sanitize(p.maritalStatus),
    },
    { label: 'Dependientes', value: String(p.dependents ?? '—') },
    {
      label: 'Vivienda',
      value: HOUSING_LABELS[p.housing] || sanitize(p.housing),
    },
    { label: 'Pago mensual vivienda', value: formatMoney(p.monthlyHousingPayment) },
    {
      label: 'Años en domicilio actual',
      value: p.yearsAtAddress != null ? String(p.yearsAtAddress) : '—',
    },
  ];
}

export function creditDetailFields(request: FIRequest): Array<{ label: string; value: string }> {
  const c = request.creditInfo || ({} as FIRequest['creditInfo']);
  return [
    {
      label: 'Rango crediticio declarado',
      value: CREDIT_LABELS[c.creditRange] || sanitize(c.creditRange),
    },
    { label: 'Notas crediticias', value: c.notes || '—' },
    {
      label: 'Historial bancarrota',
      value: request.bankruptcyHistory ? 'Sí — ver notas' : 'No declarada',
    },
    { label: 'Notas bancarrota', value: request.bankruptcyNotes || '—' },
    {
      label: 'Pagos mensuales de deudas',
      value: formatMoney(request.monthlyDebtPayments),
    },
  ];
}

export function referenceFields(request: FIRequest): Array<{ label: string; value: string }> {
  const refs = request.references || [];
  if (!refs.length) return [];
  return refs.flatMap((r, i) => [
    { label: `Ref. ${i + 1} — Nombre`, value: r.name },
    { label: `Ref. ${i + 1} — Relación`, value: r.relationship },
    { label: `Ref. ${i + 1} — Teléfono`, value: r.phone },
    ...(r.yearsKnown != null
      ? [{ label: `Ref. ${i + 1} — Años de conocer`, value: String(r.yearsKnown) }]
      : []),
    ...(r.address ? [{ label: `Ref. ${i + 1} — Dirección`, value: r.address }] : []),
  ]);
}

export function financingCalcFields(request: FIRequest): Array<{ label: string; value: string }> {
  const calc = request.financingCalculation as unknown as Record<string, unknown> | undefined;
  if (!calc) return [];
  return [
    { label: 'Cuota mensual estimada', value: formatMoney(calc.monthlyPayment as number) },
    { label: 'Tasa APR estimada', value: calc.apr != null ? `${calc.apr}%` : '—' },
    { label: 'Plazo (meses)', value: sanitize(calc.termMonths) },
    { label: 'Total intereses', value: formatMoney(calc.totalInterest as number) },
    { label: 'Total a pagar', value: formatMoney(calc.totalAmount as number) },
    {
      label: 'DTI estimado',
      value: calc.dtiRatio != null ? `${Number(calc.dtiRatio).toFixed(1)}%` : '—',
    },
  ];
}

export function approvalScoreFields(request: FIRequest): Array<{ label: string; value: string }> {
  const score = request.approvalScore;
  if (!score) return [];
  return [
    { label: 'Puntuación interna', value: sanitize(score.score) },
    { label: 'Probabilidad', value: `${Math.round((score.probability || 0) * 100)}%` },
    { label: 'Recomendación', value: sanitize(score.recommendation) },
  ];
}

export function drawCompleteClientProfile(
  b: ProfessionalPdfBuilder,
  client: FIClient,
  request: FIRequest,
  ref: string
): void {
  b.drawSection('Identificación y contacto del solicitante');
  b.drawFieldGrid(clientIdentityFields(client, request));

  drawAllEmploymentSections(b, request);

  b.drawSection('Perfil crediticio y obligaciones');
  b.drawFieldGrid(creditDetailFields(request));

  b.drawSection('Información personal y hogar');
  b.drawFieldGrid(personalDetailFields(request));

  const refs = referenceFields(request);
  if (refs.length) {
    b.drawSection('Referencias');
    b.drawFieldGrid(refs);
  }

  b.drawSection('Vehículo de interés');
  b.drawFieldGrid(vehicleDetailFields(client));

  if (client.hasTradeIn && client.tradeInDetails) {
    b.drawSection('Detalle del vehículo en trade-in');
    b.drawFieldGrid(tradeInFields(client.tradeInDetails));
  }

  const calcRows = financingCalcFields(request);
  if (calcRows.length) {
    b.drawSection('Estructura de financiamiento propuesta');
    b.drawFieldGrid(calcRows);
  }

  const scoreRows = approvalScoreFields(request);
  if (scoreRows.length) {
    b.drawSection('Score interno (referencia del concesionario)');
    b.drawFieldGrid(scoreRows);
  }
}

export function cosignerIdentityFields(cosigner: Cosigner): Array<{ label: string; value: string }> {
  const p = cosigner.personalInfo;
  const idLine = cosigner.identificationType
    ? `${cosigner.identificationType}: ${p?.identification || '—'}`
    : p?.identification || '—';
  return [
    { label: 'Nombre completo', value: cosigner.name },
    { label: 'Relación con solicitante', value: RELATIONSHIP_LABELS[cosigner.relationship] || cosigner.relationship },
    { label: 'Teléfono principal', value: cosigner.phone },
    { label: 'Teléfono alterno', value: cosigner.phoneAlternate || '—' },
    { label: 'Correo electrónico', value: cosigner.email },
    { label: 'Identificación', value: idLine },
    { label: 'Licencia de conducir', value: cosigner.driversLicense || '—' },
    { label: 'Fecha de nacimiento', value: cosigner.dateOfBirth || '—' },
    { label: 'SSN', value: ssnForPdf(cosigner) },
    {
      label: 'Dirección',
      value: [p?.address, p?.city, p?.state, p?.zipCode].filter(Boolean).join(', ') || p?.address || '—',
    },
    {
      label: 'Años en domicilio',
      value: p?.yearsAtAddress != null ? String(p.yearsAtAddress) : '—',
    },
  ];
}

export function cosignerCreditFields(cosigner: Cosigner): Array<{ label: string; value: string }> {
  const c = cosigner.creditInfo;
  return [
    {
      label: 'Rango crediticio',
      value: CREDIT_LABELS[c.creditRange] || sanitize(c.creditRange),
    },
    { label: 'Score declarado', value: c.creditScore != null ? String(c.creditScore) : '—' },
    { label: 'Notas crediticias', value: c.notes || '—' },
    {
      label: 'Historial bancarrota',
      value: cosigner.bankruptcyHistory ? 'Sí — ver notas' : 'No declarada',
    },
    { label: 'Notas bancarrota', value: cosigner.bankruptcyNotes || '—' },
    { label: 'Pagos mensuales de deudas', value: formatMoney(cosigner.monthlyDebtPayments) },
  ];
}

export function cosignerPersonalFields(cosigner: Cosigner): Array<{ label: string; value: string }> {
  const p = cosigner.personalInfo;
  return [
    {
      label: 'Estado civil',
      value: MARITAL_LABELS[p?.maritalStatus || ''] || sanitize(p?.maritalStatus),
    },
    { label: 'Dependientes', value: String(p?.dependents ?? '—') },
    { label: 'Vivienda', value: HOUSING_LABELS[p?.housing || ''] || sanitize(p?.housing) },
    { label: 'Pago mensual vivienda', value: formatMoney(p?.monthlyHousingPayment) },
  ];
}

export function drawCosignerEmploymentSections(b: ProfessionalPdfBuilder, cosigner: Cosigner): void {
  b.drawSection('Empleo principal del codeudor');
  b.drawFieldGrid(employmentRecordFields(cosigner.employment));

  (cosigner.additionalEmployments || []).forEach((job, i) => {
    b.drawSection(`Empleo adicional codeudor ${i + 1}`);
    b.drawFieldGrid(employmentRecordFields(job));
  });

  if (cosigner.previousEmployment) {
    b.drawSection('Empleo anterior del codeudor');
    b.drawFieldGrid(employmentRecordFields(cosigner.previousEmployment));
  }

  const other = cosigner.otherIncomeSources || [];
  if (other.length) {
    b.drawSection('Otros ingresos del codeudor');
    b.drawFieldGrid(
      other.flatMap((src, i) => [
        { label: `Fuente ${i + 1}`, value: src.source },
        { label: `Monto ${i + 1}`, value: formatMoney(src.monthlyAmount) },
      ])
    );
  }

  b.drawHighlightBox('Ingresos mensuales del codeudor', [
    `Empleo principal: ${formatMoney(cosigner.employment?.monthlyIncome)}`,
    `TOTAL CODEUDOR: ${formatMoney(getCosignerTotalMonthlyIncome(cosigner))}`,
  ]);
}

export function drawCompleteCosignerProfile(b: ProfessionalPdfBuilder, cosigner: Cosigner): void {
  b.drawParagraph(
    'Información completa del codeudor (co-signer / garante). El codeudor se obliga solidariamente al pago del financiamiento.',
    { size: 9, bold: true }
  );
  b.drawSpacer(6);
  b.drawSection('Identificación y contacto del codeudor');
  b.drawFieldGrid(cosignerIdentityFields(cosigner));
  drawCosignerEmploymentSections(b, cosigner);
  b.drawSection('Perfil crediticio del codeudor');
  b.drawFieldGrid(cosignerCreditFields(cosigner));
  b.drawSection('Información personal del codeudor');
  b.drawFieldGrid(cosignerPersonalFields(cosigner));
  const refs = cosigner.references || [];
  if (refs.length) {
    b.drawSection('Referencias del codeudor');
    b.drawFieldGrid(
      refs.flatMap((r, i) => [
        { label: `Ref. ${i + 1} — Nombre`, value: r.name },
        { label: `Ref. ${i + 1} — Relación`, value: r.relationship },
        { label: `Ref. ${i + 1} — Teléfono`, value: r.phone },
      ])
    );
  }
  b.drawSignatureBlock('Firma del codeudor');
}

export function drawHouseholdIncomeSummary(
  b: ProfessionalPdfBuilder,
  request: FIRequest
): void {
  if (!request.cosigner) return;
  const primary = getFITotalMonthlyIncome(request);
  const cosignerInc = getCosignerTotalMonthlyIncome(request.cosigner);
  b.drawHighlightBox('Ingreso mensual combinado (solicitante + codeudor)', [
    `Solicitante principal: ${formatMoney(primary)}`,
    `Codeudor: ${formatMoney(cosignerInc)}`,
    `TOTAL COMBINADO: ${formatMoney(getFIHouseholdMonthlyIncome(request))}`,
    request.combinedScore != null
      ? `Score combinado interno: ${request.combinedScore}`
      : 'Score combinado: pendiente de cálculo',
  ]);
}

export {
  vehicleLabel,
  STATUS_LABELS,
  formatMoney,
  formatDate,
  CREDIT_LABELS,
};
