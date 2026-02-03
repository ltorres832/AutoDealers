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
      description,
      type,
      discount,
      platforms,
      content,
      imageUrl,
      startDate,
      endDate,
      isPremium = false,
      price = 0,
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

    // Crear la promoción
    const promotionRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('promotions')
      .doc();

    const promotionData: any = {
      name,
      description: description || '',
      type,
      discount: discount || null,
      status: 'draft',
      startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : admin.firestore.FieldValue.serverTimestamp(),
      endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : null,
      createdBy: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isPremium: isPremium || false,
      price: isPremium ? (price || 0) : 0,
      platforms: platforms || [],
      content: content || '',
      imageUrl: imageUrl || null,
    };

    await promotionRef.set(promotionData);

    // Si es promoción premium, no publicar automáticamente (debe ser aprobada por pago)
    if (isPremium) {
      return NextResponse.json({
        success: true,
        promotionId: promotionRef.id,
        message: 'Premium promotion created. Waiting for payment approval.',
      });
    }

    // Si es promoción regular y se solicita publicación inmediata
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
        const publishContent = {
          text: content || description || name,
          imageUrl,
          hashtags: type === 'discount' ? ['promocion', 'descuento', 'autos'] : [],
        };

        for (const platform of platformsToPublish) {
          try {
            if (platform === 'facebook') {
              const result = await publisher.publishToFacebook(tenantId, publishContent);
              publishResults.push({ ...result, platform: 'facebook' });
            } else if (platform === 'instagram') {
              const result = await publisher.publishToInstagram(tenantId, publishContent);
              publishResults.push({ ...result, platform: 'instagram' });
            }
          } catch (error: any) {
            publishResults.push({
              platform,
              success: false,
              error: error.message,
            });
          }
        }

        // Actualizar estado de la promoción
        await promotionRef.update({
          status: 'active',
          publishedAt: admin.firestore.FieldValue.serverTimestamp(),
          publishResults,
        });
      }
    }

    return NextResponse.json({
      success: true,
      promotionId: promotionRef.id,
      publishResults,
    });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


