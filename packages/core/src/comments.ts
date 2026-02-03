// Sistema de comentarios de redes sociales

import { getFirestore } from './firebase';
import * as admin from 'firebase-admin';

const db = getFirestore();

export interface SocialComment {
  id: string;
  tenantId: string;
  postId: string; // ID del post en la red social
  platform: 'facebook' | 'instagram';
  commentId: string; // ID del comentario en la plataforma
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string; // Si es respuesta a otro comentario
  isReplied: boolean;
  replyId?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Crea o actualiza un comentario
 */
export async function saveComment(
  comment: Omit<SocialComment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SocialComment> {
  // Buscar si ya existe
  const existing = await db
    .collection('tenants')
    .doc(comment.tenantId)
    .collection('comments')
    .where('platform', '==', comment.platform)
    .where('commentId', '==', comment.commentId)
    .limit(1)
    .get();

  if (!existing.empty) {
    // Actualizar existente
    const doc = existing.docs[0];
    await doc.ref.update({
      ...comment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    const data = doc.data();
    return {
      id: doc.id,
      ...comment,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: new Date(),
    };
  }

  // Crear nuevo
  const docRef = db
    .collection('tenants')
    .doc(comment.tenantId)
    .collection('comments')
    .doc();

  await docRef.set({
    ...comment,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  } as any);

  return {
    id: docRef.id,
    ...comment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Obtiene comentarios de un post
 */
export async function getPostComments(
  tenantId: string,
  postId: string
): Promise<SocialComment[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('comments')
    .where('postId', '==', postId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as SocialComment;
  });
}

/**
 * Marca comentario como respondido
 */
export async function markCommentAsReplied(
  tenantId: string,
  commentId: string,
  replyId: string
): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('comments')
    .doc(commentId)
    .update({
      isReplied: true,
      replyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);
}





