// CRM Module - Núcleo del sistema
// Gestión de leads, mensajes, citas, ventas

export * from './leads';
export * from './messages';
export * from './appointments';
export * from './sales';
export * from './post-sale';
export * from './internal-messages';
export * from './public-chat';
export * from './reviews';
// NO usar export * para customer-files - usar exportación explícita más abajo
// export * from './customer-files';
export * from './pre-qualification';
export * from './finance-insurance';
export {
  createFIClient,
  getFIClientById,
  getFIClients,
  updateFIClient,
  createFIRequest,
  submitFIRequest,
  updateFIRequestStatus,
  getFIRequestById,
  getFIRequests,
  addFIRequestNote,
  getFIRequestHistory,
  calculateFinancing,
  calculateApprovalScore,
  calculateAndUpdateFinancing,
  calculateAndUpdateApprovalScore,
  addCosignerToRequest,
  updateCosignerStatus,
  calculateCombinedScore,
  getFIMetrics,
  createFIWorkflow,
  getFIWorkflows,
  executeFIWorkflows,
  compareFinancingOptions,
  validateDocument,
  pullCreditReport,
} from './finance-insurance';
export * from './types';
export * from './corporate-email';
export * from './email-aliases';
export * from './tasks';
export * from './scoring';
export * from './workflows';
export * from './contracts';
export * from './contract-templates';

// Re-exportar funciones de búsqueda de leads
export { findLeadByPhone, findLeadByPhoneInTenant } from './leads';

// Re-exportar funciones de post-sale para fácil acceso
export { getAllReminders, getPendingReminders, createPostSaleReminders, createReminder, markReminderAsSent } from './post-sale';
export type { PostSaleReminder, ReminderType, ReminderFrequency } from './post-sale';

// Re-exportar funciones de reviews
export { 
  createReview, 
  getReviews, 
  getPublicReviews, 
  getReviewById, 
  updateReview, 
  deleteReview, 
  addReviewResponse, 
  getReviewStats 
} from './reviews';
export type { Review } from './reviews';

// Re-exportar funciones de customer-files
export {
  createCustomerFile,
  getCustomerFileById,
  getCustomerFileByToken,
  getCustomerFiles,
  requestDocument,
  addCustomerDocument,
  addDealerDocument,
  addEvidence,
  updateCustomerFileStatus,
  deleteCustomerFile,
  updateCustomerFileNotes,
} from './customer-files';
export type { CustomerFile, CustomerDocument, RequestedDocument, EvidenceItem } from './types';

