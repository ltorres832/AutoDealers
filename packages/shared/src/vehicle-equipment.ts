/** Shared, browser-safe vehicle equipment model. Missing data never means absent equipment. */
export const EQUIPMENT_GROUPS = [
  { id: 'identity', label: 'Identificación y fabricación' },
  { id: 'interior', label: 'Interior y comodidad' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'entertainment', label: 'Entretenimiento y conectividad' },
  { id: 'safety', label: 'Seguridad y asistencia' },
  { id: 'mechanical', label: 'Mecánica y transmisión' },
  { id: 'efficiency', label: 'Consumo, batería y carga' },
  { id: 'dimensions', label: 'Dimensiones y capacidades' },
  { id: 'other', label: 'Otras especificaciones' },
] as const;
export type EquipmentGroup = typeof EQUIPMENT_GROUPS[number]['id'];
export type EquipmentEntry = { label: string; group: EquipmentGroup; value: string; source: 'vin' | 'manual' };
export type VehicleEquipment = { version: 1; vin: string; provider: string; decodedAt: string; fields: Record<string, EquipmentEntry> };
export type EquipmentDefinition = { id: string; label: string; group: EquipmentGroup; keys: string[]; unit?: string };
const definitions: Array<[EquipmentGroup, string, string, string?]> = [
  ['identity', 'Trim', 'Versión / acabado'], ['identity', 'Trim2', 'Acabado adicional'], ['identity', 'Series', 'Serie'],
  ['identity', 'Series2', 'Serie adicional'], ['identity', 'Manufacturer', 'Fabricante'], ['identity', 'PlantCompanyName', 'Empresa ensambladora'],
  ['identity', 'PlantCountry', 'País de fabricación'], ['identity', 'PlantState', 'Estado de fabricación'], ['identity', 'PlantCity', 'Ciudad de fabricación'],
  ['identity', 'VehicleType', 'Clase de vehículo'],
  ['interior', 'Seats', 'Asientos'], ['interior', 'SeatRows', 'Filas de asientos'], ['interior', 'InteriorColor', 'Color interior'],
  ['interior', 'Upholstery', 'Tapicería'], ['interior', 'HeatedSeats', 'Asientos calefactables'], ['interior', 'VentilatedSeats', 'Asientos ventilados'],
  ['interior', 'PowerSeats', 'Asientos eléctricos'], ['interior', 'SeatMemory', 'Memoria de asientos'], ['interior', 'ClimateControl', 'Climatización'],
  ['interior', 'HeatedSteeringWheel', 'Volante calefactable'], ['interior', 'KeylessEntry', 'Acceso sin llave'], ['interior', 'RemoteStart', 'Arranque remoto'],
  ['exterior', 'BodyClass', 'Carrocería'], ['exterior', 'Doors', 'Puertas'], ['exterior', 'ExteriorColor', 'Color exterior'],
  ['exterior', 'BedType', 'Tipo de caja'], ['exterior', 'CabType', 'Tipo de cabina'], ['exterior', 'WheelSizeFront', 'Diámetro de rines delanteros', 'pulgadas'],
  ['exterior', 'WheelSizeRear', 'Diámetro de rines traseros', 'pulgadas'], ['exterior', 'Wheels', 'Número de ruedas'], ['exterior', 'TireSize', 'Medida de neumáticos'],
  ['exterior', 'HeadlampLightSource', 'Tecnología de faros'], ['exterior', 'DaytimeRunningLight', 'Luces diurnas'],
  ['exterior', 'Sunroof', 'Techo solar / panorámico'], ['exterior', 'PowerLiftgate', 'Portón eléctrico'], ['exterior', 'RoofRails', 'Barras de techo'],
  ['exterior', 'PowerMirrors', 'Espejos eléctricos'], ['exterior', 'HeatedMirrors', 'Espejos calefactables'],
  ['entertainment', 'AudioSystem', 'Sistema de audio'], ['entertainment', 'Speakers', 'Altavoces'], ['entertainment', 'Bluetooth', 'Bluetooth'],
  ['entertainment', 'AppleCarPlay', 'Apple CarPlay'], ['entertainment', 'AndroidAuto', 'Android Auto'], ['entertainment', 'Navigation', 'Navegación GPS'],
  ['entertainment', 'Touchscreen', 'Pantalla multimedia'], ['entertainment', 'USB', 'Puertos USB'], ['entertainment', 'WirelessCharging', 'Cargador inalámbrico'],
  ['entertainment', 'WiFiHotspot', 'Punto de acceso Wi-Fi'], ['entertainment', 'SatelliteRadio', 'Radio satelital'], ['entertainment', 'RearEntertainment', 'Entretenimiento trasero'],
  ['safety', 'ABS', 'Frenos antibloqueo (ABS)'], ['safety', 'ESC', 'Control electrónico de estabilidad'], ['safety', 'TractionControl', 'Control de tracción'],
  ['safety', 'AirBagLocFront', 'Airbags frontales'], ['safety', 'AirBagLocSide', 'Airbags laterales'], ['safety', 'AirBagLocCurtain', 'Airbags de cortina'],
  ['safety', 'AirBagLocKnee', 'Airbags de rodilla'], ['safety', 'AirBagLocSeatCushion', 'Airbags de asiento'], ['safety', 'SeatBeltsAll', 'Cinturones de seguridad'],
  ['safety', 'Pretensioner', 'Pretensores'], ['safety', 'TPMS', 'Monitoreo de presión de neumáticos'], ['safety', 'BackupCamera', 'Cámara de reversa'],
  ['safety', 'ParkingAssist', 'Asistencia de estacionamiento'], ['safety', 'ParkAssist', 'Asistente de parqueo'], ['safety', 'BlindSpotMon', 'Monitoreo de punto ciego'],
  ['safety', 'BlindSpotIntervention', 'Intervención de punto ciego'], ['safety', 'ForwardCollisionWarning', 'Alerta de colisión frontal'],
  ['safety', 'DynamicBrakeSupport', 'Asistencia dinámica de frenado'], ['safety', 'CIB', 'Frenado automático ante colisión'],
  ['safety', 'PedestrianAutomaticEmergencyBraking', 'Frenado automático para peatones'], ['safety', 'RearAutomaticEmergencyBraking', 'Frenado automático trasero'],
  ['safety', 'LaneDepartureWarning', 'Alerta de salida de carril'], ['safety', 'LaneKeepSystem', 'Asistencia de mantenimiento de carril'],
  ['safety', 'LaneCenteringAssistance', 'Centrado de carril'], ['safety', 'AdaptiveCruiseControl', 'Control crucero adaptativo'],
  ['safety', 'RearCrossTrafficAlert', 'Alerta de tráfico cruzado trasero'], ['safety', 'AutoReverseSystem', 'Antipinzamiento de ventanas'],
  ['safety', 'AutomaticPedestrianAlertingSound', 'Aviso acústico para peatones'], ['safety', 'KeylessIgnition', 'Encendido sin llave'],
  ['safety', 'SemiautomaticHeadlampBeamSwitching', 'Luces altas automáticas'], ['safety', 'AdaptiveDrivingBeam', 'Iluminación adaptativa'],
  ['safety', 'OtherRestraintSystemInfo', 'Otros sistemas de retención'],
  ['mechanical', 'EngineModel', 'Modelo de motor'], ['mechanical', 'EngineManufacturer', 'Fabricante del motor'], ['mechanical', 'EngineCylinders', 'Cilindros'],
  ['mechanical', 'DisplacementL', 'Cilindrada', 'L'], ['mechanical', 'EngineConfiguration', 'Configuración del motor'],
  ['mechanical', 'EngineHP', 'Potencia', 'hp'], ['mechanical', 'EngineKW', 'Potencia', 'kW'], ['mechanical', 'Torque', 'Torque'],
  ['mechanical', 'Turbo', 'Turbo'], ['mechanical', 'CoolingType', 'Refrigeración'], ['mechanical', 'ValveTrainDesign', 'Distribución de válvulas'],
  ['mechanical', 'TransmissionStyle', 'Tipo de transmisión'], ['mechanical', 'TransmissionSpeeds', 'Velocidades de transmisión'],
  ['mechanical', 'DriveType', 'Tracción'], ['mechanical', 'Axles', 'Ejes'], ['mechanical', 'AxleConfiguration', 'Configuración de ejes'],
  ['mechanical', 'BrakeSystemType', 'Sistema de frenos'], ['mechanical', 'SteeringLocation', 'Posición del volante'],
  ['mechanical', 'Suspension', 'Suspensión'], ['mechanical', 'OtherEngineInfo', 'Información adicional del motor'],
  ['efficiency', 'FuelTypePrimary', 'Combustible principal'], ['efficiency', 'FuelTypeSecondary', 'Combustible secundario'],
  ['efficiency', 'ElectrificationLevel', 'Electrificación'], ['efficiency', 'MPGCity', 'Rendimiento urbano', 'MPG'], ['efficiency', 'MPGHighway', 'Rendimiento en carretera', 'MPG'],
  ['efficiency', 'BatteryType', 'Tipo de batería'], ['efficiency', 'BatteryKWh', 'Capacidad de batería', 'kWh'], ['efficiency', 'BatteryV', 'Voltaje de batería', 'V'],
  ['efficiency', 'BatteryA', 'Corriente de batería', 'A'], ['efficiency', 'BatteryCells', 'Celdas de batería'], ['efficiency', 'BatteryModules', 'Módulos de batería'],
  ['efficiency', 'BatteryPacks', 'Paquetes de batería'], ['efficiency', 'ChargerLevel', 'Nivel de carga'], ['efficiency', 'ChargerPowerKW', 'Potencia del cargador', 'kW'],
  ['efficiency', 'EVDriveUnit', 'Unidad de propulsión eléctrica'], ['efficiency', 'ElectricRange', 'Autonomía eléctrica'],
  ['dimensions', 'GVWR', 'Clasificación de peso bruto'], ['dimensions', 'GVWR_to', 'Peso bruto máximo de la categoría'],
  ['dimensions', 'GCWR', 'Clasificación de peso combinado'], ['dimensions', 'CurbWeightLB', 'Peso en vacío', 'lb'],
  ['dimensions', 'WheelBaseShort', 'Distancia entre ejes', 'pulgadas'], ['dimensions', 'WheelBaseLong', 'Distancia máxima entre ejes', 'pulgadas'],
  ['dimensions', 'BedLengthIN', 'Longitud de caja', 'pulgadas'], ['dimensions', 'TrackWidth', 'Ancho de vía', 'pulgadas'],
  ['dimensions', 'Length', 'Longitud'], ['dimensions', 'Width', 'Ancho'], ['dimensions', 'Height', 'Altura'],
  ['dimensions', 'CargoVolume', 'Capacidad de carga interior'], ['dimensions', 'TowingCapacity', 'Capacidad de remolque'],
];
export const EQUIPMENT_FIELDS: EquipmentDefinition[] = definitions.map(([group, id, label, unit]) => ({ group, id, label, keys: [id], ...(unit ? { unit } : {}) }));
const aliases: Record<string, string[]> = { Seats: ['SeatingCapacity', 'SeatCount'], Doors: ['DoorCount', 'NumberOfDoors'], Manufacturer: ['ManufacturerName'], BatteryKWh: ['BatteryKWhFrom'], ABS: ['AntiBrakingSystem'] };
for (const field of EQUIPMENT_FIELDS) field.keys.push(...(aliases[field.id] || []));
export const normalizeEquipmentVin = (vin: string) => String(vin || '').toUpperCase().replace(/[\s-]/g, '');
export function equipmentText(value: unknown): string {
  if (!['string', 'number', 'boolean'].includes(typeof value)) return '';
  const text = String(value).trim();
  if (!text || /^(null|undefined|unknown|n\/?a|not available|not reported|not specified)$/i.test(text)) return '';
  const translated: Record<string, string> = { Standard: 'De serie', Optional: 'Opcional; confirmar en esta unidad', 'Not Applicable': 'No aplica', Yes: 'Sí', No: 'No', true: 'Sí', false: 'No' };
  return (translated[text] || text).slice(0, 2000);
}
export function emptyEquipment(vin = ''): VehicleEquipment {
  return { version: 1, vin: normalizeEquipmentVin(vin), provider: 'NHTSA vPIC', decodedAt: '', fields: {} };
}
export function buildVinEquipment(raw: Record<string, unknown>, vin: string, decodedAt = new Date().toISOString()): VehicleEquipment {
  const equipment = { ...emptyEquipment(vin), decodedAt };
  const consumed = new Set(['VIN', 'Make', 'Model', 'ModelYear', 'ErrorCode', 'ErrorText', 'AdditionalErrorText', 'SuggestedVIN', 'PossibleValues', 'VehicleDescriptor', 'NCSABodyType', 'NCSAMake', 'NCSAModel', 'NCSANote', 'BasePrice', 'DestinationMarket']);
  for (const field of EQUIPMENT_FIELDS) {
    field.keys.forEach(key => consumed.add(key));
    const value = field.keys.map(key => equipmentText(raw[key])).find(Boolean);
    if (value) equipment.fields[field.id] = { label: field.label, group: field.group, value: field.unit ? `${value} ${field.unit}` : value, source: 'vin' };
  }
  for (const [key, input] of Object.entries(raw)) {
    if (consumed.has(key) || !/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(key)) continue;
    const value = equipmentText(input);
    if (value && value !== 'No aplica') equipment.fields[`extra_${key}`] = { label: key.replace(/([a-z])([A-Z])/g, '$1 $2'), group: 'other', value, source: 'vin' };
  }
  return equipment;
}
export function readEquipment(value: unknown, vin: string): VehicleEquipment {
  const result = emptyEquipment(vin);
  if (!value || typeof value !== 'object') return result;
  const input = value as Partial<VehicleEquipment>;
  if (normalizeEquipmentVin(input.vin || '') !== result.vin || !input.fields || typeof input.fields !== 'object') return result;
  result.decodedAt = typeof input.decodedAt === 'string' ? input.decodedAt : '';
  for (const [id, entry] of Object.entries(input.fields).slice(0, 300)) {
    if (!entry || !/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(id) || !EQUIPMENT_GROUPS.some(group => group.id === entry.group)) continue;
    if (typeof entry.value !== 'string') continue;
    result.fields[id] = { label: String(entry.label || id).slice(0, 160), group: entry.group, value: entry.value.slice(0, 2000), source: entry.source === 'manual' ? 'manual' : 'vin' };
  }
  return result;
}
export function equipmentFromSpecifications(specs: Record<string, unknown> = {}, vin = String(specs.vin || (specs.equipment as Partial<VehicleEquipment> | undefined)?.vin || '')): VehicleEquipment {
  if (specs.vin && normalizeEquipmentVin(String(specs.vin)) !== normalizeEquipmentVin(vin)) return emptyEquipment(vin);
  const result = specs.equipment ? readEquipment(specs.equipment, vin)
    : specs.decoded && typeof specs.decoded === 'object' ? buildVinEquipment(specs.decoded as Record<string, unknown>, vin) : emptyEquipment(vin);
  // Existing inventory often predates VIN equipment. Show its saved specifications too.
  const saved: Record<string, unknown> = {
    EngineModel: specs.engine, TransmissionStyle: specs.transmission, DriveType: specs.driveType,
    FuelTypePrimary: specs.fuelType, Seats: specs.seats, Doors: specs.doors,
    ExteriorColor: specs.exteriorColor || specs.color, InteriorColor: specs.interiorColor,
    BodyClass: specs.bodyType, Trim: specs.trim, MPGCity: specs.mpgCity, MPGHighway: specs.mpgHighway,
  };
  for (const [id, input] of Object.entries(saved)) {
    if (Object.prototype.hasOwnProperty.call(result.fields, id)) continue;
    const value = equipmentText(input);
    if (!value) continue;
    const definition = EQUIPMENT_FIELDS.find(field => field.id === id)!;
    result.fields[id] = { label: definition.label, group: definition.group, value: definition.unit && !value.toLowerCase().includes(definition.unit.toLowerCase()) ? value + ' ' + definition.unit : value, source: 'manual' };
  }
  return result;
}
export function mergeEquipment(current: VehicleEquipment, incoming: VehicleEquipment): VehicleEquipment {
  const fields = { ...incoming.fields };
  if (normalizeEquipmentVin(current.vin) === normalizeEquipmentVin(incoming.vin)) {
    for (const [key, entry] of Object.entries(current.fields)) if (entry.source === 'manual') fields[key] = entry;
  }
  return { ...incoming, fields };
}
export interface VinDecodeResult {
  vin?: string; make?: string; model?: string; year?: number; bodyType?: string; engine?: string;
  displacement?: string; cylinders?: number; fuelType?: string; transmission?: string; doors?: number;
  trim?: string; series?: string; manufacturer?: string; plant?: string; driveType?: string; vehicleType?: string;
  seats?: number; seatRows?: number; features?: Record<string, unknown>; specificationsRaw?: Record<string, unknown> | null;
  equipment?: VehicleEquipment; warnings?: string[];
}
/** One mapping for all creation/editing screens; ignore a late response for another VIN. */
export function applyVinDecode<T extends { vin: string; equipment: VehicleEquipment }>(form: T, result: VinDecodeResult): T {
  if (result.vin && normalizeEquipmentVin(form.vin) !== normalizeEquipmentVin(result.vin)) return form;
  const next = { ...form } as T & Record<string, unknown>;
  for (const key of ['make', 'model', 'year', 'bodyType', 'engine', 'fuelType', 'transmission', 'driveType'] as const) {
    if (result[key] !== undefined && result[key] !== '') (next as Record<string, unknown>)[key] = result[key];
  }
  for (const key of ['doors', 'seats'] as const) if (result[key] != null) (next as Record<string, unknown>)[key] = String(result[key]);
  if (result.equipment) next.equipment = mergeEquipment(form.equipment, result.equipment);
  else if (result.specificationsRaw) next.equipment = mergeEquipment(form.equipment, buildVinEquipment(result.specificationsRaw, form.vin));
  return applyEquipmentEdit(next, next.equipment);
}
/** Detach equipment immediately when the VIN changes, including pending requests. */
export function changeEquipmentVin<T extends { vin: string; equipment: VehicleEquipment }>(form: T, vin: string): T {
  return { ...form, vin, equipment: normalizeEquipmentVin(form.vin) === normalizeEquipmentVin(vin) ? form.equipment : emptyEquipment(vin) };
}
const BASIC_FIELDS: Record<string, string> = { Seats: 'seats', Doors: 'doors', InteriorColor: 'interiorColor', ExteriorColor: 'exteriorColor', MPGCity: 'mpgCity', MPGHighway: 'mpgHighway', TransmissionStyle: 'transmission', DriveType: 'driveType' };
function basicValue(id: string, value: string): string {
  const v = value.toLowerCase().trim();
  if (['Seats', 'Doors', 'MPGCity', 'MPGHighway'].includes(id)) return value.match(/^\d+(?:\.\d+)?/)?.[0] || '';
  if (id === 'DriveType') return /awd|all.wheel/.test(v) ? 'awd' : /4wd|4x4|4.wheel/.test(v) ? '4wd' : /fwd|front.wheel/.test(v) ? 'fwd' : /rwd|rear.wheel/.test(v) ? 'rwd' : '';
  if (id === 'TransmissionStyle') return /cvt|continuously variable/.test(v) ? 'cvt' : /auto/.test(v) ? 'automatic' : /manual/.test(v) ? 'manual' : '';
  if (id === 'FuelTypePrimary') return /plug.in|phev/.test(v) ? 'plug-in-hybrid' : /hybrid|híbrido/.test(v) ? 'hybrid' : /gasolin/.test(v) ? 'gasoline' : /di[eé]sel/.test(v) ? 'diesel' : /electric|eléctric/.test(v) ? 'electric' : '';
  return value;
}
export function equipmentForForm<T extends { vin: string; equipment: VehicleEquipment }>(form: T): VehicleEquipment {
  const equipment = readEquipment(form.equipment, form.vin);
  for (const [id, key] of Object.entries(BASIC_FIELDS)) {
    if (!(key in form)) continue;
    const value = String((form as Record<string, unknown>)[key] ?? '');
    const entry = equipment.fields[id];
    if (entry && basicValue(id, entry.value) === value) continue;
    if (!value && !entry) continue;
    const definition = EQUIPMENT_FIELDS.find(field => field.id === id)!;
    equipment.fields[id] = { label: definition.label, group: definition.group, value, source: 'manual' };
  }
  return equipment;
}
export function applyEquipmentEdit<T extends { vin: string; equipment: VehicleEquipment }>(form: T, equipment: VehicleEquipment): T {
  const next = { ...form, equipment };
  const before = equipmentForForm(form);
  for (const [id, key] of Object.entries(BASIC_FIELDS)) {
    const entry = equipment.fields[id];
    if (!(key in form) || !entry || entry.value === before.fields[id]?.value) continue;
    const value = basicValue(id, entry.value);
    if (value || entry.value === '') (next as Record<string, unknown>)[key] = value;
  }
  return next;
}
/** Preserve existing specs on partial updates, and discard VIN data from another unit. */
export function mergeVehicleSpecifications(existing: Record<string, unknown>, incoming: Record<string, unknown>, vin: string): Record<string, unknown> {
  const result: Record<string, unknown> & { vin: string } = { ...existing, ...incoming, vin: normalizeEquipmentVin(vin) };
  if (normalizeEquipmentVin(String(existing.vin || '')) !== result.vin) {
    delete result.decoded;
    result.equipment = readEquipment(incoming.equipment, result.vin);
  } else if (Object.prototype.hasOwnProperty.call(incoming, 'equipment')) {
    result.equipment = readEquipment(incoming.equipment, result.vin);
  }
  return result;
}
