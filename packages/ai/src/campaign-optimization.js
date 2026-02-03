"use strict";
// Optimización de campañas con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizeCampaignBudget = optimizeCampaignBudget;
exports.suggestTargetAudience = suggestTargetAudience;
exports.optimizePostingSchedule = optimizePostingSchedule;
const core_1 = require("@autodealers/core");
const core_2 = require("@autodealers/core");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Optimiza el presupuesto de una campaña
 */
async function optimizeCampaignBudget(tenantId, campaignId, apiKey) {
    try {
        const campaignDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('campaigns')
            .doc(campaignId)
            .get();
        if (!campaignDoc.exists) {
            return null;
        }
        const campaign = campaignDoc.data();
        const allCampaigns = await (0, core_2.getCampaigns)(tenantId);
        const historicalCampaigns = allCampaigns.filter(c => c.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Optimiza el presupuesto de esta campaña:

Campaña actual:
- Nombre: ${campaign?.name}
- Plataformas: ${campaign?.platforms?.join(', ')}
- Presupuesto actual: $${campaign?.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0}
- Objetivo: ${campaign?.type}

Campañas históricas:
${historicalCampaigns.slice(0, 10).map(c => `- ${c.name}: Presupuesto $${c.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0}, 
   Impresiones: ${c.metrics?.impressions || 0}, Clicks: ${c.metrics?.clicks || 0}, Leads: ${c.metrics?.leads || 0}`).join('\n')}

Sugiere:
1. Presupuesto optimizado total
2. Límite diario recomendado
3. Resultados esperados (impresiones, clicks, leads)
4. Razonamiento

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de campañas publicitarias.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            suggestedBudget: result.suggestedBudget || campaign?.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0,
            dailyLimit: result.dailyLimit || (result.suggestedBudget / 30),
            reasoning: result.reasoning || '',
            expectedResults: {
                impressions: result.expectedResults?.impressions || 0,
                clicks: result.expectedResults?.clicks || 0,
                leads: result.expectedResults?.leads || 0,
            },
        };
    }
    catch (error) {
        console.error('Error optimizing campaign budget:', error);
        return null;
    }
}
/**
 * Sugiere audiencias objetivo para campañas
 */
async function suggestTargetAudience(tenantId, campaignType, apiKey) {
    try {
        const sales = await getTenantSales(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Sugiere audiencia objetivo para una campaña de tipo: ${campaignType}

Datos de ventas históricas:
${completedSales.slice(0, 20).map(s => `- Cliente: ${s.buyer?.fullName || 'N/A'}, Vehículo: ${s.vehicle?.make} ${s.vehicle?.model}`).join('\n')}

Sugiere:
1. Rango de edad
2. Géneros
3. Ubicaciones
4. Intereses

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en segmentación de audiencias para marketing.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            demographics: result.demographics || {
                ageRange: { min: 25, max: 55 },
                genders: ['all'],
                locations: [],
                interests: [],
            },
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error suggesting target audience:', error);
        return null;
    }
}
/**
 * Optimiza horarios de publicación para campañas
 */
async function optimizePostingSchedule(tenantId, platform, apiKey) {
    try {
        const campaigns = await (0, core_2.getCampaigns)(tenantId);
        const completedCampaigns = campaigns.filter(c => c.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Optimiza horarios de publicación para ${platform}:

Campañas históricas:
${completedCampaigns.slice(0, 10).map(c => `- ${c.name}: Horarios ${c.schedule?.times?.join(', ') || 'N/A'}, 
   Métricas: Impresiones ${c.metrics?.impressions || 0}, Clicks ${c.metrics?.clicks || 0}`).join('\n')}

Sugiere los mejores horarios para publicar.
Responde en formato JSON con optimalTimes (array) y reasoning:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de horarios de publicación en redes sociales.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            optimalTimes: result.optimalTimes || ['09:00', '13:00', '18:00'],
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error optimizing posting schedule:', error);
        return null;
    }
}
//# sourceMappingURL=campaign-optimization.js.map