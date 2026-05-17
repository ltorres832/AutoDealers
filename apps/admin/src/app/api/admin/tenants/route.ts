export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createTenant, createUser, getTenants } from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import { getAuth } from '@autodealers/shared';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenants = await getTenants();

    // Agregar estadísticas a cada tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [usersSnapshot, vehiclesSnapshot, leadsSnapshot] = await Promise.all([
          db.collection('users').where('tenantId', '==', tenant.id).get(),
          db.collection('tenants').doc(tenant.id).collection('vehicles').get(),
          db.collection('tenants').doc(tenant.id).collection('leads').get(),
        ]);

        // Calcular calificaciones promedio del tenant
        let avgDealerRating = 0;
        let avgSellerRating = 0;
        let dealerRatingCount = 0;
        let sellerRatingCount = 0;

        if (tenant.type === 'dealer') {
          // Para dealers, obtener calificación del dealer principal
          const dealerUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'dealer');
          if (dealerUsers.length > 0) {
            const dealerData = dealerUsers[0].data();
            avgDealerRating = dealerData?.dealerRating || 0;
            dealerRatingCount = dealerData?.dealerRatingCount || 0;
          }
        } else {
          // Para sellers, obtener calificación promedio de todos los sellers
          const sellerUsers = usersSnapshot.docs.filter(doc => doc.data().role === 'seller');
          if (sellerUsers.length > 0) {
            const ratings = sellerUsers
              .map(doc => doc.data().sellerRating || 0)
              .filter(rating => rating > 0);
            if (ratings.length > 0) {
              avgSellerRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
              sellerRatingCount = sellerUsers.reduce((sum, doc) => sum + (doc.data().sellerRatingCount || 0), 0);
            }
          }
        }

        return {
          ...tenant,
          userCount: usersSnapshot.size,
          vehicleCount: vehiclesSnapshot.size,
          leadCount: leadsSnapshot.size,
          // Calificaciones
          avgDealerRating,
          dealerRatingCount,
          avgSellerRating,
          sellerRatingCount,
        };
      })
    );

    return NextResponse.json({ tenants: tenantsWithStats });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      subdomain,
      companyName,
      ownerEmail,
      ownerPassword,
      ownerPasswordConfirm,
      ownerName,
      phone,
      whatsapp,
    } = body as {
      name?: string;
      type?: string;
      subdomain?: string;
      companyName?: string;
      ownerEmail?: string;
      ownerPassword?: string;
      ownerPasswordConfirm?: string;
      ownerName?: string;
      phone?: string;
      whatsapp?: string;
    };

    const email = (ownerEmail || '').trim().toLowerCase();
    const password = ownerPassword || '';
    const passwordConfirm = ownerPasswordConfirm || '';
    const displayName = (ownerName || '').trim() || (name || '').trim();
    const phoneNorm = (phone || '').trim();
    const wa = (whatsapp || '').trim() || phoneNorm;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña del titular son obligatorios para crear la cuenta de acceso.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }
    if (password !== passwordConfirm) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json(
        { error: 'Indica el nombre del titular de la cuenta (persona que iniciará sesión).' },
        { status: 400 }
      );
    }
    if (!phoneNorm) {
      return NextResponse.json(
        { error: 'El teléfono del titular es obligatorio (contacto y recuperación).' },
        { status: 400 }
      );
    }

    if (!name || !type || (type !== 'dealer' && type !== 'seller')) {
      return NextResponse.json({ error: 'Nombre y tipo de tenant inválidos.' }, { status: 400 });
    }
    if (type === 'dealer' && !(companyName || '').trim()) {
      return NextResponse.json(
        { error: 'El nombre de la compañía es obligatorio para dealers.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email del titular inválido.' }, { status: 400 });
    }

    const tenant = await createTenant(
      name as string,
      type as 'dealer' | 'seller',
      subdomain,
      undefined,
      type === 'dealer' ? companyName : undefined
    );

    try {
      const role = type === 'dealer' ? 'dealer' : 'seller';
      const user = await createUser(
        email,
        password,
        displayName,
        role,
        tenant.id,
        undefined,
        undefined
      );

      try {
        await db.collection('users').doc(user.id).update({
          phone: phoneNorm,
          ...(wa ? { whatsapp: wa } : {}),
          platformTermsAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdByAdmin: true,
          adminCreatorUserId: auth.userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('tenants').doc(tenant.id).update({
          ownerId: user.id,
          phone: phoneNorm,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updErr) {
        console.error('Post-create user updates failed, rolling back:', updErr);
        try {
          await getAuth().deleteUser(user.id);
        } catch (delAuth) {
          console.error('deleteUser failed:', delAuth);
        }
        try {
          await db.collection('users').doc(user.id).delete();
        } catch (delFs) {
          console.error('delete user doc failed:', delFs);
        }
        try {
          await db.collection('tenants').doc(tenant.id).delete();
        } catch (delT) {
          console.error('delete tenant failed:', delT);
        }
        throw updErr;
      }

      return NextResponse.json({ tenant, owner: { id: user.id, email } }, { status: 201 });
    } catch (userErr: unknown) {
      console.error('Error creating owner user after tenant:', userErr);
      try {
        await db.collection('tenants').doc(tenant.id).delete();
      } catch (delErr) {
        console.error('Rollback tenant failed:', delErr);
      }
      const msg =
        userErr &&
        typeof userErr === 'object' &&
        'code' in userErr &&
        (userErr as { code?: string }).code === 'auth/email-already-exists'
          ? 'Ese email ya está registrado en la plataforma.'
          : userErr instanceof Error
            ? userErr.message
            : 'No se pudo crear el usuario titular.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

