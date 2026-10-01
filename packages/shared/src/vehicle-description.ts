import { vehicleMarketingFacts, marketingBasics, marketingIdentity, type MarketingVehicle } from './vehicle-marketing';
import { equipmentForForm } from './vehicle-equipment';

export type DescriptionSource = 'ai' | 'manual' | 'regeneration' | 'restore' | 'migration';
export interface DescriptionVersion { id: string; text: string; createdAt: string; userId: string; source: DescriptionSource; revision: number; model?: string; restoredFrom?: string; }
export interface DescriptionMeta { draftId?: string; restoreVersionId?: string; expectedRevision?: number; }
export interface SuggestedFeature { id: string; label: string; value: string; status: 'suggested' | 'confirmed' | 'rejected'; source: 'photo'; photoUrl?: string; confirmedBy?: string; confirmedAt?: string; }
export interface DescriptionVehicle extends MarketingVehicle {
  id?: string; masterDescription?: string; descriptionNeedsReview?: boolean; descriptionRevision?: number;
  trim?: string; version?: string; engine?: string; transmission?: string; drivetrain?: string;
  driveType?: string; fuelType?: string; doors?: string | number; seats?: string | number;
  exteriorColor?: string; interiorColor?: string; packages?: string[]; accessories?: string[];
  modifications?: string[]; confirmedNotes?: string; suggestedFeatures?: SuggestedFeature[];
}
export interface VehicleDescriptionConfig {
  aiVehicleDescriptionsEnabled: boolean; automaticGeneration: boolean;
  rollout: 'development' | 'staging' | 'internal' | 'selected' | 'all';
  internalUserIds: string[]; tenantIds: string[]; language: 'es' | 'en'; length: 'short' | 'medium' | 'long';
  emojis: boolean; tone: 'professional' | 'friendly' | 'direct'; cta: string; forbiddenWords: string[];
  baseTemplate: string; bulletFormat: 'bullet' | 'dash' | 'check'; maxCharacters: number;
  allowManualEdit: boolean; allowRegeneration: boolean;
}
export const DEFAULT_DESCRIPTION_CONFIG: VehicleDescriptionConfig = {
  aiVehicleDescriptionsEnabled: false, automaticGeneration: true, rollout: 'internal', internalUserIds: [], tenantIds: [],
  language: 'es', length: 'medium', emojis: false, tone: 'professional',
  cta: '', forbiddenWords: ['garantizado', 'sin accidentes', 'único dueño', 'impecable'],
  baseTemplate: '{title}\n\n{introduction}\n\n{commercial}\n\n{features}\n\n{important}\n\n{cta}',
  bulletFormat: 'bullet', maxCharacters: 2100, allowManualEdit: true, allowRegeneration: true,
};
export function officialVehicleDescription(vehicle: { masterDescription?: unknown; description?: unknown }): string {
  return typeof vehicle.masterDescription === 'string' ? vehicle.masterDescription : typeof vehicle.description === 'string' ? vehicle.description : '';
}
const clean = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';
const list = (value: unknown) => Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 40) : [];

/** Form adapter only; no prompt, credentials or inferred specifications belong here. */
export function descriptionVehicleFromForm(form: Record<string, any>): DescriptionVehicle {
  const num = (v: unknown) => v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : undefined;
  return {
    ...form, price: num(form.price), mileage: num(form.mileage), year: num(form.year), mileageUnit: form.mileageUnit || 'mi',
    specifications: {
      ...(form.specifications || {}), equipment: form.equipment ? equipmentForForm(form as any) : form.specifications?.equipment,
      ...Object.fromEntries(['trim','version','engine','transmission','driveType','fuelType','doors','seats','exteriorColor','interiorColor','bodyType','mpgCity','mpgHighway'].filter(k => form[k] !== undefined).map(k => [k, form[k]])),
      features: typeof form.premiumFeatures === 'string' ? form.premiumFeatures.split(',').map(clean).filter(Boolean) : form.specifications?.features,
    },
  };
}
export function confirmedDescriptionFacts(vehicle: DescriptionVehicle) {
  const specs = vehicle.specifications || {};
  const prepared = { ...vehicle, description: '', vin: vehicle.vin || String(specs.vin || (specs.equipment as any)?.vin || ''), specifications: {
    ...Object.fromEntries(['trim','version','engine','transmission','fuelType','doors','seats','exteriorColor','interiorColor'].filter(k => (vehicle as any)[k] !== undefined).map(k=>[k,(vehicle as any)[k]])),
    driveType: vehicle.drivetrain || vehicle.driveType || specs.drivetrain, ...specs,
  }};
  const facts = vehicleMarketingFacts(prepared);
  for (const key of ['features','packages','accessories','modifications'] as const) {
    for (const [i, value] of [...new Set([...list(vehicle[key]), ...list(specs[key]), ...(key==='features'?list(specs.premiumFeatures):[])])].entries()) {
      if (/optional|opcional|unknown|por confirmar|pendiente/i.test(value)) continue;
      facts.push({ id: `${key}:${i}`, group: 'other', label: {features:'Equipamiento',packages:'Paquete',accessories:'Accesorio',modifications:'Modificación'}[key], value });
    }
  }
  if (clean(vehicle.version || specs.version)) facts.push({id:'version',group:'identity',label:'Versión',value:clean(vehicle.version || specs.version)});
  if (clean(vehicle.confirmedNotes)) facts.push({id:'confirmedNotes',group:'other',label:'Información del vendedor',value:clean(vehicle.confirmedNotes)});
  // Suggestions are deliberately excluded, even when a caller forges their status.
  return facts.filter((f,i,a)=>a.findIndex(x=>x.label===f.label && x.value===f.value)===i);
}
export function descriptionInput(vehicle: DescriptionVehicle) {
  return { identity: marketingIdentity(vehicle), year: vehicle.year, make: clean(vehicle.make), model: clean(vehicle.model),
    basics: marketingBasics(vehicle).filter(line=>!line.startsWith('Estado:')), facts: confirmedDescriptionFacts(vehicle) };
}
/** Stable canonical value, not a security signature. The server hashes it cryptographically. */
export function descriptionInputKey(vehicle: DescriptionVehicle): string { return JSON.stringify(descriptionInput(vehicle)); }
export function hasDescriptionData(vehicle: DescriptionVehicle): boolean {
  return !!(vehicle.make?.trim() && vehicle.model?.trim() && Number(vehicle.year) >= 1886 && Number(vehicle.year) <= new Date().getFullYear()+2 && (confirmedDescriptionFacts(vehicle).length || marketingBasics(vehicle).length));
}
export const DESCRIPTION_FAILURE = 'No pudimos generar la descripción en este momento. Puedes continuar publicando el vehículo o intentarlo nuevamente.';
