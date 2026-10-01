import { type VehicleEquipment } from '../vehicle-equipment';
export default function VehicleEquipmentEditor({ value, onChange, disabled }: {
    value: VehicleEquipment;
    onChange: (value: VehicleEquipment) => void;
    disabled?: boolean;
}): import("react/jsx-runtime").JSX.Element;
