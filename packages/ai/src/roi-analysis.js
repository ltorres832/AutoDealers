"use strict";
// Análisis de ROI con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCampaignROI = calculateCampaignROI;
exports.analyzeCostPerLead = analyzeCostPerLead;
exports.optimizeMarketingInvestment = optimizeMarketingInvestment;
exports.predictROI = predictROI;
const core_1 = require("@autodealers/core");
const core_2 = require("@autodealers/core");
const crm_1 = require("@autodealers/crm");
const crm_2 = require("@autodealers/crm");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Calcula ROI de una campaña
 */
async function calculateCampaignROI(tenantId, campaignId, apiKey) {
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
        const totalSpent = campaign?.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
        const leadsGenerated = campaign?.metrics?.leads || 0;
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const campaignSales = sales.filter((s) => s.source === campaign?.name ||
            s.metadata?.campaignId === campaignId);
        const totalRevenue = campaignSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0);
        const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
        const costPerLead = leadsGenerated > 0 ? totalSpent / leadsGenerated : 0;
        const costPerSale = campaignSales.length > 0 ? totalSpent / campaignSales.length : 0;
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza el ROI de esta campaña y proporciona recomendaciones:

Campaña: ${campaign?.name}
Gastado: $${totalSpent}
Revenue generado: $${totalRevenue}
ROI: ${roi.toFixed(2)}%
Leads generados: ${leadsGenerated}
Costo por lead: $${costPerLead.toFixed(2)}
Costo por venta: $${costPerSale.toFixed(2)}
Ventas: ${campaignSales.length}

Proporciona recomendaciones para mejorar el ROI.
Responde en formato JSON con recommendations (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de ROI de campañas publicitarias.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            roi,
            totalSpent,
            totalRevenue,
            leadsGenerated,
            costPerLead,
            costPerSale,
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error calculating campaign ROI:', error);
        return null;
    }
}
/**
 * Analiza costo por lead
 */
async function analyzeCostPerLead(tenantId, apiKey) {
    try {
        const campaigns = await (0, core_2.getCampaigns)(tenantId);
        const leads = await (0, crm_2.getLeads)(tenantId);
        const sourceCosts = {};
        campaigns.forEach(campaign => {
            const campaignCost = campaign.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
            const campaignLeads = campaign.metrics?.leads || 0;
            const source = campaign.name;
            if (!sourceCosts[source]) {
                sourceCosts[source] = { cost: 0, leads: 0 };
            }
            sourceCosts[source].cost += campaignCost;
            sourceCosts[source].leads += campaignLeads;
        });
        const totalCost = Object.values(sourceCosts).reduce((sum, sc) => sum + sc.cost, 0);
        const totalLeads = leads.length;
        const averageCostPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza el costo por lead:

Costo promedio por lead: $${averageCostPerLead.toFixed(2)}
Total de leads: ${totalLeads}

Costo por fuente:
${Object.entries(sourceCosts).map(([source, data]) => `- ${source}: $${data.cost}, ${data.leads} leads, CPL: $${data.leads > 0 ? (data.cost / data.leads).toFixed(2) : 0}`).join('\n')}

Proporciona recomendaciones para optimizar el costo por lead.
Responde en formato JSON con recommendations (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de costo por lead.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            averageCostPerLead,
            costBySource: Object.entries(sourceCosts).map(([source, data]) => ({
                source,
                cost: data.cost,
                leads: data.leads,
            })),
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error analyzing cost per lead:', error);
        return null;
    }
}
/**
 * Optimiza inversión en marketing
 */
async function optimizeMarketingInvestment(tenantId, apiKey) {
    try {
        const campaigns = await (0, core_2.getCampaigns)(tenantId);
        const completedCampaigns = campaigns.filter(c => c.status === 'completed');
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Optimiza la inversión en marketing:

Campañas completadas: ${completedCampaigns.length}
ROI promedio: ${completedCampaigns.length > 0
            ? completedCampaigns.reduce((sum, c) => {
                const cost = c.budgets?.reduce((s, b) => s + b.amount, 0) || 0;
                const revenue = c.metrics?.leads ? c.metrics.leads * 1000 : 0; // Estimación
                return sum + (cost > 0 ? ((revenue - cost) / cost) * 100 : 0);
            }, 0) / completedCampaigns.length
            : 0}%

Campañas por plataforma:
${completedCampaigns.reduce((acc, c) => {
            c.platforms?.forEach((p) => {
                acc[p] = (acc[p] || 0) + 1;
            });
            return acc;
        }, {})}

Sugiere:
1. Presupuesto total recomendado
2. Distribución por canal (% y $)
3. ROI esperado por canal
4. Razonamiento

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en optimización de inversión en marketing.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            recommendedBudget: result.recommendedBudget || 1000,
            allocation: result.allocation || [],
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error optimizing marketing investment:', error);
        return null;
    }
}
/**
 * Predice retorno de inversión
 */
async function predictROI(tenantId, investmentAmount, channel, apiKey) {
    try {
        const campaigns = await (0, core_2.getCampaigns)(tenantId);
        const channelCampaigns = campaigns.filter(c => c.platforms?.includes(channel) && c.status === 'completed');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Predice el ROI de una inversión:

Inversión propuesta: $${investmentAmount}
Canal: ${channel}

Campañas históricas en este canal:
${channelCampaigns.slice(0, 10).map(c => `- ${c.name}: Presupuesto $${c.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0}, 
   Leads: ${c.metrics?.leads || 0}, ROI estimado: ${c.budgets && c.budgets.length > 0
            ? (((c.metrics?.leads || 0) * 1000 - (c.budgets.reduce((sum, b) => sum + b.amount, 0))) /
                c.budgets.reduce((sum, b) => sum + b.amount, 0) * 100).toFixed(2)
            : 0}%`).join('\n')}

Predice:
1. ROI esperado (%)
2. Revenue esperado
3. Leads esperados
4. Nivel de confianza (0-1)
5. Razonamiento

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en predicción de ROI de inversiones en marketing.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            predictedROI: result.predictedROI || 0,
            expectedRevenue: result.expectedRevenue || 0,
            expectedLeads: result.expectedLeads || 0,
            confidence: result.confidence || 0.5,
            reasoning: result.reasoning || '',
        };
    }
    catch (error) {
        console.error('Error predicting ROI:', error);
        return null;
    }
}
//# sourceMappingURL=roi-analysis.js.map