"use strict";
// Análisis de competencia con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMarketPricing = analyzeMarketPricing;
exports.identifyMarketOpportunities = identifyMarketOpportunities;
exports.analyzeIndustryTrends = analyzeIndustryTrends;
const core_1 = require("@autodealers/core");
const inventory_1 = require("@autodealers/inventory");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Analiza precios de mercado y compara con competencia
 */
async function analyzeMarketPricing(tenantId, vehicleId, apiKey) {
    try {
        const vehicleDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .get();
        if (!vehicleDoc.exists) {
            return null;
        }
        const vehicle = vehicleDoc.data();
        const similarVehicles = await (0, inventory_1.getVehicles)(tenantId);
        const sameMakeModel = similarVehicles.filter(v => v.make === vehicle?.make &&
            v.model === vehicle?.model &&
            v.year === vehicle?.year &&
            v.id !== vehicleId);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza el precio de mercado para este vehículo:

Vehículo:
- ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}
- Precio actual: $${vehicle?.price}
- Kilometraje: ${vehicle?.mileage || 'Nuevo'}
- Condición: ${vehicle?.condition}

Vehículos similares en el mercado:
${sameMakeModel.slice(0, 10).map(v => `- $${v.price} (${v.mileage || 'Nuevo'} km, ${v.condition})`).join('\n')}

Analiza:
1. Precio promedio de mercado
2. Rango de precios de competidores
3. Posición del precio actual (above/at/below)
4. Recomendación de precio competitivo
5. Recomendación de estrategia

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de precios de mercado de vehículos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        const marketAverage = result.marketAverage || vehicle?.price || 0;
        const currentPrice = vehicle?.price || 0;
        return {
            marketAverage,
            competitorRange: result.competitorRange || { min: marketAverage * 0.9, max: marketAverage * 1.1 },
            pricePosition: currentPrice > marketAverage * 1.05 ? 'above' :
                currentPrice < marketAverage * 0.95 ? 'below' : 'at',
            recommendation: result.recommendation || '',
            competitivePrice: result.competitivePrice || marketAverage,
        };
    }
    catch (error) {
        console.error('Error analyzing market pricing:', error);
        return null;
    }
}
/**
 * Identifica oportunidades de mercado
 */
async function identifyMarketOpportunities(tenantId, apiKey) {
    try {
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const availableVehicles = vehicles.filter(v => v.status === 'available');
        const sales = await getTenantSales(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Identifica oportunidades de mercado basado en estos datos:

Inventario disponible: ${availableVehicles.length}
Ventas completadas: ${completedSales.length}

Vehículos más vendidos:
${completedSales.slice(0, 10).map(s => `${s.vehicle?.make} ${s.vehicle?.model}`).join('\n')}

Inventario actual:
${availableVehicles.slice(0, 10).map(v => `${v.make} ${v.model} - $${v.price}`).join('\n')}

Identifica oportunidades de mercado:
1. Tipos de vehículos con alta demanda
2. Segmentos de mercado no explotados
3. Oportunidades de precio
4. Acciones recomendadas

Responde en formato JSON con opportunities (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en identificación de oportunidades de mercado.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            opportunities: result.opportunities || [],
        };
    }
    catch (error) {
        console.error('Error identifying market opportunities:', error);
        return null;
    }
}
/**
 * Analiza tendencias del sector
 */
async function analyzeIndustryTrends(tenantId, apiKey) {
    try {
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const sales = await getTenantSales(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza tendencias del sector automotriz basado en estos datos:

Ventas totales: ${completedSales.length}
Inventario: ${vehicles.length}

Vehículos más vendidos:
${completedSales.slice(0, 15).map(s => `${s.vehicle?.make} ${s.vehicle?.model} ${s.vehicle?.year}`).join('\n')}

Identifica tendencias en:
1. Marcas y modelos populares
2. Precios y valores
3. Preferencias de clientes
4. Estacionalidad

Responde en formato JSON con trends (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de tendencias del sector automotriz.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            trends: result.trends || [],
        };
    }
    catch (error) {
        console.error('Error analyzing industry trends:', error);
        return null;
    }
}
//# sourceMappingURL=competitor-analysis.js.map