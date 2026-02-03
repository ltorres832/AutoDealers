// Optimización de inventario con IA

import { getFirestore } from '@autodealers/core';
import { getVehicles } from '@autodealers/inventory';
import { getTenantSales } from '@autodealers/crm';
import OpenAI from 'openai';

const db = getFirestore();

/**
 * Sugiere qué vehículos comprar
 */
export async function suggestVehiclesToPurchase(
  tenantId: string,
  apiKey: string
): Promise<{
  suggestions: Array<{
    make: string;
    model: string;
    year: number;
    priceRange: { min: number; max: number };
    reasoning: string;
    expectedROI: number; // porcentaje
  }>;
} | null> {
  try {
    const sales = await getTenantSales(tenantId);
    const completedSales = sales.filter(s => s.status === 'completed');
    const vehicles = await getVehicles(tenantId);
    const soldVehicles = vehicles.filter(v => v.status === 'sold');

    const openai = new OpenAI({ apiKey });

    const prompt = `Sugiere qué vehículos comprar basado en estos datos:

Ventas completadas: ${completedSales.length}
Vehículos vendidos: ${soldVehicles.length}

Vehículos más vendidos:
${completedSales.slice(0, 20).map((s: any) => 
  `${s.vehicle?.make || 'N/A'} ${s.vehicle?.model || 'N/A'} ${s.vehicle?.year || 'N/A'} - Vendido por $${s.salePrice || s.total || 0}`
).join('\n')}

Inventario actual:
${vehicles.filter(v => v.status === 'available').slice(0, 10).map(v => 
  `${v.make} ${v.model} ${v.year} - $${v.price}`
).join('\n')}

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
  } catch (error) {
    console.error('Error suggesting vehicles to purchase:', error);
    return null;
  }
}

/**
 * Analiza rentabilidad por vehículo
 */
export async function analyzeVehicleProfitability(
  tenantId: string,
  vehicleId: string,
  apiKey: string
): Promise<{
  profitabilityScore: number; // 0-100
  profitMargin: number; // porcentaje
  daysToBreakEven: number;
  recommendations: string[];
} | null> {
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
    const sales = await getTenantSales(tenantId);
    const similarSales = sales.filter(s => 
      (s as any).vehicle?.make === vehicle?.make && 
      (s as any).vehicle?.model === vehicle?.model &&
      s.status === 'completed'
    );

    const openai = new OpenAI({ apiKey });

    const prompt = `Analiza la rentabilidad de este vehículo:

Vehículo:
- ${vehicle?.year} ${vehicle?.make} ${vehicle?.model}
- Precio: $${vehicle?.price}
- Días en inventario: ${Math.floor((Date.now() - (vehicle?.createdAt?.toDate?.()?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))}

Ventas similares:
${similarSales.slice(0, 10).map(s => 
  `Vendido por $${s.salePrice || s.total || 0}`
).join('\n')}

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
  } catch (error) {
    console.error('Error analyzing vehicle profitability:', error);
    return null;
  }
}

/**
 * Optimiza el mix de inventario
 */
export async function optimizeInventoryMix(
  tenantId: string,
  apiKey: string
): Promise<{
  optimalMix: Array<{
    category: string; // 'luxury', 'mid-range', 'economy', etc.
    percentage: number; // 0-100
    reasoning: string;
  }>;
  currentMix: Array<{
    category: string;
    percentage: number;
  }>;
  recommendations: string[];
} | null> {
  try {
    const vehicles = await getVehicles(tenantId);
    const availableVehicles = vehicles.filter(v => v.status === 'available');
    const sales = await getTenantSales(tenantId);
    const completedSales = sales.filter(s => s.status === 'completed');

    const openai = new OpenAI({ apiKey });

    const prompt = `Optimiza el mix de inventario:

Inventario actual: ${availableVehicles.length} vehículos
Ventas completadas: ${completedSales.length}

Distribución actual por precio:
${availableVehicles.reduce((acc: any, v) => {
  const category = v.price > 50000 ? 'luxury' : v.price > 25000 ? 'mid-range' : 'economy';
  acc[category] = (acc[category] || 0) + 1;
  return acc;
}, {})}

Ventas por categoría:
${completedSales.reduce((acc: any, s) => {
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
  } catch (error) {
    console.error('Error optimizing inventory mix:', error);
    return null;
  }
}

/**
 * Predice demanda estacional
 */
export async function predictSeasonalDemand(
  tenantId: string,
  apiKey: string
): Promise<{
  seasonalTrends: Array<{
    month: string;
    expectedDemand: 'high' | 'medium' | 'low';
    recommendedInventory: number;
    reasoning: string;
  }>;
} | null> {
  try {
    const sales = await getTenantSales(tenantId);
    const completedSales = sales.filter(s => s.status === 'completed');

    const openai = new OpenAI({ apiKey });

    const prompt = `Predice demanda estacional basado en ventas históricas:

Ventas por mes:
${completedSales.reduce((acc: any, s) => {
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
  } catch (error) {
    console.error('Error predicting seasonal demand:', error);
    return null;
  }
}


