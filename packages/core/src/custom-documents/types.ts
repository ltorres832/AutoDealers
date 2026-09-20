/** Tipos del sistema de documentos personalizados. */

export type DocumentEngine = 'blocks' | 'pdf_upload';

export type DocumentTemplateType =
  | 'bill_of_sale'
  | 'invoice'
  | 'receipt'
  | 'delivery_receipt'
  | 'authorization'
  | 'disclosure'
  | 'warranty'
  | 'custom';

export type DocumentStatus =
  | 'draft'
  | 'final'
  | 'sent'
  | 'awaiting_signature'
  | 'signed'
  | 'void';

export type BlockSectionType =
  | 'header_branding'
  | 'title'
  | 'party_info'
  | 'vehicle_info'
  | 'sale_terms'
  | 'line_items'
  | 'payment_summary'
  | 'legal_text'
  | 'checkbox_ack'
  | 'signature_block'
  | 'footer'
  | 'custom_fields';

export interface BlockSection {
  id: string;
  type: BlockSectionType;
  title?: string;
  /** Texto libre / cláusulas legales */
  content?: string;
  /** Etiquetas de firma */
  signatureLabels?: string[];
  /** Campos personalizados { label, binding } */
  fields?: Array<{ label: string; binding?: string; value?: string }>;
  /** Reconocimientos con checkbox */
  acknowledgments?: string[];
  enabled?: boolean;
}

export interface FillableFieldDef {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'address' | 'signature';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  binding?: string;
  position?: { x: number; y: number; width?: number; height?: number; page?: number };
}

export interface SignatureFieldDef {
  id: string;
  type: 'signature' | 'initial' | 'date';
  signer: 'buyer' | 'seller' | 'dealer' | 'cosigner' | 'witness';
  required: boolean;
  label: string;
  position: { x: number; y: number; width: number; height: number; page?: number };
}

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  engine: DocumentEngine;
  type: DocumentTemplateType;
  name: string;
  description?: string;
  category: 'standard' | 'custom';
  isActive: boolean;
  requiresSignature: boolean;
  layout?: { sections: BlockSection[] };
  templateDocumentUrl?: string;
  fillableFields?: FillableFieldDef[];
  signatureFields?: SignatureFieldDef[];
  dataBindings?: Record<string, string>;
  legalDefaults?: Record<string, string>;
  /** Borrador IA pendiente de confirmación */
  aiDraft?: boolean;
  sourceImageUrl?: string;
  aiModel?: string;
  aiConfidence?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedDocumentParties {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerName?: string;
  sellerEmail?: string;
  dealerName?: string;
}

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  templateId: string;
  engine: DocumentEngine;
  type: DocumentTemplateType;
  name: string;
  status: DocumentStatus;
  documentNumber: string;
  payload: Record<string, unknown>;
  pdfUrl?: string;
  parties?: GeneratedDocumentParties;
  shareToken?: string;
  shareExpiresAt?: Date | null;
  contractId?: string;
  vehicleId?: string;
  leadId?: string;
  saleId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentPayload {
  title?: string;
  subtitle?: string;
  documentNumber?: string;
  parties?: GeneratedDocumentParties;
  buyer?: Record<string, string>;
  seller?: Record<string, string>;
  dealer?: Record<string, string>;
  vehicle?: Record<string, string | number>;
  sale?: Record<string, string | number>;
  lineItems?: Array<{ description: string; qty?: number; unitPrice?: number; total?: number }>;
  payment?: Record<string, string | number>;
  legalTexts?: Record<string, string>;
  customFields?: Array<{ label: string; value: string }>;
  acknowledgments?: string[];
  fieldValues?: Record<string, string | number>;
  [key: string]: unknown;
}
