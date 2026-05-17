// Servicio para publicar posts en Facebook e Instagram usando credenciales del tenant

import { getFirestore } from '@autodealers/shared';

const GRAPH_RETRIES = 3;
const GRAPH_BASE_DELAY_MS = 1200;

/** Descarga de URL pública (p. ej. Firebase Storage) hacia el servidor antes de subir a Graph. */
const REMOTE_IMAGE_RETRIES = 3;
const REMOTE_IMAGE_BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function remoteImageFetchRetryable(status: number): boolean {
  return (
    status === 429 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

/**
 * Descarga bytes de una URL de imagen con reintentos (red intermitente, 5xx del CDN, 429).
 */
async function fetchRemoteImageBlobWithRetry(imageUrl: string): Promise<Blob> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < REMOTE_IMAGE_RETRIES; attempt++) {
    try {
      const res = await fetch(imageUrl, { redirect: 'follow' });
      if (res.ok) {
        return await res.blob();
      }
      const msg = `No se pudo descargar la imagen (${res.status} ${res.statusText || ''})`.trim();
      lastError = new Error(msg);
      if (!remoteImageFetchRetryable(res.status) || attempt === REMOTE_IMAGE_RETRIES - 1) {
        throw lastError;
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('No se pudo descargar')) {
        throw e;
      }
      lastError = e instanceof Error ? e : new Error('Error de red al descargar la imagen');
      if (attempt === REMOTE_IMAGE_RETRIES - 1) {
        throw lastError;
      }
    }
    await sleep(REMOTE_IMAGE_BASE_DELAY_MS * Math.pow(2, attempt));
  }
  throw lastError ?? new Error('Error al descargar la imagen');
}

function graphResponseRetryable(status: number, body: { error?: { code?: number } }): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 408) return true;
  const c = body?.error?.code;
  if (typeof c === 'number' && (c === 4 || c === 17 || c === 32 || c === 613 || c === 80001 || c === 80003)) return true;
  return false;
}

async function fetchGraphWithRetry(url: string, init: RequestInit): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < GRAPH_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      if (attempt === GRAPH_RETRIES - 1) {
        throw new Error('Error de red al contactar Graph API');
      }
      await sleep(GRAPH_BASE_DELAY_MS * (attempt + 1));
      continue;
    }
    last = res;
    if (res.ok) return res;
    let body: { error?: { code?: number; message?: string } } = {};
    try {
      body = (await res.clone().json()) as { error?: { code?: number; message?: string } };
    } catch {
      /* ignore */
    }
    if (!graphResponseRetryable(res.status, body) || attempt === GRAPH_RETRIES - 1) {
      return res;
    }
    await sleep(GRAPH_BASE_DELAY_MS * Math.pow(2, attempt));
  }
  return last!;
}

export interface PostContent {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string[];
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  platform: 'facebook' | 'instagram';
  error?: string;
  url?: string;
}

export class SocialPublisherService {
  private db = getFirestore();

  /**
   * Obtiene las credenciales de integración del tenant
   */
  private async getTenantIntegration(
    tenantId: string,
    type: 'facebook' | 'instagram'
  ): Promise<{
    accessToken: string;
    pageId?: string;
    instagramId?: string;
    pageName?: string;
  } | null> {
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

      const accessToken =
        typeof credentials?.pageAccessToken === 'string' && credentials.pageAccessToken.trim()
          ? credentials.pageAccessToken.trim()
          : typeof credentials?.accessToken === 'string' && credentials.accessToken.trim()
            ? credentials.accessToken.trim()
            : '';

      if (!accessToken) {
        return null;
      }

      return {
        accessToken,
        pageId: credentials.pageId,
        instagramId: credentials.instagramId,
        pageName: credentials.pageName,
      };
    } catch (error) {
      console.error(`Error getting ${type} integration for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Publica un post en Facebook
   */
  async publishToFacebook(
    tenantId: string,
    content: PostContent
  ): Promise<PublishResult> {
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
      const payload: any = {
        message,
      };

      // Si hay imagen, subirla primero
      if (content.imageUrl) {
        payload.attached_media = [
          {
            media_fbid: await this.uploadImageToFacebook(
              integration.accessToken,
              integration.pageId,
              content.imageUrl
            ),
          },
        ];
      }

      // Publicar en la página
      const response = await fetchGraphWithRetry(
        `https://graph.facebook.com/v18.0/${integration.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al publicar en Facebook');
      }

      return {
        success: true,
        platform: 'facebook',
        postId: data.id,
        url: `https://www.facebook.com/${data.id}`,
      };
    } catch (error) {
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
  async publishToInstagram(
    tenantId: string,
    content: PostContent
  ): Promise<PublishResult> {
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
      const imageContainerId = await this.createInstagramImageContainer(
        integration.accessToken,
        integration.instagramId,
        content.imageUrl,
        caption
      );

      // Publicar en Instagram
      const response = await fetchGraphWithRetry(
        `https://graph.facebook.com/v18.0/${integration.instagramId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: imageContainerId,
          }),
        }
      );

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al publicar en Instagram');
      }

      return {
        success: true,
        platform: 'instagram',
        postId: data.id,
        url: `https://www.instagram.com/p/${data.id}/`,
      };
    } catch (error) {
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
  private async uploadImageToFacebook(
    accessToken: string,
    pageId: string,
    imageUrl: string
  ): Promise<string> {
    const imageBlob = await fetchRemoteImageBlobWithRetry(imageUrl);

    // Crear form data
    const formData = new FormData();
    formData.append('source', imageBlob);
    formData.append('published', 'false');

    // Subir a Facebook
    const uploadResponse = await fetchGraphWithRetry(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const uploadData = await uploadResponse.json() as any;

    if (!uploadResponse.ok) {
      throw new Error(uploadData.error?.message || 'Error al subir imagen');
    }

    return uploadData.id;
  }

  /**
   * Crea un contenedor de imagen para Instagram
   */
  private async createInstagramImageContainer(
    accessToken: string,
    instagramId: string,
    imageUrl: string,
    caption: string
  ): Promise<string> {
    const response = await fetchGraphWithRetry(
      `https://graph.facebook.com/v18.0/${instagramId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
        }),
      }
    );

    const data = await response.json() as any;

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al crear contenedor de imagen');
    }

    return data.id;
  }

  /**
   * Publica en múltiples plataformas
   */
  async publishToMultiple(
    tenantId: string,
    content: PostContent,
    platforms: ('facebook' | 'instagram')[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const platform of platforms) {
      if (platform === 'facebook') {
        results.push(await this.publishToFacebook(tenantId, content));
      } else if (platform === 'instagram') {
        results.push(await this.publishToInstagram(tenantId, content));
      }
    }

    return results;
  }
}

