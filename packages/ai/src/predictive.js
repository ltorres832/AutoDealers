"use strict";
// Funciones predictivas de IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictLeadConversion = predictLeadConversion;
exports.predictVehicleDemand = predictVehicleDemand;
exports.predictInventoryTurnover = predictInventoryTurnover;
const core_1 = require("@autodealers/core");
const crm_1 = require("@autodealers/crm");
const inventory_1 = require("@autodealers/inventory");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Predice la probabilidad de cierre de un lead
 */
async function predictLeadConversion(tenantId, leadId, apiKey) {
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
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const historicalData = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza este lead y predice su probabilidad de conversión:

Lead:
- Estado: ${leadData?.status}
- Fuente: ${leadData?.source}
- Interacciones: ${interactions.length}
- Última interacción: ${interactions[interactions.length - 1]?.content || 'Ninguna'}
- Vehículos de interés: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Datos históricos:
- Ventas totales: ${historicalData.length}
- Tasa de conversión promedio: ${historicalData.length > 0 ? (historicalData.length / (historicalData.length + 100)) * 100 : 0}%

Predice:
1. Probabilidad de conversión (0-100)
2. Días estimados hasta cierre
3. Nivel de confianza (0-1)
4. Factores clave que influyen

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis predictivo de ventas de autos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            conversionProbability: result.conversionProbability || 50,
            estimatedDaysToClose: result.estimatedDaysToClose || 30,
            confidence: result.confidence || 0.5,
            factors: result.factors || [],
        };
    }
    catch (error) {
        console.error('Error predicting lead conversion:', error);
        return null;
    }
}
/**
 * Predice la demanda por tipo de vehículo
 */
async function predictVehicleDemand(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza la demanda de vehículos basado en estos datos:

Ventas completadas: ${completedSales.length}
Inventario disponible: ${vehicles.length}

Ventas por marca/modelo:
${completedSales.slice(0, 20).map(s => `${s.vehicle?.make} ${s.vehicle?.model}`).join('\n')}

Predice la demanda para los próximos 30 días por tipo de vehículo.
Responde en formato JSON con array de predictions:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de demanda de vehículos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            predictions: result.predictions || [],
        };
    }
    catch (error) {
        console.error('Error predicting vehicle demand:', error);
        return null;
    }
}
/**
 * Predice la rotación de inventario
 */
async function predictInventoryTurnover(tenantId, vehicleId, apiKey) {
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
            s.vehicle?.model === vehicle?.model);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Predice cuántos días tomará vender este vehículo:

Vehículo: ${vehicle?.make} ${vehicle?.model} ${vehicle?.year}
Precio: $${vehicle?.price}
Kilometraje: ${vehicle?.mileage || 'N/A'}
Condición: ${vehicle?.condition}
Días en inventario: ${Math.floor((Date.now() - (vehicle?.createdAt?.toDate?.()?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))}

Ventas similares: ${similarSales.length}
Tiempo promedio de venta: ${similarSales.length > 0 ? similarSales.reduce((sum, s) => {
            const saleDate = s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt);
            const vehicleDate = vehicle?.createdAt?.toDate?.() || new Date();
            return sum + Math.floor((saleDate.getTime() - vehicleDate.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / similarSales.length : 30} días

Responde en formato JSON con estimatedDaysToSell, turnoverScore (0-100), y reasoning:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de rotación de inventario.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            estimatedDaysToSell: result.estimatedDaysToSell || 30,
            turnoverScore: result.turnoverScore || 50,
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error predicting inventory turnover:', error);
        return null;
    }
}
//# sourceMappingURL=predictive.js.map