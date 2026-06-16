/**
 * Entrada segura para componentes cliente (sin firebase-admin).
 * Usar en páginas 'use client' en lugar de `@autodealers/shared`.
 */
export { SocialMediaLinks, type SocialMediaMap } from './components/SocialMediaLinks';
export { StripePaymentForm } from './components/StripePaymentForm';
export { Logo } from './components/Logo';
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Footer } from './components/Footer';
export { Header } from './components/Header';
export { PageHeader } from './components/PageHeader';
export { Sidebar } from './components/Sidebar';
export { StatsCard } from './components/StatsCard';
export { SocialIcon } from './components/SocialIcon';
export {
  MetaIntegrationsCard,
  type MetaIntegrationRow,
  type MetaTokenHealthSummary,
} from './components/MetaIntegrationsCard';
export { ToastNotification, type ToastData } from './components/ToastNotification';
export { expeditionStageLabel, type ExpeditionStage } from './expedition-labels';
export {
  PublishVehicleToSocialModal,
  type PublishSocialVehicle,
  type PublishVehicleToSocialModalProps,
} from './components/PublishVehicleToSocialModal';
export {
  playNotificationSound,
  showBrowserNotification,
  requestBrowserNotificationPermission,
  NOTIFICATION_SOUND_DATA_URI,
} from './notifications/notification-alerts';
export { useNotificationAlerts, type AlertableNotification } from './notifications/use-notification-alerts';
export { registerWebPushToken, unregisterWebPushToken } from './notifications/register-web-push';
export { NotificationAlertsBootstrap } from './notifications/NotificationAlertsBootstrap';
export { NotificationSettingsForm, type NotificationPrefsPayload } from './components/NotificationSettingsForm';
export { BillingAccessBanner } from './components/BillingAccessBanner';
export { MembershipOnboardingBanner } from './components/MembershipOnboardingBanner';
export { MembershipOnboardingNotice } from './components/MembershipOnboardingNotice';
export { MustChangePasswordModal } from './components/MustChangePasswordModal';
export { DealerManagedReferralsNotice } from './components/DealerManagedReferralsNotice';
