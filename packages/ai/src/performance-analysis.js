"use strict";
// Análisis de rendimiento con IA
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSellerPerformance = analyzeSellerPerformance;
exports.identifyBestPractices = identifyBestPractices;
exports.suggestContinuousImprovements = suggestContinuousImprovements;
exports.performAutoBenchmarking = performAutoBenchmarking;
const core_1 = require("@autodealers/core");
const crm_1 = require("@autodealers/crm");
const crm_2 = require("@autodealers/crm");
const inventory_1 = require("@autodealers/inventory");
const core_2 = require("@autodealers/core");
const openai_1 = __importDefault(require("openai"));
const db = (0, core_1.getFirestore)();
/**
 * Analiza rendimiento por vendedor
 */
async function analyzeSellerPerformance(tenantId, sellerId, apiKey) {
    try {
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        if (!sellerDoc.exists) {
            return null;
        }
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const sellerSales = sales.filter(s => s.sellerId === sellerId && s.status === 'completed');
        const allSales = sales.filter(s => s.status === 'completed');
        const users = await (0, core_2.getUsersByTenant)(tenantId);
        const sellers = users.filter(u => u.role === 'seller');
        const sellerPerformance = {
            salesCount: sellerSales.length,
            revenue: sellerSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0),
            averageSalePrice: sellerSales.length > 0
                ? sellerSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0) / sellerSales.length
                : 0,
        };
        const allSellersPerformance = sellers.map(seller => {
            const sSales = sales.filter(s => s.sellerId === seller.id && s.status === 'completed');
            return {
                sellerId: seller.id,
                salesCount: sSales.length,
                revenue: sSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0),
            };
        });
        const averagePerformance = {
            salesCount: allSellersPerformance.reduce((sum, sp) => sum + sp.salesCount, 0) / (sellers.length || 1),
            revenue: allSellersPerformance.reduce((sum, sp) => sum + sp.revenue, 0) / (sellers.length || 1),
        };
        const bestSeller = allSellersPerformance.sort((a, b) => b.revenue - a.revenue)[0];
        const openai = new openai_1.default({ apiKey });
        const prompt = `Analiza el rendimiento de este vendedor:

Vendedor: ${sellerDoc.data()?.name}
Ventas: ${sellerPerformance.salesCount}
Revenue: $${sellerPerformance.revenue}
Precio promedio por venta: $${sellerPerformance.averageSalePrice}

Comparación:
- Promedio del equipo: ${averagePerformance.salesCount} ventas, $${averagePerformance.revenue} revenue
- Mejor vendedor: ${bestSeller?.salesCount || 0} ventas, $${bestSeller?.revenue || 0} revenue

Analiza:
1. Puntuación de rendimiento (0-100)
2. Fortalezas
3. Debilidades
4. Recomendaciones de mejora
5. Comparación vs promedio y vs mejor

Responde en formato JSON:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en análisis de rendimiento de vendedores.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            performanceScore: result.performanceScore || 50,
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            recommendations: result.recommendations || [],
            comparison: {
                vsAverage: result.comparison?.vsAverage || 0,
                vsBest: result.comparison?.vsBest || 0,
            },
        };
    }
    catch (error) {
        console.error('Error analyzing seller performance:', error);
        return null;
    }
}
/**
 * Identifica mejores prácticas
 */
async function identifyBestPractices(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const leads = await (0, crm_2.getLeads)(tenantId);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Identifica mejores prácticas basado en estos datos:

Ventas completadas: ${completedSales.length}
Leads totales: ${leads.length}
Tasa de conversión: ${leads.length > 0 ? (completedSales.length / leads.length * 100).toFixed(2) : 0}%

Ventas más exitosas:
${completedSales.slice(0, 10).map(s => `- ${s.vehicle?.make} ${s.vehicle?.model} vendido por $${s.salePrice || s.total || 0}`).join('\n')}

Identifica:
1. Prácticas que llevan al éxito
2. Impacto de cada práctica (high/medium/low)
3. Evidencia de cada práctica
4. Recomendaciones

Responde en formato JSON con practices (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en identificación de mejores prácticas de ventas.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            practices: result.practices || [],
        };
    }
    catch (error) {
        console.error('Error identifying best practices:', error);
        return null;
    }
}
/**
 * Sugiere mejoras continuas
 */
async function suggestContinuousImprovements(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const leads = await (0, crm_2.getLeads)(tenantId);
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Sugiere mejoras continuas basado en estos datos:

Métricas actuales:
- Ventas: ${completedSales.length}
- Leads: ${leads.length}
- Tasa de conversión: ${leads.length > 0 ? (completedSales.length / leads.length * 100).toFixed(2) : 0}%
- Inventario: ${vehicles.length}
- Vehículos disponibles: ${vehicles.filter(v => v.status === 'available').length}

Áreas de mejora identificadas:
1. Conversión de leads
2. Gestión de inventario
3. Procesos de venta
4. Seguimiento de clientes

Sugiere mejoras específicas con:
1. Área de mejora
2. Estado actual
3. Estado objetivo
4. Acciones específicas
5. Impacto esperado
6. Prioridad (1-10)

Responde en formato JSON con improvements (array):`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en mejora continua y optimización de procesos.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.4,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            improvements: result.improvements || [],
        };
    }
    catch (error) {
        console.error('Error suggesting improvements:', error);
        return null;
    }
}
/**
 * Benchmarking automático
 */
async function performAutoBenchmarking(tenantId, apiKey) {
    try {
        const sales = await (0, crm_1.getTenantSales)(tenantId);
        const completedSales = sales.filter(s => s.status === 'completed');
        const leads = await (0, crm_2.getLeads)(tenantId);
        const vehicles = await (0, inventory_1.getVehicles)(tenantId);
        const openai = new openai_1.default({ apiKey });
        const prompt = `Realiza benchmarking automático:

Métricas actuales:
- Tasa de conversión: ${leads.length > 0 ? (completedSales.length / leads.length * 100).toFixed(2) : 0}%
- Revenue promedio por venta: ${completedSales.length > 0
            ? (completedSales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0) / completedSales.length).toFixed(2)
            : 0}
- Días promedio en inventario: ${vehicles.length > 0
            ? Math.floor(vehicles.reduce((sum, v) => {
                const days = Math.floor((Date.now() - (v.createdAt instanceof Date ? v.createdAt.getTime() : new Date(v.createdAt).getTime())) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0) / vehicles.length)
            : 0}

Compara con promedios de la industria y calcula percentiles.
Responde en formato JSON con benchmarks (array), overallScore, y recommendations:`;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en benchmarking y análisis comparativo de la industria.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content || '{}';
        const result = JSON.parse(content);
        return {
            benchmarks: result.benchmarks || [],
            overallScore: result.overallScore || 50,
            recommendations: result.recommendations || [],
        };
    }
    catch (error) {
        console.error('Error performing benchmarking:', error);
        return null;
    }
}
//# sourceMappingURL=performance-analysis.js.map