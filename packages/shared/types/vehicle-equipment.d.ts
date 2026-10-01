/** Shared, browser-safe vehicle equipment model. Missing data never means absent equipment. */
export declare const EQUIPMENT_GROUPS: readonly [{
    readonly id: "identity";
    readonly label: "Identificación y fabricación";
}, {
    readonly id: "interior";
    readonly label: "Interior y comodidad";
}, {
    readonly id: "exterior";
    readonly label: "Exterior";
}, {
    readonly id: "entertainment";
    readonly label: "Entretenimiento y conectividad";
}, {
    readonly id: "safety";
    readonly label: "Seguridad y asistencia";
}, {
    readonly id: "mechanical";
    readonly label: "Mecánica y transmisión";
}, {
    readonly id: "efficiency";
    readonly label: "Consumo, batería y carga";
}, {
    readonly id: "dimensions";
    readonly label: "Dimensiones y capacidades";
}, {
    readonly id: "other";
    readonly label: "Otras especificaciones";
}];
export type EquipmentGroup = typeof EQUIPMENT_GROUPS[number]['id'];
export type EquipmentEntry = {
    label: string;
    group: EquipmentGroup;
    value: string;
    source: 'vin' | 'manual';
};
export type VehicleEquipment = {
    version: 1;
    vin: string;
    provider: string;
    decodedAt: string;
    fields: Record<string, EquipmentEntry>;
};
export type EquipmentDefinition = {
    id: string;
    label: string;
    group: EquipmentGroup;
    keys: string[];
    unit?: string;
};
export declare const EQUIPMENT_FIELDS: EquipmentDefinition[];
export declare const normalizeEquipmentVin: (vin: string) => string;
export declare function equipmentText(value: unknown): string;
export declare function emptyEquipment(vin?: string): VehicleEquipment;
export declare function buildVinEquipment(raw: Record<string, unknown>, vin: string, decodedAt?: string): VehicleEquipment;
export declare function readEquipment(value: unknown, vin: string): VehicleEquipment;
export declare function equipmentFromSpecifications(specs?: Record<string, unknown>, vin?: string): VehicleEquipment;
export declare function mergeEquipment(current: VehicleEquipment, incoming: VehicleEquipment): VehicleEquipment;
export interface VinDecodeResult {
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    bodyType?: string;
    engine?: string;
    displacement?: string;
    cylinders?: number;
    fuelType?: string;
    transmission?: string;
    doors?: number;
    trim?: string;
    series?: string;
    manufacturer?: string;
    plant?: string;
    driveType?: string;
    vehicleType?: string;
    seats?: number;
    seatRows?: number;
    features?: Record<string, unknown>;
    specificationsRaw?: Record<string, unknown> | null;
    equipment?: VehicleEquipment;
    warnings?: string[];
}
/** One mapping for all creation/editing screens; ignore a late response for another VIN. */
export declare function applyVinDecode<T extends {
    vin: string;
    equipment: VehicleEquipment;
}>(form: T, result: VinDecodeResult): T;
/** Detach equipment immediately when the VIN changes, including pending requests. */
export declare function changeEquipmentVin<T extends {
    vin: string;
    equipment: VehicleEquipment;
}>(form: T, vin: string): T;
export declare function equipmentForForm<T extends {
    vin: string;
    equipment: VehicleEquipment;
}>(form: T): VehicleEquipment;
export declare function applyEquipmentEdit<T extends {
    vin: string;
    equipment: VehicleEquipment;
}>(form: T, equipment: VehicleEquipment): T;
/** Preserve existing specs on partial updates, and discard VIN data from another unit. */
export declare function mergeVehicleSpecifications(existing: Record<string, unknown>, incoming: Record<string, unknown>, vin: string): Record<string, unknown>;
