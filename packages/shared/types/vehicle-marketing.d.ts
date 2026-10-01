import { type EquipmentGroup } from './vehicle-equipment';
/** Public, buyer-facing facts only. Never serialize the full inventory record to an AI provider. */
export interface MarketingVehicle {
    make?: string;
    model?: string;
    year?: number;
    price?: number;
    currency?: string;
    condition?: string;
    status?: string;
    mileage?: number;
    mileageUnit?: string;
    vin?: string;
    bodyType?: string;
    description?: string;
    location?: string;
    features?: string[];
    keyFeatures?: string[];
    specifications?: Record<string, unknown>;
}
export type MarketingFact = {
    id: string;
    group: EquipmentGroup;
    label: string;
    value: string;
};
export declare function vehicleMarketingFacts(vehicle: MarketingVehicle): MarketingFact[];
export declare function marketingIdentity(vehicle: MarketingVehicle): string;
export declare function marketingBasics(vehicle: MarketingVehicle): string[];
export declare const MARKETING_LEADS: {
    readonly general: "Conoce sus características y compara lo que ofrece para tu próximo auto.";
    readonly safety: "Conoce los sistemas de seguridad y asistencia registrados en esta unidad.";
    readonly interior: "Explora su interior y las opciones de comodidad para tus recorridos.";
    readonly entertainment: "Descubre el equipamiento de conectividad y entretenimiento de esta unidad.";
    readonly mechanical: "Revisa su configuración mecánica y equipamiento antes de elegir tu próximo auto.";
};
/** AI can rank sourced fact IDs, but cannot rewrite specs or invent features. */
export declare function buildVehicleMarketingPost(vehicle: MarketingVehicle, options?: {
    highlightedIds?: string[];
    lead?: string;
    maxLength?: number;
    objective?: string;
}): string;
export declare function vehicleMarketingPrompt(vehicle: MarketingVehicle): string;
/** Sharing starts with the seller-authored description, without generated additions or truncation. */
export declare function vehicleShareDescription(vehicle: Pick<MarketingVehicle, 'description'>): string;
