// Tipos de reportes

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  status?: string;
  dealerId?: string; // Filtrar por dealer específico
  sellerId?: string; // Filtrar por vendedor específico
  scope?: 'global' | 'dealer' | 'seller'; // Alcance del reporte
}

export interface LeadsReport {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byAssignedTo: Record<string, number>;
  conversionRate: number;
  averageResponseTime: number; // en horas
}

export interface SalesReport {
  total: number;
  totalRevenue: number;
  bySeller: Record<string, { count: number; revenue: number }>;
  byMonth: Record<string, { count: number; revenue: number }>;
  averageSalePrice: number;
  conversionRate: number;
}

export interface PerformanceReport {
  sellerId: string;
  sellerName: string;
  leadsAssigned: number;
  leadsContacted: number;
  leadsQualified: number;
  appointments: number;
  sales: number;
  revenue: number;
  conversionRate: number;
  averageResponseTime: number;
}

export interface SocialMediaReport {
  platform: string;
  postsPublished: number;
  engagement: number;
  clicks: number;
  leadsGenerated: number;
}

export interface AIReport {
  responsesGenerated: number;
  leadsClassified: number;
  postsCreated: number;
  averageConfidence: number;
  approvalRate: number;
}



