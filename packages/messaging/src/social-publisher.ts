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
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube';
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

type VideoIntegrationRecord = {
  docId: string;
  accessToken: string;
  refreshToken?: string;
  openId?: string;
  channelId?: string;
  pageName?: string;
  expiresAtMs?: number;
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

  /** Publica una foto en la página de Facebook. Devuelve el postId. */
  private async publishFacebookPhoto(
    pageId: string,
    pageToken: string,
    imageUrl: string,
    message: string
  ): Promise<string | undefined> {
    const photoBase =
      `https://graph.facebook.com/v21.0/${pageId}/photos` +
      `?access_token=${encodeURIComponent(pageToken)}`;

    // 1) URL pública + message (sin published=false ni feed+attached_media)
    const urlBody = new URLSearchParams();
    urlBody.set('url', imageUrl);
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
      const imageBlob = await fetchRemoteImageBlobWithRetry(imageUrl);
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

    return photoData.post_id || photoData.id;
  }

  /** Publica un video en la página de Facebook usando file_url. Devuelve el videoId. */
  private async publishFacebookVideo(
    pageId: string,
    pageToken: string,
    videoUrl: string,
    message: string
  ): Promise<string | undefined> {
    const body = new URLSearchParams();
    body.set('access_token', pageToken);
    body.set('file_url', videoUrl);
    body.set('description', message);

    const response = await fetchGraphWithRetry(
      `https://graph.facebook.com/v21.0/${pageId}/videos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    );

    const data = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(data.error?.message || 'Error al publicar video en Facebook');
    }
    return data.id;
  }

  /**
   * Publica un post en Facebook.
   * Con imageUrl publica foto; con videoUrl publica video; con ambos publica dos posts.
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

      const imageUrl = content.imageUrl?.trim();
      const videoUrl = content.videoUrl?.trim();

      if (!imageUrl && !videoUrl) {
        return {
          success: false,
          platform: 'facebook',
          error:
            'Facebook requiere una imagen o un video para publicar. Agrega la foto del vehículo, tu perfil o genera un video.',
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

      const errors: string[] = [];
      let postId: string | undefined;

      if (videoUrl) {
        try {
          postId = await this.publishFacebookVideo(pageId, pageToken, videoUrl, message);
        } catch (e) {
          errors.push(`video: ${e instanceof Error ? e.message : 'error desconocido'}`);
        }
      }

      if (imageUrl) {
        try {
          const photoPostId = await this.publishFacebookPhoto(pageId, pageToken, imageUrl, message);
          postId = postId ?? photoPostId;
        } catch (e) {
          errors.push(`foto: ${e instanceof Error ? e.message : 'error desconocido'}`);
        }
      }

      if (!postId) {
        throw new Error(errors.join(' · ') || 'Error al publicar en Facebook');
      }

      return {
        success: true,
        platform: 'facebook',
        postId,
        url: `https://www.facebook.com/${postId}`,
        ...(errors.length > 0 ? { error: `Publicado parcialmente (${errors.join(' · ')})` } : {}),
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

  /** Publica un contenedor de Instagram ya listo (media_publish). Devuelve el mediaId. */
  private async publishInstagramContainer(
    accessToken: string,
    instagramId: string,
    containerId: string
  ): Promise<string> {
    const publishBody = new URLSearchParams();
    publishBody.set('access_token', accessToken);
    publishBody.set('creation_id', containerId);

    const response = await fetchGraphWithRetry(
      `https://graph.facebook.com/v18.0/${instagramId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString(),
      }
    );

    const data = (await response.json()) as { id?: string; error?: { message?: string } };
    if (!response.ok || !data.id) {
      throw new Error(data.error?.message || 'Error al publicar en Instagram');
    }
    return data.id;
  }

  /** Publica una imagen en Instagram. Devuelve el mediaId. */
  private async publishInstagramImage(
    accessToken: string,
    instagramId: string,
    imageUrl: string,
    caption: string
  ): Promise<string> {
    const containerId = await this.createInstagramImageContainer(
      accessToken,
      instagramId,
      imageUrl,
      caption
    );
    return this.publishInstagramContainer(accessToken, instagramId, containerId);
  }

  /** Publica un video como Reel en Instagram (crea contenedor, espera procesamiento y publica). */
  private async publishInstagramReel(
    accessToken: string,
    instagramId: string,
    videoUrl: string,
    caption: string
  ): Promise<string> {
    const mediaBody = new URLSearchParams();
    mediaBody.set('access_token', accessToken);
    mediaBody.set('media_type', 'REELS');
    mediaBody.set('video_url', videoUrl);
    mediaBody.set('caption', caption);

    const createRes = await fetchGraphWithRetry(
      `https://graph.facebook.com/v18.0/${instagramId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: mediaBody.toString(),
      }
    );
    const createData = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!createRes.ok || !createData.id) {
      throw new Error(createData.error?.message || 'Error al crear contenedor de video en Instagram');
    }

    // Instagram procesa el video de forma asíncrona: esperar hasta FINISHED
    const containerId = createData.id;
    const maxWaitMs = 3 * 60 * 1000;
    const pollIntervalMs = 5000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWaitMs) {
      await sleep(pollIntervalMs);
      const statusRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
        { method: 'GET' }
      );
      const statusData = (await statusRes.json()) as {
        status_code?: string;
        error?: { message?: string };
      };
      if (statusData.status_code === 'FINISHED') {
        return this.publishInstagramContainer(accessToken, instagramId, containerId);
      }
      if (statusData.status_code === 'ERROR') {
        throw new Error(
          statusData.error?.message ||
            'Instagram no pudo procesar el video (revisa formato MP4 y duración de 3 s a 15 min)'
        );
      }
    }

    throw new Error('Instagram tardó demasiado en procesar el video. Intenta de nuevo.');
  }

  /**
   * Publica un post en Instagram.
   * Con imageUrl publica foto; con videoUrl publica Reel; con ambos publica los dos.
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

      const imageUrl = content.imageUrl?.trim();
      const videoUrl = content.videoUrl?.trim();

      if (!imageUrl && !videoUrl) {
        return {
          success: false,
          platform: 'instagram',
          error: 'Instagram requiere una imagen o un video para publicar',
        };
      }

      // Construir el caption con hashtags
      let caption = content.text;
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtagsStr = content.hashtags.map((h) => `#${h}`).join(' ');
        caption = `${caption}\n\n${hashtagsStr}`;
      }

      const pageToken = await this.resolvePageAccessToken(tenantId, integration);
      const instagramId = integration.instagramId!;

      const errors: string[] = [];
      let postId: string | undefined;

      if (videoUrl) {
        try {
          postId = await this.publishInstagramReel(pageToken, instagramId, videoUrl, caption);
        } catch (e) {
          errors.push(`video: ${e instanceof Error ? e.message : 'error desconocido'}`);
        }
      }

      if (imageUrl) {
        try {
          const imageMediaId = await this.publishInstagramImage(
            pageToken,
            instagramId,
            imageUrl,
            caption
          );
          postId = postId ?? imageMediaId;
        } catch (e) {
          errors.push(`foto: ${e instanceof Error ? e.message : 'error desconocido'}`);
        }
      }

      if (!postId) {
        throw new Error(errors.join(' · ') || 'Error al publicar en Instagram');
      }

      return {
        success: true,
        platform: 'instagram',
        postId,
        url: `https://www.instagram.com/p/${postId}/`,
        ...(errors.length > 0 ? { error: `Publicado parcialmente (${errors.join(' · ')})` } : {}),
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
    platforms: ('facebook' | 'instagram' | 'tiktok' | 'youtube')[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const platform of platforms) {
      if (platform === 'facebook') {
        results.push(await this.publishToFacebook(tenantId, content));
      } else if (platform === 'instagram') {
        results.push(await this.publishToInstagram(tenantId, content));
      } else if (platform === 'tiktok') {
        results.push(await this.publishToTikTok(tenantId, content));
      } else if (platform === 'youtube') {
        results.push(await this.publishToYouTube(tenantId, content));
      }
    }

    return results;
  }

  private async getVideoIntegration(
    tenantId: string,
    type: 'tiktok' | 'youtube'
  ): Promise<VideoIntegrationRecord | null> {
    try {
      const snap = await this.db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', type)
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      const credentials = (doc.data().credentials ?? {}) as Record<string, unknown>;
      const accessToken =
        typeof credentials.accessToken === 'string' ? credentials.accessToken.trim() : '';
      if (!accessToken) return null;
      const expiresAt =
        typeof credentials.expiresAt === 'number'
          ? credentials.expiresAt
          : typeof credentials.expiresAt === 'string'
            ? Date.parse(credentials.expiresAt)
            : undefined;
      return {
        docId: doc.id,
        accessToken,
        refreshToken:
          typeof credentials.refreshToken === 'string'
            ? credentials.refreshToken.trim()
            : undefined,
        openId: typeof credentials.openId === 'string' ? credentials.openId : undefined,
        channelId: typeof credentials.channelId === 'string' ? credentials.channelId : undefined,
        pageName:
          typeof credentials.pageName === 'string'
            ? credentials.pageName
            : typeof credentials.displayName === 'string'
              ? credentials.displayName
              : typeof credentials.channelTitle === 'string'
                ? credentials.channelTitle
                : undefined,
        expiresAtMs: Number.isFinite(expiresAt) ? expiresAt : undefined,
      };
    } catch (error) {
      console.error(`Error getting ${type} integration for tenant ${tenantId}:`, error);
      return null;
    }
  }

  private async persistVideoTokens(
    tenantId: string,
    docId: string,
    patch: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
    }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      'credentials.accessToken': patch.accessToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (patch.refreshToken) updates['credentials.refreshToken'] = patch.refreshToken;
    if (patch.expiresAt) updates['credentials.expiresAt'] = patch.expiresAt;
    await this.db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .doc(docId)
      .update(updates);
  }

  private async fetchRemoteVideoBuffer(videoUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const res = await fetch(videoUrl, { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`No se pudo descargar el video (${res.status})`);
    }
    const contentType = res.headers.get('content-type') || 'video/mp4';
    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    if (buffer.byteLength < 1024) {
      throw new Error('El archivo de video es demasiado pequeño o inválido');
    }
    if (buffer.byteLength > 100 * 1024 * 1024) {
      throw new Error('El video supera 100 MB; usa un archivo más corto');
    }
    return { buffer, contentType };
  }

  private buildSocialCaption(content: PostContent, maxLen: number): string {
    const tags = (content.hashtags || [])
      .map((h) => (h.startsWith('#') ? h : `#${h}`))
      .join(' ');
    const base = [content.text?.trim() || '', tags].filter(Boolean).join('\n\n').trim();
    if (base.length <= maxLen) return base;
    return `${base.slice(0, maxLen - 1)}…`;
  }

  /**
   * Publica un video en TikTok (Content Posting API, FILE_UPLOAD).
   * Apps sin auditoría de TikTok suelen quedar en PRIVADO (SELF_ONLY).
   */
  async publishToTikTok(tenantId: string, content: PostContent): Promise<PublishResult> {
    try {
      if (!content.videoUrl?.trim()) {
        return {
          success: false,
          platform: 'tiktok',
          error: 'TikTok requiere videoUrl (URL pública del video)',
        };
      }

      let integration = await this.getVideoIntegration(tenantId, 'tiktok');
      if (!integration) {
        return {
          success: false,
          platform: 'tiktok',
          error: 'TikTok no está conectado. Ve a Integraciones.',
        };
      }

      const accessToken = await this.resolveTikTokAccessToken(tenantId, integration);
      const { buffer } = await this.fetchRemoteVideoBuffer(content.videoUrl.trim());
      const title = this.buildSocialCaption(content, 2200);
      const videoSize = buffer.byteLength;
      const chunkSize = videoSize;
      const totalChunkCount = 1;

      const privacyLevels = ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'] as const;
      let lastError = 'Error al publicar en TikTok';

      for (const privacy of privacyLevels) {
        const initRes = await fetch(
          'https://open.tiktokapis.com/v2/post/publish/video/init/',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              post_info: {
                title,
                privacy_level: privacy,
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false,
              },
              source_info: {
                source: 'FILE_UPLOAD',
                video_size: videoSize,
                chunk_size: chunkSize,
                total_chunk_count: totalChunkCount,
              },
            }),
          }
        );
        const initJson = (await initRes.json()) as {
          data?: { publish_id?: string; upload_url?: string };
          error?: { code?: string; message?: string };
        };
        if (!initRes.ok || !initJson.data?.upload_url || (initJson.error?.code && initJson.error.code !== 'ok')) {
          lastError =
            initJson.error?.message ||
            `TikTok init falló (${initRes.status})`;
          if (
            privacy === 'PUBLIC_TO_EVERYONE' &&
            /privacy|audit|unaudited|scope/i.test(lastError)
          ) {
            continue;
          }
          if (privacy === 'SELF_ONLY') {
            break;
          }
          continue;
        }

        const uploadRes = await fetch(initJson.data.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(videoSize),
            'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
          },
          body: buffer,
        });
        if (!uploadRes.ok) {
          lastError = `Error al subir video a TikTok (${uploadRes.status})`;
          continue;
        }

        return {
          success: true,
          platform: 'tiktok',
          postId: initJson.data.publish_id,
          url: undefined,
        };
      }

      // Inbox fallback (video.upload) — aparece en bandeja del creador
      const inboxInit = await fetch(
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({
            source_info: {
              source: 'FILE_UPLOAD',
              video_size: videoSize,
              chunk_size: chunkSize,
              total_chunk_count: totalChunkCount,
            },
          }),
        }
      );
      const inboxJson = (await inboxInit.json()) as {
        data?: { publish_id?: string; upload_url?: string };
        error?: { code?: string; message?: string };
      };
      if (inboxInit.ok && inboxJson.data?.upload_url) {
        const uploadRes = await fetch(inboxJson.data.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(videoSize),
            'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
          },
          body: buffer,
        });
        if (uploadRes.ok) {
          return {
            success: true,
            platform: 'tiktok',
            postId: inboxJson.data.publish_id,
          };
        }
      }

      return {
        success: false,
        platform: 'tiktok',
        error:
          inboxJson.error?.message ||
          lastError ||
          'No se pudo publicar en TikTok',
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'tiktok',
        error: error?.message || 'Error al publicar en TikTok',
      };
    }
  }

  private async resolveTikTokAccessToken(
    tenantId: string,
    integration: VideoIntegrationRecord
  ): Promise<string> {
    const needsRefresh =
      !!integration.refreshToken &&
      (!integration.expiresAtMs || integration.expiresAtMs < Date.now() + 60_000);
    if (!needsRefresh) return integration.accessToken;

    const { getTikTokCredentials, refreshTikTokToken } = await import('@autodealers/core');
    const { clientKey, clientSecret } = await getTikTokCredentials();
    if (!clientKey || !clientSecret || !integration.refreshToken) {
      return integration.accessToken;
    }
    const refreshed = await refreshTikTokToken({
      clientKey,
      clientSecret,
      refreshToken: integration.refreshToken,
    });
    const expiresAt = Date.now() + (refreshed.expires_in || 86400) * 1000;
    await this.persistVideoTokens(tenantId, integration.docId, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || integration.refreshToken,
      expiresAt,
    });
    return refreshed.access_token;
  }

  /**
   * Sube un Short/video a YouTube (resumable upload).
   */
  async publishToYouTube(tenantId: string, content: PostContent): Promise<PublishResult> {
    try {
      if (!content.videoUrl?.trim()) {
        return {
          success: false,
          platform: 'youtube',
          error: 'YouTube requiere videoUrl (URL pública del video)',
        };
      }

      const integration = await this.getVideoIntegration(tenantId, 'youtube');
      if (!integration) {
        return {
          success: false,
          platform: 'youtube',
          error: 'YouTube no está conectado. Ve a Integraciones.',
        };
      }

      const accessToken = await this.resolveYouTubeAccessToken(tenantId, integration);
      const { buffer, contentType } = await this.fetchRemoteVideoBuffer(
        content.videoUrl.trim()
      );

      const caption = this.buildSocialCaption(content, 4900);
      const titleBase = (content.text || 'Vacante').split('\n')[0].trim().slice(0, 80);
      const title = `${titleBase} #Shorts`.slice(0, 100);
      const description = `${caption}\n\n#Shorts`.slice(0, 5000);

      const metadata = {
        snippet: {
          title,
          description,
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(buffer.byteLength),
            'X-Upload-Content-Type': contentType.includes('video')
              ? contentType
              : 'video/mp4',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initRes.ok) {
        const errBody = await initRes.text();
        throw new Error(
          `YouTube init falló (${initRes.status}): ${errBody.slice(0, 300)}`
        );
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) {
        throw new Error('YouTube no devolvió URL de subida');
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType.includes('video') ? contentType : 'video/mp4',
          'Content-Length': String(buffer.byteLength),
        },
        body: buffer,
      });
      const uploadJson = (await uploadRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!uploadRes.ok || !uploadJson.id) {
        throw new Error(
          uploadJson.error?.message || `Error al subir a YouTube (${uploadRes.status})`
        );
      }

      return {
        success: true,
        platform: 'youtube',
        postId: uploadJson.id,
        url: `https://www.youtube.com/watch?v=${uploadJson.id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        platform: 'youtube',
        error: error?.message || 'Error al publicar en YouTube',
      };
    }
  }

  private async resolveYouTubeAccessToken(
    tenantId: string,
    integration: VideoIntegrationRecord
  ): Promise<string> {
    const needsRefresh =
      !!integration.refreshToken &&
      (!integration.expiresAtMs || integration.expiresAtMs < Date.now() + 60_000);
    if (!needsRefresh && integration.accessToken) return integration.accessToken;
    if (!integration.refreshToken) return integration.accessToken;

    const { getYouTubeCredentials, refreshGoogleToken } = await import('@autodealers/core');
    const { clientId, clientSecret } = await getYouTubeCredentials();
    if (!clientId || !clientSecret) return integration.accessToken;

    const refreshed = await refreshGoogleToken({
      clientId,
      clientSecret,
      refreshToken: integration.refreshToken,
    });
    const expiresAt = Date.now() + (refreshed.expires_in || 3600) * 1000;
    await this.persistVideoTokens(tenantId, integration.docId, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || integration.refreshToken,
      expiresAt,
    });
    return refreshed.access_token;
  }
}

