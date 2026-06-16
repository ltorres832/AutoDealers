/**
 * Cloud Functions para AutoDealersPR
 *
 * Funciones principales según el documento maestro.
 * Los servidores Next.js (nextjsServer*) se definen en index.js en la raíz de functions.
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export { createPurchaseIntent } from './purchase/createPurchaseIntent';

// CRM Functions
export * from './crm/leads';

// Inventory Functions
export * from './inventory/vehicles';

// Messaging Functions
export * from './messaging/messages';

// Appointments Functions
export * from './appointments/appointments';

// Sales Functions
export * from './sales/sales';

// Tenants/Subdomains Functions
export * from './tenants/subdomains';

// Admin Functions
export * from './admin/users';
export * from './admin/tenants';
export * from './admin/sellers';

// Messaging Functions (Email, SMS, WhatsApp)
export * from './messaging/email';
export * from './messaging/sms';
export * from './messaging/whatsapp';

// Billing Functions
export * from './billing/subscriptions';
export { processOverdueSubscriptionsDaily } from './billing/process-overdue-cron';

// Notifications Functions
export * from './notifications/notifications';

// Reports Functions
export * from './reports/reports';

// AI Functions
export * from './ai/ai';

// Workflows Functions
export * from './workflows/workflows';

// Tasks Functions
export * from './tasks/tasks';

// Social Media Functions
export * from './social/social';

// Templates Functions
export * from './templates/templates';

// Promotions Functions
export * from './promotions/promotions';

// Contracts Functions
export * from './contracts/contracts';

// Reviews Functions
export * from './reviews/reviews';

// Referrals Functions
export * from './referrals/referrals';
export { confirmReferralRewardsDaily } from './referrals/confirmation-cron';

// Banners Functions
export * from './banners/banners';

// Customer Files Functions
export * from './customer-files/customer-files';

// Reminders Functions
export * from './reminders/reminders';

// Internal Chat Functions
export * from './internal-chat/internal-chat';

// Announcements Functions
export * from './announcements/announcements';

// Corporate Emails Functions
export * from './corporate-emails/corporate-emails';

// FI (Financing & Insurance) Functions
export * from './fi/fi';

// Public Chat Functions
export * from './public-chat/public-chat';

// Settings Functions
export * from './settings/settings';

// Integrations Functions
export * from './integrations/integrations';

// Policies Functions
export * from './policies/policies';

// Email Aliases Functions
export * from './email-aliases/email-aliases';

// Pre-Qualifications Functions
export * from './pre-qualifications/pre-qualifications';

// Scoring Functions
export * from './scoring/scoring';

// Segments & Tags Functions
export * from './segments-tags/segments-tags';

// Webhooks Functions
export * from './webhooks/stripe';
export * from './webhooks/whatsapp';
export * from './webhooks/facebook';
export * from './webhooks/instagram';

// Upload Functions
export * from './upload/upload';

// Campaigns Functions
export * from './campaigns/campaigns';

// Auto-Responses Functions
export * from './auto-responses/auto-responses';

// Feature Flags Functions
export * from './feature-flags/feature-flags';

// Pricing Config Functions
export * from './pricing-config/pricing-config';

// FAQs Functions
export * from './faqs/faqs';

// Testimonials Functions
export * from './testimonials/testimonials';

// Stripe Config Functions
export * from './stripe-config/stripe-config';

// AI Config Functions
export * from './ai-config/ai-config';

// Dynamic Features Functions
export * from './dynamic-features/dynamic-features';

// Landing Config Functions
export * from './landing-config/landing-config';

// Maintenance Functions
export * from './maintenance/maintenance';

// Communication Templates Functions
export * from './communication-templates/communication-templates';

// Test Users Function
export { createTestUsers } from './create-test-users';

