export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuth } from '@/lib/auth';
import {
  createUser,
  finalizeUserRegistration,
  resolveRegistrationLinks,
  upsertNewsletterSubscriber,
} from '@autodealers/core';
import { getFirestore } from '@autodealers/core';
import { getAuth } from '@autodealers/shared';
import { sendWelcomeEmailForRole } from '@/lib/send-welcome-email';

const db = getFirestore();

async function resolveCreatedByForDealerSubUser(tenantId: string): Promise<string | null> {
  const t = await db.collection('tenants').doc(tenantId).get();
  const owner = t.data()?.ownerId as string | undefined;
  if (owner) return owner;
  const dealers = await db
    .collection('users')
    .where('tenantId', '==', tenantId)
    .where('role', '==', 'dealer')
    .limit(1)
    .get();
  if (!dealers.empty) return dealers.docs[0].id;
  const admins = await db
    .collection('users')
    .where('tenantId', '==', tenantId)
    .where('role', '==', 'dealer_admin')
    .limit(1)
    .get();
  if (!admins.empty) return admins.docs[0].id;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Una sola igualdad en Firestore: combinar role+status requería índice compuesto y fallaba en silencio.
    let query: any = db.collection('users');
    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      // Intentar obtener lastLogin de múltiples campos posibles
      const lastLogin = data?.lastLogin?.toDate?.() 
        || data?.lastAccess?.toDate?.() 
        || (data?.lastLogin instanceof Date ? data.lastLogin : null)
        || (data?.lastAccess instanceof Date ? data.lastAccess : null);
      
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        lastLogin: lastLogin ? lastLogin.toISOString() : undefined,
        // Calificaciones
        sellerRating: data?.sellerRating || 0,
        sellerRatingCount: data?.sellerRatingCount || 0,
        dealerRating: data?.dealerRating || 0,
        dealerRatingCount: data?.dealerRatingCount || 0,
      };
    });

    if (status) {
      users = users.filter((user: { status?: string }) => (user.status ?? 'active') === status);
    }

    // Filtrar por búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (user: any) =>
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
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
      email: rawEmail,
      password,
      passwordConfirm,
      name,
      role,
      tenantId,
      dealerId: bodyDealerId,
      phone,
      whatsapp,
    } = body as {
      email?: string;
      password?: string;
      passwordConfirm?: string;
      name?: string;
      role?: string;
      tenantId?: string;
      dealerId?: string;
      phone?: string;
      whatsapp?: string;
    };

    const email = (rawEmail || '').trim().toLowerCase();
    const passwordConfirmStr = typeof passwordConfirm === 'string' ? passwordConfirm : '';
    const phoneNorm = (phone || '').trim();
    const wa = (whatsapp || '').trim() || phoneNorm;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }
    if (password !== passwordConfirmStr) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden.' }, { status: 400 });
    }
    if (!name || !(name as string).trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }
    const allowedRoles = ['admin', 'dealer', 'seller', 'manager', 'dealer_admin'] as const;
    if (!role || !allowedRoles.includes(role as (typeof allowedRoles)[number])) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
    }

    let resolvedDealerId: string | undefined =
      typeof bodyDealerId === 'string' && bodyDealerId.trim() ? bodyDealerId.trim() : undefined;
    let resolvedMembershipId: string | undefined;

    const tid = typeof tenantId === 'string' ? tenantId.trim() : '';

    if (role !== 'admin' && !tid) {
      return NextResponse.json(
        { error: 'Debes seleccionar el tenant para este rol.' },
        { status: 400 }
      );
    }
    if (role !== 'admin' && !phoneNorm) {
      return NextResponse.json(
        { error: 'El teléfono es obligatorio para cuentas de dealer, vendedor o personal del concesionario.' },
        { status: 400 }
      );
    }
    if (tid) {
      const tenantSnap = await db.collection('tenants').doc(tid).get();
      if (!tenantSnap.exists) {
        return NextResponse.json({ error: 'El tenant seleccionado no existe.' }, { status: 400 });
      }
      const tData = tenantSnap.data()!;
      resolvedMembershipId = (tData.membershipId as string) || undefined;
      if (role === 'seller' && tData.type === 'dealer' && !resolvedDealerId) {
        resolvedDealerId = tid;
      }
      const links = resolveRegistrationLinks({
        role,
        tenantId: tid,
        tenantType: tData.type,
        tenantOwnerId: tData.ownerId,
        userId: '',
        explicitDealerId: resolvedDealerId,
      });
      if (links.dealerId === null) {
        resolvedDealerId = undefined;
      } else if (typeof links.dealerId === 'string') {
        resolvedDealerId = links.dealerId;
      }
    }

    let user: Awaited<ReturnType<typeof createUser>>;
    try {
      user = await createUser(
        email,
        password,
        name.trim(),
        role as 'admin' | 'dealer' | 'seller' | 'manager' | 'dealer_admin',
        tid || undefined,
        resolvedDealerId,
        resolvedMembershipId
      );
    } catch (userErr: unknown) {
      const code =
        userErr && typeof userErr === 'object' && 'code' in userErr
          ? (userErr as { code?: string }).code
          : undefined;
      const msg =
        code === 'auth/email-already-exists'
          ? 'Ese email ya está registrado en la plataforma.'
          : userErr instanceof Error
            ? userErr.message
            : 'No se pudo crear el usuario.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const warnings: string[] = [];

    try {
      const patch: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdByAdmin: true,
        mustChangePassword: true,
        adminCreatorUserId: auth.userId,
        ...(role === 'seller' || role === 'dealer'
          ? { adminMembershipSelectionRequired: true }
          : {}),
      };
      if (phoneNorm) {
        patch.phone = phoneNorm;
        if (wa) patch.whatsapp = wa;
      }
      if (role !== 'admin') {
        patch.platformTermsAcceptedAt = admin.firestore.FieldValue.serverTimestamp();
      }
      await db.collection('users').doc(user.id).update(patch);
      await finalizeUserRegistration(user.id);
      await upsertNewsletterSubscriber({
        email,
        source: 'user_registration',
        name: (name as string).trim(),
        role,
        userId: user.id,
      });
    } catch (updErr) {
      console.error('Admin create user: post-create update failed, rolling back:', updErr);
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
      return NextResponse.json(
        { error: 'No se pudo finalizar el perfil del usuario. Intenta de nuevo.' },
        { status: 500 }
      );
    }

    if (role === 'seller' && tid && resolvedDealerId === tid) {
      try {
        const createdBy = (await resolveCreatedByForDealerSubUser(tid)) || auth.userId;
        const assistantPerms = {
          canManageLeads: true,
          canManageInventory: false,
          canManageCampaigns: false,
          canManageMessages: true,
          canViewReports: true,
          canManageSettings: false,
        };
        await db
          .collection('tenants')
          .doc(tid)
          .collection('sub_users')
          .doc(user.id)
          .set({
            tenantId: tid,
            createdBy,
            email,
            name,
            role: 'assistant',
            permissions: assistantPerms,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (subErr) {
        console.error('Admin create seller: sub_users no creado:', subErr);
        warnings.push(
          'Usuario creado pero no se pudo registrar en sub_users del tenant (el panel de vendedores sigue viendo al usuario por dealerId en users).'
        );
      }
    }

    let welcomeEmailSent = false;

    if (role !== 'admin') {
      const welcome = await sendWelcomeEmailForRole({
        email,
        name: name.trim(),
        role,
      });
      welcomeEmailSent = welcome.sent;
      if (!welcome.sent && welcome.error) {
        warnings.push(
          `Usuario creado pero no se pudo enviar el email de bienvenida: ${welcome.error}`
        );
      }
    }

    return NextResponse.json({ user, warnings, welcomeEmailSent }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

