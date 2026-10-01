"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETING_LEADS = void 0;
exports.vehicleMarketingFacts = vehicleMarketingFacts;
exports.marketingIdentity = marketingIdentity;
exports.marketingBasics = marketingBasics;
exports.buildVehicleMarketingPost = buildVehicleMarketingPost;
exports.vehicleMarketingPrompt = vehicleMarketingPrompt;
exports.vehicleShareDescription = vehicleShareDescription;
const vehicle_equipment_1 = require("./vehicle-equipment");
const order = ['mechanical', 'safety', 'interior', 'entertainment', 'exterior', 'efficiency', 'dimensions', 'identity', 'other'];
const translations = {
    automatic: 'Automática', manual: 'Manual', cvt: 'CVT', gasoline: 'Gasolina', diesel: 'Diésel', electric: 'Eléctrico', hybrid: 'Híbrido', 'plug-in-hybrid': 'Híbrido enchufable',
    sedan: 'Sedán', 'sedan/saloon': 'Sedán', 'pickup-truck': 'Pickup', suv: 'SUV', 'sport utility vehicle (suv)/multi-purpose vehicle (mpv)': 'SUV',
    'fwd/front-wheel drive': 'Delantera (FWD)', 'rwd/rear-wheel drive': 'Trasera (RWD)', 'awd/all-wheel drive': 'Integral (AWD)',
    '1st row (driver and passenger)': 'Primera fila: conductor y pasajero', '1st and 2nd rows': 'Primera y segunda fila',
};
const clean = (value, max = 160) => (0, vehicle_equipment_1.equipmentText)(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, max).trim();
const usable = (value) => value && !/^(no|none|0|no aplica|not applicable|not equipped|no disponible)$/i.test(value) && !/opcional|optional|pendiente|por confirmar|unknown|not reported/i.test(value);
const translate = (value) => translations[value.toLowerCase()] || value;
const priority = ['EngineModel', 'TransmissionStyle', 'DriveType', 'EngineHP', 'DisplacementL', 'EngineCylinders', 'BackupCamera', 'BlindSpotMon', 'CIB', 'LaneKeepSystem', 'AdaptiveCruiseControl', 'ABS', 'ESC', 'Seats', 'ClimateControl', 'Upholstery', 'HeatedSeats', 'AppleCarPlay', 'AndroidAuto', 'Bluetooth', 'Touchscreen', 'ExteriorColor', 'BodyClass', 'Doors', 'Sunroof', 'FuelTypePrimary', 'MPGCity', 'MPGHighway', 'ElectricRange', 'BatteryKWh', 'CargoVolume', 'TowingCapacity', 'Trim'];
function vehicleMarketingFacts(vehicle) {
    const specs = vehicle.specifications || {};
    const equipment = (0, vehicle_equipment_1.equipmentFromSpecifications)(specs, vehicle.vin || String(specs.vin || ''));
    const facts = [];
    const add = (id, group, label, input) => {
        const value = clean(input, id === 'description' ? 320 : 160);
        if (usable(value))
            facts.push({ id, group, label: clean(label, 90), value: translate(value) });
    };
    for (const [id, field] of Object.entries(equipment.fields)) {
        // Manufacturing codes and unclassified vPIC metadata do not help a buyer compare cars.
        if (field.group === 'identity' && !['Trim', 'Series', 'Trim2'].includes(id))
            continue;
        if (id.startsWith('extra_'))
            continue;
        add(id, field.group, field.label, field.value);
    }
    const basic = [
        ['EngineModel', 'mechanical', 'Motor', specs.engine], ['TransmissionStyle', 'mechanical', 'Transmisión', specs.transmission],
        ['DriveType', 'mechanical', 'Tracción', specs.driveType], ['FuelTypePrimary', 'efficiency', 'Combustible', specs.fuelType],
        ['ExteriorColor', 'exterior', 'Color exterior', specs.color || specs.exteriorColor], ['InteriorColor', 'interior', 'Color interior', specs.interiorColor],
        ['Seats', 'interior', 'Asientos', specs.seats], ['Doors', 'exterior', 'Puertas', specs.doors],
        ['BodyClass', 'exterior', 'Carrocería', vehicle.bodyType || specs.bodyType], ['Trim', 'identity', 'Versión', specs.trim],
    ];
    for (const [id, group, label, value] of basic) {
        // An explicit cleared/absent equipment entry takes precedence over legacy values.
        if (!Object.prototype.hasOwnProperty.call(equipment.fields, id))
            add(id, group, label, value);
    }
    const extra = [...(Array.isArray(vehicle.features) ? vehicle.features : []), ...(Array.isArray(vehicle.keyFeatures) ? vehicle.keyFeatures : [])];
    for (const [index, feature] of [...new Set(extra)].slice(0, 20).entries())
        add(`feature_${index}`, 'other', 'Equipamiento', feature);
    if (vehicle.description)
        add('description', 'other', 'Descripción del anunciante', vehicle.description);
    return facts.sort((a, b) => {
        const group = order.indexOf(a.group) - order.indexOf(b.group);
        if (group)
            return group;
        const rank = (id) => priority.includes(id) ? priority.indexOf(id) : 100;
        return rank(a.id) - rank(b.id);
    });
}
function marketingIdentity(vehicle) {
    return [vehicle.year, vehicle.make, vehicle.model].map(value => clean(value, 70)).filter(Boolean).join(' ') || 'Vehículo';
}
function marketingBasics(vehicle) {
    const lines = [];
    const condition = { new: 'Nuevo', used: 'Usado', certified: 'Certificado' }[vehicle.condition || ''];
    if (condition)
        lines.push(`Condición: ${condition}`);
    const mileage = vehicle.mileage ?? vehicle.specifications?.mileage;
    if (typeof mileage === 'number' && Number.isFinite(mileage) && mileage >= 0) {
        const unit = vehicle.mileageUnit || vehicle.specifications?.mileageUnit;
        lines.push(`Odómetro: ${mileage.toLocaleString('es-US')}${unit === 'km' ? ' km' : unit === 'mi' || unit === 'miles' ? ' millas' : ' (unidad por confirmar)'}`);
    }
    if (typeof vehicle.price === 'number' && Number.isFinite(vehicle.price) && vehicle.price > 0) {
        const currency = clean(vehicle.currency, 3).toUpperCase();
        lines.push(`Precio: ${vehicle.price.toLocaleString('es-US')}${/^[A-Z]{3}$/.test(currency) ? ` ${currency}` : ' (moneda por confirmar)'}`);
    }
    if (clean(vehicle.location))
        lines.push(`Ubicación: ${clean(vehicle.location)}`);
    if (['sold', 'reserved', 'hidden'].includes(vehicle.status || ''))
        lines.push(`Estado: ${{ sold: 'Vendido', reserved: 'Reservado', hidden: 'No publicado' }[vehicle.status]}`);
    return lines;
}
exports.MARKETING_LEADS = {
    general: 'Conoce sus características y compara lo que ofrece para tu próximo auto.',
    safety: 'Conoce los sistemas de seguridad y asistencia registrados en esta unidad.',
    interior: 'Explora su interior y las opciones de comodidad para tus recorridos.',
    entertainment: 'Descubre el equipamiento de conectividad y entretenimiento de esta unidad.',
    mechanical: 'Revisa su configuración mecánica y equipamiento antes de elegir tu próximo auto.',
};
/** AI can rank sourced fact IDs, but cannot rewrite specs or invent features. */
function buildVehicleMarketingPost(vehicle, options = {}) {
    const facts = vehicleMarketingFacts(vehicle);
    const maxLength = Math.max(500, Math.min(options.maxLength || 1850, 4000));
    const selected = options.highlightedIds || [];
    const selectionRank = (id) => selected.includes(id) ? selected.indexOf(id) : 1000;
    const leadKey = options.lead;
    const lead = leadKey in exports.MARKETING_LEADS && (leadKey === 'general' || facts.some(f => f.group === leadKey)) ? exports.MARKETING_LEADS[leadKey] : exports.MARKETING_LEADS.general;
    const intro = `${marketingIdentity(vehicle)}\n${lead}`;
    const cta = options.objective === 'more_visits' ? 'Consulta la ficha completa y coordina una visita para conocerlo.' : 'Escríbenos para consultar disponibilidad, resolver tus dudas y coordinar una visita.';
    const basics = marketingBasics(vehicle).join(' · ');
    const ending = [basics, cta].filter(Boolean).join('\n\n');
    const budget = maxLength - intro.length - ending.length - 4;
    const groups = order.map(group => ({
        label: vehicle_equipment_1.EQUIPMENT_GROUPS.find(item => item.id === group).label,
        facts: facts.filter(f => f.group === group).sort((a, b) => selectionRank(a.id) - selectionRank(b.id)).slice(0, 5),
        rows: [],
    }));
    // Round-robin gives every available category space before adding more from any one category.
    const sections = () => groups.filter(g => g.rows.length).map(g => `${g.label}:\n${g.rows.join('\n')}`).join('\n\n');
    for (let index = 0; index < 5; index++)
        for (const group of groups) {
            const fact = group.facts[index];
            if (!fact)
                continue;
            const row = `• ${fact.label}${/^(sí|de serie)$/i.test(fact.value) ? '' : `: ${fact.value}`}`;
            group.rows.push(row);
            if (sections().length > budget)
                group.rows.pop();
        }
    return [intro, sections(), ending].filter(Boolean).join('\n\n');
}
function vehicleMarketingPrompt(vehicle) {
    return JSON.stringify({ vehicle: marketingIdentity(vehicle), basics: marketingBasics(vehicle), facts: vehicleMarketingFacts(vehicle) });
}
/** Sharing starts with the seller-authored description, without generated additions or truncation. */
function vehicleShareDescription(vehicle) {
    return typeof vehicle.masterDescription === 'string' ? vehicle.masterDescription : typeof vehicle.description === 'string' ? vehicle.description : '';
}
