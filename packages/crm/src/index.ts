// CRM Module - Núcleo del sistema
// Gestión de leads, mensajes, citas, ventas

export * from './leads';
export * from './seller-owned-leads';
export { getLeads } from './leads';
export {
  ingestFacebookLeadgenWebhook,
  type FacebookLeadgenIngestResult,
} from './facebook-leadgen-ingest';
export { normalizeLeadSource, leadDisplayName } from './lead-utils';
export { parseLeadPatchBody } from './parse-lead-patch';
export type { ParseLeadPatchOptions, ParseLeadPatchResult } from './parse-lead-patch';
export { sanitizeLeadTradeIn } from './lead-trade-in';
export * from './messages';
export { createMessage, getLeadMessages, getMessagesByChannel } from './messages';
export * from './appointments';
export { updateAppointment, updateAppointmentStatus } from './appointments';
export {
  ensurePublicAppointmentTrackingDoc,
  mirrorPublicAppointmentTracking,
  PUBLIC_LEAD_APPOINTMENT_TRACKING_COLLECTION,
} from './public-appointment-tracking';
export * from './sales';
export { getTenantSales } from './sales';
export * from './post-sale';
export * from './internal-messages';
export * from './public-chat';
export * from './reviews';
export * from './review-invites';
// NO usar export * para customer-files - usar exportación explícita más abajo
// export * from './customer-files';
export * from './pre-qualification';
export * from './finance-insurance';
export {
  fiStatusToExpeditionStage,
  syncLinkedCustomerFileExpedition,
  linkCustomerFileToFiRequest,
  expeditionStageLabel,
} from './expedition-sync';
export type { ExpeditionStage } from './expedition-sync';
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
export { getCorporateEmails, suspendCorporateEmail, activateCorporateEmail } from './corporate-email';
export * from './email-aliases';
export * from './tasks';
export * from './scoring';
export * from './workflows';
export * from './tags';
export * from './contracts';
export * from './contract-templates';
export {
  getCrmLeadRoutingConfig,
  pickNextAssignedSellerForNewLead,
  type CrmLeadRoutingConfig,
  type CrmSourceRuleEntry,
  type LeadRoutingStrategy,
} from './lead-routing';
export {
  getCrmSlaConfig,
  computeLeadSlaSeverity,
  leadLastTouchMs,
  formatHoursSinceTouch,
  DEFAULT_CRM_SLA,
  type CrmSlaConfig,
  type LeadSlaSeverity,
} from './lead-sla';

// findLeadByPhone y findLeadByPhoneInTenant ya están exportadas con export * from './leads'

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
  getReviewStats,
  getApprovedReviewRatingAggregate,
  syncUserRatingFromApprovedReviews,
  getPublicReviewsForSeller,
  getPublicReviewsForDealer,
  resolveSellerPublicRating,
  resolveDealerPublicRating,
  resyncSellerPublicRatings,
  resyncDealerPublicRatings,
  enrichReviewPatchOnApprove,
  linkApprovedReviewsToSeller,
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

