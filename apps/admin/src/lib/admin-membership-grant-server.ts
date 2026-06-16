/**
 * Membresía demo / sin facturación — implementación local del admin.
 * Usa @autodealers/core (misma BD que GET /api/admin/memberships).
 */
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

type MembershipType = 'dealer' | 'seller';

export type AdminMembershipAccessStatus =
  | 'not_applicable'
  | 'dealer_managed'
  | 'granted_by_admin'
  | 'paid_stripe'
  | 'selection_required';

function db() {
  return getFirestore();
}

function isAdminProvisionedAccount(user: Record<string, unknown>): boolean {
  if (user.createdByAdmin === true) return true;
  if (typeof user.adminCreatorUserId === 'string' && user.adminCreatorUserId.trim()) return true;
  if (
    user.mustChangePassword === true &&
    (user.role === 'seller' || user.role === 'dealer')
  ) {
    return true;
  }
  return false;
}

function canAdminControlMembershipBilling(user: Record<string, unknown>): {
  ok: boolean;
  reason?: string;
} {
  const role = typeof user.role === 'string' ? user.role : '';
  if (role !== 'seller' && role !== 'dealer') {
    return { ok: false, reason: 'Solo aplica a usuarios con rol seller o dealer.' };
  }
  if (role === 'seller' && user.dealerId) {
    return { ok: false, reason: 'Este vendedor depende del plan del concesionario (tiene dealerId).' };
  }
  const tenantId = typeof user.tenantId === 'string' ? user.tenantId.trim() : '';
  if (!tenantId) {
    return { ok: false, reason: 'El usuario no tiene tenantId asignado.' };
  }
  return { ok: true };
}

async function loadMembershipRecord(membershipId: string): Promise<{
  id: string;
  name: string;
  type: MembershipType;
  isActive: boolean;
} | null> {
  const id = membershipId?.trim();
  if (!id) return null;
  const snap = await db().collection('memberships').doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const type = data.type;
  if (type !== 'dealer' && type !== 'seller') return null;
  if (!String(data.name || '').trim()) return null;
  if (['dealer', 'seller', 'free'].includes(id) && data.billingCycle == null) {
    return null;
  }
  const isActive = data.isActive === false || data.status === 'inactive' ? false : true;
  return { id: snap.id, name: String(data.name), type, isActive };
}

type SubRow = {
  id: string;
  status: string;
  membershipId?: string;
  stripeSubscriptionId?: string;
  billingSource?: string;
};

async function listSubscriptionsForTenant(tenantId: string): Promise<SubRow[]> {
  const col = db().collection('subscriptions');
  let snap;
  try {
    snap = await col.where('tenantId', '==', tenantId).orderBy('createdAt', 'desc').get();
  } catch {
    snap = await col.where('tenantId', '==', tenantId).get();
  }
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      status: String(data.status || ''),
      membershipId: typeof data.membershipId === 'string' ? data.membershipId : undefined,
      stripeSubscriptionId:
        typeof data.stripeSubscriptionId === 'string' ? data.stripeSubscriptionId : undefined,
      billingSource: typeof data.billingSource === 'string' ? data.billingSource : undefined,
    };
  });
}

async function applyMembershipToTenantAndUsers(
  tenantId: string,
  membershipId: string
): Promise<void> {
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const tenantRef = db().collection('tenants').doc(tenantId);
  const tenantDoc = await tenantRef.get();
  if (tenantDoc.exists) {
    await tenantRef.update({ membershipId, updatedAt: ts });
  }
  const usersSnapshot = await db().collection('users').where('tenantId', '==', tenantId).get();
  for (const userDoc of usersSnapshot.docs) {
    await userDoc.ref.update({ membershipId, updatedAt: ts });
  }
}

export async function getAdminMembershipAccessStatus(userId: string): Promise<{
  applicable: boolean;
  status: AdminMembershipAccessStatus;
  subscriptionId?: string;
  membershipId?: string;
  membershipName?: string;
  reason?: string;
  provisionedByAdmin?: boolean;
  adminMembershipRequired?: boolean;
}> {
  const userSnap = await db().collection('users').doc(userId).get();
  if (!userSnap.exists) {
    return { applicable: false, status: 'not_applicable' };
  }
  const user = userSnap.data() || {};
  const billingControl = canAdminControlMembershipBilling(user);
  if (!billingControl.ok) {
    return {
      applicable: false,
      status: user.role === 'seller' && user.dealerId ? 'dealer_managed' : 'not_applicable',
      ...(billingControl.reason ? { reason: billingControl.reason } : {}),
    };
  }
  const tenantId = typeof user.tenantId === 'string' ? user.tenantId.trim() : '';
  const provisionedByAdmin = isAdminProvisionedAccount(user);

  const subs = await listSubscriptionsForTenant(tenantId);
  const active = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const stripeActive = active.find((s) => s.stripeSubscriptionId?.trim());
  if (stripeActive) {
    const membership = stripeActive.membershipId
      ? await loadMembershipRecord(stripeActive.membershipId)
      : null;
    return {
      applicable: true,
      status: 'paid_stripe',
      subscriptionId: stripeActive.id,
      membershipId: stripeActive.membershipId,
      membershipName: membership?.name,
      provisionedByAdmin,
    };
  }

  const adminGrant = active.find((s) => s.billingSource === 'admin_grant');
  if (adminGrant || user.adminMembershipAccess === 'granted') {
    const membership = adminGrant?.membershipId
      ? await loadMembershipRecord(adminGrant.membershipId)
      : user.membershipId
        ? await loadMembershipRecord(String(user.membershipId))
        : null;
    return {
      applicable: true,
      status: 'granted_by_admin',
      subscriptionId: adminGrant?.id,
      membershipId: adminGrant?.membershipId || (user.membershipId as string | undefined),
      membershipName: membership?.name,
      provisionedByAdmin,
    };
  }

  return {
    applicable: true,
    status: 'selection_required',
    membershipId: typeof user.membershipId === 'string' ? user.membershipId : undefined,
    provisionedByAdmin,
    adminMembershipRequired:
      user.adminMembershipSelectionRequired === true ||
      user.adminMembershipAccess === 'required',
  };
}

async function resolveBillingUser(userId: string): Promise<{
  tenantId: string;
  role: string;
}> {
  const userSnap = await db().collection('users').doc(userId).get();
  if (!userSnap.exists) {
    throw new Error('Usuario no encontrado');
  }
  const user = userSnap.data() || {};
  const check = canAdminControlMembershipBilling(user);
  if (!check.ok) {
    throw new Error(check.reason || 'Esta cuenta no admite control de membresía desde admin');
  }
  return {
    tenantId: String(user.tenantId).trim(),
    role: String(user.role),
  };
}

export async function grantAdminMembershipAccess(params: {
  userId: string;
  membershipId: string;
  grantedByAdminId: string;
}): Promise<{ subscriptionId: string }> {
  const { userId, membershipId, grantedByAdminId } = params;
  const { tenantId, role } = await resolveBillingUser(userId);

  const membership = await loadMembershipRecord(membershipId);
  if (!membership) {
    throw new Error(`Membresía no encontrada (id: ${membershipId})`);
  }
  if (!membership.isActive) {
    throw new Error(`Membresía inactiva: ${membership.name}`);
  }
  const expectedType = role === 'dealer' ? 'dealer' : 'seller';
  if (membership.type !== expectedType) {
    throw new Error(`La membresía debe ser de tipo ${expectedType}`);
  }

  const tenantSnap = await db().collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) {
    throw new Error('Tenant no encontrado');
  }

  const subs = await listSubscriptionsForTenant(tenantId);
  const paidStripe = subs.find(
    (s) =>
      (s.status === 'active' || s.status === 'trialing') && s.stripeSubscriptionId?.trim()
  );
  if (paidStripe) {
    throw new Error('Esta cuenta ya tiene una suscripción pagada en Stripe');
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 10);

  const existingGrant = subs.find(
    (s) =>
      s.billingSource === 'admin_grant' &&
      (s.status === 'active' || s.status === 'trialing')
  );

  let subscriptionId: string;

  if (existingGrant) {
    subscriptionId = existingGrant.id;
    await db()
      .collection('subscriptions')
      .doc(subscriptionId)
      .update({
        membershipId,
        status: 'active',
        billingSource: 'admin_grant',
        adminGrantedBy: grantedByAdminId,
        adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
        cancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } else {
    const ref = db().collection('subscriptions').doc();
    subscriptionId = ref.id;
    await ref.set({
      id: ref.id,
      tenantId,
      userId,
      membershipId,
      status: 'active',
      billingSource: 'admin_grant',
      adminGrantedBy: grantedByAdminId,
      adminGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeSubscriptionId: '',
      stripeCustomerId: '',
      currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
      cancelAtPeriodEnd: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await db()
    .collection('users')
    .doc(userId)
    .update({
      adminMembershipAccess: 'granted',
      adminMembershipGrantedBy: grantedByAdminId,
      adminMembershipGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminMembershipSelectionRequired: admin.firestore.FieldValue.delete(),
      membershipId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  try {
    await applyMembershipToTenantAndUsers(tenantId, membershipId);
  } catch (error) {
    console.error('[grantAdminMembershipAccess] sync tenant/users:', error);
  }

  return { subscriptionId };
}

export async function requireAdminMembershipSelection(params: {
  userId: string;
  adminUserId: string;
}): Promise<void> {
  const { userId, adminUserId } = params;
  const { tenantId } = await resolveBillingUser(userId);
  const subs = await listSubscriptionsForTenant(tenantId);
  const ts = admin.firestore.FieldValue.serverTimestamp();

  for (const sub of subs) {
    if (sub.billingSource !== 'admin_grant' || sub.status === 'cancelled') continue;
    await db()
      .collection('subscriptions')
      .doc(sub.id)
      .update({
        status: 'cancelled',
        cancelledAt: ts,
        cancelAtPeriodEnd: false,
        adminRevokedAt: ts,
        adminRevokedBy: adminUserId,
        updatedAt: ts,
      });
  }

  await db()
    .collection('users')
    .doc(userId)
    .update({
      adminMembershipAccess: 'required',
      adminMembershipSelectionRequired: true,
      adminMembershipGrantedBy: admin.firestore.FieldValue.delete(),
      adminMembershipGrantedAt: admin.firestore.FieldValue.delete(),
      updatedAt: ts,
    });
}

export async function markUserAsAdminProvisioned(
  userId: string,
  adminUserId: string
): Promise<void> {
  const userSnap = await db().collection('users').doc(userId).get();
  if (!userSnap.exists) {
    throw new Error('Usuario no encontrado');
  }
  const user = userSnap.data() || {};
  const check = canAdminControlMembershipBilling(user);
  if (!check.ok) {
    throw new Error(check.reason || 'No se puede marcar esta cuenta');
  }
  await db()
    .collection('users')
    .doc(userId)
    .update({
      createdByAdmin: true,
      adminCreatorUserId: adminUserId,
      adminMembershipSelectionRequired: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
