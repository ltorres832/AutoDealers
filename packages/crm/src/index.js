"use strict";
// CRM Module - Núcleo del sistema
// Gestión de leads, mensajes, citas, ventas
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomerFile = exports.updateCustomerFileStatus = exports.addEvidence = exports.addDealerDocument = exports.addCustomerDocument = exports.requestDocument = exports.getCustomerFiles = exports.getCustomerFileByToken = exports.getCustomerFileById = exports.createCustomerFile = exports.getReviewStats = exports.addReviewResponse = exports.deleteReview = exports.updateReview = exports.getReviewById = exports.getPublicReviews = exports.getReviews = exports.createReview = exports.markReminderAsSent = exports.createReminder = exports.createPostSaleReminders = exports.getPendingReminders = exports.getAllReminders = exports.findLeadByPhoneInTenant = exports.findLeadByPhone = exports.pullCreditReport = exports.validateDocument = exports.compareFinancingOptions = exports.executeFIWorkflows = exports.getFIWorkflows = exports.createFIWorkflow = exports.getFIMetrics = exports.calculateCombinedScore = exports.updateCosignerStatus = exports.addCosignerToRequest = exports.calculateAndUpdateApprovalScore = exports.calculateAndUpdateFinancing = exports.calculateApprovalScore = exports.calculateFinancing = exports.getFIRequestHistory = exports.addFIRequestNote = exports.getFIRequests = exports.getFIRequestById = exports.updateFIRequestStatus = exports.submitFIRequest = exports.createFIRequest = exports.updateFIClient = exports.getFIClients = exports.getFIClientById = exports.createFIClient = void 0;
exports.updateCustomerFileNotes = void 0;
__exportStar(require("./leads"), exports);
__exportStar(require("./messages"), exports);
__exportStar(require("./appointments"), exports);
__exportStar(require("./sales"), exports);
__exportStar(require("./post-sale"), exports);
__exportStar(require("./internal-messages"), exports);
__exportStar(require("./public-chat"), exports);
__exportStar(require("./reviews"), exports);
// NO usar export * para customer-files - usar exportación explícita más abajo
// export * from './customer-files';
__exportStar(require("./pre-qualification"), exports);
__exportStar(require("./finance-insurance"), exports);
var finance_insurance_1 = require("./finance-insurance");
Object.defineProperty(exports, "createFIClient", { enumerable: true, get: function () { return finance_insurance_1.createFIClient; } });
Object.defineProperty(exports, "getFIClientById", { enumerable: true, get: function () { return finance_insurance_1.getFIClientById; } });
Object.defineProperty(exports, "getFIClients", { enumerable: true, get: function () { return finance_insurance_1.getFIClients; } });
Object.defineProperty(exports, "updateFIClient", { enumerable: true, get: function () { return finance_insurance_1.updateFIClient; } });
Object.defineProperty(exports, "createFIRequest", { enumerable: true, get: function () { return finance_insurance_1.createFIRequest; } });
Object.defineProperty(exports, "submitFIRequest", { enumerable: true, get: function () { return finance_insurance_1.submitFIRequest; } });
Object.defineProperty(exports, "updateFIRequestStatus", { enumerable: true, get: function () { return finance_insurance_1.updateFIRequestStatus; } });
Object.defineProperty(exports, "getFIRequestById", { enumerable: true, get: function () { return finance_insurance_1.getFIRequestById; } });
Object.defineProperty(exports, "getFIRequests", { enumerable: true, get: function () { return finance_insurance_1.getFIRequests; } });
Object.defineProperty(exports, "addFIRequestNote", { enumerable: true, get: function () { return finance_insurance_1.addFIRequestNote; } });
Object.defineProperty(exports, "getFIRequestHistory", { enumerable: true, get: function () { return finance_insurance_1.getFIRequestHistory; } });
Object.defineProperty(exports, "calculateFinancing", { enumerable: true, get: function () { return finance_insurance_1.calculateFinancing; } });
Object.defineProperty(exports, "calculateApprovalScore", { enumerable: true, get: function () { return finance_insurance_1.calculateApprovalScore; } });
Object.defineProperty(exports, "calculateAndUpdateFinancing", { enumerable: true, get: function () { return finance_insurance_1.calculateAndUpdateFinancing; } });
Object.defineProperty(exports, "calculateAndUpdateApprovalScore", { enumerable: true, get: function () { return finance_insurance_1.calculateAndUpdateApprovalScore; } });
Object.defineProperty(exports, "addCosignerToRequest", { enumerable: true, get: function () { return finance_insurance_1.addCosignerToRequest; } });
Object.defineProperty(exports, "updateCosignerStatus", { enumerable: true, get: function () { return finance_insurance_1.updateCosignerStatus; } });
Object.defineProperty(exports, "calculateCombinedScore", { enumerable: true, get: function () { return finance_insurance_1.calculateCombinedScore; } });
Object.defineProperty(exports, "getFIMetrics", { enumerable: true, get: function () { return finance_insurance_1.getFIMetrics; } });
Object.defineProperty(exports, "createFIWorkflow", { enumerable: true, get: function () { return finance_insurance_1.createFIWorkflow; } });
Object.defineProperty(exports, "getFIWorkflows", { enumerable: true, get: function () { return finance_insurance_1.getFIWorkflows; } });
Object.defineProperty(exports, "executeFIWorkflows", { enumerable: true, get: function () { return finance_insurance_1.executeFIWorkflows; } });
Object.defineProperty(exports, "compareFinancingOptions", { enumerable: true, get: function () { return finance_insurance_1.compareFinancingOptions; } });
Object.defineProperty(exports, "validateDocument", { enumerable: true, get: function () { return finance_insurance_1.validateDocument; } });
Object.defineProperty(exports, "pullCreditReport", { enumerable: true, get: function () { return finance_insurance_1.pullCreditReport; } });
__exportStar(require("./types"), exports);
__exportStar(require("./corporate-email"), exports);
__exportStar(require("./email-aliases"), exports);
__exportStar(require("./tasks"), exports);
__exportStar(require("./scoring"), exports);
__exportStar(require("./workflows"), exports);
__exportStar(require("./contracts"), exports);
__exportStar(require("./contract-templates"), exports);
// Re-exportar funciones de búsqueda de leads
var leads_1 = require("./leads");
Object.defineProperty(exports, "findLeadByPhone", { enumerable: true, get: function () { return leads_1.findLeadByPhone; } });
Object.defineProperty(exports, "findLeadByPhoneInTenant", { enumerable: true, get: function () { return leads_1.findLeadByPhoneInTenant; } });
// Re-exportar funciones de post-sale para fácil acceso
var post_sale_1 = require("./post-sale");
Object.defineProperty(exports, "getAllReminders", { enumerable: true, get: function () { return post_sale_1.getAllReminders; } });
Object.defineProperty(exports, "getPendingReminders", { enumerable: true, get: function () { return post_sale_1.getPendingReminders; } });
Object.defineProperty(exports, "createPostSaleReminders", { enumerable: true, get: function () { return post_sale_1.createPostSaleReminders; } });
Object.defineProperty(exports, "createReminder", { enumerable: true, get: function () { return post_sale_1.createReminder; } });
Object.defineProperty(exports, "markReminderAsSent", { enumerable: true, get: function () { return post_sale_1.markReminderAsSent; } });
// Re-exportar funciones de reviews
var reviews_1 = require("./reviews");
Object.defineProperty(exports, "createReview", { enumerable: true, get: function () { return reviews_1.createReview; } });
Object.defineProperty(exports, "getReviews", { enumerable: true, get: function () { return reviews_1.getReviews; } });
Object.defineProperty(exports, "getPublicReviews", { enumerable: true, get: function () { return reviews_1.getPublicReviews; } });
Object.defineProperty(exports, "getReviewById", { enumerable: true, get: function () { return reviews_1.getReviewById; } });
Object.defineProperty(exports, "updateReview", { enumerable: true, get: function () { return reviews_1.updateReview; } });
Object.defineProperty(exports, "deleteReview", { enumerable: true, get: function () { return reviews_1.deleteReview; } });
Object.defineProperty(exports, "addReviewResponse", { enumerable: true, get: function () { return reviews_1.addReviewResponse; } });
Object.defineProperty(exports, "getReviewStats", { enumerable: true, get: function () { return reviews_1.getReviewStats; } });
// Re-exportar funciones de customer-files
var customer_files_1 = require("./customer-files");
Object.defineProperty(exports, "createCustomerFile", { enumerable: true, get: function () { return customer_files_1.createCustomerFile; } });
Object.defineProperty(exports, "getCustomerFileById", { enumerable: true, get: function () { return customer_files_1.getCustomerFileById; } });
Object.defineProperty(exports, "getCustomerFileByToken", { enumerable: true, get: function () { return customer_files_1.getCustomerFileByToken; } });
Object.defineProperty(exports, "getCustomerFiles", { enumerable: true, get: function () { return customer_files_1.getCustomerFiles; } });
Object.defineProperty(exports, "requestDocument", { enumerable: true, get: function () { return customer_files_1.requestDocument; } });
Object.defineProperty(exports, "addCustomerDocument", { enumerable: true, get: function () { return customer_files_1.addCustomerDocument; } });
Object.defineProperty(exports, "addDealerDocument", { enumerable: true, get: function () { return customer_files_1.addDealerDocument; } });
Object.defineProperty(exports, "addEvidence", { enumerable: true, get: function () { return customer_files_1.addEvidence; } });
Object.defineProperty(exports, "updateCustomerFileStatus", { enumerable: true, get: function () { return customer_files_1.updateCustomerFileStatus; } });
Object.defineProperty(exports, "deleteCustomerFile", { enumerable: true, get: function () { return customer_files_1.deleteCustomerFile; } });
Object.defineProperty(exports, "updateCustomerFileNotes", { enumerable: true, get: function () { return customer_files_1.updateCustomerFileNotes; } });
//# sourceMappingURL=index.js.map