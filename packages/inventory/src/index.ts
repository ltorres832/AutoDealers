// Inventory Module - Gestión de Inventario

// Exportaciones compatibles con cliente (sin dependencias de servidor)
export * from './types';
export * from './vehicle-types';

// Exportaciones solo para servidor (no deben importarse en componentes cliente)
// Estas exportaciones solo deben usarse en API routes o Server Components
export * from './vehicles';
export * from './storage';

