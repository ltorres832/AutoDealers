"use strict";
/**
 * Mapeo de field_data de Meta Lead Ads / Instant Forms → campos del CRM.
 * Los nombres de campos en Meta varían por idioma y plantilla; se cubren aliases comunes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapMetaLeadFieldDataToLeadForm = mapMetaLeadFieldDataToLeadForm;
exports.formatMetaLeadNotes = formatMetaLeadNotes;
function joinValues(values) {
    return (values || []).map((v) => String(v).trim()).filter(Boolean).join(', ');
}
function pick(byLower, keys) {
    for (const k of keys) {
        const v = byLower.get(k.toLowerCase());
        if (v)
            return v;
    }
    return '';
}
/**
 * Convierte field_data de un lead de Meta en contacto + respuestas.
 * `leadgenId` se usa como fallback estable para `phone` si no hay teléfono en el formulario.
 */
function mapMetaLeadFieldDataToLeadForm(fieldData, opts) {
    const leadFormResponses = {};
    const byLower = new Map();
    for (const row of fieldData || []) {
        const key = String(row.name || '').trim();
        if (!key)
            continue;
        const val = joinValues(row.values);
        leadFormResponses[key] = val;
        byLower.set(key.toLowerCase(), val);
    }
    const first = pick(byLower, ['first_name', 'nombre', 'primer_nombre']);
    const last = pick(byLower, ['last_name', 'apellido', 'apellidos']);
    const full = pick(byLower, ['full_name', 'name', 'nombre_completo', 'your_full_name']);
    let name = full || [first, last].filter(Boolean).join(' ').trim();
    if (!name)
        name = 'Lead formulario Meta';
    const email = pick(byLower, ['email', 'correo', 'correo_electronico', 'e-mail', 'mail']);
    const phone = pick(byLower, [
        'phone_number',
        'phone',
        'mobile_phone',
        'teléfono',
        'telefono',
        'numero_de_telefono',
        'número_de_teléfono',
        'cell_phone',
    ]);
    const city = pick(byLower, [
        'city',
        'ciudad',
        'pueblo',
        'town',
        'municipio',
        'location',
        'ubicación',
        'ubicacion',
    ]);
    const vehicleInterest = pick(byLower, [
        'which_vehicle_are_you_interested_in?',
        'which_vehicle_are_you_interested_in',
        'vehicle_of_interest',
        'vehicle',
        'vehiculo',
        'vehículo',
        'what_vehicle_are_you_looking_for',
        'car_you_are_interested_in',
        'modelo_de_interés',
        'modelo_de_interes',
        'interested_vehicle',
    ]);
    const fallbackPhone = phone ||
        (opts?.leadgenId ? `meta-lead:${opts.leadgenId}` : `meta-lead:${Date.now()}`);
    return {
        name,
        email: email || '',
        phone: fallbackPhone,
        city: city || '',
        vehicleInterest: vehicleInterest || '',
        leadFormResponses,
    };
}
function formatMetaLeadNotes(mapped, meta) {
    const lines = Object.entries(mapped.leadFormResponses).map(([k, v]) => `• ${k}: ${v}`);
    const header = ['Lead recibido desde anuncio (Meta Lead Ads).'];
    if (meta?.formId)
        header.push(`Form ID: ${meta.formId}`);
    if (meta?.adId)
        header.push(`Ad ID: ${meta.adId}`);
    return [...header, '', ...lines].join('\n');
}
