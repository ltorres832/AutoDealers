// Reporte de redes sociales

import { getFirestore } from '@autodealers/core';
import { SocialMediaReport, ReportFilters } from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();

/**
 * Genera reporte de redes sociales
 */
export async function generateSocialMediaReport(
  tenantId: string,
  filters?: ReportFilters
): Promise<SocialMediaReport[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('social_posts')
    .where('status', '==', 'published')
    .get();

  const posts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    publishedAt: doc.data().publishedAt?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  }));

  // Filtrar por fecha
  let filteredPosts = posts;
  if (filters?.startDate || filters?.endDate) {
    filteredPosts = posts.filter((post: any) => {
      const postDate = post.publishedAt || post.createdAt;
      if (!postDate) return false;
      if (filters.startDate && postDate < filters.startDate) return false;
      if (filters.endDate && postDate > filters.endDate) return false;
      return true;
    });
  }

  // Agrupar por plataforma
  const byPlatform: Record<string, any[]> = {};
  filteredPosts.forEach((post: any) => {
    post.platforms?.forEach((platform: string) => {
      if (!byPlatform[platform]) {
        byPlatform[platform] = [];
      }
      byPlatform[platform].push(post);
    });
  });

  // Calcular métricas por plataforma
  return Object.entries(byPlatform).map(([platform, platformPosts]) => {
    const engagement = platformPosts.reduce(
      (sum: number, post: any) => sum + (post.metadata?.engagement || 0),
      0
    );
    const clicks = platformPosts.reduce(
      (sum: number, post: any) => sum + (post.metadata?.clicks || 0),
      0
    );

    // Obtener leads generados desde esta plataforma
    const leads = filteredPosts
      .filter((post: any) => post.metadata?.leadIds)
      .flatMap((post: any) => post.metadata.leadIds || []);

    return {
      platform,
      postsPublished: platformPosts.length,
      engagement,
      clicks,
      leadsGenerated: new Set(leads).size,
    };
  });
}





