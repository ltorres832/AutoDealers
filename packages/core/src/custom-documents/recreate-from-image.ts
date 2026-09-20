/**
 * Recrea una plantilla de documento a partir de una foto/escaneo vía OpenAI Vision.
 */
import { getOpenAIApiKey } from '../credentials';
import { uploadFile } from '../storage';
import type { BlockSection, DocumentTemplateType, FillableFieldDef } from './types';
import { createDocumentTemplate } from './templates';

export interface RecreateFromImageResult {
  templateId: string;
  detectedType: DocumentTemplateType;
  title: string;
  engineSuggestion: 'blocks' | 'pdf_overlay';
  confidence: number;
  sections: BlockSection[];
  fields: FillableFieldDef[];
  warnings: string[];
}

function sid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function asType(raw: string): DocumentTemplateType {
  const allowed: DocumentTemplateType[] = [
    'bill_of_sale',
    'invoice',
    'receipt',
    'delivery_receipt',
    'authorization',
    'disclosure',
    'warranty',
    'custom',
  ];
  return allowed.includes(raw as DocumentTemplateType)
    ? (raw as DocumentTemplateType)
    : 'custom';
}

export async function recreateTemplateFromImage(
  tenantId: string,
  userId: string,
  imageBuffer: Buffer,
  contentType: string,
  fileName = 'scan.jpg'
): Promise<RecreateFromImageResult> {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI no está configurado en la plataforma');
  }

  const sourceImageUrl = await uploadFile(
    tenantId,
    imageBuffer,
    fileName,
    contentType || 'image/jpeg',
    'document-scans'
  );

  const b64 = imageBuffer.toString('base64');
  const mime = contentType || 'image/jpeg';

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Eres un experto en documentos legales automotrices (bill of sale, invoices, receipts, autorizaciones).
Analiza la imagen del documento y responde SOLO JSON con esta forma:
{
  "detectedType": "bill_of_sale|invoice|receipt|delivery_receipt|authorization|disclosure|warranty|custom",
  "title": "string",
  "engineSuggestion": "blocks|pdf_overlay",
  "confidence": 0.0-1.0,
  "sections": [{"type":"title|party_info|vehicle_info|sale_terms|line_items|payment_summary|legal_text|checkbox_ack|signature_block|custom_fields","title":"string","content":"string opcional","signatureLabels":[],"acknowledgments":[],"fields":[{"label":"","binding":"vehicle.vin|buyer.name|sale.price|..."}]}],
  "fields": [{"id":"f1","name":"buyer_name","type":"text","required":true,"binding":"buyer.name","placeholder":"Nombre del comprador"}],
  "warnings": ["string"]
}
Usa engineSuggestion=blocks cuando puedas reconstruir estructura; pdf_overlay si el layout es muy denso/oficial.
Incluye en warnings si la foto es borrosa o incompleta.
Textos legales: copia lo más fiel posible del documento.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Reconstruye este documento como plantilla editable. Extrae todos los campos visibles y cláusulas.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${b64}` },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('La IA no devolvió un JSON válido; intenta con una foto más nítida');
  }

  const detectedType = asType(String(parsed.detectedType || 'custom'));
  const title = String(parsed.title || 'Documento recreado');
  const engineSuggestion =
    parsed.engineSuggestion === 'pdf_overlay' ? 'pdf_overlay' : 'blocks';
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));

  const sections: BlockSection[] = Array.isArray(parsed.sections)
    ? parsed.sections.map((s: any) => ({
        id: sid('ai'),
        type: s.type || 'legal_text',
        title: s.title,
        content: s.content,
        signatureLabels: s.signatureLabels,
        acknowledgments: s.acknowledgments,
        fields: s.fields,
        enabled: true,
      }))
    : [
        { id: sid('t'), type: 'title', title, enabled: true },
        {
          id: sid('l'),
          type: 'legal_text',
          title: 'Contenido detectado',
          content: 'Revisa y completa este borrador generado por IA.',
          enabled: true,
        },
      ];

  const fields: FillableFieldDef[] = Array.isArray(parsed.fields)
    ? parsed.fields.map((f: any, i: number) => ({
        id: f.id || `f${i}`,
        name: f.name || `field_${i}`,
        type: f.type || 'text',
        required: Boolean(f.required),
        placeholder: f.placeholder,
        binding: f.binding,
      }))
    : [];

  const warnings: string[] = Array.isArray(parsed.warnings)
    ? parsed.warnings.map(String)
    : [];
  warnings.unshift(
    'Este es un borrador de IA. Revísalo y corrígelo antes de usarlo en operaciones reales. No se garantiza copia 100% idéntica a la foto.'
  );

  const template = await createDocumentTemplate(tenantId, userId, {
    engine: engineSuggestion === 'pdf_overlay' ? 'pdf_upload' : 'blocks',
    type: detectedType,
    name: `${title} (IA)`,
    description: `Borrador recreado por IA. ${warnings[0]}`,
    category: 'custom',
    requiresSignature: sections.some((s) => s.type === 'signature_block'),
    layout: { sections },
    templateDocumentUrl: engineSuggestion === 'pdf_overlay' ? sourceImageUrl : undefined,
    fillableFields: fields,
    aiDraft: true,
    sourceImageUrl,
    aiModel: 'gpt-4o',
    aiConfidence: confidence,
  });

  return {
    templateId: template.id,
    detectedType,
    title,
    engineSuggestion,
    confidence,
    sections,
    fields,
    warnings,
  };
}
