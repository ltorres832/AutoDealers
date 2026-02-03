"use strict";
// Optimización de inventario con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestVehiclesToPurchase = suggestVehiclesToPurchase;
exports.analyzeVehicleProfitability = analyzeVehicleProfitability;
exports.optimizeInventoryMix = optimizeInventoryMix;
exports.predictSeasonalDemand = predictSeasonalDemand;
const core_1 = require("@autodealers/core");
const inventory_1 = require("@autodealers/inventory");
const crm_1 = require("@autodealers/crm");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Sugiere qué vehículos comprar
 */
async function suggestVehiclesToPurchase(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const soldVehicles = vehicles.filter(v => v.status === 'sold');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Sugiere qué vehículos comprar basado en estos datos:

Ventas completadas: ${completedSales.length}
Vehículos vendidos: ${soldVehicles.length}

Vehículos más vendidos:
${completedSales.slice(0, 20).map(s => `${s.vehicle?.make} ${s.vehicle?.model} ${s.vehicle?.year} - Vendido por $${s.salePrice || s.total || 0}`).join('\n')}

Inventario actual:
${vehicles.filter(v => v.status === 'available').slice(0, 10).map(v => `${v.make} ${v.model} ${v.year} - $${v.price}`).join('\n')}

Sugiere 5-7 vehículos que deberías comprar con:
1. Marca, modelo y año
2. Rango de precio recomendado
3. Razonamiento
4. ROI esperado (%)

Responde en formato JSON con suggestions (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en compra de inventario de vehículos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            suggestions: result.suggestions || [],
        };
    }
    catch (error) {
        console.error('Error suggesting vehicles to purchase:', error);
        return null;
    }
}
/**
 * Analiza rentabilidad por vehículo
 */
async function analyzeVehicleProfitability(tenantId, vehicleId, apiKey) {
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
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const similarSales = sales.filter(s => s.vehicle?.make === vehicle?.make &&
            s.vehicle?.model === vehicle?.model &&
            s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza la rentabilidad de este vehículo:

Vehículo:
- ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}
- Precio: $${vehicle?.price}
- Días en inventario: ${Math.floor((Date.now() - (vehicle?.createdAt?.toDate?.()?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))}

Ventas similares:
${similarSales.slice(0, 10).map(s => `Vendido por $${s.salePrice || s.total || 0}`).join('\n')}

Analiza:
1. Puntuación de rentabilidad (0-100)
2. Margen de ganancia estimado (%)
3. Días hasta punto de equilibrio
4. Recomendaciones para mejorar rentabilidad

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de rentabilidad de vehículos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            profitabilityScore: result.profitabilityScore || 50,
            profitMargin: result.profitMargin || 0,
            daysToBreakEven: result.daysToBreakEven || 30,
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error analyzing vehicle profitability:', error);
        return null;
    }
}
/**
 * Optimiza el mix de inventario
 */
async function optimizeInventoryMix(tenantId, apiKey) {
    try {
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const availableVehicles = vehicles.filter(v => v.status === 'available');
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Optimiza el mix de inventario:

Inventario actual: ${availableVehicles.length} vehículos
Ventas completadas: ${completedSales.length}

Distribución actual por precio:
${availableVehicles.reduce((acc, v) => {
            const category = v.price > 50000 ? 'luxury' : v.price > 25000 ? 'mid-range' : 'economy';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {})}

Ventas por categoría:
${completedSales.reduce((acc, s) => {
            const price = s.salePrice || s.total || 0;
            const category = price > 50000 ? 'luxury' : price > 25000 ? 'mid-range' : 'economy';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {})}

Sugiere:
1. Mix óptimo de inventario por categoría (%)
2. Comparación con mix actual
3. Recomendaciones

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de mix de inventario.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            optimalMix: result.optimalMix || [],
            currentMix: result.currentMix || [],
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error optimizing inventory mix:', error);
        return null;
    }
}
/**
 * Predice demanda estacional
 */
async function predictSeasonalDemand(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Predice demanda estacional basado en ventas históricas:

Ventas por mes:
${completedSales.reduce((acc, s) => {
            const date = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
            const month = date.toLocaleString('es', { month: 'long' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {})}

Predice demanda para los próximos 12 meses con:
1. Mes
2. Demanda esperada (high/medium/low)
3. Inventario recomendado
4. Razonamiento

Responde en formato JSON con seasonalTrends (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en predicción de demanda estacional.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            seasonalTrends: result.seasonalTrends || [],
        };
    }
    catch (error) {
        console.error('Error predicting seasonal demand:', error);
        return null;
    }
}
//# sourceMappingURL=inventory-optimization.js.map