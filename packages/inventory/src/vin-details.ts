import { buildVinEquipment, type VinDecodeResult } from '@autodealers/shared/vehicle-equipment';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const positive = (value: unknown) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : undefined; };
const lower = (value: unknown) => text(value).toLowerCase();
const bodyTypes: Record<string, string> = {
  'sport utility vehicle (suv)/multi-purpose vehicle (mpv)': 'suv', 'sedan/saloon': 'sedan', pickup: 'pickup-truck', truck: 'pickup-truck', coupe: 'coupe',
  hatchback: 'hatchback', 'hatchback/liftback/notchback': 'hatchback', wagon: 'wagon', 'convertible/cabriolet': 'convertible', minivan: 'minivan', van: 'van', 'cargo van': 'van', crossover: 'crossover',
};
const fuels: Record<string, string> = { gasoline: 'gasoline', diesel: 'diesel', electric: 'electric', 'battery electric vehicle (bev)': 'electric', 'flexible fuel vehicle (ffv)': 'gasoline' };
export function normalizeVpicRecord(raw: Record<string, unknown>, vin: string): VinDecodeResult | null {
  if (!raw.Make && !raw.Model && !raw.ModelYear) return null;
  const result: VinDecodeResult = { vin, equipment: buildVinEquipment(raw, vin), specificationsRaw: raw, warnings: [] };
  if (raw.Make) result.make = text(raw.Make).toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  if (raw.Model) result.model = text(raw.Model);
  const year = positive(raw.ModelYear);
  if (year && year > 1950) result.year = year;
  if (bodyTypes[lower(raw.BodyClass)]) result.bodyType = bodyTypes[lower(raw.BodyClass)];
  const cylinders = positive(raw.EngineCylinders);
  const displacement = positive(raw.DisplacementL);
  if (cylinders) result.cylinders = cylinders;
  if (displacement) result.displacement = String(displacement);
  const engine = [cylinders ? `${cylinders} cil` : '', displacement ? `${displacement}L` : '', text(raw.EngineModel)].filter(Boolean).join(' ');
  if (engine) result.engine = engine;
  const electrification = lower(raw.ElectrificationLevel);
  if (/phev|plug.in hybrid/.test(electrification)) result.fuelType = 'plug-in-hybrid';
  else if (/hev|hybrid/.test(electrification)) result.fuelType = 'hybrid';
  else if (/bev|battery electric/.test(electrification)) result.fuelType = 'electric';
  else if (fuels[lower(raw.FuelTypePrimary)]) result.fuelType = fuels[lower(raw.FuelTypePrimary)];
  const transmission = lower(raw.TransmissionStyle);
  if (/cvt|continuously variable/.test(transmission)) result.transmission = 'cvt';
  else if (/automatic/.test(transmission)) result.transmission = 'automatic';
  else if (/manual/.test(transmission)) result.transmission = 'manual';
  const drive = lower(raw.DriveType);
  if (/awd|all.wheel/.test(drive)) result.driveType = 'awd';
  else if (/4wd|4x4|4.wheel|four.wheel/.test(drive)) result.driveType = '4wd';
  else if (/fwd|front.wheel/.test(drive)) result.driveType = 'fwd';
  else if (/rwd|rear.wheel/.test(drive)) result.driveType = 'rwd';
  for (const key of ['doors', 'seats', 'seatRows'] as const) {
    const number = positive(key === 'doors' ? raw.Doors || raw.DoorCount || raw.NumberOfDoors : key === 'seats' ? raw.Seats || raw.SeatingCapacity || raw.SeatCount : raw.SeatRows);
    if (number) result[key] = number;
  }
  const strings = { trim: raw.Trim, series: raw.Series, manufacturer: raw.Manufacturer || raw.ManufacturerName, vehicleType: raw.VehicleType };
  for (const [key, value] of Object.entries(strings)) if (text(value)) (result as Record<string, unknown>)[key] = text(value);
  const plant = [text(raw.PlantCity), text(raw.PlantCountry)].filter(Boolean).join(', ');
  if (plant) result.plant = plant;
  result.features = Object.fromEntries(Object.entries(result.equipment!.fields).filter(([, field]) => field.group === 'safety').map(([key, field]) => [key, field.value]));
  const codes = String(raw.ErrorCode || '0').split(',').map(code => code.trim());
  if (codes.some(code => code && code !== '0')) result.warnings = ['La fuente devolvió información parcial. Revisa los datos antes de guardar.'];
  return result;
}
