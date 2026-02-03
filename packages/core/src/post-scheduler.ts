// Scheduler de publicaciones en redes sociales

import { getFirestore } from './firebase';

// Lazy initialization - solo se inicializa cuando se necesita
function getDb() {
  return getFirestore();
}
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Publica posts programados
 */
export async function publishScheduledPosts(): Promise<void> {
  const now = new Date();

  const tenantsSnapshot = await getDb().collection('tenants').get();

  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;

    // Obtener posts programados para ahora
    const postsSnapshot = await getDb().collection('tenants')
      .doc(tenantId)
      .collection('social_posts')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', now)
      .get();

    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data();
      const scheduledFor = post.scheduledFor?.toDate();

      if (!scheduledFor || scheduledFor > now) {
        continue;
      }

      try {
        await publishPost(tenantId, postDoc.id, post);
      } catch (error) {
        console.error(`Error publishing post ${postDoc.id}:`, error);
        // Marcar como fallido
        await postDoc.ref.update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        } as any);
      }
    }
  }
}

/**
 * Publica un post en las plataformas configuradas
 */
async function publishPost(
  tenantId: string,
  postId: string,
  post: any
): Promise<void> {
  const { getSocialIntegrations } = await import('./social-integrations');

  for (const platform of post.platforms || []) {
    try {
      const integrations = await getSocialIntegrations(tenantId, platform);

      if (integrations.length === 0) {
        console.warn(`No integration found for ${platform} in tenant ${tenantId}`);
        continue;
      }

      const integration = integrations[0];

      switch (platform) {
        case 'facebook': {
          // Publicar en página de Facebook
          await publishToFacebook(post, integration);
          break;
        }

        case 'instagram': {
          // Publicar en Instagram
          await publishToInstagram(post, integration);
          break;
        }

        case 'whatsapp': {
          // WhatsApp no soporta publicaciones, solo mensajes
          break;
        }
      }

      // Marcar como publicado
      await getDb().collection('tenants')
        .doc(tenantId)
        .collection('social_posts')
        .doc(postId)
        .update({
          status: 'published',
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any);
    } catch (error) {
      console.error(`Error publishing to ${platform}:`, error);
      throw error;
    }
  }
}

/**
 * Publica en Facebook
 */
async function publishToFacebook(
  post: any,
  integration: any
): Promise<void> {
  // Usar Graph API para publicar en página
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${integration.accountId}/feed`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: post.content,
        link: post.metadata?.link,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to publish to Facebook');
  }
}

/**
 * Publica en Instagram
 */
async function publishToInstagram(
  post: any,
  integration: any
): Promise<void> {
  // Instagram requiere un proceso más complejo con contenedores
  // Por ahora, simplificado
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${integration.accountId}/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caption: post.content,
        image_url: post.media?.[0] || '',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Failed to publish to Instagram');
  }
}

