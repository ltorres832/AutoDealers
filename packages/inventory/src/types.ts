// Tipos del módulo de inventario

export type VehicleCondition = 'new' | 'used' | 'certified';

export type VehicleStatus = 'available' | 'reserved' | 'sold';

export type VehicleBodyType = 
  | 'suv' 
  | 'sedan' 
  | 'pickup-truck' 
  | 'coupe' 
  | 'hatchback' 
  | 'wagon' 
  | 'convertible' 
  | 'minivan' 
  | 'van'
  | 'electric'
  | 'hybrid'
  | 'plug-in-hybrid'
  | 'luxury'
  | 'crossover';

export interface VehicleSpecs {
  make: string;
  model: string;
  year: number;
  color?: string;
  mileage?: number;
  transmission?: 'automatic' | 'manual' | 'cvt';
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plug-in-hybrid';
  engine?: string;
  doors?: number;
  seats?: number;
  vin?: string;
  stockNumber?: string; // Número de stock/control
  bodyType?: VehicleBodyType; // Categoría/tipo de vehículo
  [key: string]: any;
}

export interface Vehicle {
  id: string;
  tenantId: string;
  sellerId?: string; // ID del vendedor que creó/posee el vehículo
  assignedTo?: string; // ID del vendedor asignado (alternativo a sellerId)
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  mileage?: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  description: string;
  photos: string[];
  videos?: string[];
  specifications: VehicleSpecs;
  vin?: string;
  stockNumber?: string; // Número de stock/control generado automáticamente
  bodyType?: VehicleBodyType; // Categoría/tipo de vehículo (también puede estar en specifications)
  // Comisiones configurables por el vendedor
  sellerCommissionType?: 'percentage' | 'fixed'; // Tipo de comisión: porcentaje o monto fijo
  sellerCommissionRate?: number; // Porcentaje de comisión del vendedor por este vehículo (si es percentage)
  sellerCommissionFixed?: number; // Monto fijo de comisión del vendedor por este vehículo (si es fixed)
  insuranceCommissionType?: 'percentage' | 'fixed'; // Tipo de comisión de seguro
  insuranceCommissionRate?: number; // Porcentaje de comisión del vendedor por seguro (opcional)
  insuranceCommissionFixed?: number; // Monto fijo de comisión del vendedor por seguro (opcional)
  accessoriesCommissionType?: 'percentage' | 'fixed'; // Tipo de comisión de accesorios
  accessoriesCommissionRate?: number; // Porcentaje de comisión del vendedor por accesorios (opcional)
  accessoriesCommissionFixed?: number; // Monto fijo de comisión del vendedor por accesorios (opcional)
  publishedOnPublicPage?: boolean; // Si el vehículo está publicado en la página pública
  createdAt: Date;
  updatedAt: Date;
  soldAt?: Date;
}

export interface VehicleFilters {
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: VehicleCondition;
  status?: VehicleStatus;
  search?: string;
  bodyType?: VehicleBodyType; // Filtro por categoría
  fuelType?: string;
  transmission?: string;
  limit?: number; // Límite de resultados por tenant
}



