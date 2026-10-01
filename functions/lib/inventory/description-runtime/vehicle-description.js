"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESCRIPTION_FAILURE = exports.DEFAULT_DESCRIPTION_CONFIG = void 0;
exports.officialVehicleDescription = officialVehicleDescription;
exports.descriptionVehicleFromForm = descriptionVehicleFromForm;
exports.confirmedDescriptionFacts = confirmedDescriptionFacts;
exports.descriptionInput = descriptionInput;
exports.descriptionInputKey = descriptionInputKey;
exports.hasDescriptionData = hasDescriptionData;
const vehicle_marketing_1 = require("./vehicle-marketing");
const vehicle_equipment_1 = require("./vehicle-equipment");
exports.DEFAULT_DESCRIPTION_CONFIG = {
    aiVehicleDescriptionsEnabled: false, automaticGeneration: true, rollout: 'internal', internalUserIds: [], tenantIds: [],
    language: 'es', length: 'medium', emojis: false, tone: 'professional',
    cta: '', forbiddenWords: ['garantizado', 'sin accidentes', 'único dueño', 'impecable'],
    baseTemplate: '{title}\n\n{introduction}\n\n{commercial}\n\n{features}\n\n{important}\n\n{cta}',
    bulletFormat: 'bullet', maxCharacters: 2100, allowManualEdit: true, allowRegeneration: true,
};
function officialVehicleDescription(vehicle) {
    return typeof vehicle.masterDescription === 'string' ? vehicle.masterDescription : typeof vehicle.description === 'string' ? vehicle.description : '';
}
const clean = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : '';
const list = (value) => Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 40) : [];
/** Form adapter only; no prompt, credentials or inferred specifications belong here. */
function descriptionVehicleFromForm(form) {
    const num = (v) => v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : undefined;
    return {
        ...form, price: num(form.price), mileage: num(form.mileage), year: num(form.year), mileageUnit: form.mileageUnit || 'mi',
        specifications: {
            ...(form.specifications || {}), equipment: form.equipment ? (0, vehicle_equipment_1.equipmentForForm)(form) : form.specifications?.equipment,
            ...Object.fromEntries(['trim', 'version', 'engine', 'transmission', 'driveType', 'fuelType', 'doors', 'seats', 'exteriorColor', 'interiorColor', 'bodyType', 'mpgCity', 'mpgHighway'].filter(k => form[k] !== undefined).map(k => [k, form[k]])),
            features: typeof form.premiumFeatures === 'string' ? form.premiumFeatures.split(',').map(clean).filter(Boolean) : form.specifications?.features,
        },
    };
}
function confirmedDescriptionFacts(vehicle) {
    const specs = vehicle.specifications || {};
    const prepared = { ...vehicle, description: '', vin: vehicle.vin || String(specs.vin || specs.equipment?.vin || ''), specifications: {
            ...Object.fromEntries(['trim', 'version', 'engine', 'transmission', 'fuelType', 'doors', 'seats', 'exteriorColor', 'interiorColor'].filter(k => vehicle[k] !== undefined).map(k => [k, vehicle[k]])),
            driveType: vehicle.drivetrain || vehicle.driveType || specs.drivetrain, ...specs,
        } };
    const facts = (0, vehicle_marketing_1.vehicleMarketingFacts)(prepared);
    for (const key of ['features', 'packages', 'accessories', 'modifications']) {
        for (const [i, value] of [...new Set([...list(vehicle[key]), ...list(specs[key]), ...(key === 'features' ? list(specs.premiumFeatures) : [])])].entries()) {
            if (/optional|opcional|unknown|por confirmar|pendiente/i.test(value))
                continue;
            facts.push({ id: `${key}:${i}`, group: 'other', label: { features: 'Equipamiento', packages: 'Paquete', accessories: 'Accesorio', modifications: 'Modificación' }[key], value });
        }
    }
    if (clean(vehicle.version || specs.version))
        facts.push({ id: 'version', group: 'identity', label: 'Versión', value: clean(vehicle.version || specs.version) });
    if (clean(vehicle.confirmedNotes))
        facts.push({ id: 'confirmedNotes', group: 'other', label: 'Información del vendedor', value: clean(vehicle.confirmedNotes) });
    // Suggestions are deliberately excluded, even when a caller forges their status.
    return facts.filter((f, i, a) => a.findIndex(x => x.label === f.label && x.value === f.value) === i);
}
function descriptionInput(vehicle) {
    return { identity: (0, vehicle_marketing_1.marketingIdentity)(vehicle), year: vehicle.year, make: clean(vehicle.make), model: clean(vehicle.model),
        basics: (0, vehicle_marketing_1.marketingBasics)(vehicle).filter(line => !line.startsWith('Estado:')), facts: confirmedDescriptionFacts(vehicle) };
}
/** Stable canonical value, not a security signature. The server hashes it cryptographically. */
function descriptionInputKey(vehicle) { return JSON.stringify(descriptionInput(vehicle)); }
function hasDescriptionData(vehicle) {
    return !!(vehicle.make?.trim() && vehicle.model?.trim() && Number(vehicle.year) >= 1886 && Number(vehicle.year) <= new Date().getFullYear() + 2 && (confirmedDescriptionFacts(vehicle).length || (0, vehicle_marketing_1.marketingBasics)(vehicle).length));
}
exports.DESCRIPTION_FAILURE = 'No pudimos generar la descripción en este momento. Puedes continuar publicando el vehículo o intentarlo nuevamente.';
