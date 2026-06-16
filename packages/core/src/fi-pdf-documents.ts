/**

 * Plantillas PDF profesionales para el módulo F&I.

 */



import type { FIClient, FIRequest, FIEmploymentRecord, Cosigner } from '@autodealers/crm';
import { getFITotalMonthlyIncome, getFIHouseholdMonthlyIncome } from '@autodealers/crm';
import { ProfessionalPdfBuilder, formatDate, formatMoney } from './pdf-layout';
import {
  drawCompleteClientProfile,
  drawCompleteCosignerProfile,
  drawHouseholdIncomeSummary,
  vehicleLabel,
  STATUS_LABELS,
  clientIdentityFields,
  vehicleDetailFields,
  financingCalcFields,
  employmentRecordFields,
} from './fi-pdf-fields';



export type FIDocumentTemplate =

  | 'credit_application'

  | 'pre_approval_letter'

  | 'rejection_letter'

  | 'financing_summary'

  | 'lender_package'

  | 'terms_agreement'

  | 'cosigner_agreement';



const TEMPLATE_BRANDING: Record<FIDocumentTemplate, string> = {

  credit_application: 'contract',

  pre_approval_letter: 'certificate',

  rejection_letter: 'certificate',

  financing_summary: 'contract',

  lender_package: 'contract',

  terms_agreement: 'contract',

  cosigner_agreement: 'contract',

};



const TEMPLATE_TITLES: Record<FIDocumentTemplate, string> = {

  credit_application: 'Solicitud de Crédito Automotriz',

  pre_approval_letter: 'Carta de Pre-aprobación',

  rejection_letter: 'Comunicado de Decisión Crediticia',

  financing_summary: 'Resumen de Financiamiento',

  lender_package: 'Paquete para Entidad Financiera',

  terms_agreement: 'Acuerdo de Términos',

  cosigner_agreement: 'Información de Co-signer',

};



export async function generateFIDocumentPdf(options: {

  tenantId: string;

  userId?: string;

  template: FIDocumentTemplate;

  client: FIClient;

  request: FIRequest;

  tenantContact?: { phone?: string; email?: string; address?: string };

}): Promise<Buffer> {

  const { tenantId, userId, template, client, request, tenantContact } = options;

  const docType = TEMPLATE_BRANDING[template];

  const title = TEMPLATE_TITLES[template];

  const ref = `REF-${request.id.slice(0, 8).toUpperCase()}`;



  const builder = await ProfessionalPdfBuilder.create({

    tenantId,

    userId,

    documentType: docType,

    tenantPhone: tenantContact?.phone,

    tenantEmail: tenantContact?.email,

    tenantAddress: tenantContact?.address,

  });



  builder.setHeader(title, `${ref} · ${formatDate()}`);



  switch (template) {

    case 'credit_application':

      await buildCreditApplication(builder, client, request, ref);

      break;

    case 'pre_approval_letter':

      await buildPreApprovalLetter(builder, client, request, ref);

      break;

    case 'rejection_letter':

      await buildRejectionLetter(builder, client, request, ref);

      break;

    case 'financing_summary':

      await buildFinancingSummary(builder, client, request, ref);

      break;

    case 'lender_package':

      await buildLenderPackage(builder, client, request, ref);

      break;

    case 'terms_agreement':

      await buildTermsAgreement(builder, client, request, ref);

      break;

    case 'cosigner_agreement':

      await buildCosignerSection(builder, client, request, ref);

      break;

    default:

      await buildLenderPackage(builder, client, request, ref);

  }



  return builder.finalize();

}



async function buildCreditApplication(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawParagraph(

    'El solicitante declara bajo pena de perjurio que la información contenida en este documento es veraz y completa. Autoriza al concesionario y a las entidades financieras receptoras a verificar empleo, ingresos, referencias, historial crediticio y cualquier dato relevante para la evaluación del crédito automotriz.',

    { size: 9 }

  );

  b.drawSpacer(8);

  drawCompleteClientProfile(b, client, request, ref);

  if (request.cosigner) {
    drawCompleteCosignerProfile(b, request.cosigner);
    drawHouseholdIncomeSummary(b, request);
  }

  if (request.sellerNotes) {

    b.drawSection('Notas del vendedor');

    b.drawParagraph(request.sellerNotes);

  }

  b.drawSection('Declaración y firma');

  b.drawParagraph(

    `Referencia ${ref}. Estado: ${STATUS_LABELS[request.status] || request.status}. Generado: ${formatDate()}.`

  );

  b.drawSignatureBlock('Firma del solicitante');

  b.drawSignatureBlock('Firma del representante del concesionario');

}



async function buildPreApprovalLetter(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawParagraph(`Estimado/a ${client.name},`, { bold: true });

  b.drawSpacer(6);

  b.drawParagraph(

    `Con base en la información recibida (referencia ${ref}), su solicitud de financiamiento automotriz ha sido pre-aprobada de forma preliminar, sujeta a verificación de empleos, ingresos, documentos y historial crediticio.`

  );

  b.drawSpacer(8);

  b.drawHighlightBox('Resumen preliminar', [

    `Vehículo: ${vehicleLabel(client)}`,

    `Precio: ${formatMoney(client.vehiclePrice)}`,

    `Enganche: ${formatMoney(client.downPayment)}`,

    `Ingreso mensual total declarado: ${formatMoney(getFITotalMonthlyIncome(request))}`,

    ...(request.financingCalculation

      ? [`Cuota estimada: ${formatMoney((request.financingCalculation as { monthlyPayment?: number }).monthlyPayment)}`]

      : []),

  ]);

  b.drawParagraph(

    'Esta carta no constituye compromiso final de crédito. La aprobación definitiva depende de la entidad financiera seleccionada.'

  );

  b.drawSpacer(12);

  b.drawSignatureBlock('Gerente de Financiamiento (F&I)');

}



async function buildRejectionLetter(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawParagraph(`Estimado/a ${client.name},`, { bold: true });

  b.drawSpacer(6);

  b.drawParagraph(

    `Tras revisar su solicitud (referencia ${ref}), en este momento no podemos continuar con la aprobación bajo los términos solicitados.`

  );

  if (request.fiManagerNotes) {

    b.drawSection('Comentarios');

    b.drawParagraph(request.fiManagerNotes);

  }

  b.drawParagraph('Quedamos disponibles para explorar alternativas de enganche, plazo o vehículo.');

  b.drawSignatureBlock('Gerente de Financiamiento (F&I)');

}



async function buildFinancingSummary(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawSection('Cliente');

  b.drawFieldGrid(clientIdentityFields(client, request));

  b.drawSection('Vehículo y montos');

  b.drawFieldGrid(vehicleDetailFields(client));

  const calcRows = financingCalcFields(request);

  if (calcRows.length) {

    b.drawSection('Cálculo de financiamiento');

    b.drawFieldGrid(calcRows);

  }

  if (request.financingOptions?.length) {

    b.drawSection('Opciones presentadas');

    for (const opt of request.financingOptions.slice(0, 4)) {

      const o = opt as unknown as Record<string, unknown>;

      b.drawHighlightBox(String(o.lender || o.name || 'Opción'), [

        `Cuota: ${formatMoney(o.monthlyPayment as number)}`,

        `Plazo: ${o.term || o.termMonths} meses`,

        `APR: ${o.interestRate ?? o.apr ?? '—'}%`,

      ]);

    }

  }

  b.drawParagraph(`Referencia interna: ${ref}`);

}



async function buildLenderPackage(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawParagraph(

    'Paquete de solicitud de financiamiento automotriz para evaluación crediticia. Incluye identificación del solicitante, historial laboral (empleo principal y adicionales), ingresos, referencias, vehículo y trade-in cuando aplique.',

    { size: 9 }

  );

  b.drawSpacer(6);

  b.drawHighlightBox('Resumen ejecutivo', [

    `Referencia: ${ref}`,

    `Solicitante: ${client.name}`,

    `Vehículo: ${vehicleLabel(client)} — ${formatMoney(client.vehiclePrice)}`,

    `Enganche: ${formatMoney(client.downPayment)}`,

    `Ingreso mensual total: ${formatMoney(
      request.cosigner
        ? getFIHouseholdMonthlyIncome(request)
        : getFITotalMonthlyIncome(request)
    )}`,
    ...(request.cosigner
      ? [`Incluye codeudor: ${request.cosigner.name}`]
      : []),

    `Estado solicitud: ${STATUS_LABELS[request.status] || request.status}`,

  ]);

  drawCompleteClientProfile(b, client, request, ref);

  if (request.cosigner) {
    drawCompleteCosignerProfile(b, request.cosigner);
    drawHouseholdIncomeSummary(b, request);
  }

  if (request.sellerNotes || request.fiManagerNotes) {

    b.drawSection('Notas internas para el analista');

    if (request.sellerNotes) b.drawParagraph(`Vendedor: ${request.sellerNotes}`);

    if (request.fiManagerNotes) b.drawParagraph(`Gerente F&I: ${request.fiManagerNotes}`);

  }

  b.drawSection('Certificación del concesionario');

  b.drawParagraph(

    'Certificamos que los datos fueron capturados con autorización del cliente. Este documento no sustituye el reporte de crédito oficial ni la decisión final del prestamista.'

  );

  b.drawSignatureBlock('Representante autorizado del concesionario');

}



async function buildTermsAgreement(

  b: ProfessionalPdfBuilder,

  client: FIClient,

  request: FIRequest,

  ref: string

): Promise<void> {

  b.drawParagraph(`Acuerdo de términos — Referencia ${ref}`, { bold: true });

  b.drawSpacer(8);

  b.drawSection('Partes');

  b.drawFieldGrid([

    { label: 'Cliente', value: client.name },

    { label: 'Vehículo', value: vehicleLabel(client) },

    { label: 'Precio acordado', value: formatMoney(client.vehiclePrice) },

    { label: 'Enganche', value: formatMoney(client.downPayment) },

  ]);

  b.drawSection('Términos generales');

  b.drawParagraph(

    '1. Montos, tasas y plazos finales están sujetos a aprobación de la entidad financiera.'

  );

  b.drawParagraph(

    '2. El concesionario actúa como intermediario salvo acuerdo expreso en contrario.'

  );

  b.drawParagraph('3. El cliente entregará documentación verídica y actualizada durante el proceso.');

  b.drawSignatureBlock('Cliente');

  b.drawSignatureBlock('Representante del concesionario');

}



async function buildCosignerSection(
  b: ProfessionalPdfBuilder,
  client: FIClient,
  request: FIRequest,
  ref: string
): Promise<void> {
  b.drawParagraph(
    'Documento de codeudor (co-signer / garante). El codeudor se obliga solidariamente al pago del financiamiento junto con el solicitante principal.',
    { size: 9 }
  );
  b.drawSpacer(6);
  b.drawSection('Solicitante principal (resumen)');
  b.drawFieldGrid(clientIdentityFields(client, request));
  b.drawFieldGrid([
    {
      label: 'Ingreso mensual solicitante',
      value: formatMoney(getFITotalMonthlyIncome(request)),
    },
  ]);

  const cosigner = request.cosigner as Cosigner | undefined;
  if (cosigner) {
    drawCompleteCosignerProfile(b, cosigner);
    drawHouseholdIncomeSummary(b, request);
  } else {
    b.drawSection('Codeudor');
    b.drawParagraph('No se registró codeudor en esta solicitud.');
  }

  b.drawParagraph(`Referencia: ${ref}`);
}



export function fiTemplateFilename(template: FIDocumentTemplate, clientName: string): string {

  const slug = clientName

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .replace(/[^a-zA-Z0-9]+/g, '-')

    .replace(/^-|-$/g, '')

    .slice(0, 40);

  const names: Record<FIDocumentTemplate, string> = {

    credit_application: 'solicitud-credito',

    pre_approval_letter: 'carta-preaprobacion',

    rejection_letter: 'carta-decision',

    financing_summary: 'resumen-financiamiento',

    lender_package: 'paquete-entidad-financiera',

    terms_agreement: 'acuerdo-terminos',

    cosigner_agreement: 'co-signer',

  };

  return `${names[template]}-${slug || 'cliente'}.pdf`;

}



export { TEMPLATE_TITLES, TEMPLATE_BRANDING };


