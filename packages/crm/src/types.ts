// Tipos del módulo CRM

export type LeadSource =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'web'
  | 'email'
  | 'sms'
  | 'phone';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'pre_qualified'
  | 'appointment'
  | 'test_drive'
  | 'negotiation'
  | 'closed'
  | 'lost';

export interface Lead {
  id: string;
  tenantId: string;
  assignedTo?: string;
  source: LeadSource;
  status: LeadStatus;
  contact: {
    name: string;
    email?: string;
    phone: string;
    preferredChannel: string;
  };
  interestedVehicles?: string[];
  notes: string;
  aiClassification?: {
    priority: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    intent: string;
  };
  // Scoring avanzado
  score?: {
    automatic: number; // 0-100
    manual?: number; // 0-100
    combined: number; // Promedio o fórmula personalizada
    lastUpdated: Date;
    history: ScoreHistory[];
  };
  // Etiquetas
  tags?: string[];
  // Documentos
  documents?: LeadDocument[];
  interactions: Interaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoreHistory {
  score: number;
  type: 'automatic' | 'manual';
  reason?: string;
  updatedBy?: string;
  updatedAt: Date;
}

export interface LeadDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  size?: number;
  mimeType?: string;
}

export interface Interaction {
  id: string;
  type: 'message' | 'call' | 'email' | 'note' | 'appointment' | 'task' | 'document' | 'workflow';
  content: string;
  userId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  tenantId: string;
  leadId?: string;
  channel: 'whatsapp' | 'facebook' | 'instagram' | 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  content: string;
  attachments?: string[];
  status: 'sent' | 'delivered' | 'read' | 'failed';
  aiGenerated: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string;
  vehicleIds: string[];
  type: 'consultation' | 'test_drive' | 'delivery';
  scheduledAt: Date;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  notes?: string;
  reminders: Reminder[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  sentAt: Date;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
}

export interface Sale {
  id: string;
  tenantId: string;
  leadId?: string;
  vehicleId: string;
  sellerId: string;
  // Información del comprador
  buyer?: {
    fullName: string;
    phone: string;
    email: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    driverLicenseNumber?: string;
    vehiclePlate?: string; // Tablilla del vehículo
  };
  // Recordatorios
  enableReminders?: boolean;
  selectedReminders?: string[]; // Tipos de recordatorios seleccionados
  // Precios y desglose
  salePrice: number; // Precio final de venta
  vehiclePrice: number; // Precio base del vehículo
  bonus1?: number; // Bono 1
  bonus2?: number; // Bono 2
  rebate?: number; // Rebate/Descuento
  tablilla?: number; // Costo de tablilla
  insurance?: number; // Seguro
  accessories?: number; // Accesorios
  other?: number; // Otros
  total: number; // Suma total (salePrice + bonus1 + bonus2 + rebate + tablilla + insurance + accessories + other)
  currency: string;
  // Comisiones
  vehicleCommissionRate?: number; // Porcentaje de comisión del vehículo
  vehicleCommission?: number; // Comisión calculada del vehículo
  insuranceCommissionRate?: number; // Porcentaje de comisión del seguro
  insuranceCommission?: number; // Comisión calculada del seguro
  accessoriesCommissionRate?: number; // Porcentaje de comisión de accesorios
  accessoriesCommission?: number; // Comisión calculada de accesorios
  totalCommission?: number; // Comisión total del vendedor
  // Otros
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
  documents: string[];
  notes: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CustomerFile {
  id: string;
  tenantId: string;
  saleId: string;
  customerId: string; // ID del lead/cliente
  customerInfo: {
    fullName: string;
    phone: string;
    email: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    driverLicenseNumber?: string;
    vehiclePlate?: string;
  };
  vehicleId: string;
  sellerId: string;
  sellerInfo?: {
    id: string;
    name: string;
    email: string;
  };
  // Documentos
  documents: CustomerDocument[];
  // Documentos solicitados
  requestedDocuments: RequestedDocument[];
  // Token único para enlace de subida
  uploadToken: string;
  // Estado del file
  status: 'active' | 'completed' | 'archived' | 'deleted';
  // Notas y evidencia
  notes: string;
  evidence: EvidenceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerDocument {
  id: string;
  name: string;
  type: string; // Tipo de documento: 'license', 'insurance', 'registration', 'other'
  url: string;
  uploadedBy: 'customer' | 'seller' | 'dealer';
  uploadedAt: Date;
  size?: number;
  mimeType?: string;
}

export interface RequestedDocument {
  id: string;
  name: string; // Nombre del documento solicitado
  description?: string;
  type: string; // Tipo de documento
  required: boolean;
  requestedAt: Date;
  requestedBy: string; // ID del vendedor/dealer
  status: 'pending' | 'received' | 'rejected';
  receivedAt?: Date;
  documentId?: string; // ID del documento cuando se recibe
}

export interface EvidenceItem {
  id: string;
  type: 'document' | 'note' | 'communication' | 'payment' | 'other';
  title: string;
  description?: string;
  content?: string; // Para notas
  documentId?: string; // Para documentos
  url?: string; // Para enlaces externos
  createdBy: string;
  createdAt: Date;
}

// Pre-Cualificación para Financiamiento
export type PreQualificationStatus = 
  | 'pre_approved' 
  | 'partially_approved' 
  | 'not_qualified' 
  | 'manual_review';

export type EmploymentType = 'employed' | 'self_employed' | 'retired' | 'unemployed';
export type CreditHistory = 'excellent' | 'good' | 'fair' | 'limited' | 'poor';
export type VehicleType = 'new' | 'used' | 'both';

export interface PreQualification {
  id: string;
  tenantId: string;
  leadId?: string; // Si se convierte en lead
  
  // Información del cliente
  contact: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    identificationNumber: string;
  };
  
  // Información financiera
  financial: {
    monthlyIncome: number;
    monthlyExpenses: number;
    employmentType: EmploymentType;
    employmentDuration: number; // meses
    creditHistory: CreditHistory;
  };
  
  // Preferencias
  preferences: {
    desiredPriceRange: {
      min: number;
      max: number;
    };
    vehicleType: VehicleType;
    financingTerm: number; // meses
    interestedVehicleId?: string;
  };
  
  // Resultado de la evaluación
  result: {
    status: PreQualificationStatus;
    approvedAmount?: number;
    maxAmount?: number;
    interestRate?: number;
    score: number; // 0-100
    reasons: string[]; // Razones de la decisión
    suggestedVehicles: string[]; // IDs de vehículos
  };
  
  // Metadatos
  source: 'web' | 'mobile' | 'api';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date; // Pre-cualificación válida por 30 días
}



