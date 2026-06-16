// Servicio para publicar posts en Facebook e Instagram usando credenciales del tenant

import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

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

type TenantIntegrationRecord = {
  docId: string;
  accessToken: string;
  pageId?: string;
  instagramId?: string;
  pageName?: string;
  userAccessToken?: string;
};

export class SocialPublisherService {
  private db = getFirestore();

  /**
   * Renueva el token de la página desde Meta (evita tokens viejos o incorrectos).
   */
  /** Token de página desde /me/accounts (método oficial de Meta). */
  private async fetchPageAccessTokenFromAccounts(
    pageId: string,
    userAccessToken: string
  ): Promise<string> {
    const url =
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token` +
      `&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetchGraphWithRetry(url, { method: 'GET' });
    const data = (await res.json()) as {
      data?: Array<{ id?: string; access_token?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data.error?.message || 'No se pudo listar páginas de Meta');
    }
    const page = data.data?.find((p) => String(p.id) === String(pageId));
    if (!page?.access_token?.trim()) {
      throw new Error(
        `No se encontró token para la página ${pageId}. Reconecta Meta y elige la página correcta.`
      );
    }
    return page.access_token.trim();
  }

  private async persistPageAccessToken(
    tenantId: string,
    docId: string,
    pageAccessToken: string
  ): Promise<void> {
    await this.db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .doc(docId)
      .update({
        'credentials.pageAccessToken': pageAccessToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  /**
   * Obtiene credenciales activas del tenant.
   */
  private async getTenantIntegration(
    tenantId: string,
    type: 'facebook' | 'instagram'
  ): Promise<TenantIntegrationRecord | null> {
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

      const doc = integrationSnapshot.docs[0];
      const credentials = doc.data().credentials ?? {};

      const pageAccessToken =
        typeof credentials.pageAccessToken === 'string' && credentials.pageAccessToken.trim()
          ? credentials.pageAccessToken.trim()
          : '';

      const userAccessToken =
        typeof credentials.accessToken === 'string' && credentials.accessToken.trim()
          ? credentials.accessToken.trim()
          : '';

      if (!pageAccessToken && !userAccessToken) {
        console.warn(
          `[social-publisher] Tenant ${tenantId} ${type}: sin tokens; reconectar Meta en Integraciones`
        );
        return null;
      }

      return {
        docId: doc.id,
        accessToken: pageAccessToken || userAccessToken,
        userAccessToken: userAccessToken || undefined,
        pageId: credentials.pageId,
        instagramId: credentials.instagramId,
        pageName: credentials.pageName,
      };
    } catch (error) {
      console.error(`Error getting ${type} integration for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /** Token de página listo para publicar (renovado si hay token de usuario). */
  private async resolvePageAccessToken(
    tenantId: string,
    integration: TenantIntegrationRecord
  ): Promise<string> {
    const pageId = integration.pageId?.trim();
    if (!pageId) {
      throw new Error('Falta pageId de Facebook. Reconecta Meta en Integraciones.');
    }

    if (integration.userAccessToken) {
      try {
        const fresh = await this.fetchPageAccessTokenFromAccounts(
          pageId,
          integration.userAccessToken
        );
        await this.persistPageAccessToken(tenantId, integration.docId, fresh);
        return fresh;
      } catch (e) {
        console.warn('[social-publisher] /me/accounts falló, usando pageAccessToken guardado:', e);
      }
    }

    if (!integration.accessToken?.trim()) {
      throw new Error('Falta token de página. Reconecta Meta en Integraciones.');
    }
    return integration.accessToken.trim();
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
          error:
            'Facebook no está conectado o falta el token de la página. Ve a Integraciones y reconecta Meta.',
        };
      }

      // Construir el mensaje con hashtags
      let message = content.text;
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtagsStr = content.hashtags.map((h) => `#${h}`).join(' ');
        message = `${message}\n\n${hashtagsStr}`;
      }

      const pageId = integration.pageId!.trim();
      const pageToken = await this.resolvePageAccessToken(tenantId, integration);

      if (content.imageUrl) {
        const photoBase =
          `https://graph.facebook.com/v21.0/${pageId}/photos` +
          `?access_token=${encodeURIComponent(pageToken)}`;

        // 1) URL pública + message (sin published=false ni feed+attached_media)
        const urlBody = new URLSearchParams();
        urlBody.set('url', content.imageUrl);
        urlBody.set('message', message);

        let photoResponse = await fetchGraphWithRetry(photoBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: urlBody.toString(),
        });

        let photoData = (await photoResponse.json()) as {
          id?: string;
          post_id?: string;
          error?: { message?: string };
        };

        // 2) Fallback: subir binario (sin campo published)
        if (!photoResponse.ok) {
          const imageBlob = await fetchRemoteImageBlobWithRetry(content.imageUrl);
          const formData = new FormData();
          formData.append('source', imageBlob, 'vehicle.jpg');
          formData.append('message', message);

          photoResponse = await fetchGraphWithRetry(photoBase, {
            method: 'POST',
            body: formData,
          });
          photoData = (await photoResponse.json()) as typeof photoData;
        }

        if (!photoResponse.ok) {
          throw new Error(photoData.error?.message || 'Error al publicar foto en Facebook');
        }

        const postId = photoData.post_id || photoData.id;
        return {
          success: true,
          platform: 'facebook',
          postId,
          url: postId ? `https://www.facebook.com/${postId}` : undefined,
        };
      }

      // Solo texto en el feed de la página
      const feedUrl =
        `https://graph.facebook.com/v21.0/${pageId}/feed` +
        `?access_token=${encodeURIComponent(pageToken)}`;
      const feedBody = new URLSearchParams();
      feedBody.set('message', message);

      const response = await fetchGraphWithRetry(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: feedBody.toString(),
      });

      const data = (await response.json()) as {
        id?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al publicar en Facebook');
      }

      return {
        success: true,
        platform: 'facebook',
        postId: data.id,
        url: data.id ? `https://www.facebook.com/${data.id}` : undefined,
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

      const pageToken = await this.resolvePageAccessToken(tenantId, integration);

      const imageContainerId = await this.createInstagramImageContainer(
        pageToken,
        integration.instagramId!,
        content.imageUrl,
        caption
      );

      const publishBody = new URLSearchParams();
      publishBody.set('access_token', pageToken);
      publishBody.set('creation_id', imageContainerId);

      const response = await fetchGraphWithRetry(
        `https://graph.facebook.com/v18.0/${integration.instagramId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: publishBody.toString(),
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
    const mediaBody = new URLSearchParams();
    mediaBody.set('access_token', accessToken);
    mediaBody.set('image_url', imageUrl);
    mediaBody.set('caption', caption);

    const response = await fetchGraphWithRetry(
      `https://graph.facebook.com/v18.0/${instagramId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: mediaBody.toString(),
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

