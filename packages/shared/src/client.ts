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
export { MetaIntegrationsCard, type MetaIntegrationRow } from './components/MetaIntegrationsCard';
export { ToastNotification, type ToastData } from './components/ToastNotification';
export { expeditionStageLabel, type ExpeditionStage } from './expedition-labels';
export {
  PublishVehicleToSocialModal,
  type PublishSocialVehicle,
  type PublishVehicleToSocialModalProps,
} from './components/PublishVehicleToSocialModal';
