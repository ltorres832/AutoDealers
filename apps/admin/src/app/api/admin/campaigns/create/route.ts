export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import { SocialPublisherService } from '@autodealers/messaging';
import * as admin from 'firebase-admin';

const db = getFirestore();
const publisher = new SocialPublisherService();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
      name,
      type,
      platforms,
      content,
      imageUrl,
      videoUrl,
      hashtags,
      publishNow = false,
    } = body;

    if (!tenantId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name, type' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Crear la campaña
    const campaignRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('campaigns')
      .doc();

    const campaignData = {
      name,
      type,
      platforms: platforms || [],
      content: content || '',
      imageUrl,
      videoUrl,
      hashtags: hashtags || [],
      status: 'draft',
      createdBy: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metrics: {
        impressions: 0,
        clicks: 0,
        leads: 0,
        spend: 0,
      },
    };

    await campaignRef.set(campaignData);

    // Si se solicita publicación inmediata y hay plataformas seleccionadas
    let publishResults: any[] = [];
    if (publishNow && platforms && platforms.length > 0) {
      // Verificar credenciales del tenant
      const integrationsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('status', '==', 'active')
        .get();

      const availablePlatforms = integrationsSnapshot.docs
        .map((doc) => doc.data().type)
        .filter((type) => ['facebook', 'instagram'].includes(type));

      const platformsToPublish = platforms.filter((p: string) =>
        availablePlatforms.includes(p)
      );

      if (platformsToPublish.length > 0) {
        // Publicar en redes sociales
        const publishContent = {
          text: content || name,
          imageUrl,
          videoUrl,
          hashtags,
        };

        for (const platform of platformsToPublish) {
          try {
            if (platform === 'facebook') {
              const result = await publisher.publishToFacebook(tenantId, publishContent);
              const { platform: _ignored, ...rest } = result || {};
              publishResults.push({ platform: 'facebook', ...rest });
            } else if (platform === 'instagram') {
              const result = await publisher.publishToInstagram(tenantId, publishContent);
              const { platform: _ignored, ...rest } = result || {};
              publishResults.push({ platform: 'instagram', ...rest });
            }
          } catch (error: any) {
            publishResults.push({
              platform,
              success: false,
              error: error.message,
            });
          }
        }

        // Actualizar estado de la campaña
        await campaignRef.update({
          status: 'active',
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
          publishResults,
        });
      }
    }

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      publishResults,
    });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


