import type { BlockSection, DocumentTemplateType } from './types';

function sid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const BILL_OF_SALE_LEGAL = `El Vendedor declara ser el propietario legítimo del vehículo descrito y tener pleno derecho a transferirlo. El Comprador reconoce haber inspeccionado el vehículo (o haber tenido oportunidad razonable de hacerlo) y lo acepta en su estado actual ("AS IS / TAL CUAL"), salvo garantías expresas por escrito en este documento. Cualquier garantía implícita de comerciabilidad o idoneidad queda excluida en la medida permitida por la ley aplicable. Las partes confirman que la información de identificación del vehículo (VIN, odómetro, año, marca y modelo) es correcta al mejor de su conocimiento. Este documento constituye el acuerdo completo respecto a la transferencia de propiedad aquí descrita.`;

const DISCLOSURE_LEGAL = `El presente aviso se emite para informar al cliente sobre términos, condiciones y riesgos relevantes de la transacción. El cliente declara haber leído y comprendido este documento. Nada en este aviso sustituye asesoría legal independiente. Conserve una copia para sus registros.`;

const AUTHORIZATION_LEGAL = `Por medio del presente, el abajo firmante autoriza a la empresa identificada en el encabezado a realizar las gestiones aquí descritas en su nombre, incluyendo la verificación de información necesaria para completar la solicitud. Esta autorización es válida hasta su revocación por escrito o hasta la conclusión del trámite indicado.`;

export interface SeedTemplateDef {
  type: DocumentTemplateType;
  name: string;
  description: string;
  requiresSignature: boolean;
  sections: BlockSection[];
}

export function getSeedTemplateDefinitions(): SeedTemplateDef[] {
  return [
    {
      type: 'bill_of_sale',
      name: 'Bill of Sale / Contrato de compraventa',
      description:
        'Transferencia de vehículo con partes, VIN, precio, forma de pago, cláusula AS-IS y firmas.',
      requiresSignature: true,
      sections: [
        { id: sid('t'), type: 'title', title: 'BILL OF SALE / CONTRATO DE COMPRAVENTA', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Partes', enabled: true },
        { id: sid('v'), type: 'vehicle_info', title: 'Vehículo', enabled: true },
        { id: sid('s'), type: 'sale_terms', title: 'Términos de la venta', enabled: true },
        { id: sid('pay'), type: 'payment_summary', title: 'Resumen de pago', enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Declaraciones y condiciones',
          content: BILL_OF_SALE_LEGAL,
          enabled: true,
        },
        {
          id: sid('a'),
          type: 'checkbox_ack',
          title: 'Reconocimientos',
          acknowledgments: [
            'He leído y acepto las condiciones de este documento.',
            'Confirmo que el odómetro y el VIN indicados son correctos.',
          ],
          enabled: true,
        },
        {
          id: sid('sig'),
          type: 'signature_block',
          title: 'Firmas',
          signatureLabels: ['Firma del Comprador', 'Firma del Vendedor', 'Testigo (opcional)'],
          enabled: true,
        },
      ],
    },
    {
      type: 'invoice',
      name: 'Factura / Invoice',
      description: 'Factura profesional con ítems, subtotal, impuestos y total.',
      requiresSignature: false,
      sections: [
        { id: sid('t'), type: 'title', title: 'FACTURA / INVOICE', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Cliente', enabled: true },
        { id: sid('v'), type: 'vehicle_info', title: 'Referencia de vehículo', enabled: true },
        { id: sid('li'), type: 'line_items', title: 'Detalle', enabled: true },
        { id: sid('pay'), type: 'payment_summary', title: 'Totales', enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Términos de pago',
          content:
            'El pago es exigible según los términos indicados. Los cargos por mora o fondos insuficientes podrán aplicarse conforme a la política del negocio y la ley aplicable.',
          enabled: true,
        },
      ],
    },
    {
      type: 'receipt',
      name: 'Recibo de pago',
      description: 'Comprobante de pago recibido, método y balance restante.',
      requiresSignature: false,
      sections: [
        { id: sid('t'), type: 'title', title: 'RECIBO DE PAGO', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Pagador', enabled: true },
        { id: sid('pay'), type: 'payment_summary', title: 'Detalle del pago', enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Nota',
          content:
            'Este recibo confirma el pago indicado. No constituye por sí solo transferencia de título del vehículo salvo que se acompañe de Bill of Sale firmado.',
          enabled: true,
        },
        {
          id: sid('sig'),
          type: 'signature_block',
          title: 'Acuse',
          signatureLabels: ['Recibido por'],
          enabled: true,
        },
      ],
    },
    {
      type: 'delivery_receipt',
      name: 'Recibo de entrega',
      description: 'Entrega del vehículo, condición y odómetro a la salida.',
      requiresSignature: true,
      sections: [
        { id: sid('t'), type: 'title', title: 'RECIBO DE ENTREGA DE VEHÍCULO', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Partes', enabled: true },
        { id: sid('v'), type: 'vehicle_info', title: 'Vehículo entregado', enabled: true },
        {
          id: sid('c'),
          type: 'custom_fields',
          title: 'Condición a la entrega',
          fields: [
            { label: 'Condición general', binding: 'sale.deliveryCondition' },
            { label: 'Odómetro a la entrega', binding: 'vehicle.mileage' },
            { label: 'Fecha/hora de entrega', binding: 'sale.deliveryAt' },
          ],
          enabled: true,
        },
        {
          id: sid('a'),
          type: 'checkbox_ack',
          acknowledgments: [
            'Recibí el vehículo en la condición descrita.',
            'Se me entregaron llaves y documentos aplicables.',
          ],
          enabled: true,
        },
        {
          id: sid('sig'),
          type: 'signature_block',
          signatureLabels: ['Firma del receptor', 'Firma del entregador'],
          enabled: true,
        },
      ],
    },
    {
      type: 'authorization',
      name: 'Autorización',
      description: 'Autorización de prueba, crédito, retiro u otro trámite.',
      requiresSignature: true,
      sections: [
        { id: sid('t'), type: 'title', title: 'AUTORIZACIÓN', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Autorizante', enabled: true },
        {
          id: sid('c'),
          type: 'custom_fields',
          title: 'Alcance',
          fields: [
            { label: 'Tipo de autorización', binding: 'custom.authType' },
            { label: 'Válida hasta', binding: 'custom.validUntil' },
          ],
          enabled: true,
        },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Términos',
          content: AUTHORIZATION_LEGAL,
          enabled: true,
        },
        {
          id: sid('sig'),
          type: 'signature_block',
          signatureLabels: ['Firma del autorizante'],
          enabled: true,
        },
      ],
    },
    {
      type: 'disclosure',
      name: 'Aviso / Disclosure',
      description: 'Aviso legal editable para revelaciones al cliente.',
      requiresSignature: true,
      sections: [
        { id: sid('t'), type: 'title', title: 'AVISO AL CLIENTE / DISCLOSURE', enabled: true },
        { id: sid('p'), type: 'party_info', title: 'Cliente', enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Contenido del aviso',
          content: DISCLOSURE_LEGAL,
          enabled: true,
        },
        {
          id: sid('a'),
          type: 'checkbox_ack',
          acknowledgments: ['He recibido y leído este aviso.'],
          enabled: true,
        },
        {
          id: sid('sig'),
          type: 'signature_block',
          signatureLabels: ['Firma del cliente'],
          enabled: true,
        },
      ],
    },
    {
      type: 'custom',
      name: 'Documento en blanco (personalizado)',
      description: 'Plantilla base con branding; agrega las secciones que necesites.',
      requiresSignature: false,
      sections: [
        { id: sid('t'), type: 'title', title: 'DOCUMENTO', enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Contenido',
          content: 'Escribe aquí el contenido de tu documento o agrega más secciones en el editor.',
          enabled: true,
        },
      ],
    },
  ];
}
