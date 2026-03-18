// Shared components and utilities

// Firebase (Solo para uso en servidor, seguro para exportar gracias a dynamic require)
export { initializeFirebase, getFirestore, getAuth, getStorage } from './firebase';
export * from './firebase-server';

export * from './components/Logo';
export * from './components/Header';
export * from './components/Sidebar';
export * from './components/Footer';
export * from './components/Card';
export * from './components/Button';
export * from './components/StatsCard';
export * from './components/PageHeader';
export { StripePaymentForm } from './components/StripePaymentForm';
