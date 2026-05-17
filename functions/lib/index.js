"use strict";
/**
 * Cloud Functions para AutoDealersPR
 *
 * Funciones principales según el documento maestro.
 * Los servidores Next.js (nextjsServer*) se definen en index.js en la raíz de functions.
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestUsers = exports.createPurchaseIntent = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
var createPurchaseIntent_1 = require("./purchase/createPurchaseIntent");
Object.defineProperty(exports, "createPurchaseIntent", { enumerable: true, get: function () { return createPurchaseIntent_1.createPurchaseIntent; } });
// CRM Functions
__exportStar(require("./crm/leads"), exports);
// Inventory Functions
__exportStar(require("./inventory/vehicles"), exports);
// Messaging Functions
__exportStar(require("./messaging/messages"), exports);
// Appointments Functions
__exportStar(require("./appointments/appointments"), exports);
// Sales Functions
__exportStar(require("./sales/sales"), exports);
// Tenants/Subdomains Functions
__exportStar(require("./tenants/subdomains"), exports);
// Admin Functions
__exportStar(require("./admin/users"), exports);
__exportStar(require("./admin/tenants"), exports);
__exportStar(require("./admin/sellers"), exports);
// Messaging Functions (Email, SMS, WhatsApp)
__exportStar(require("./messaging/email"), exports);
__exportStar(require("./messaging/sms"), exports);
__exportStar(require("./messaging/whatsapp"), exports);
// Billing Functions
__exportStar(require("./billing/subscriptions"), exports);
// Notifications Functions
__exportStar(require("./notifications/notifications"), exports);
// Reports Functions
__exportStar(require("./reports/reports"), exports);
// AI Functions
__exportStar(require("./ai/ai"), exports);
// Workflows Functions
__exportStar(require("./workflows/workflows"), exports);
// Tasks Functions
__exportStar(require("./tasks/tasks"), exports);
// Social Media Functions
__exportStar(require("./social/social"), exports);
// Templates Functions
__exportStar(require("./templates/templates"), exports);
// Promotions Functions
__exportStar(require("./promotions/promotions"), exports);
// Contracts Functions
__exportStar(require("./contracts/contracts"), exports);
// Reviews Functions
__exportStar(require("./reviews/reviews"), exports);
// Referrals Functions
__exportStar(require("./referrals/referrals"), exports);
// Banners Functions
__exportStar(require("./banners/banners"), exports);
// Customer Files Functions
__exportStar(require("./customer-files/customer-files"), exports);
// Reminders Functions
__exportStar(require("./reminders/reminders"), exports);
// Internal Chat Functions
__exportStar(require("./internal-chat/internal-chat"), exports);
// Announcements Functions
__exportStar(require("./announcements/announcements"), exports);
// Corporate Emails Functions
__exportStar(require("./corporate-emails/corporate-emails"), exports);
// FI (Financing & Insurance) Functions
__exportStar(require("./fi/fi"), exports);
// Public Chat Functions
__exportStar(require("./public-chat/public-chat"), exports);
// Settings Functions
__exportStar(require("./settings/settings"), exports);
// Integrations Functions
__exportStar(require("./integrations/integrations"), exports);
// Policies Functions
__exportStar(require("./policies/policies"), exports);
// Email Aliases Functions
__exportStar(require("./email-aliases/email-aliases"), exports);
// Pre-Qualifications Functions
__exportStar(require("./pre-qualifications/pre-qualifications"), exports);
// Scoring Functions
__exportStar(require("./scoring/scoring"), exports);
// Segments & Tags Functions
__exportStar(require("./segments-tags/segments-tags"), exports);
// Webhooks Functions
__exportStar(require("./webhooks/stripe"), exports);
__exportStar(require("./webhooks/whatsapp"), exports);
__exportStar(require("./webhooks/facebook"), exports);
__exportStar(require("./webhooks/instagram"), exports);
// Upload Functions
__exportStar(require("./upload/upload"), exports);
// Campaigns Functions
__exportStar(require("./campaigns/campaigns"), exports);
// Auto-Responses Functions
__exportStar(require("./auto-responses/auto-responses"), exports);
// Feature Flags Functions
__exportStar(require("./feature-flags/feature-flags"), exports);
// Pricing Config Functions
__exportStar(require("./pricing-config/pricing-config"), exports);
// FAQs Functions
__exportStar(require("./faqs/faqs"), exports);
// Testimonials Functions
__exportStar(require("./testimonials/testimonials"), exports);
// Stripe Config Functions
__exportStar(require("./stripe-config/stripe-config"), exports);
// AI Config Functions
__exportStar(require("./ai-config/ai-config"), exports);
// Dynamic Features Functions
__exportStar(require("./dynamic-features/dynamic-features"), exports);
// Landing Config Functions
__exportStar(require("./landing-config/landing-config"), exports);
// Maintenance Functions
__exportStar(require("./maintenance/maintenance"), exports);
// Communication Templates Functions
__exportStar(require("./communication-templates/communication-templates"), exports);
// Test Users Function
var create_test_users_1 = require("./create-test-users");
Object.defineProperty(exports, "createTestUsers", { enumerable: true, get: function () { return create_test_users_1.createTestUsers; } });
//# sourceMappingURL=index.js.map