"use strict";
// Funciones avanzadas de IA para el CRM
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestVehiclesForLead = suggestVehiclesForLead;
exports.analyzeConversation = analyzeConversation;
exports.optimizeVehiclePrice = optimizeVehiclePrice;
exports.generateAIReport = generateAIReport;
exports.analyzeCustomerSatisfaction = analyzeCustomerSatisfaction;
exports.optimizeAppointmentSchedule = optimizeAppointmentSchedule;
const assistant_1 = require("./assistant");
const core_1 = require("@autodealers/core");
const core_2 = require("@autodealers/core");
const db = (0, core_2.getFirestore)();
/**
 * Sugiere vehículos para un lead basado en sus preferencias y mensajes
 */
async function suggestVehiclesForLead(tenantId, leadId) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        if (!config.advancedSettings.intentDetection) {
            return null;
        }
        // Obtener información del lead
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
        const messages = leadData?.interactions
            ?.filter((i) => i.type === 'message')
            .map((i) => i.content) || [];
        // Obtener inventario disponible
        const vehiclesSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .where('status', '==', 'available')
            .limit(20)
            .get();
        const vehicles = vehiclesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        if (vehicles.length === 0) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const assistant = new assistant_1.AIAssistant(apiKey);
        // Crear prompt para sugerir vehículos
        const vehicleList = vehicles.map((v) => `${v.make} ${v.model} ${v.year} - $${v.price}`).join('\n');
        const prompt = `Basado en estos mensajes del cliente: ${messages.join('\n')}
Y este inventario disponible:
${vehicleList}

Sugiere los 3 vehículos más adecuados. Responde solo con los IDs separados por comas.`;
        // Usar OpenAI para analizar y sugerir
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en venta de autos. Analiza las preferencias del cliente y sugiere vehículos adecuados.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 100,
        });
        const response = completion.choices[0]?.message?.content || '';
        const suggestedIds = response
            .split(',')
            .map(id => id.trim())
            .filter(id => vehicles.some(v => v.id === id))
            .slice(0, 3);
        return suggestedIds.length > 0 ? suggestedIds : null;
    }
    catch (error) {
        console.error('Error sugiriendo vehículos:', error);
        return null;
    }
}
/**
 * Analiza una conversación completa y genera un resumen
 */
async function analyzeConversation(tenantId, leadId) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        if (!config.advancedSettings.conversationSummarization) {
            return null;
        }
        // Obtener todas las interacciones del lead
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
        if (interactions.length === 0) {
            return null;
        }
        const conversation = interactions
            .map((i) => `${i.type}: ${i.content}`)
            .join('\n');
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const prompt = `Analiza esta conversación con un cliente de venta de autos:

${conversation}

Proporciona:
1. Un resumen ejecutivo (2-3 oraciones)
2. Puntos clave (3-5 puntos)
3. Próximos pasos recomendados (3-5 acciones)
4. Sentimiento general (positive/neutral/negative)

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de conversaciones de ventas.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            summary: result.summary || '',
            keyPoints: result.keyPoints || [],
            nextSteps: result.nextSteps || [],
            sentiment: (result.sentiment || 'neutral'),
        };
    }
    catch (error) {
        console.error('Error analizando conversación:', error);
        return null;
    }
}
/**
 * Optimiza el precio de un vehículo basado en mercado y características
 */
async function optimizeVehiclePrice(tenantId, vehicleId) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        // Obtener información del vehículo
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
        // Obtener vehículos similares
        const similarVehicles = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .where('make', '==', vehicle?.make)
            .where('model', '==', vehicle?.model)
            .where('year', '==', vehicle?.year)
            .limit(10)
            .get();
        const prices = similarVehicles.docs
            .map(doc => doc.data().price)
            .filter((p) => p && p > 0);
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const prompt = `Analiza este vehículo y sugiere un precio optimizado:

Vehículo: ${vehicle?.make} ${vehicle?.model} ${vehicle?.year}
Precio actual: $${vehicle?.price}
Kilometraje: ${vehicle?.mileage || 'N/A'}
Condición: ${vehicle?.condition}
Características: ${JSON.stringify(vehicle?.specifications || {})}

Precios de vehículos similares: ${prices.join(', ')}

Sugiere un precio optimizado basado en:
1. Precios de mercado
2. Características del vehículo
3. Condición y kilometraje
4. Competencia

Responde en formato JSON con: suggestedPrice (número), reasoning (texto), marketComparison (texto)`;
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en valuación de vehículos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            suggestedPrice: result.suggestedPrice || vehicle?.price,
            reasoning: result.reasoning || '',
            marketComparison: result.marketComparison || '',
        };
    }
    catch (error) {
        console.error('Error optimizando precio:', error);
        return null;
    }
}
/**
 * Genera un reporte inteligente con análisis de IA
 */
async function generateAIReport(tenantId, reportType, filters) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        // Obtener datos según el tipo de reporte
        let data = {};
        switch (reportType) {
            case 'leads':
                const leadsSnapshot = await db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('leads')
                    .limit(100)
                    .get();
                data.leads = leadsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                break;
            case 'sales':
                const salesSnapshot = await db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('sales')
                    .limit(100)
                    .get();
                data.sales = salesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                break;
            case 'inventory':
                const vehiclesSnapshot = await db
                    .collection('tenants')
                    .doc(tenantId)
                    .collection('vehicles')
                    .limit(100)
                    .get();
                data.vehicles = vehiclesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                break;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const prompt = `Analiza estos datos de ${reportType} y genera un reporte inteligente:

${JSON.stringify(data, null, 2)}

Proporciona:
1. Un resumen ejecutivo (3-5 oraciones)
2. Insights clave (5-7 puntos)
3. Recomendaciones accionables (5-7 acciones)

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un analista de negocios experto en venta de autos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            summary: result.summary || '',
            insights: result.insights || [],
            recommendations: result.recommendations || [],
            data,
        };
    }
    catch (error) {
        console.error('Error generando reporte de IA:', error);
        return null;
    }
}
/**
 * Analiza la satisfacción del cliente basado en interacciones
 */
async function analyzeCustomerSatisfaction(tenantId, leadId) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
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
        if (interactions.length === 0) {
            return null;
        }
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const prompt = `Analiza la satisfacción del cliente basado en estas interacciones:

${interactions.map((i) => `${i.type}: ${i.content}`).join('\n')}

Estado del lead: ${leadData?.status}
Tiempo de respuesta promedio: [calcular si es posible]

Evalúa:
1. Nivel de satisfacción (0-100)
2. Factores que afectan la satisfacción (positivos y negativos)
3. Recomendaciones para mejorar

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de satisfacción del cliente.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            satisfactionScore: result.satisfactionScore || 50,
            factors: result.factors || [],
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error analizando satisfacción:', error);
        return null;
    }
}
/**
 * Optimiza horarios de citas basado en historial y preferencias
 */
async function optimizeAppointmentSchedule(tenantId, leadId, preferredDates) {
    try {
        if (!(await (0, core_1.isAIEnabled)(tenantId))) {
            return null;
        }
        // Obtener citas existentes
        const appointmentsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('appointments')
            .where('scheduledAt', '>=', new Date())
            .limit(50)
            .get();
        const bookedTimes = appointmentsSnapshot.docs.map(doc => doc.data().scheduledAt?.toDate?.()?.toISOString() || '');
        const apiKey = await (0, core_1.getAIApiKey)(tenantId);
        if (!apiKey) {
            return null;
        }
        const config = await (0, core_1.getAIConfig)(tenantId);
        const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const openai = new OpenAI({ apiKey });
        const prompt = `Optimiza horarios de cita para un cliente:

Fechas preferidas: ${preferredDates.join(', ')}
Horarios ya reservados: ${bookedTimes.slice(0, 10).join(', ')}

Sugiere 3-5 horarios óptimos considerando:
1. Disponibilidad
2. Preferencias del cliente
3. Distribución de carga de trabajo
4. Mejores momentos para conversión

Responde en formato JSON con suggestedTimes (array) y reasoning (texto)`;
        const completion = await openai.chat.completions.create({
            model: config.responseSettings.model || 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de horarios y programación.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            suggestedTimes: result.suggestedTimes || preferredDates.slice(0, 3),
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error optimizando horarios:', error);
        return null;
    }
}
//# sourceMappingURL=advanced-features.js.map