"use strict";
// Servicio para publicar posts en Facebook e Instagram usando credenciales del tenant
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialPublisherService = void 0;
const core_1 = require("@autodealers/core");
class SocialPublisherService {
    constructor() {
        this.db = (0, core_1.getFirestore)();
    }
    /**
     * Obtiene las credenciales de integración del tenant
     */
    async getTenantIntegration(tenantId, type) {
        try {
            const integrationSnapshot = await this.db
                .collection('tenants')
                .doc(tenantId)
                .collection('integrations')
                .where('type', '==', type)
                .where('status', '==', 'active')
                .get();
            if (integrationSnapshot.empty) {
                return null;
            }
            const integrationData = integrationSnapshot.docs[0].data();
            const credentials = integrationData.credentials;
            if (!credentials?.accessToken) {
                return null;
            }
            return {
                accessToken: credentials.accessToken,
                pageId: credentials.pageId,
                instagramId: credentials.instagramId,
                pageName: credentials.pageName,
            };
        }
        catch (error) {
            console.error(`Error getting ${type} integration for tenant ${tenantId}:`, error);
            return null;
        }
    }
    /**
     * Publica un post en Facebook
     */
    async publishToFacebook(tenantId, content) {
        try {
            const integration = await this.getTenantIntegration(tenantId, 'facebook');
            if (!integration || !integration.pageId) {
                return {
                    success: false,
                    platform: 'facebook',
                    error: 'Facebook no está conectado o no tiene página configurada',
                };
            }
            // Construir el mensaje con hashtags
            let message = content.text;
            if (content.hashtags && content.hashtags.length > 0) {
                const hashtagsStr = content.hashtags.map((h) => `#${h}`).join(' ');
                message = `${message}\n\n${hashtagsStr}`;
            }
            // Preparar el payload
            const payload = {
                message,
            };
            // Si hay imagen, subirla primero
            if (content.imageUrl) {
                payload.attached_media = [
                    {
                        media_fbid: await this.uploadImageToFacebook(integration.accessToken, integration.pageId, content.imageUrl),
                    },
                ];
            }
            // Publicar en la página
            const response = await fetch(`https://graph.facebook.com/v18.0/${integration.pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${integration.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Error al publicar en Facebook');
            }
            return {
                success: true,
                platform: 'facebook',
                postId: data.id,
                url: `https://www.facebook.com/${data.id}`,
            };
        }
        catch (error) {
            console.error('Error publishing to Facebook:', error);
            return {
                success: false,
                platform: 'facebook',
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }
    /**
     * Publica un post en Instagram
     */
    async publishToInstagram(tenantId, content) {
        try {
            const integration = await this.getTenantIntegration(tenantId, 'instagram');
            if (!integration || !integration.instagramId) {
                return {
                    success: false,
                    platform: 'instagram',
                    error: 'Instagram no está conectado o no tiene cuenta configurada',
                };
            }
            // Instagram requiere una imagen
            if (!content.imageUrl) {
                return {
                    success: false,
                    platform: 'instagram',
                    error: 'Instagram requiere una imagen para publicar',
                };
            }
            // Construir el caption con hashtags
            let caption = content.text;
            if (content.hashtags && content.hashtags.length > 0) {
                const hashtagsStr = content.hashtags.map((h) => `#${h}`).join(' ');
                caption = `${caption}\n\n${hashtagsStr}`;
            }
            // Subir imagen a Instagram
            const imageContainerId = await this.createInstagramImageContainer(integration.accessToken, integration.instagramId, content.imageUrl, caption);
            // Publicar en Instagram
            const response = await fetch(`https://graph.facebook.com/v18.0/${integration.instagramId}/media_publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${integration.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: imageContainerId,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message || 'Error al publicar en Instagram');
            }
            return {
                success: true,
                platform: 'instagram',
                postId: data.id,
                url: `https://www.instagram.com/p/${data.id}/`,
            };
        }
        catch (error) {
            console.error('Error publishing to Instagram:', error);
            return {
                success: false,
                platform: 'instagram',
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }
    /**
     * Sube una imagen a Facebook y retorna el media_fbid
     */
    async uploadImageToFacebook(accessToken, pageId, imageUrl) {
        // Descargar la imagen
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        // Crear form data
        const formData = new FormData();
        formData.append('source', imageBlob);
        formData.append('published', 'false');
        // Subir a Facebook
        const uploadResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
            throw new Error(uploadData.error?.message || 'Error al subir imagen');
        }
        return uploadData.id;
    }
    /**
     * Crea un contenedor de imagen para Instagram
     */
    async createInstagramImageContainer(accessToken, instagramId, imageUrl, caption) {
        const response = await fetch(`https://graph.facebook.com/v18.0/${instagramId}/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: imageUrl,
                caption: caption,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Error al crear contenedor de imagen');
        }
        return data.id;
    }
    /**
     * Publica en múltiples plataformas
     */
    async publishToMultiple(tenantId, content, platforms) {
        const results = [];
        for (const platform of platforms) {
            if (platform === 'facebook') {
                results.push(await this.publishToFacebook(tenantId, content));
            }
            else if (platform === 'instagram') {
                results.push(await this.publishToInstagram(tenantId, content));
            }
        }
        return results;
    }
}
exports.SocialPublisherService = SocialPublisherService;
//# sourceMappingURL=social-publisher.js.map