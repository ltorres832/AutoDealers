import type { EquipmentGroup, VehicleEquipment } from '../vehicle-equipment';
export declare const SPECIFICATION_TABS: Array<{
    id: string;
    label: string;
    groups: EquipmentGroup[];
}>;
export declare function VehicleSpecificationTabs({ value, editing, disabled, onEdit }: {
    value: VehicleEquipment;
    editing?: boolean;
    disabled?: boolean;
    onEdit?: (id: string, text: string) => void;
}): import("react/jsx-runtime").JSX.Element;
