"use strict";
// Personalización avanzada con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.personalizeMessage = personalizeMessage;
exports.recommendVehiclesByHistory = recommendVehiclesByHistory;
exports.personalizePromotion = personalizePromotion;
const core_1 = require("@autodealers/core");
const inventory_1 = require("@autodealers/inventory");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Personaliza mensajes según el perfil del cliente
 */
async function personalizeMessage(tenantId, leadId, messageType, apiKey, customInstructions) {
    try {
        const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .get();
        if (!leadDoc.exists) {
            return null;
        }
        const leadData = leadDoc.data();
        const interactions = leadData?.interactions || [];
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const interestedVehicles = vehicles.filter(v => leadData?.interestedVehicles?.includes(v.id));
        const openai = new openai_1.default({ apiKey });
        const prompt = `Personaliza un mensaje de tipo "${messageType}" para este cliente:

Cliente:
- Nombre: ${leadData?.contact?.name}
- Fuente: ${leadData?.source}
- Interacciones previas: ${interactions.slice(-3).map((i) => i.content).join('\n')}
- Vehículos de interés: ${interestedVehicles.map(v => `${v.year} ${v.make} ${v.model}`).join(', ') || 'Ninguno'}
- Estado del lead: ${leadData?.status}

${customInstructions ? `Instrucciones personalizadas: ${customInstructions}` : ''}

Genera un mensaje personalizado que:
1. Se adapte al perfil del cliente
2. Mencione información relevante de sus interacciones
3. Sea apropiado para el tipo de mensaje
4. Incluya información útil sobre vehículos de interés

Responde en formato JSON con personalizedMessage, tone, y keyPoints (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en personalización de mensajes de ventas.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            personalizedMessage: result.personalizedMessage || '',
            tone: result.tone || 'friendly',
            keyPoints: result.keyPoints || [],
        };
    }
    catch (error) {
        console.error('Error personalizing message:', error);
        return null;
    }
}
/**
 * Recomienda vehículos basado en historial del cliente
 */
async function recommendVehiclesByHistory(tenantId, leadId, apiKey) {
    try {
        const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .get();
        if (!leadDoc.exists) {
            return null;
        }
        const leadData = leadDoc.data();
        const interactions = leadData?.interactions || [];
        const vehicles = await (0, inventory_1.getVehicles)(tenantId, { status: 'available' });
        if (vehicles.length === 0) {
            return null;
        }
        const openai = new openai_1.default({ apiKey });
        const vehicleList = vehicles.slice(0, 20).map(v => `ID: ${v.id} - ${v.year} ${v.make} ${v.model}, Precio: $${v.price}, ${v.mileage ? `${v.mileage} km` : 'Nuevo'}`).join('\n');
        const prompt = `Recomienda vehículos para este cliente basado en su historial:

Cliente: ${leadData?.contact?.name}
Interacciones: ${interactions.map((i) => i.content).join('\n')}
Vehículos de interés previos: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Inventario disponible:
${vehicleList}

Recomienda los 3-5 vehículos más adecuados con:
1. ID del vehículo
2. Puntuación de coincidencia (0-100)
3. Razonamiento

Responde en formato JSON con recommendedVehicles (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en recomendación de vehículos basado en preferencias del cliente.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            recommendedVehicles: (result.recommendedVehicles || []).filter((rv) => vehicles.some(v => v.id === rv.vehicleId)),
        };
    }
    catch (error) {
        console.error('Error recommending vehicles:', error);
        return null;
    }
}
/**
 * Personaliza promociones según el perfil del cliente
 */
async function personalizePromotion(tenantId, leadId, promotionId, apiKey) {
    try {
        const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .get();
        const promotionDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('promotions')
            .doc(promotionId)
            .get();
        if (!leadDoc.exists || !promotionDoc.exists) {
            return null;
        }
        const leadData = leadDoc.data();
        const promotion = promotionDoc.data();
        const interactions = leadData?.interactions || [];
        const openai = new openai_1.default({ apiKey });
        const prompt = `Personaliza esta promoción para el cliente:

Promoción:
- Nombre: ${promotion?.name}
- Descripción: ${promotion?.description}
- Descuento: ${promotion?.discount?.value || 0}${promotion?.discount?.type === 'percentage' ? '%' : '$'}

Cliente:
- Nombre: ${leadData?.contact?.name}
- Estado: ${leadData?.status}
- Interacciones: ${interactions.slice(-3).map((i) => i.content).join('\n')}
- Vehículos de interés: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Personaliza el contenido y sugiere un descuento apropiado.
Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en personalización de promociones.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.6,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            personalizedContent: result.personalizedContent || promotion?.description || '',
            discountSuggestion: result.discountSuggestion || promotion?.discount?.value || 0,
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error personalizing promotion:', error);
        return null;
    }
}
//# sourceMappingURL=personalization.js.map