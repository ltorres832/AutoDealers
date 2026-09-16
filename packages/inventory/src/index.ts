// Inventory Module - Gestión de Inventario

// Exportaciones compatibles con cliente (sin dependencias de servidor)
export * from './types';
export * from './vehicle-types';

// Exportaciones solo para servidor (no deben importarse en componentes cliente)
// Estas exportaciones solo deben usarse en API routes o Server Components
export * from './vehicles';
export * from './storage';
export * from './listing-disposition';
export * from './bulk-import';
export * from './bulk-actions';
export * from './parts';
export * from './parts-procurement';
export * from './dealer-seller-propagation';
export * from './vin-sold-sync';
export * from './inventory-compete-constants';
export * from './inventory-compete';
// photo-ai (sharp) NO se exporta desde el barrel: solo apps dealer/seller vía
// `import ... from '@autodealers/inventory/photo-ai'` para no romper App Hosting.
