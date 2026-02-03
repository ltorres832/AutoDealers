"use strict";
// Automatización avanzada con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoEscalateCriticalLeads = autoEscalateCriticalLeads;
exports.autoAssignLeadsToSellers = autoAssignLeadsToSellers;
exports.autoScheduleFollowups = autoScheduleFollowups;
exports.detectPurchaseIntent = detectPurchaseIntent;
const core_1 = require("@autodealers/core");
const crm_1 = require("@autodealers/crm");
const core_2 = require("@autodealers/core");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Escala automáticamente leads críticos
 */
async function autoEscalateCriticalLeads(tenantId, apiKey) {
    try {
        const leads = await (0, crm_1.getLeads)(tenantId);
        const activeLeads = leads.filter(l => l.status === 'active' || l.status === 'new');
        const openai = new openai_1.default({ apiKey });
        const prompt = `Identifica leads críticos que necesitan escalación:

Leads activos: ${activeLeads.length}

Leads:
${activeLeads.slice(0, 20).map(l => `- ID: ${l.id}, Estado: ${l.status}, Fuente: ${l.source}, 
   Interacciones: ${l.interactions?.length || 0}, 
   Última interacción: ${l.interactions?.[l.interactions.length - 1]?.content || 'Ninguna'}`).join('\n')}

Identifica leads que:
1. Tienen alta probabilidad de conversión pero no han recibido atención reciente
2. Muestran señales de urgencia
3. Son de alto valor potencial
4. Requieren seguimiento inmediato

Responde en formato JSON con escalatedLeads (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en identificación de leads críticos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            escalatedLeads: (result.escalatedLeads || []).filter((el) => activeLeads.some(l => l.id === el.leadId)),
        };
    }
    catch (error) {
        console.error('Error auto-escalating leads:', error);
        return null;
    }
}
/**
 * Asigna automáticamente leads a vendedores
 */
async function autoAssignLeadsToSellers(tenantId, leadId, apiKey) {
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
        const users = await (0, core_2.getUsersByTenant)(tenantId);
        const sellers = users.filter(u => u.role === 'seller' && u.status === 'active');
        if (sellers.length === 0) {
            return null;
        }
        const sales = await getTenantSales(tenantId);
        const sellerPerformance = sellers.map(seller => {
            const sellerSales = sales.filter(s => s.sellerId === seller.id && s.status === 'completed');
            return {
                sellerId: seller.id,
                name: seller.name,
                salesCount: sellerSales.length,
                revenue: sellerSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0),
            };
        });
        const openai = new openai_1.default({ apiKey });
        const prompt = `Asigna este lead al vendedor más adecuado:

Lead:
- Estado: ${leadData?.status}
- Fuente: ${leadData?.source}
- Interacciones: ${leadData?.interactions?.length || 0}
- Vehículos de interés: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Vendedores disponibles:
${sellerPerformance.map(sp => `- ${sp.name} (ID: ${sp.sellerId}): ${sp.salesCount} ventas, $${sp.revenue} revenue`).join('\n')}

Recomienda el vendedor más adecuado basado en:
1. Experiencia con tipos similares de leads
2. Carga de trabajo actual
3. Especialización
4. Rendimiento histórico

Responde en formato JSON con recommendedSellerId, reasoning, y matchScore (0-100):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en asignación de leads a vendedores.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        const recommendedSellerId = result.recommendedSellerId;
        if (!sellers.some(s => s.id === recommendedSellerId)) {
            // Si el ID sugerido no existe, usar el mejor vendedor por rendimiento
            const bestSeller = sellerPerformance.sort((a, b) => b.salesCount - a.salesCount)[0];
            return {
                recommendedSellerId: bestSeller.sellerId,
                reasoning: result.reasoning || 'Asignado al vendedor con mejor rendimiento',
                matchScore: result.matchScore || 70,
            };
        }
        return {
            recommendedSellerId,
            reasoning: result.reasoning || '',
            matchScore: result.matchScore || 70,
        };
    }
    catch (error) {
        console.error('Error auto-assigning lead:', error);
        return null;
    }
}
/**
 * Programa automáticamente seguimientos
 */
async function autoScheduleFollowups(tenantId, leadId, apiKey) {
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
        const openai = new openai_1.default({ apiKey });
        const prompt = `Programa seguimientos automáticos para este lead:

Lead:
- Estado: ${leadData?.status}
- Fuente: ${leadData?.source}
- Última interacción: ${interactions[interactions.length - 1]?.content || 'Ninguna'}
- Vehículos de interés: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Historial de interacciones:
${interactions.slice(-5).map((i) => `${i.type}: ${i.content} (${i.createdAt || 'Fecha no disponible'})`).join('\n')}

Programa 2-4 seguimientos estratégicos con:
1. Fecha sugerida
2. Tipo de contacto (call/email/whatsapp/visit)
3. Mensaje sugerido
4. Prioridad

Responde en formato JSON con followups (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en programación de seguimientos de ventas.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            followups: result.followups || [],
        };
    }
    catch (error) {
        console.error('Error auto-scheduling followups:', error);
        return null;
    }
}
/**
 * Detecta automáticamente intención de compra
 */
async function detectPurchaseIntent(tenantId, leadId, apiKey) {
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
        const openai = new openai_1.default({ apiKey });
        const prompt = `Detecta la intención de compra de este lead:

Lead:
- Estado: ${leadData?.status}
- Fuente: ${leadData?.source}
- Vehículos de interés: ${leadData?.interestedVehicles?.join(', ') || 'Ninguno'}

Interacciones:
${interactions.map((i) => i.content).join('\n')}

Analiza:
1. Nivel de intención de compra (0-100)
2. Señales de intención (palabras clave, preguntas, comportamiento)
3. Acción recomendada

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en detección de intención de compra.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        const intentScore = result.intentScore || 50;
        const intentLevel = intentScore >= 70 ? 'high' : intentScore >= 40 ? 'medium' : 'low';
        return {
            intentScore,
            intentLevel,
            signals: result.signals || [],
            recommendedAction: result.recommendedAction || '',
        };
    }
    catch (error) {
        console.error('Error detecting purchase intent:', error);
        return null;
    }
}
//# sourceMappingURL=advanced-automation.js.map