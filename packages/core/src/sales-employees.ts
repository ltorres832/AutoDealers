/**
 * Empleados de ventas internas. Colecciones propias — no usa afiliados ni referidos.
 */

import * as admin from 'firebase-admin';
import { getAuth, getFirestore } from '@autodealers/shared';
import {
  resolveBusinessUrl,
  resolveDealerUrl,
  resolvePublicWebUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';
import { createUser, PlatformProfileExistsError } from './users';
import { createTenant } from './tenants';
import { finalizeUserRegistration, generateTemporaryPassword, normalizeLoginEmail } from './user-auth-sync';
import { ensureAuthAccount } from './platform-registration';
import { findPlatformProfile } from './platform-registration';
import { listMembershipCatalog } from './memberships-catalog';
import { getBusinessCategoryBySlug, listBusinessCategories, slugifyBusiness } from './automotive-categories';
import { upsertNewsletterSubscriber } from './newsletter-subscribers';
import { sendWelcomeEmailForRole } from './welcome-email';
import { notifyPlatformAdminsOfRegistration } from './platform-admin-notify';

export const SALES_EMPLOYEE_PORTAL_PATH = '/sales';
export const SALES_MEMBERSHIP_HOLD_DAYS = 14;
export const SALES_MEMBERSHIP_SECOND_MONTHS = 6;
export const SALES_MEMBERSHIP_COMMISSION_RATE = 0.5;
export const SALES_AD_COMMISSION_RATE = 0.25;
export const SALES_AD_COMMISSION_TYPES = [
  'premium_banner',
  'assigned_banner',
  'paid_promotion',
  'featured_promotion',
  'premium_promotion',
] as const;

export const SALES_EMPLOYEES_COL = 'sales_employees';
export const SALES_ACCOUNTS_COL = 'sales_employee_accounts';
export const SALES_LINKS_COL = 'sales_employee_payment_links';
export const SALES_COMMISSIONS_COL = 'sales_employee_commissions';
export const SALES_VISITS_COL = 'sales_employee_visits';
export const SALES_APPOINTMENTS_COL = 'sales_employee_appointments';
export const SALES_NOTIFICATIONS_COL = 'sales_employee_notifications';

export type SalesEmployeeStatus = 'active' | 'inactive';
export type SalesClientRole = 'dealer' | 'seller' | 'business';
export type SalesCommissionType = 'membership_first' | 'membership_second' | 'ad';
export type SalesCommissionStatus =
  | 'pending_hold'
  | 'void_cancelled'
  | 'payable'
  | 'paid'
  | 'blocked_inactive';
export type SalesPaymentLinkStatus = 'open' | 'paid' | 'expired' | 'cancelled';
export type SalesAppointmentKind = 'orientation' | 'setup';
export type SalesProspectRelation = 'current' | 'former' | 'unknown';

export function parseSalesClientRole(value: unknown): SalesClientRole {
  const role = String(value || '');
  if (role === 'dealer' || role === 'seller' || role === 'business') return role;
  throw new Error('Indica si es o fue vendedor, dealer o negocio.');
}

export function parseOptionalSalesProspectRelation(value: unknown): SalesProspectRelation {
  const relation = String(value || '').trim();
  if (relation === 'current' || relation === 'former') return relation;
  return 'unknown';
}

export function parseSalesProspectRelation(value: unknown): SalesProspectRelation {
  const relation = String(value || '').trim();
  if (relation === 'current' || relation === 'former') return relation;
  throw new Error('Indica si la persona es o fue vendedor, dealer o negocio.');
}

export function salesProspectLabel(role: SalesClientRole, relation?: SalesProspectRelation | string): string {
  const roleLabel = role === 'dealer' ? 'dealer' : role === 'seller' ? 'vendedor' : 'negocio';
  if (relation === 'former') return `Fue ${roleLabel}`;
  if (relation === 'current') return `Es ${roleLabel}`;
  return roleLabel;
}

export function isSalesAdCommissionType(type: unknown): boolean {
  return (SALES_AD_COMMISSION_TYPES as readonly string[]).includes(String(type || ''));
}

function requireVisitNotes(notes: unknown): string {
  const trimmed = String(notes || '').trim();
  if (trimmed.length < 3) {
    throw new Error('La nota de la visita es obligatoria.');
  }
  return trimmed;
}

function requireContactName(value: unknown): string {
  const name = String(value || '').trim();
  if (!name) {
    throw new Error('El nombre de la persona es obligatorio.');
  }
  return name;
}

function requireContactPhone(value: unknown): string {
  const phone = String(value || '').trim();
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) {
    throw new Error('El teléfono de la persona es obligatorio.');
  }
  return phone;
}

function salesRoleFromStored(value: unknown): SalesClientRole | null {
  const role = String(value || '').trim();
  if (role === 'dealer' || role === 'master_dealer') return 'dealer';
  if (role === 'seller') return 'seller';
  if (role === 'business' || role === 'automotive_business') return 'business';
  return null;
}

function requireVisitedAt(value: unknown): Date {
  const raw = String(value || '').trim();
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error('La fecha de la visita es obligatoria.');
  }
  return date;
}

export interface SalesEmployee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: SalesEmployeeStatus;
  authUserId?: string;
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  commissionRulesAcceptedAt?: Date;
  stats?: {
    totalAccounts: number;
    pendingPayout: number;
    totalPaid: number;
    totalVoided: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SalesEmployeeAccount {
  id: string;
  employeeId: string;
  role: SalesClientRole;
  tenantId: string;
  userId: string;
  email: string;
  name: string;
  companyName?: string;
  membershipId?: string;
  createdAt?: Date;
}

export interface SalesEmployeeCommission {
  id: string;
  employeeId: string;
  type: SalesCommissionType;
  status: SalesCommissionStatus;
  amount: number;
  currency: string;
  planPrice?: number;
  tenantId?: string;
  userId?: string;
  accountId?: string;
  membershipId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  adKind?: string;
  eligibleAt?: Date;
  activatedAt?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  stripeTransferId?: string;
  payoutError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

function getDb() {
  return getFirestore();
}

function getAuthInstance() {
  return getAuth();
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(base: Date, months: number): Date {
  const next = new Date(base.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return null;
}

function mapEmployee(id: string, data: FirebaseFirestore.DocumentData): SalesEmployee {
  return {
    id,
    name: String(data.name || ''),
    email: String(data.email || ''),
    phone: data.phone ? String(data.phone) : undefined,
    status: data.status === 'inactive' ? 'inactive' : 'active',
    authUserId: data.authUserId ? String(data.authUserId) : undefined,
    stripeConnectAccountId: data.stripeConnectAccountId ? String(data.stripeConnectAccountId) : undefined,
    stripeConnectOnboardingComplete: data.stripeConnectOnboardingComplete === true,
    stripeConnectPayoutsEnabled: data.stripeConnectPayoutsEnabled === true,
    commissionRulesAcceptedAt: data.commissionRulesAcceptedAt?.toDate?.(),
    stats: data.stats || {
      totalAccounts: 0,
      pendingPayout: 0,
      totalPaid: 0,
      totalVoided: 0,
    },
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

export function getSalesEmployeePortalUrl(): string {
  return `${resolvePublicWebUrl()}${SALES_EMPLOYEE_PORTAL_PATH}`;
}

export function getClientPortalLoginUrl(role: SalesClientRole): string {
  if (role === 'dealer') return `${resolveDealerUrl()}/login`;
  if (role === 'business') return `${resolveBusinessUrl()}/login`;
  return `${resolveSellerUrl()}/login`;
}

export async function getSalesEmployee(id: string): Promise<SalesEmployee | null> {
  const snap = await getDb().collection(SALES_EMPLOYEES_COL).doc(id).get();
  if (!snap.exists) return null;
  return mapEmployee(snap.id, snap.data() || {});
}

export async function getSalesEmployeeByEmail(email: string): Promise<SalesEmployee | null> {
  const normalized = normalizeLoginEmail(email);
  if (!normalized) return null;
  const snap = await getDb().collection(SALES_EMPLOYEES_COL).where('email', '==', normalized).limit(1).get();
  if (snap.empty) return null;
  return mapEmployee(snap.docs[0].id, snap.docs[0].data() || {});
}

export async function getSalesEmployeeByAuthUserId(authUserId: string): Promise<SalesEmployee | null> {
  if (!authUserId) return null;
  const byId = await getSalesEmployee(authUserId);
  if (byId && (byId.authUserId === authUserId || byId.id === authUserId)) return byId;
  const snap = await getDb()
    .collection(SALES_EMPLOYEES_COL)
    .where('authUserId', '==', authUserId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return mapEmployee(snap.docs[0].id, snap.docs[0].data() || {});
}

export async function listSalesEmployees(): Promise<SalesEmployee[]> {
  const snap = await getDb().collection(SALES_EMPLOYEES_COL).get();
  return snap.docs
    .map((doc) => mapEmployee(doc.id, doc.data() || {}))
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

export async function createSalesEmployee(input: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): Promise<SalesEmployee & { temporaryPassword?: string }> {
  const name = String(input.name || '').trim();
  const email = normalizeLoginEmail(input.email);
  if (!name) throw new Error('El nombre es requerido');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Correo electrónico inválido');
  }

  const existing = await getSalesEmployeeByEmail(email);
  if (existing) throw new Error('Ya existe un empleado de ventas con ese correo');

  const password = String(input.password || '').trim() || `Ad${Math.random().toString(36).slice(2, 8)}!1`;
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

  const { authUserId, created } = await ensureAuthAccount({
    email,
    password,
    displayName: name,
  });
  if (!created) {
    await getAuthInstance().updateUser(authUserId, { password, displayName: name });
  }

  const docId = created ? authUserId : getDb().collection(SALES_EMPLOYEES_COL).doc().id;
  await getAuthInstance().setCustomUserClaims(authUserId, {
    role: 'sales_employee',
    salesEmployeeId: docId,
  });

  const data = {
    name,
    email,
    phone: String(input.phone || '').trim() || null,
    status: 'active' as const,
    authUserId,
    stripeConnectOnboardingComplete: false,
    stripeConnectPayoutsEnabled: false,
    stats: { totalAccounts: 0, pendingPayout: 0, totalPaid: 0, totalVoided: 0 },
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };

  await getDb().collection(SALES_EMPLOYEES_COL).doc(docId).set(data);

  return {
    id: docId,
    name,
    email,
    phone: data.phone || undefined,
    status: 'active',
    authUserId,
    stripeConnectOnboardingComplete: false,
    stripeConnectPayoutsEnabled: false,
    stats: { totalAccounts: 0, pendingPayout: 0, totalPaid: 0, totalVoided: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    temporaryPassword: input.password ? undefined : password,
  };
}

export async function updateSalesEmployee(
  id: string,
  updates: Partial<{ name: string; email: string; phone: string; status: SalesEmployeeStatus; password: string }>
): Promise<SalesEmployee> {
  const employee = await getSalesEmployee(id);
  if (!employee) throw new Error('Empleado no encontrado');

  const patch: Record<string, unknown> = { updatedAt: nowTs() };
  if (updates.name?.trim()) patch.name = updates.name.trim();
  if (updates.phone !== undefined) patch.phone = updates.phone.trim() || null;
  if (updates.status === 'active' || updates.status === 'inactive') patch.status = updates.status;
  if (updates.email) {
    const email = normalizeLoginEmail(updates.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo inválido');
    patch.email = email;
  }

  await getDb().collection(SALES_EMPLOYEES_COL).doc(id).update(patch);

  const authId = employee.authUserId || employee.id;
  const authPatch: { email?: string; displayName?: string; password?: string; disabled?: boolean } = {};
  if (typeof patch.email === 'string') authPatch.email = patch.email;
  if (typeof patch.name === 'string') authPatch.displayName = patch.name;
  if (updates.password?.trim()) authPatch.password = updates.password.trim();
  if (updates.status) authPatch.disabled = updates.status === 'inactive';
  if (Object.keys(authPatch).length) {
    try {
      await getAuthInstance().updateUser(authId, authPatch);
    } catch (error) {
      console.warn('[sales-employees] auth update failed:', error);
    }
  }

  const refreshed = await getSalesEmployee(id);
  if (!refreshed) throw new Error('Empleado no encontrado');
  return refreshed;
}

export async function getSalesEmployeeIdForTenant(tenantId: string): Promise<string | null> {
  const tid = String(tenantId || '').trim();
  if (!tid) return null;
  const snap = await getDb().collection(SALES_ACCOUNTS_COL).where('tenantId', '==', tid).limit(1).get();
  if (snap.empty) return null;
  return String(snap.docs[0].data()?.employeeId || '') || null;
}

export async function salesEmployeeMetadataForTenant(
  tenantId: string
): Promise<Record<string, string>> {
  const employeeId = await getSalesEmployeeIdForTenant(tenantId);
  return employeeId ? { employeeId } : {};
}

async function uniqueBusinessSlug(base: string): Promise<string> {
  const root = slugifyBusiness(base) || `negocio-${Date.now().toString(36)}`;
  let slug = root;
  let n = 2;
  while (n < 50) {
    const snap = await getDb()
      .collection('tenants')
      .where('type', '==', 'automotive_business')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty) return slug;
    slug = `${root}-${n}`;
    n += 1;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function markClientMustChangePassword(userId: string): Promise<void> {
  await getDb()
    .collection('users')
    .doc(userId)
    .set(
      {
        mustChangePassword: true,
        temporaryPasswordSetAt: nowTs(),
        updatedAt: nowTs(),
      },
      { merge: true }
    );
}

export async function provisionSalesEmployeeClient(input: {
  employeeId: string;
  role: SalesClientRole;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  categorySlug?: string;
  visitNotes: string;
  visitedAt: string;
  prospectRelation?: SalesProspectRelation | string;
}): Promise<{
  accountId: string;
  tenantId: string;
  userId: string;
  email: string;
  password: string;
  loginUrl: string;
  role: SalesClientRole;
}> {
  const employee = await getSalesEmployee(input.employeeId);
  if (!employee) throw new Error('Empleado no encontrado');
  if (employee.status !== 'active') throw new Error('El empleado está inactivo');

  const name = requireContactName(input.name);
  const phone = requireContactPhone(input.phone);
  const email = normalizeLoginEmail(input.email);
  const role = input.role;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Correo del cliente inválido');
  }

  const visitNotes = requireVisitNotes(input.visitNotes);
  const visitedAt = requireVisitedAt(input.visitedAt);
  const prospectRelation = parseOptionalSalesProspectRelation(input.prospectRelation);

  const password = generateTemporaryPassword();
  let tenantId = '';
  let userId = '';
  let companyName = String(input.companyName || name).trim();

  if (role === 'business') {
    let categorySlug = String(input.categorySlug || '').trim();
    if (!categorySlug) {
      const categories = await listBusinessCategories(true);
      categorySlug = categories[0]?.slug || '';
    }
    const category = categorySlug ? await getBusinessCategoryBySlug(categorySlug) : null;
    if (!category || !category.isActive) {
      throw new Error('Selecciona una categoría válida para el negocio');
    }
    const existing = await findPlatformProfile(email, 'business');
    if (existing) throw new PlatformProfileExistsError('business');

    const slug = await uniqueBusinessSlug(companyName);
    const tenant = await createTenant(companyName, 'automotive_business', undefined, '', companyName);
    tenantId = tenant.id;
    await getDb()
      .collection('tenants')
      .doc(tenantId)
      .set(
        {
          slug,
          categorySlug: category.slug,
          moduleKey: category.moduleKey,
          contactPhone: phone,
          contactEmail: email,
          published: false,
          verified: false,
          updatedAt: nowTs(),
        },
        { merge: true }
      );
    const user = await createUser(email, password, name, 'automotive_business', tenantId);
    userId = user.id;
    await getDb().collection('tenants').doc(tenantId).set({ ownerId: userId, updatedAt: nowTs() }, { merge: true });
    await finalizeUserRegistration(userId);
    void sendWelcomeEmailForRole({ email, name, role: 'automotive_business', createdByAdmin: true }).catch(() => undefined);
    void notifyPlatformAdminsOfRegistration({
      kind: 'business',
      name: companyName,
      email,
      title: 'Negocio creado por empleado de ventas',
      message: `${employee.name} creó el negocio ${companyName} (${email}).`,
      adminRoute: '/admin/empleados-ventas',
      metadata: { tenantId, userId, employeeId: employee.id },
    }).catch(() => undefined);
  } else {
    const existing = await findPlatformProfile(email, role);
    if (existing) throw new PlatformProfileExistsError(role);
    if (role === 'dealer' && !companyName) throw new Error('El nombre de la compañía es requerido');

    const tenantRef = getDb().collection('tenants').doc();
    tenantId = tenantRef.id;
    await tenantRef.set({
      name: role === 'dealer' ? companyName : name,
      type: role,
      status: 'active',
      subdomain: null,
      phone,
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });
    const user = await createUser(email, password, name, role, tenantId);
    userId = user.id;
    await tenantRef.update({ ownerId: userId });
    await finalizeUserRegistration(userId);
    void sendWelcomeEmailForRole({ email, name, role, createdByAdmin: true }).catch(() => undefined);
    void notifyPlatformAdminsOfRegistration({
      kind: role,
      name,
      email,
      title: role === 'dealer' ? 'Dealer creado por empleado de ventas' : 'Vendedor creado por empleado de ventas',
      message: `${employee.name} creó la cuenta ${name} (${email}).`,
      adminRoute: '/admin/empleados-ventas',
      metadata: { tenantId, userId, employeeId: employee.id },
    }).catch(() => undefined);
  }

  await markClientMustChangePassword(userId);
  await getDb()
    .collection('users')
    .doc(userId)
    .set({ platformTermsAcceptedAt: nowTs(), createdBySalesEmployeeId: employee.id, updatedAt: nowTs() }, { merge: true });

  await upsertNewsletterSubscriber({
    email,
    source: 'user_registration',
    name,
    role: role === 'business' ? 'automotive_business' : role,
    userId,
  }).catch(() => undefined);

  const accountRef = getDb().collection(SALES_ACCOUNTS_COL).doc();
  await accountRef.set({
    employeeId: employee.id,
    role,
    tenantId,
    userId,
    email,
    name,
    companyName: companyName || null,
    createdAt: nowTs(),
  });

  await getDb()
    .collection(SALES_EMPLOYEES_COL)
    .doc(employee.id)
    .set(
      {
        stats: {
          ...(employee.stats || {}),
          totalAccounts: Number(employee.stats?.totalAccounts || 0) + 1,
        },
        updatedAt: nowTs(),
      },
      { merge: true }
    );

  await createSalesEmployeeVisit({
    employeeId: employee.id,
    accountId: accountRef.id,
    tenantId,
    contactName: name,
    contactPhone: phone,
    contactEmail: email,
    companyName: companyName || undefined,
    prospectRole: role,
    prospectRelation,
    notes: visitNotes,
    visitedAt: visitedAt.toISOString(),
    membershipSold: false,
  });

  return {
    accountId: accountRef.id,
    tenantId,
    userId,
    email,
    password,
    loginUrl: getClientPortalLoginUrl(role),
    role,
  };
}

export async function listSalesEmployeeAccounts(employeeId?: string): Promise<Array<SalesEmployeeAccount & { id: string }>> {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_ACCOUNTS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(500).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        employeeId: String(data.employeeId || ''),
        role: (data.role || 'seller') as SalesClientRole,
        tenantId: String(data.tenantId || ''),
        userId: String(data.userId || ''),
        email: String(data.email || ''),
        name: String(data.name || ''),
        companyName: data.companyName ? String(data.companyName) : undefined,
        membershipId: data.membershipId ? String(data.membershipId) : undefined,
        createdAt: data.createdAt?.toDate?.(),
      };
    })
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

export async function listSalesMembershipsForRole(role: SalesClientRole) {
  return listMembershipCatalog({ type: role, activeOnly: true, excludeMultiDealer: true });
}

export async function createSalesEmployeePaymentLink(input: {
  employeeId: string;
  accountId: string;
  membershipId: string;
  checkoutUrl: string;
  stripeSessionId: string;
}): Promise<string> {
  const ref = getDb().collection(SALES_LINKS_COL).doc();
  await ref.set({
    employeeId: input.employeeId,
    accountId: input.accountId,
    membershipId: input.membershipId,
    checkoutUrl: input.checkoutUrl,
    stripeSessionId: input.stripeSessionId,
    status: 'open',
    createdAt: nowTs(),
    updatedAt: nowTs(),
  });
  return ref.id;
}

export async function markSalesEmployeePaymentLinkPaid(stripeSessionId: string): Promise<void> {
  const snap = await getDb()
    .collection(SALES_LINKS_COL)
    .where('stripeSessionId', '==', stripeSessionId)
    .limit(1)
    .get();
  if (snap.empty) return;
  await snap.docs[0].ref.update({ status: 'paid', paidAt: nowTs(), updatedAt: nowTs() });
}

export async function markSalesEmployeePaymentLinkExpired(stripeSessionId: string): Promise<void> {
  const sid = String(stripeSessionId || '').trim();
  if (!sid) return;
  const snap = await getDb()
    .collection(SALES_LINKS_COL)
    .where('stripeSessionId', '==', sid)
    .limit(1)
    .get();
  if (snap.empty) return;
  const status = String(snap.docs[0].data()?.status || '');
  if (status === 'paid') return;
  await snap.docs[0].ref.update({ status: 'expired', expiredAt: nowTs(), updatedAt: nowTs() });
}

export async function markOpenSalesEmployeePaymentLinksPaidForTenant(tenantId: string): Promise<void> {
  const account = await findAccountByTenant(tenantId);
  if (!account) return;
  const snap = await getDb()
    .collection(SALES_LINKS_COL)
    .where('accountId', '==', account.id)
    .limit(20)
    .get();
  const openDocs = snap.docs.filter((doc) => String(doc.data()?.status || '') === 'open');
  if (!openDocs.length) return;
  const batch = getDb().batch();
  openDocs.forEach((doc) => {
    batch.update(doc.ref, { status: 'paid', paidAt: nowTs(), updatedAt: nowTs() });
  });
  await batch.commit();
}

export async function markSalesEmployeeVisitMembershipSold(tenantId: string): Promise<void> {
  const tid = String(tenantId || '').trim();
  if (!tid) return;
  const snap = await getDb().collection(SALES_VISITS_COL).where('tenantId', '==', tid).limit(50).get();
  if (snap.empty) return;
  const batch = getDb().batch();
  let writes = 0;
  for (const doc of snap.docs) {
    if (doc.data()?.membershipSold === true) continue;
    batch.update(doc.ref, { membershipSold: true, membershipSoldAt: nowTs() });
    writes += 1;
  }
  if (writes) await batch.commit();
}

export async function listSalesEmployeePaymentLinks(employeeId?: string) {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_LINKS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(300).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
        createdAt: toIso(data.createdAt),
        paidAt: toIso(data.paidAt),
      };
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function findAccountByTenant(tenantId: string) {
  const snap = await getDb().collection(SALES_ACCOUNTS_COL).where('tenantId', '==', tenantId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() || {}) };
}

function membershipCommissionDocId(
  employeeId: string,
  stripeSubscriptionId: string,
  type: 'membership_first' | 'membership_second'
): string {
  return `${employeeId}_${stripeSubscriptionId}_${type}`.replace(/\//g, '_');
}

function adCommissionDocId(employeeId: string, stripePaymentIntentId: string): string {
  return `${employeeId}_${stripePaymentIntentId}_ad`.replace(/\//g, '_');
}

async function createCommissionDocIfMissing(
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    await getDb().collection(SALES_COMMISSIONS_COL).doc(id).create(data);
    return true;
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? Number((error as { code?: number }).code) : 0;
    if (code === 6) return false;
    throw error;
  }
}

async function commissionExists(params: {
  type: SalesCommissionType;
  employeeId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
}): Promise<boolean> {
  if (params.employeeId && params.stripeSubscriptionId && params.type !== 'ad') {
    const snap = await getDb()
      .collection(SALES_COMMISSIONS_COL)
      .doc(membershipCommissionDocId(params.employeeId, params.stripeSubscriptionId, params.type))
      .get();
    if (snap.exists) return true;
  }
  if (params.employeeId && params.stripePaymentIntentId && params.type === 'ad') {
    const snap = await getDb()
      .collection(SALES_COMMISSIONS_COL)
      .doc(adCommissionDocId(params.employeeId, params.stripePaymentIntentId))
      .get();
    if (snap.exists) return true;
  }
  let query: FirebaseFirestore.Query = getDb().collection(SALES_COMMISSIONS_COL).where('type', '==', params.type);
  if (params.stripeSubscriptionId) {
    query = query.where('stripeSubscriptionId', '==', params.stripeSubscriptionId);
  } else if (params.stripePaymentIntentId) {
    query = query.where('stripePaymentIntentId', '==', params.stripePaymentIntentId);
  } else {
    return false;
  }
  const snap = await query.limit(1).get();
  return !snap.empty;
}

export async function createSalesEmployeeMembershipCommissions(input: {
  employeeId?: string | null;
  tenantId: string;
  userId?: string;
  membershipId: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  amountPaid?: number;
}): Promise<void> {
  const employeeId = input.employeeId || (await getSalesEmployeeIdForTenant(input.tenantId));
  if (!employeeId) return;
  const stripeSubscriptionId = String(input.stripeSubscriptionId || '').trim();
  if (!stripeSubscriptionId) {
    console.warn('[sales-employees] comisión de membresía omitida: falta stripeSubscriptionId');
    return;
  }
  if (input.amountPaid != null && Number(input.amountPaid) <= 0) return;

  const exists = await commissionExists({
    type: 'membership_first',
    employeeId,
    stripeSubscriptionId,
  });
  if (exists) {
    if (input.stripeSessionId) await markSalesEmployeePaymentLinkPaid(input.stripeSessionId);
    await markSalesEmployeeVisitMembershipSold(input.tenantId);
    return;
  }

  const memberships = await listMembershipCatalog({ activeOnly: false });
  const membership = memberships.find((item) => item.id === input.membershipId);
  const planPrice = Number(membership?.price || 0);
  if (planPrice <= 0) {
    console.warn('[sales-employees] membresía sin precio, no se crea comisión', input.membershipId);
    return;
  }

  const half = Math.round(planPrice * SALES_MEMBERSHIP_COMMISSION_RATE * 100) / 100;
  const activatedAt = new Date();
  const account = await findAccountByTenant(input.tenantId);
  if (account) {
    await getDb()
      .collection(SALES_ACCOUNTS_COL)
      .doc(account.id)
      .update({ membershipId: input.membershipId, updatedAt: nowTs() });
  }

  const base = {
    employeeId,
    tenantId: input.tenantId,
    userId: input.userId || account?.userId || null,
    accountId: account?.id || null,
    membershipId: input.membershipId,
    stripeSubscriptionId,
    stripeSessionId: input.stripeSessionId || null,
    idempotencyKey: `${employeeId}_${stripeSubscriptionId}`,
    planPrice,
    amount: half,
    currency: String(membership?.currency || 'USD').toLowerCase(),
    activatedAt: admin.firestore.Timestamp.fromDate(activatedAt),
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };

  const createdFirst = await createCommissionDocIfMissing(
    membershipCommissionDocId(employeeId, stripeSubscriptionId, 'membership_first'),
    {
      ...base,
      type: 'membership_first',
      status: 'pending_hold',
      eligibleAt: admin.firestore.Timestamp.fromDate(addDays(activatedAt, SALES_MEMBERSHIP_HOLD_DAYS)),
    }
  );
  await createCommissionDocIfMissing(
    membershipCommissionDocId(employeeId, stripeSubscriptionId, 'membership_second'),
    {
      ...base,
      type: 'membership_second',
      status: 'pending_hold',
      eligibleAt: admin.firestore.Timestamp.fromDate(addMonths(activatedAt, SALES_MEMBERSHIP_SECOND_MONTHS)),
    }
  );

  if (input.stripeSessionId) {
    await markSalesEmployeePaymentLinkPaid(input.stripeSessionId);
  }
  await markOpenSalesEmployeePaymentLinksPaidForTenant(input.tenantId);
  await markSalesEmployeeVisitMembershipSold(input.tenantId);

  if (createdFirst) await refreshSalesEmployeeStats(employeeId);
}

export async function createSalesEmployeeAdCommission(input: {
  employeeId?: string | null;
  tenantId?: string;
  amountPaid: number;
  currency?: string;
  stripePaymentIntentId?: string;
  adKind?: string;
}): Promise<void> {
  const employeeId =
    input.employeeId || (input.tenantId ? await getSalesEmployeeIdForTenant(input.tenantId) : null);
  if (!employeeId) return;
  if (!isSalesAdCommissionType(input.adKind)) return;
  if (input.stripePaymentIntentId) {
    const exists = await commissionExists({
      type: 'ad',
      employeeId,
      stripePaymentIntentId: input.stripePaymentIntentId,
    });
    if (exists) return;
  }
  const paid = Number(input.amountPaid || 0);
  if (paid <= 0) return;
  const amount = Math.round(paid * SALES_AD_COMMISSION_RATE * 100) / 100;
  const account = input.tenantId ? await findAccountByTenant(input.tenantId) : null;
  const data = {
    employeeId,
    type: 'ad' as const,
    status: 'payable' as const,
    amount,
    planPrice: paid,
    currency: String(input.currency || 'usd').toLowerCase(),
    tenantId: input.tenantId || null,
    accountId: account?.id || null,
    stripePaymentIntentId: input.stripePaymentIntentId || null,
    adKind: input.adKind || 'ad',
    eligibleAt: admin.firestore.Timestamp.fromDate(new Date()),
    activatedAt: nowTs(),
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
  if (input.stripePaymentIntentId) {
    const created = await createCommissionDocIfMissing(
      adCommissionDocId(employeeId, input.stripePaymentIntentId),
      data
    );
    if (!created) return;
  } else {
    await getDb().collection(SALES_COMMISSIONS_COL).add(data);
  }
  await refreshSalesEmployeeStats(employeeId);
}

export async function voidSalesEmployeeMembershipCommissions(input: {
  tenantId?: string;
  stripeSubscriptionId?: string;
  reason?: 'cancelled' | 'payment_failed';
}): Promise<void> {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_COMMISSIONS_COL);
  if (input.stripeSubscriptionId) {
    query = query.where('stripeSubscriptionId', '==', input.stripeSubscriptionId);
  } else if (input.tenantId) {
    query = query.where('tenantId', '==', input.tenantId);
  } else {
    return;
  }

  const snap = await query.get();
  const now = new Date();
  const employeeIds = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const type = String(data.type || '');
    if (type !== 'membership_first' && type !== 'membership_second') continue;
    if (data.status === 'paid' || data.status === 'void_cancelled') continue;

    const activatedAt = data.activatedAt?.toDate?.() as Date | undefined;
    const holdEnds = activatedAt ? addDays(activatedAt, SALES_MEMBERSHIP_HOLD_DAYS) : null;
    const withinHold = holdEnds ? now.getTime() < holdEnds.getTime() : type === 'membership_first';

    const failed = input.reason === 'payment_failed';
    if (failed || (type === 'membership_first' && withinHold)) {
      await doc.ref.update({
        status: 'void_cancelled',
        voidedAt: nowTs(),
        updatedAt: nowTs(),
      });
      employeeIds.add(String(data.employeeId || ''));
    } else if (type === 'membership_second') {
      await doc.ref.update({
        status: withinHold ? 'void_cancelled' : 'blocked_inactive',
        voidedAt: nowTs(),
        updatedAt: nowTs(),
      });
      employeeIds.add(String(data.employeeId || ''));
    }
  }

  for (const employeeId of employeeIds) {
    if (!employeeId) continue;
    await createSalesEmployeeNotification({
      employeeId,
      title: input.reason === 'payment_failed' ? 'Pago de membresía falló' : 'Cliente canceló la membresía',
      message:
        input.reason === 'payment_failed'
          ? 'El cobro de la membresía falló. Esta comisión se anuló.'
          : withinHoldMessage(input.tenantId),
      type: input.reason === 'payment_failed' ? 'membership_payment_failed' : 'membership_cancelled',
      metadata: { tenantId: input.tenantId || null, stripeSubscriptionId: input.stripeSubscriptionId || null },
    });
    await refreshSalesEmployeeStats(employeeId);
  }
}

function withinHoldMessage(tenantId?: string) {
  return tenantId
    ? `El cliente (tenant ${tenantId}) canceló dentro de los 14 días. Esta venta no genera comisión. Haz seguimiento.`
    : 'Un cliente canceló dentro de los 14 días. Esta venta no genera comisión. Haz seguimiento.';
}

export async function createSalesEmployeeNotification(input: {
  employeeId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getDb().collection(SALES_NOTIFICATIONS_COL).add({
    employeeId: input.employeeId,
    title: input.title,
    message: input.message,
    type: input.type,
    read: false,
    metadata: input.metadata || {},
    createdAt: nowTs(),
  });
}

export async function listSalesEmployeeNotifications(employeeId: string, limit = 50) {
  const snap = await getDb()
    .collection(SALES_NOTIFICATIONS_COL)
    .where('employeeId', '==', employeeId)
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        title: String(data.title || ''),
        message: String(data.message || ''),
        type: String(data.type || ''),
        read: data.read === true,
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function markSalesEmployeeNotificationsRead(employeeId: string): Promise<void> {
  const snap = await getDb()
    .collection(SALES_NOTIFICATIONS_COL)
    .where('employeeId', '==', employeeId)
    .where('read', '==', false)
    .limit(100)
    .get();
  const batch = getDb().batch();
  snap.docs.forEach((doc) => batch.update(doc.ref, { read: true, readAt: nowTs() }));
  if (!snap.empty) await batch.commit();
}

export async function listSalesEmployeeCommissions(employeeId?: string): Promise<SalesEmployeeCommission[]> {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_COMMISSIONS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(500).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        employeeId: String(data.employeeId || ''),
        type: data.type as SalesCommissionType,
        status: data.status as SalesCommissionStatus,
        amount: Number(data.amount || 0),
        currency: String(data.currency || 'usd'),
        planPrice: data.planPrice != null ? Number(data.planPrice) : undefined,
        tenantId: data.tenantId ? String(data.tenantId) : undefined,
        userId: data.userId ? String(data.userId) : undefined,
        accountId: data.accountId ? String(data.accountId) : undefined,
        membershipId: data.membershipId ? String(data.membershipId) : undefined,
        stripeSubscriptionId: data.stripeSubscriptionId ? String(data.stripeSubscriptionId) : undefined,
        stripePaymentIntentId: data.stripePaymentIntentId ? String(data.stripePaymentIntentId) : undefined,
        adKind: data.adKind ? String(data.adKind) : undefined,
        eligibleAt: data.eligibleAt?.toDate?.(),
        activatedAt: data.activatedAt?.toDate?.(),
        paidAt: data.paidAt?.toDate?.(),
        voidedAt: data.voidedAt?.toDate?.(),
        stripeTransferId: data.stripeTransferId ? String(data.stripeTransferId) : undefined,
        payoutError: data.payoutError ? String(data.payoutError) : undefined,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.(),
      };
    })
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

export async function refreshSalesEmployeeStats(employeeId: string): Promise<void> {
  const commissions = await listSalesEmployeeCommissions(employeeId);
  const accounts = await listSalesEmployeeAccounts(employeeId);
  const pending = commissions
    .filter((item) => item.status === 'pending_hold' || item.status === 'payable')
    .reduce((sum, item) => sum + item.amount, 0);
  const paid = commissions.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
  const voided = commissions
    .filter((item) => item.status === 'void_cancelled' || item.status === 'blocked_inactive')
    .reduce((sum, item) => sum + item.amount, 0);

  await getDb()
    .collection(SALES_EMPLOYEES_COL)
    .doc(employeeId)
    .set(
      {
        stats: {
          totalAccounts: accounts.length,
          pendingPayout: Math.round(pending * 100) / 100,
          totalPaid: Math.round(paid * 100) / 100,
          totalVoided: Math.round(voided * 100) / 100,
        },
        updatedAt: nowTs(),
      },
      { merge: true }
    );
}

export async function createSalesEmployeeVisit(input: {
  employeeId: string;
  accountId?: string;
  tenantId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  prospectRole: SalesClientRole | string;
  prospectRelation?: SalesProspectRelation | string;
  notes: string;
  visitedAt: string;
  membershipSold?: boolean;
}): Promise<string> {
  const notes = requireVisitNotes(input.notes);
  const visitedAt = requireVisitedAt(input.visitedAt);
  const contactName = requireContactName(input.contactName);
  const contactPhone = requireContactPhone(input.contactPhone);
  const prospectRole = parseSalesClientRole(input.prospectRole);
  const prospectRelation = parseOptionalSalesProspectRelation(input.prospectRelation);
  const accountId = String(input.accountId || '').trim() || null;
  const membershipSold = false;
  const ref = getDb().collection(SALES_VISITS_COL).doc();
  await ref.set({
    employeeId: input.employeeId,
    accountId,
    tenantId: String(input.tenantId || '').trim() || null,
    contactName,
    contactPhone,
    contactEmail: String(input.contactEmail || '').trim() || null,
    companyName: String(input.companyName || '').trim() || null,
    prospectRole,
    prospectRelation,
    membershipSold,
    notes,
    visitedAt: admin.firestore.Timestamp.fromDate(visitedAt),
    createdAt: nowTs(),
  });
  return ref.id;
}

export async function listSalesEmployeeVisits(employeeId?: string) {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_VISITS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(300).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        employeeId: String(data.employeeId || ''),
        accountId: data.accountId ? String(data.accountId) : null,
        tenantId: data.tenantId ? String(data.tenantId) : null,
        contactName: String(data.contactName || ''),
        contactPhone: data.contactPhone ? String(data.contactPhone) : null,
        contactEmail: data.contactEmail ? String(data.contactEmail) : null,
        companyName: data.companyName ? String(data.companyName) : null,
        prospectRole: (data.prospectRole || '') as SalesClientRole | '',
        prospectRelation: (data.prospectRelation || '') as SalesProspectRelation | '',
        membershipSold: data.membershipSold === true,
        notes: String(data.notes || ''),
        visitedAt: toIso(data.visitedAt),
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => String(b.visitedAt || '').localeCompare(String(a.visitedAt || '')));
}

async function resolveClientAppointmentContact(input: {
  tenantId: string;
  userId: string;
  account: Record<string, unknown> & { id: string };
}): Promise<{
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  prospectRole: SalesClientRole;
  visitId?: string;
}> {
  const [userSnap, tenantSnap] = await Promise.all([
    getDb().collection('users').doc(input.userId).get(),
    getDb().collection('tenants').doc(input.tenantId).get(),
  ]);
  const user = userSnap.data() || {};
  const tenant = tenantSnap.data() || {};
  const contactName = String(input.account.name || user.name || tenant.name || '').trim();
  const contactEmail = String(input.account.email || user.email || tenant.contactEmail || '').trim();
  const companyName = String(input.account.companyName || tenant.name || '').trim();
  const prospectRole =
    salesRoleFromStored(input.account.role) ||
    salesRoleFromStored(tenant.type) ||
    salesRoleFromStored(user.role) ||
    salesRoleFromStored(user.membershipType);
  let contactPhone = String(tenant.phone || tenant.contactPhone || user.phone || '').trim();
  let visitId: string | undefined;

  if (!contactPhone) {
    const visits = await getDb()
      .collection(SALES_VISITS_COL)
      .where('tenantId', '==', input.tenantId)
      .limit(20)
      .get();
    const match = visits.docs.find((doc) => String(doc.data()?.contactPhone || '').trim());
    if (match) {
      contactPhone = String(match.data()?.contactPhone || '').trim();
      visitId = match.id;
    }
  }

  if (!contactName || !prospectRole) {
    throw new Error('No se pudo identificar a la persona de la cita. Actualiza nombre y tipo en tu perfil.');
  }
  if (!contactPhone) {
    throw new Error('No hay teléfono en tu perfil. Actualízalo para pedir la cita de configuración.');
  }

  return {
    contactName,
    contactPhone,
    contactEmail: contactEmail || undefined,
    companyName: companyName || undefined,
    prospectRole,
    visitId,
  };
}

export async function createSalesEmployeeAppointment(input: {
  employeeId: string;
  accountId?: string;
  tenantId?: string;
  visitId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  prospectRole: SalesClientRole | string;
  prospectRelation: SalesProspectRelation | string;
  kind: SalesAppointmentKind;
  scheduledAt: string;
  notes?: string;
  requestedBy: 'client' | 'admin' | 'employee';
  createdByAdminId?: string;
  clientUserId?: string;
  /** Solo admin: minutos de acceso al panel del cliente desde la fecha de la cita */
  grantAccessDurationMinutes?: number;
}): Promise<string> {
  const employee = await getSalesEmployee(input.employeeId);
  if (!employee) throw new Error('Empleado no encontrado');
  if (input.requestedBy === 'employee' && input.kind !== 'orientation') {
    throw new Error('El empleado solo puede crear citas de orientación. La de configuración la pide el dueño de la membresía.');
  }
  if (input.requestedBy === 'client' && input.kind !== 'setup') {
    throw new Error('El dueño de la membresía solo puede pedir la cita de configuración.');
  }
  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime())) throw new Error('Fecha de cita inválida');

  const contactName = requireContactName(input.contactName);
  const contactPhone = requireContactPhone(input.contactPhone);
  const prospectRole = parseSalesClientRole(input.prospectRole);
  const prospectRelation = parseSalesProspectRelation(input.prospectRelation);
  const accountId = String(input.accountId || '').trim() || null;
  const tenantId = String(input.tenantId || '').trim() || null;
  const visitId = String(input.visitId || '').trim() || null;

  const ref = getDb().collection(SALES_APPOINTMENTS_COL).doc();
  await ref.set({
    employeeId: input.employeeId,
    accountId,
    tenantId,
    visitId,
    contactName,
    contactPhone,
    contactEmail: String(input.contactEmail || '').trim() || null,
    companyName: String(input.companyName || '').trim() || null,
    prospectRole,
    prospectRelation,
    kind: input.kind,
    scheduledAt: admin.firestore.Timestamp.fromDate(when),
    notes: String(input.notes || '').trim() || null,
    requestedBy: input.requestedBy,
    createdByAdminId: input.createdByAdminId || null,
    clientUserId: input.clientUserId || null,
    status: 'scheduled',
    createdAt: nowTs(),
    updatedAt: nowTs(),
  });

  await createSalesEmployeeNotification({
    employeeId: input.employeeId,
    title: input.kind === 'setup' ? 'Nueva cita de configuración' : 'Nueva cita de orientación',
    message: `Cita con ${contactName} (${salesProspectLabel(prospectRole, prospectRelation)}) el ${when.toLocaleString('es-PR')}.`,
    type: 'appointment',
    metadata: { appointmentId: ref.id, tenantId, visitId },
  });

  // Acceso temporal: ligado a UNA cuenta específica (tenantId).
  try {
    const { createStaffAccessGrant, createStaffAccessRequest, listStaffAccessRequestsForEmployee } =
      await import('./staff-temp-access');

    const grantMinutes = Number(input.grantAccessDurationMinutes || 0);
    const accountLabel =
      String(input.companyName || '').trim() ||
      contactName ||
      (tenantId ? `Cuenta ${tenantId}` : '');

    if (input.requestedBy === 'admin' && grantMinutes >= 15) {
      if (!tenantId) {
        throw new Error(
          'Para otorgar acceso debes vincular una cuenta (membresía) a la cita'
        );
      }
      let targetUserId: string | undefined;
      if (accountId) {
        const accDoc = await getDb().collection(SALES_ACCOUNTS_COL).doc(accountId).get();
        if (accDoc.exists) {
          targetUserId = String(accDoc.data()?.userId || '') || undefined;
        }
      }
      await createStaffAccessGrant({
        salesEmployeeId: input.employeeId,
        grantedByAdminId: String(input.createdByAdminId || 'admin'),
        grantedByEmail: 'admin',
        startsAt: when,
        durationMinutes: grantMinutes,
        reason: `Cita ${input.kind} ${ref.id} · ${accountLabel}`,
        appointmentId: ref.id,
        targetTenantId: tenantId,
        targetAccountId: accountId || undefined,
        targetUserId,
        targetAccountLabel: accountLabel,
      });
      await createSalesEmployeeNotification({
        employeeId: input.employeeId,
        title: 'Acceso temporal a una cuenta',
        message: `Acceso a «${accountLabel}» desde ${when.toLocaleString('es-PR')} (${grantMinutes} min).`,
        type: 'appointment',
        metadata: { appointmentId: ref.id, grantMinutes, tenantId },
      });
    } else if (
      (input.requestedBy === 'employee' || input.requestedBy === 'client') &&
      tenantId
    ) {
      const existing = await listStaffAccessRequestsForEmployee(input.employeeId, 20);
      const pendingSame = existing.find(
        (r) => r.status === 'pending' && r.targetTenantId === tenantId
      );
      if (!pendingSame) {
        let targetUserId: string | undefined;
        if (accountId) {
          const accDoc = await getDb().collection(SALES_ACCOUNTS_COL).doc(accountId).get();
          if (accDoc.exists) {
            targetUserId = String(accDoc.data()?.userId || '') || undefined;
          }
        }
        if (input.clientUserId) targetUserId = input.clientUserId;
        await createStaffAccessRequest({
          salesEmployeeId: input.employeeId,
          requestedMinutes: 120,
          preferredStartAt: when,
          reason: `Cita ${input.kind} · ${accountLabel} — admin asigna duración`,
          appointmentId: ref.id,
          targetTenantId: tenantId,
          targetAccountId: accountId || undefined,
          targetUserId,
          targetAccountLabel: accountLabel,
        });
      }
    }
  } catch (err) {
    console.error('[sales appointment] staff access hook', err);
    if (err instanceof Error && err.message.includes('vincular una cuenta')) {
      throw err;
    }
  }

  return ref.id;
}

export async function requestSalesEmployeeAppointmentByClient(input: {
  tenantId: string;
  userId: string;
  kind: SalesAppointmentKind;
  scheduledAt: string;
  notes?: string;
}): Promise<string> {
  const account = await findAccountByTenant(input.tenantId);
  if (!account?.employeeId) {
    throw new Error('Esta cuenta no está asignada a un empleado de ventas');
  }
  const contact = await resolveClientAppointmentContact({
    tenantId: input.tenantId,
    userId: input.userId,
    account,
  });
  return createSalesEmployeeAppointment({
    employeeId: String(account.employeeId),
    accountId: account.id,
    tenantId: input.tenantId,
    visitId: contact.visitId,
    contactName: contact.contactName,
    contactPhone: contact.contactPhone,
    contactEmail: contact.contactEmail,
    companyName: contact.companyName,
    prospectRole: contact.prospectRole,
    prospectRelation: 'current',
    kind: 'setup',
    scheduledAt: input.scheduledAt,
    notes: input.notes,
    requestedBy: 'client',
    clientUserId: input.userId,
  });
}

export async function createSalesEmployeeOrientationAppointment(input: {
  employeeId: string;
  accountId?: string;
  tenantId?: string;
  visitId?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  companyName?: string;
  prospectRole: SalesClientRole | string;
  prospectRelation: SalesProspectRelation | string;
  scheduledAt: string;
  notes?: string;
}): Promise<string> {
  return createSalesEmployeeAppointment({
    ...input,
    kind: 'orientation',
    requestedBy: 'employee',
  });
}

export async function acceptSalesEmployeeCommissionRules(employeeId: string): Promise<void> {
  const employee = await getSalesEmployee(employeeId);
  if (!employee) throw new Error('Empleado no encontrado');
  if (employee.commissionRulesAcceptedAt) return;
  await getDb().collection(SALES_EMPLOYEES_COL).doc(employeeId).set(
    {
      commissionRulesAcceptedAt: nowTs(),
      updatedAt: nowTs(),
    },
    { merge: true }
  );
}

export async function listSalesEmployeeAppointments(employeeId?: string) {
  let query: FirebaseFirestore.Query = getDb().collection(SALES_APPOINTMENTS_COL);
  if (employeeId) query = query.where('employeeId', '==', employeeId);
  const snap = await query.limit(300).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        employeeId: String(data.employeeId || ''),
        accountId: data.accountId ? String(data.accountId) : null,
        tenantId: data.tenantId ? String(data.tenantId) : null,
        visitId: data.visitId ? String(data.visitId) : null,
        contactName: String(data.contactName || ''),
        contactPhone: data.contactPhone ? String(data.contactPhone) : null,
        contactEmail: data.contactEmail ? String(data.contactEmail) : null,
        companyName: data.companyName ? String(data.companyName) : null,
        prospectRole: (data.prospectRole || '') as SalesClientRole | '',
        prospectRelation: (data.prospectRelation || '') as SalesProspectRelation | '',
        kind: String(data.kind || 'orientation'),
        scheduledAt: toIso(data.scheduledAt),
        notes: data.notes ? String(data.notes) : '',
        requestedBy: String(data.requestedBy || ''),
        status: String(data.status || 'scheduled'),
        createdAt: toIso(data.createdAt),
      };
    })
    .sort((a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || '')));
}

export async function isTenantMembershipActive(tenantId: string): Promise<boolean> {
  const tenant = await getDb().collection('tenants').doc(tenantId).get();
  if (!tenant.exists) return false;
  const membershipId = String(tenant.data()?.membershipId || '').trim();
  if (!membershipId) return false;
  const sub = await getDb().collection('subscriptions').where('tenantId', '==', tenantId).limit(5).get();
  if (sub.empty) return false;
  return sub.docs.some((doc) => {
    const status = String(doc.data()?.status || '');
    return status === 'active' || status === 'trialing';
  });
}

export async function getSalesEmployeeDashboardData(employeeId: string) {
  const employee = await getSalesEmployee(employeeId);
  if (!employee) return null;
  const [accounts, commissions, visits, appointments, notifications, links] = await Promise.all([
    listSalesEmployeeAccounts(employeeId),
    listSalesEmployeeCommissions(employeeId),
    listSalesEmployeeVisits(employeeId),
    listSalesEmployeeAppointments(employeeId),
    listSalesEmployeeNotifications(employeeId),
    listSalesEmployeePaymentLinks(employeeId),
  ]);

  const now = Date.now();
  const nextPayout = commissions
    .filter((item) => item.status === 'pending_hold' || item.status === 'payable')
    .sort((a, b) => (a.eligibleAt?.getTime() || 0) - (b.eligibleAt?.getTime() || 0))[0];

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      status: employee.status,
      stripeConnectAccountId: employee.stripeConnectAccountId || null,
      stripeConnectOnboardingComplete: employee.stripeConnectOnboardingComplete === true,
      stripeConnectPayoutsEnabled: employee.stripeConnectPayoutsEnabled === true,
      commissionRulesAccepted: Boolean(employee.commissionRulesAcceptedAt),
      stats: employee.stats,
    },
    accounts: accounts.map((item) => ({
      ...item,
      createdAt: item.createdAt?.toISOString() || null,
      loginUrl: getClientPortalLoginUrl(item.role),
    })),
    commissions: commissions.map((item) => ({
      ...item,
      eligibleAt: item.eligibleAt?.toISOString() || null,
      activatedAt: item.activatedAt?.toISOString() || null,
      paidAt: item.paidAt?.toISOString() || null,
      createdAt: item.createdAt?.toISOString() || null,
    })),
    visits,
    appointments,
    notifications,
    paymentLinks: links,
    nextPayout: nextPayout
      ? {
          amount: nextPayout.amount,
          type: nextPayout.type,
          status: nextPayout.status,
          eligibleAt: nextPayout.eligibleAt?.toISOString() || null,
          isDue: (nextPayout.eligibleAt?.getTime() || 0) <= now,
        }
      : null,
    rules: {
      membership: 'Cobras el 50% del plan a los 14 días si el cliente no cancela. Si cancela en esos 14 días, $0. El otro 50% a los 6 meses si tú y el cliente siguen activos.',
      ads: 'Los anuncios, banners y promociones pagan 25% del valor pagado, sin espera de 14 días.',
    },
  };
}

export function serializeSalesEmployee(employee: SalesEmployee) {
  return {
    ...employee,
    createdAt: employee.createdAt?.toISOString() || null,
    updatedAt: employee.updatedAt?.toISOString() || null,
    portalUrl: getSalesEmployeePortalUrl(),
  };
}
