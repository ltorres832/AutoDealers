import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - carga dinámica para evitar errores de tipos en build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getFirestore, getRatingByToken, completeRating, createNotification } = require('@autodealers/core') as any;
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      customerName,
      customerEmail,
      customerPhone,
      rating,
      title,
      comment,
      tenantId,
      vehicleId,
      saleId,
    } = body;

    // Validaciones básicas
    if (!customerName || !customerEmail || !rating || !comment) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, email, calificación y comentario' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La calificación debe estar entre 1 y 5' },
        { status: 400 }
      );
    }

    if (comment.trim().length < 20) {
      return NextResponse.json(
        { error: 'El comentario debe tener al menos 20 caracteres' },
        { status: 400 }
      );
    }

    // Si hay token, es una encuesta de rating existente
    if (token) {
      try {
        const ratingDoc = await getRatingByToken(token);
        
        if (!ratingDoc) {
          return NextResponse.json(
            { error: 'Token de encuesta inválido o expirado' },
            { status: 404 }
          );
        }

        if (ratingDoc.status !== 'pending') {
          return NextResponse.json(
            { error: 'Esta encuesta ya fue completada' },
            { status: 400 }
          );
        }

        // Completar el rating existente
        await completeRating(
          ratingDoc.tenantId,
          ratingDoc.id,
          rating,
          undefined, // dealerRating se puede agregar después
          comment,
          undefined // dealerComment
        );

        // Crear también una reseña pública si el comentario es suficiente
        if (comment.trim().length >= 20) {
          await db
            .collection('tenants')
            .doc(ratingDoc.tenantId)
            .collection('reviews')
            .add({
              customerName,
              customerEmail,
              customerPhone,
              rating,
              title: title || undefined,
              comment: comment.trim(),
              vehicleId: ratingDoc.vehicleId,
              saleId: ratingDoc.saleId,
              sellerId: ratingDoc.sellerId,
              dealerId: ratingDoc.dealerId,
              status: 'pending', // Requiere aprobación
              featured: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // Crear notificación para el admin
          try {
            await createNotification({
              tenantId: ratingDoc.tenantId,
              userId: '', // Se enviará a todos los admins
              type: 'review_submitted',
              title: 'Nueva Reseña Pendiente',
              message: `${customerName} ha dejado una reseña que requiere aprobación`,
              channels: ['dashboard'],
              metadata: {
                reviewId: ratingDoc.id,
                saleId: ratingDoc.saleId,
                rating,
              },
            });
          } catch (error) {
            console.error('Error creating notification:', error);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Encuesta completada exitosamente. Tu reseña será revisada antes de publicarse.',
        });
      } catch (error: any) {
        console.error('Error completing rating:', error);
        return NextResponse.json(
          { error: 'Error al completar la encuesta', details: error.message },
          { status: 500 }
        );
      }
    }

    // Si no hay token, es una reseña pública nueva
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Se requiere tenantId para crear una reseña pública' },
        { status: 400 }
      );
    }

    // Verificar que el tenant existe
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    // Crear la reseña (pendiente de aprobación)
    const reviewRef = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('reviews')
      .add({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        rating,
        title: title || undefined,
        comment: comment.trim(),
        vehicleId: vehicleId || undefined,
        saleId: saleId || undefined,
        status: 'pending', // Requiere aprobación del admin
        featured: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Crear notificación para el admin
    try {
      await createNotification({
        tenantId,
        userId: '', // Se enviará a todos los admins
        type: 'review_submitted',
        title: 'Nueva Reseña Pendiente',
        message: `${customerName} ha dejado una reseña que requiere aprobación`,
        channels: ['dashboard'],
        metadata: {
          reviewId: reviewRef.id,
          rating,
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }

    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
      message: 'Reseña enviada exitosamente. Será revisada antes de publicarse.',
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

