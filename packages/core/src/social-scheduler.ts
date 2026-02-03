// Sistema de programación automática de posts

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface ScheduledPost {
  id: string;
  tenantId: string;
  userId: string;
  content: {
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    hashtags: string[];
  };
  platforms: ('facebook' | 'instagram')[];
  scheduledFor: Date;
  publishedAt?: Date;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  postIds?: {
    facebook?: string;
    instagram?: string;
  };
  error?: string;
  aiGenerated: boolean;
  vehicleId?: string;
  promotionId?: string;
  createdAt: Date;
}

/**
 * Programa un post para publicarse más tarde
 */
export async function schedulePost(
  post: Omit<ScheduledPost, 'id' | 'createdAt' | 'status' | 'publishedAt'>
): Promise<ScheduledPost> {
  const docRef = db
    .collection('tenants')
    .doc(post.tenantId)
    .collection('scheduled_posts')
    .doc();

  const postData = {
    ...post,
    status: 'scheduled' as const,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(postData as any);

  return {
    id: docRef.id,
    ...post,
    status: 'scheduled',
    createdAt: new Date(),
  };
}

/**
 * Publica un post programado
 */
export async function publishScheduledPost(
  tenantId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('scheduled_posts')
      .doc(postId)
      .get();

    if (!postDoc.exists) {
      return { success: false, error: 'Post no encontrado' };
    }

    const post = postDoc.data() as ScheduledPost;

    if (post.status !== 'scheduled') {
      return { success: false, error: 'Post no está programado' };
    }

    // Importar el servicio de publicación
    const { SocialPublisherService } = await import('@autodealers/messaging');
    const publisher = new SocialPublisherService();

    const results = await publisher.publishToMultiple(
      tenantId,
      {
        text: post.content.text,
        imageUrl: post.content.imageUrl,
        videoUrl: post.content.videoUrl,
        hashtags: post.content.hashtags,
      },
      post.platforms
    );

    const postIds: { facebook?: string; instagram?: string } = {};
    let hasError = false;
    let errorMessage = '';

    results.forEach((result) => {
      if (result.success && result.postId) {
        if (result.platform === 'facebook') {
          postIds.facebook = result.postId;
        } else if (result.platform === 'instagram') {
          postIds.instagram = result.postId;
        }
      } else {
        hasError = true;
        errorMessage = result.error || 'Error desconocido';
      }
    });

    // Actualizar el post
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('scheduled_posts')
      .doc(postId)
      .update({
        status: hasError ? 'failed' : 'published',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        postIds,
        error: hasError ? errorMessage : undefined,
      } as any);

    return { success: !hasError, error: hasError ? errorMessage : undefined };
  } catch (error) {
    console.error('Error publishing scheduled post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Pausa un post programado
 */
export async function pauseScheduledPost(
  tenantId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('scheduled_posts')
      .doc(postId)
      .update({
        status: 'cancelled',
      } as any);

    return { success: true };
  } catch (error) {
    console.error('Error pausing scheduled post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Reactiva un post pausado
 */
export async function reactivateScheduledPost(
  tenantId: string,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const postDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('scheduled_posts')
      .doc(postId)
      .get();

    if (!postDoc.exists) {
      return { success: false, error: 'Post no encontrado' };
    }

    const post = postDoc.data() as ScheduledPost;

    if (post.status !== 'cancelled') {
      return { success: false, error: 'Post no está pausado' };
    }

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('scheduled_posts')
      .doc(postId)
      .update({
        status: 'scheduled',
      } as any);

    return { success: true };
  } catch (error) {
    console.error('Error reactivating scheduled post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene posts programados de un tenant
 */
export async function getScheduledPosts(
  tenantId: string,
  userId?: string,
  status?: ScheduledPost['status']
): Promise<ScheduledPost[]> {
  let query: admin.firestore.Query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('scheduled_posts');

  if (userId) {
    query = query.where('userId', '==', userId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.orderBy('scheduledFor', 'asc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      scheduledFor: data.scheduledFor?.toDate() || new Date(),
      publishedAt: data.publishedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as ScheduledPost;
  });
}

