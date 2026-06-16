"use strict";
// IA para generar contenido de redes sociales automáticamente
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSocialPost = generateSocialPost;
exports.analyzeVehicleForSocial = analyzeVehicleForSocial;
/**
 * Genera contenido de post usando IA basado en vehículo y perfil de cliente
 */
async function generateSocialPost(vehicle, customerProfile, objective = 'more_messages') {
    try {
        // Llamar a la API de IA para generar contenido
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/generate-social-post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicle,
                customerProfile,
                objective,
            }),
        });
        if (!response.ok) {
            throw new Error('Error al generar contenido con IA');
        }
        const data = await response.json();
        return data.post;
    }
    catch (error) {
        console.error('Error generating social post:', error);
        // Fallback a contenido generado básico
        return generateFallbackPost(vehicle, objective);
    }
}
/**
 * Genera contenido básico como fallback
 */
function generateFallbackPost(vehicle, objective) {
    const priceFormatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(vehicle.price);
    const baseText = `${vehicle.year} ${vehicle.make} ${vehicle.model}\n\nPrecio: ${priceFormatted}\n\n${vehicle.condition === 'new' ? 'Nuevo' : vehicle.condition === 'certified' ? 'Certificado' : 'Usado'}`;
    const cta = objective === 'more_messages'
        ? '💬 Envíame un mensaje para más información'
        : '👀 Visita nuestro inventario para ver más opciones';
    const hashtags = [
        vehicle.make.toLowerCase(),
        vehicle.model.toLowerCase(),
        'autos',
        'vehiculos',
        vehicle.condition === 'new' ? 'nuevo' : 'usado',
        vehicle.year.toString(),
    ];
    return {
        text: `${baseText}\n\n${cta}`,
        hashtags,
        cta,
        optimizedFor: {
            facebook: {
                text: `${baseText}\n\n${cta}`,
                hashtags: hashtags.slice(0, 5),
            },
            instagram: {
                text: baseText,
                hashtags: hashtags,
                caption: `${baseText}\n\n${cta}\n\n${hashtags.map(h => `#${h}`).join(' ')}`,
            },
        },
    };
}
/**
 * Analiza vehículo y genera sugerencias de contenido
 */
async function analyzeVehicleForSocial(vehicle) {
    // Análisis básico basado en características del vehículo
    const isPremium = vehicle.price > 500000;
    const isBudget = vehicle.price < 200000;
    const isFamily = vehicle.model.toLowerCase().includes('suv') ||
        vehicle.model.toLowerCase().includes('van');
    return {
        bestTimeToPost: ['09:00', '12:00', '18:00', '20:00'],
        suggestedFormats: isPremium
            ? ['single_image', 'carousel', 'video']
            : ['single_image', 'carousel'],
        targetAudience: isPremium
            ? ['luxury_buyers', 'professionals']
            : isBudget
                ? ['first_time_buyers', 'students']
                : isFamily
                    ? ['families', 'parents']
                    : ['general'],
    };
}
