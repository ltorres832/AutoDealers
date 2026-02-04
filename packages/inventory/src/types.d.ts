export type VehicleCondition = 'new' | 'used' | 'certified';
export type VehicleStatus = 'available' | 'reserved' | 'sold';
export type VehicleBodyType = 'suv' | 'sedan' | 'pickup-truck' | 'coupe' | 'hatchback' | 'wagon' | 'convertible' | 'minivan' | 'van' | 'electric' | 'hybrid' | 'plug-in-hybrid' | 'luxury' | 'crossover';
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
    stockNumber?: string;
    bodyType?: VehicleBodyType;
    [key: string]: any;
}
export interface Vehicle {
    id: string;
    tenantId: string;
    sellerId?: string;
    assignedTo?: string;
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
    stockNumber?: string;
    bodyType?: VehicleBodyType;
    sellerCommissionType?: 'percentage' | 'fixed';
    sellerCommissionRate?: number;
    sellerCommissionFixed?: number;
    insuranceCommissionType?: 'percentage' | 'fixed';
    insuranceCommissionRate?: number;
    insuranceCommissionFixed?: number;
    accessoriesCommissionType?: 'percentage' | 'fixed';
    accessoriesCommissionRate?: number;
    accessoriesCommissionFixed?: number;
    publishedOnPublicPage?: boolean;
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
    bodyType?: VehicleBodyType;
    fuelType?: string;
    transmission?: string;
    limit?: number;
}
//# sourceMappingURL=types.d.ts.map