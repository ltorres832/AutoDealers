import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore, getAuth } from '@autodealers/shared';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

const db = getFirestore();
const auth = getAuth();

const PATCHABLE_TOP_LEVEL = new Set([
  'name',
  'email',
  'phone',
  'whatsapp',
  'role',
  'tenantId',
  'dealerId',
  'membershipId',
  'membershipType',
  'status',
  'bio',
  'photo',
  'publicPromoVideoUrl',
  'corporateEmail',
  'emailSignature',
  'emailSignatureType',
  'emailAliases',
  'referralCode',
  'sellerRating',
  'sellerRatingCount',
  'dealerRating',
  'dealerRatingCount',
]);

function serializeFirestoreValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    try {
      return (v as admin.firestore.Timestamp).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (Array.isArray(v)) return v.map(serializeFirestoreValue);
  if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      out[k] = serializeFirestoreValue(val);
    }
    return out;
  }
  return v;
}

function serializeUserDoc(id: string, data: admin.firestore.DocumentData) {
  const raw = { id, ...data };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = serializeFirestoreValue(v);
  }
  return out;
}

function buildClaims(role: string, tenantId?: string | null, dealerId?: string | null): Record<string, string> {
  const claims: Record<string, string> = { role };
  if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
    claims.tenantId = tenantId.trim();
  }
  if (dealerId && typeof dealerId === 'string' && dealerId.trim()) {
    claims.dealerId = dealerId.trim();
  }
  return claims;
}

async function syncDealerSubUser(
  userId: string,
  dealerId: string | undefined,
  patch: { name?: string; email?: string; status?: string }
) {
  if (!dealerId || !userId) return;
  const ref = db.collection('tenants').doc(dealerId).collection('sub_users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const sub: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (patch.name !== undefined) sub.name = patch.name;
  if (patch.email !== undefined) sub.email = patch.email;
  if (patch.status !== undefined) {
    sub.isActive = patch.status === 'active';
  }
  await ref.update(sub);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await verifyAuth(_request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const snap = await db.collection('users').doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    let authSummary: {
      uid: string;
      email?: string;
      displayName?: string;
      disabled: boolean;
      emailVerified: boolean;
    } | null = null;
    try {
      const rec = await auth.getUser(id);
      authSummary = {
        uid: rec.uid,
        email: rec.email,
        displayName: rec.displayName,
        disabled: !!rec.disabled,
        emailVerified: !!rec.emailVerified,
      };
    } catch {
      authSummary = null;
    }

    return NextResponse.json({
      user: serializeUserDoc(id, snap.data() || {}),
      auth: authSummary,
    });
  } catch (e) {
    console.error('admin users [id] GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await verifyAuth(request);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
    const authDisabledExplicit = typeof body.authDisabled === 'boolean' ? body.authDisabled : undefined;

    const userRef = db.collection('users').doc(id);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    const cur = snap.data() || {};

    const firestorePatch: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    let nextName = typeof cur.name === 'string' ? cur.name : '';
    let nextEmail = typeof cur.email === 'string' ? cur.email : '';
    let nextRole = typeof cur.role === 'string' ? cur.role : 'seller';
    let nextTenantId =
      typeof cur.tenantId === 'string' && cur.tenantId.trim() ? cur.tenantId.trim() : undefined;
    let nextDealerId =
      typeof cur.dealerId === 'string' && cur.dealerId.trim() ? cur.dealerId.trim() : undefined;
    let nextStatus = typeof cur.status === 'string' ? cur.status : 'active';

    const allowedRoles = new Set([
      'admin',
      'master_dealer',
      'dealer',
      'seller',
      'advertiser',
      'manager',
      'dealer_admin',
    ]);

    for (const key of PATCHABLE_TOP_LEVEL) {
      if (!(key in body)) continue;
      const val = body[key];
      if (key === 'role') {
        if (typeof val !== 'string' || !allowedRoles.has(val)) {
          return NextResponse.json({ error: `Rol inválido: ${val}` }, { status: 400 });
        }
        nextRole = val;
        firestorePatch.role = val;
        continue;
      }
      if (key === 'email') {
        if (typeof val !== 'string') continue;
        const em = val.trim().toLowerCase();
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
        }
        nextEmail = em;
        firestorePatch.email = em;
        continue;
      }
      if (key === 'tenantId') {
        if (val === null || val === '') {
          nextTenantId = undefined;
          firestorePatch.tenantId = admin.firestore.FieldValue.delete();
        } else if (typeof val === 'string' && val.trim()) {
          const tid = val.trim();
          const tSnap = await db.collection('tenants').doc(tid).get();
          if (!tSnap.exists) {
            return NextResponse.json({ error: 'El tenant indicado no existe' }, { status: 400 });
          }
          nextTenantId = tid;
          firestorePatch.tenantId = tid;
        }
        continue;
      }
      if (key === 'dealerId') {
        if (val === null || val === '') {
          nextDealerId = undefined;
          firestorePatch.dealerId = admin.firestore.FieldValue.delete();
        } else if (typeof val === 'string' && val.trim()) {
          nextDealerId = val.trim();
          firestorePatch.dealerId = val.trim();
        }
        continue;
      }
      if (key === 'membershipType') {
        if (val === 'dealer' || val === 'seller') {
          firestorePatch.membershipType = val;
        }
        continue;
      }
      if (key === 'status') {
        if (typeof val === 'string' && val.trim()) {
          nextStatus = val.trim();
          firestorePatch.status = nextStatus;
        }
        continue;
      }
      if (key === 'emailAliases' || key === 'sellerRating' || key === 'sellerRatingCount' || key === 'dealerRating' || key === 'dealerRatingCount') {
        if (val === null) {
          firestorePatch[key] = admin.firestore.FieldValue.delete();
        } else if (typeof val === 'number' && Number.isFinite(val)) {
          firestorePatch[key] = val;
        }
        continue;
      }
      if (typeof val === 'string') {
        if (key === 'name') nextName = val;
        firestorePatch[key] = val;
        continue;
      }
      if (val === null) {
        firestorePatch[key] = admin.firestore.FieldValue.delete();
      }
    }

    if (body.settings !== undefined && body.settings !== null && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
      if (body.settingsReplace === true) {
        firestorePatch.settings = body.settings as Record<string, unknown>;
      } else {
        const prev = (cur.settings && typeof cur.settings === 'object' ? cur.settings : {}) as Record<string, unknown>;
        const incoming = body.settings as Record<string, unknown>;
        firestorePatch.settings = { ...prev, ...incoming };
      }
    }

    if (body.permissions === null) {
      firestorePatch.permissions = admin.firestore.FieldValue.delete();
    } else if (
      body.permissions !== undefined &&
      body.permissions !== null &&
      typeof body.permissions === 'object' &&
      !Array.isArray(body.permissions)
    ) {
      const prev = (cur.permissions && typeof cur.permissions === 'object' ? cur.permissions : {}) as Record<string, unknown>;
      firestorePatch.permissions = { ...prev, ...(body.permissions as Record<string, unknown>) };
    }

    const hasMeaningfulFirestore = Object.keys(firestorePatch).some((k) => k !== 'updatedAt');
    const hasAuthExtras = Boolean(newPassword) || authDisabledExplicit !== undefined;
    if (!hasMeaningfulFirestore && !hasAuthExtras) {
      return NextResponse.json({ error: 'No hay cambios que aplicar' }, { status: 400 });
    }

    const authUpdates: admin.auth.UpdateRequest = {};
    if (typeof firestorePatch.name === 'string') {
      authUpdates.displayName = firestorePatch.name as string;
      nextName = firestorePatch.name as string;
    }
    if (typeof firestorePatch.email === 'string' && firestorePatch.email !== cur.email) {
      authUpdates.email = firestorePatch.email as string;
    }
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      authUpdates.password = newPassword;
    }

    if (authDisabledExplicit !== undefined) {
      authUpdates.disabled = authDisabledExplicit;
    } else if (typeof firestorePatch.status === 'string') {
      const s = firestorePatch.status as string;
      if (s === 'suspended' || s === 'cancelled') {
        authUpdates.disabled = true;
      } else if (s === 'active' || s === 'inactive') {
        authUpdates.disabled = false;
      }
    }

    try {
      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(id, authUpdates);
      }
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : '';
      const msg = e instanceof Error ? e.message : 'Error de Firebase Auth';
      if (code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'Ese email ya está en uso en otra cuenta' }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await userRef.update(firestorePatch as admin.firestore.UpdateData<admin.firestore.DocumentData>);

    await auth.setCustomUserClaims(id, buildClaims(nextRole, nextTenantId ?? null, nextDealerId ?? null));

    await syncDealerSubUser(id, nextDealerId, {
      name: typeof firestorePatch.name === 'string' ? (firestorePatch.name as string) : nextName,
      email: typeof firestorePatch.email === 'string' ? (firestorePatch.email as string) : nextEmail,
      status: nextStatus,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin users [id] PATCH:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
