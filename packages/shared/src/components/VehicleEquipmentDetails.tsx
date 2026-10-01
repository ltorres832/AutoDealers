import { equipmentFromSpecifications } from '../vehicle-equipment';
import { VehicleSpecificationTabs } from './VehicleSpecificationTabs';

export default function VehicleEquipmentDetails({ specifications, vin = '' }: { specifications?: Record<string, unknown>; vin?: string }) {
  const equipment = equipmentFromSpecifications(specifications || {}, vin || undefined);
  const fields = Object.values(equipment.fields).filter(field => field.value.trim());
  if (!fields.length) return null;
  return <section className="my-6 space-y-5" aria-label="Especificaciones detalladas">
    <h3 className="text-xl font-semibold text-slate-900">Especificaciones</h3>
    <VehicleSpecificationTabs value={equipment} />
    <p className="text-xs leading-5 text-slate-500">Información del VIN y del anunciante. Confirma con el vendedor los elementos indicados como opcionales.</p>
  </section>;
}
