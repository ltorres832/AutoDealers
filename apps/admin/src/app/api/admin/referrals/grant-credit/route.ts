import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createRewardCredit, getFirestore, normalizeLoginEmail } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

async function resolveRewardUser(params: {
  userId?: string;
  email?: string;
}): Promise<admin.firestore.DocumentSnapshot | null> {
  const userId = String(params.userId || '').trim();
  const email = normalizeLoginEmail(String(params.email || ''));

  if (userId) {
    const byId = await db.collection('users').doc(userId).get();
    if (byId.exists) return byId;

    const asTenant = await db.collection('tenants').doc(userId).get();
    const ownerId = asTenant.data()?.ownerId;
    if (typeof ownerId === 'string' && ownerId) {
      const owner = await db.collection('users').doc(ownerId).get();
      if (owner.exists) return owner;
    }
  }

  if (email) {
    const snap = await db.collection('users').where('email', '==', email).limit(5).get();
    const match =
      snap.docs.find((doc) => {
        const role = String(doc.data()?.role || '');
        return role === 'dealer' || role === 'seller';
      }) || snap.docs[0];
    if (match) return match;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type === 'banner' ? 'banner' : body.type === 'promotion' ? 'promotion' : null;

    if (!type) {
      return NextResponse.json(
        { error: 'Elige el tipo de recompensa: promoción o banner.' },
        { status: 400 }
      );
    }

    const userDoc = await resolveRewardUser({
      userId: body.userId,
      email: body.email,
    });

    if (!userDoc?.exists) {
      return NextResponse.json(
        {
          error:
            'No se encontró el usuario. Usa el correo del dealer o vendedor, o su ID de usuario.',
        },
        { status: 404 }
      );
    }

    const userData = userDoc.data() || {};
    const role = String(userData.role || '');
    if (role !== 'dealer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Solo se pueden otorgar recompensas a un dealer o a un vendedor.' },
        { status: 400 }
      );
    }

    const credit = await createRewardCredit(userDoc.id, type, 'admin_grant');

    const currentRewards = userData.activeRewards || {};
    const nextRewards = {
      nextMonthDiscount: currentRewards.nextMonthDiscount || 0,
      freeMonthsRemaining: currentRewards.freeMonthsRemaining || 0,
      promotionCredits: currentRewards.promotionCredits || 0,
      bannerCredits: currentRewards.bannerCredits || 0,
    };

    if (type === 'promotion') {
      nextRewards.promotionCredits += 1;
    } else {
      nextRewards.bannerCredits += 1;
    }

    await userDoc.ref.update({
      activeRewards: nextRewards,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const label = type === 'promotion' ? 'promoción gratis' : 'banner gratis';
    const who = userData.name || userData.email || userDoc.id;
    const dashboard = role === 'dealer' ? 'dealer → Referidos' : 'seller → Referidos';

    return NextResponse.json({
      success: true,
      message: `Se acreditó 1 ${label} a ${who}. Lo verá en ${dashboard} → Mis Recompensas y podrá usarlo al crear una ${type === 'promotion' ? 'promoción' : 'banner'}.`,
      credit: {
        id: credit.id,
        type: credit.type,
        userId: userDoc.id,
        status: 'available',
      },
      user: {
        id: userDoc.id,
        name: userData.name || '',
        email: userData.email || '',
        role,
      },
      activeRewards: nextRewards,
    });
  } catch (error: unknown) {
    console.error('Error granting credit:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
