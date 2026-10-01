import { equipmentFromSpecifications } from '@autodealers/shared/vehicle-equipment';

export default function VehicleEquipmentSummary({ vehicle }: { vehicle: { vin?: string; specifications?: object } }) {
  const equipment = equipmentFromSpecifications((vehicle.specifications || {}) as Record<string, unknown>, vehicle.vin || undefined);
  const fields = Object.values(equipment.fields).filter(field => field.value.trim() && field.group !== 'identity');
  if (!fields.length) return null;
  return <div className="my-3 text-xs text-slate-600" aria-label="Resumen de especificaciones">
    <ul className="space-y-1">{fields.slice(0, 3).map((field, index) => <li key={index} className="line-clamp-2">{field.label}: {field.value}</li>)}</ul>
    {fields.length > 3 && <p className="mt-1 font-medium text-primary-600">+{fields.length - 3} especificaciones en la ficha</p>}
  </div>;
}
