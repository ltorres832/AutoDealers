export interface PostContent {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    hashtags?: string[];
}
export interface PublishResult {
    success: boolean;
    postId?: string;
    platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube';
    error?: string;
    url?: string;
}
export declare class SocialPublisherService {
    private db;
    /**
     * Obtiene las credenciales de integración del tenant
     */
    private getTenantIntegration;
    /**
     * Publica un post en Facebook
     */
    publishToFacebook(tenantId: string, content: PostContent): Promise<PublishResult>;
    /**
     * Publica un post en Instagram
     */
    publishToInstagram(tenantId: string, content: PostContent): Promise<PublishResult>;
    /**
     * Sube una imagen a Facebook y retorna el media_fbid
     */
    private uploadImageToFacebook;
    /**
     * Crea un contenedor de imagen para Instagram
     */
    private createInstagramImageContainer;
    /**
     * Publica en múltiples plataformas
     */
    publishToMultiple(tenantId: string, content: PostContent, platforms: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[]): Promise<PublishResult[]>;
    publishToTikTok(tenantId: string, content: PostContent): Promise<PublishResult>;
    publishToYouTube(tenantId: string, content: PostContent): Promise<PublishResult>;
}
