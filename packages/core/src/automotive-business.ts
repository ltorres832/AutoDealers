import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { createUser } from './users';
import { findPlatformProfile, PlatformProfileExistsError } from './platform-registration';
import { normalizeLoginEmail } from './user-auth-sync';
import { createTenant } from './tenants';
import { isFeatureEnabled } from './feature-flags';
import { notifyPlatformAdminsOfRegistration } from './platform-admin-notify';
import { sendWelcomeEmailForRole } from './welcome-email';
import { getBusinessCategoryBySlug, slugifyBusiness } from './automotive-categories';
import {
  declaredListMatches,
  getCategoryTaxonomy,
  hasAnyDeclared,
  matchesSpecialtyFilter,
  normalizeSlugList,
} from './automotive-specializations';
import { listBusinessServices } from './automotive-ops';
import type { Tenant } from './types';

function getDb() {
  return getFirestore();
}

export interface AutomotiveBusinessProfile {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName?: string;
  description: string;
  municipality: string;
  city: string;
  address: string;
  phone: string;
  contactEmail: string;
  hours?: string;
  published: boolean;
  verified: boolean;
  mobileService: boolean;
  moduleKey: string;
  logoUrl?: string;
  membershipId?: string;
  ownerId?: string;
  status?: string;
  vertical?: Record<string, unknown>;
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
}

export interface RegisterAutomotiveBusinessInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName: string;
  categorySlug: string;
  municipality?: string;
  city?: string;
  address?: string;
  description?: string;
  hours?: string;
  mobileService?: boolean;
  membershipId?: string;
  acceptPlatformTerms: boolean;
}

/** Foto de perfil del negocio = logo / imagen de marca. No usar foto de un servicio. */
export function pickBusinessProfileLogo(tenant: Tenant): string | undefined {
  const branding = tenant.branding || ({} as Tenant['branding']);
  const settings = (tenant.settings || {}) as Record<string, unknown>;
  const extra = tenant as Tenant & {
    logoUrl?: string;
    profileImage?: string;
    photoURL?: string;
  };
  const candidates = [
    branding.logoUrl,
    branding.logo,
    extra.logoUrl,
    extra.profileImage,
    extra.photoURL,
    settings.logoUrl,
    settings.profileImage,
    settings.photoURL,
  ];
  for (const candidate of candidates) {
    const url = String(candidate || '').trim();
    if (url) return url;
  }
  return undefined;
}

export function toPublicBusiness(tenant: Tenant, categoryName?: string): AutomotiveBusinessProfile {
  return {
    id: tenant.id,
    name: tenant.companyName || tenant.name,
    slug: tenant.slug || tenant.id,
    categorySlug: tenant.categorySlug || '',
    categoryName,
    description: tenant.description || '',
    municipality: tenant.municipality || '',
    city: tenant.city || '',
    address: tenant.address || '',
    phone: tenant.contactPhone || '',
    contactEmail: tenant.contactEmail || '',
    hours: typeof tenant.settings?.hours === 'string' ? tenant.settings.hours : '',
    published: tenant.published === true,
    verified: tenant.verified === true,
    mobileService: tenant.mobileService === true,
    moduleKey: tenant.moduleKey || 'general',
    logoUrl: pickBusinessProfileLogo(tenant),
    membershipId: tenant.membershipId,
    ownerId: tenant.ownerId,
    status: tenant.status,
    vertical: (tenant.settings?.vertical as Record<string, unknown>) || {},
    specialtySlugs: normalizeSlugList((tenant as Tenant & { specialtySlugs?: unknown }).specialtySlugs),
    vehicleScopeSlugs: normalizeSlugList((tenant as Tenant & { vehicleScopeSlugs?: unknown }).vehicleScopeSlugs),
  };
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

export async function registerAutomotiveBusiness(
  input: RegisterAutomotiveBusinessInput
): Promise<{ tenantId: string; userId: string; slug: string }> {
  const registrationEnabled = await isFeatureEnabled('public', 'business_registration_enabled');
  if (!registrationEnabled) {
    throw new Error('El registro de negocios no está habilitado.');
  }
  if (input.acceptPlatformTerms !== true) {
    throw new Error('Debes aceptar los términos y condiciones de la plataforma');
  }

  const category = await getBusinessCategoryBySlug(input.categorySlug);
  if (!category || !category.isActive) {
    throw new Error('Selecciona una categoría válida.');
  }

  const existingBusiness = await findPlatformProfile(normalizeLoginEmail(input.email), 'business');
  if (existingBusiness) {
    throw new PlatformProfileExistsError('business');
  }

  const companyName = String(input.companyName || input.name).trim();
  const slug = await uniqueBusinessSlug(companyName);
  const tenant = await createTenant(
    companyName,
    'automotive_business',
    undefined,
    input.membershipId || '',
    companyName
  );

  await getDb()
    .collection('tenants')
    .doc(tenant.id)
    .set(
      {
        slug,
        categorySlug: category.slug,
        moduleKey: category.moduleKey,
        description: String(input.description || '').trim(),
        municipality: String(input.municipality || input.city || '').trim(),
        city: String(input.city || input.municipality || '').trim(),
        address: String(input.address || '').trim(),
        contactPhone: String(input.phone || '').trim(),
        contactEmail: String(input.email || '').trim().toLowerCase(),
        published: false,
        verified: false,
        mobileService: input.mobileService === true,
        settings: {
          hours: String(input.hours || '').trim(),
          vertical: {},
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  const user = await createUser(
    input.email,
    input.password,
    input.name,
    'automotive_business',
    tenant.id,
    undefined,
    input.membershipId
  );

  await getDb()
    .collection('tenants')
    .doc(tenant.id)
    .set(
      {
        ownerId: user.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  void notifyPlatformAdminsOfRegistration({
    kind: 'business',
    name: companyName,
    email: input.email,
    title: 'Nuevo negocio automotriz',
    message: `${companyName} se registró como ${category.name}.`,
    adminRoute: `/admin/automotive-businesses`,
    metadata: { tenantId: tenant.id, categorySlug: category.slug },
  });

  void sendWelcomeEmailForRole({
    email: input.email,
    name: input.name,
    role: 'automotive_business',
  });

  return { tenantId: tenant.id, userId: user.id, slug };
}

function asFitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;/|]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function extractBusinessVehicleFit(vertical?: Record<string, unknown>): {
  makes: string[];
  models: string[];
  years: number[];
} {
  const data = vertical || {};
  const makes = [
    ...asFitList(data.makes),
    ...asFitList(data.make),
    ...asFitList(data.brands),
    ...asFitList(data.marcas),
  ];
  const models = [
    ...asFitList(data.models),
    ...asFitList(data.model),
    ...asFitList(data.modelos),
  ];
  const years: number[] = [];
  for (const raw of [...asFitList(data.years), ...asFitList(data.year)]) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1950 && n <= 2100) years.push(n);
  }
  return {
    makes: Array.from(new Set(makes)),
    models: Array.from(new Set(models)),
    years: Array.from(new Set(years)),
  };
}

export function businessMatchesVehicle(
  business: Pick<AutomotiveBusinessProfile, 'vertical'>,
  vehicle?: { make?: string; model?: string; year?: number }
): boolean {
  if (!vehicle?.make && !vehicle?.model && !vehicle?.year) return true;
  const fit = extractBusinessVehicleFit(business.vertical);
  const hasFit = fit.makes.length > 0 || fit.models.length > 0 || fit.years.length > 0;
  if (!hasFit) return true;
  if (fit.makes.length && vehicle.make) {
    const make = vehicle.make.trim().toLowerCase();
    if (!fit.makes.some((item) => item === make || item.includes(make) || make.includes(item))) {
      return false;
    }
  }
  if (fit.models.length && vehicle.model) {
    const model = vehicle.model.trim().toLowerCase();
    if (!fit.models.some((item) => item === model || item.includes(model) || model.includes(item))) {
      return false;
    }
  }
  if (fit.years.length && vehicle.year && !fit.years.includes(Number(vehicle.year))) {
    return false;
  }
  return true;
}

export async function listPublishedAutomotiveBusinesses(filters?: {
  categorySlug?: string;
  municipality?: string;
  mobileService?: boolean;
  query?: string;
  limit?: number;
  make?: string;
  model?: string;
  year?: number;
  specialtySlugs?: string[];
  vehicleScopeSlugs?: string[];
  requireDeclaredSpecializations?: boolean;
}): Promise<AutomotiveBusinessProfile[]> {
  const enabled = await isFeatureEnabled('public', 'automotive_businesses_enabled');
  if (!enabled) return [];

  let q: FirebaseFirestore.Query = getDb()
    .collection('tenants')
    .where('type', '==', 'automotive_business');

  if (filters?.categorySlug) {
    q = q.where('categorySlug', '==', slugifyBusiness(filters.categorySlug));
  }

  const snap = await q.limit(Math.min(filters?.limit || 200, 400)).get();
  const categories = new Map<string, string>();
  const taxonomyCache = new Map<string, Awaited<ReturnType<typeof getCategoryTaxonomy>>>();
  const items: AutomotiveBusinessProfile[] = [];
  const requestedSpecialties = normalizeSlugList(filters?.specialtySlugs);
  const requestedScopes = normalizeSlugList(filters?.vehicleScopeSlugs);
  const vehicle = {
    make: filters?.make,
    model: filters?.model,
    year: filters?.year,
  };
  const vehicleAware = Boolean(vehicle.make || vehicle.model || vehicle.year || requestedScopes.length);
  const specialtyAware = requestedSpecialties.length > 0;
  const strict = vehicleAware || specialtyAware || filters?.requireDeclaredSpecializations === true;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.published !== true) continue;
    if (data.status && data.status !== 'active') continue;
    const tenant = { id: doc.id, ...data } as Tenant;
    if (filters?.municipality) {
      const muni = String(filters.municipality).trim().toLowerCase();
      const hay = `${tenant.municipality || ''} ${tenant.city || ''}`.toLowerCase();
      if (muni && !hay.includes(muni)) continue;
    }
    if (filters?.mobileService === true && tenant.mobileService !== true) continue;
    if (filters?.query) {
      const needle = filters.query.trim().toLowerCase();
      const hay = `${tenant.name || ''} ${tenant.companyName || ''} ${tenant.description || ''} ${tenant.municipality || ''}`.toLowerCase();
      if (!hay.includes(needle)) continue;
    }
    const publicBusiness = toPublicBusiness(tenant);
    if (strict) {
      let effectiveSpecialties = publicBusiness.specialtySlugs || [];
      let effectiveScopes = publicBusiness.vehicleScopeSlugs || [];
      if (
        (specialtyAware && !matchesSpecialtyFilter(effectiveSpecialties, requestedSpecialties)) ||
        (vehicleAware && !hasAnyDeclared(effectiveScopes)) ||
        filters?.requireDeclaredSpecializations
      ) {
        const services = await listBusinessServices(publicBusiness.id, true);
        effectiveSpecialties = Array.from(
          new Set([...effectiveSpecialties, ...services.flatMap((svc) => svc.specialtySlugs || [])])
        );
        effectiveScopes = Array.from(
          new Set([...effectiveScopes, ...services.flatMap((svc) => svc.vehicleScopeSlugs || [])])
        );
      }
      if (filters?.requireDeclaredSpecializations && (!hasAnyDeclared(effectiveSpecialties) || !hasAnyDeclared(effectiveScopes))) {
        continue;
      }
      if (specialtyAware && !matchesSpecialtyFilter(effectiveSpecialties, requestedSpecialties)) {
        continue;
      }
      if (vehicleAware) {
        if (!hasAnyDeclared(effectiveScopes)) continue;
        const categorySlug = publicBusiness.categorySlug || '';
        if (!taxonomyCache.has(categorySlug)) {
          taxonomyCache.set(categorySlug, categorySlug ? await getCategoryTaxonomy(categorySlug) : null);
        }
        const taxonomy = taxonomyCache.get(categorySlug);
        const scopeItems = taxonomy?.vehicleScopes || [];
        if (requestedScopes.length && !requestedScopes.some((slug) => effectiveScopes.includes(slug))) {
          continue;
        }
        if ((vehicle.make || vehicle.model) && !declaredListMatches(effectiveScopes, scopeItems, vehicle)) {
          continue;
        }
      }
      if (
        !businessMatchesVehicle(publicBusiness, {
          make: filters?.make,
          model: filters?.model,
          year: filters?.year,
        })
      ) {
        continue;
      }
    }
    let categoryName = categories.get(tenant.categorySlug || '');
    if (!categoryName && tenant.categorySlug) {
      const cat = await getBusinessCategoryBySlug(tenant.categorySlug);
      categoryName = cat?.name || tenant.categorySlug;
      categories.set(tenant.categorySlug, categoryName);
    }
    items.push(toPublicBusiness(tenant, categoryName));
  }

  return items;
}

export async function getAutomotiveBusinessBySlug(
  categorySlug: string,
  businessSlug: string
): Promise<AutomotiveBusinessProfile | null> {
  const enabled = await isFeatureEnabled('public', 'automotive_businesses_enabled');
  if (!enabled) return null;

  const snap = await getDb()
    .collection('tenants')
    .where('type', '==', 'automotive_business')
    .where('slug', '==', slugifyBusiness(businessSlug))
    .limit(1)
    .get();
  if (snap.empty) return null;
  const tenant = { id: snap.docs[0].id, ...snap.docs[0].data() } as Tenant;
  if (tenant.published !== true) return null;
  if (categorySlug && tenant.categorySlug !== slugifyBusiness(categorySlug)) return null;
  const cat = tenant.categorySlug ? await getBusinessCategoryBySlug(tenant.categorySlug) : null;
  return toPublicBusiness(tenant, cat?.name);
}

export async function getAutomotiveBusinessById(tenantId: string): Promise<AutomotiveBusinessProfile | null> {
  const doc = await getDb().collection('tenants').doc(tenantId).get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  if (data.type !== 'automotive_business') return null;
  const tenant = { id: doc.id, ...data } as Tenant;
  const cat = tenant.categorySlug ? await getBusinessCategoryBySlug(tenant.categorySlug) : null;
  return toPublicBusiness(tenant, cat?.name);
}

export async function listAutomotiveBusinessesAdmin(includeUnpublished = true): Promise<AutomotiveBusinessProfile[]> {
  const snap = await getDb()
    .collection('tenants')
    .where('type', '==', 'automotive_business')
    .limit(500)
    .get();
  const items: AutomotiveBusinessProfile[] = [];
  for (const doc of snap.docs) {
    const tenant = { id: doc.id, ...doc.data() } as Tenant;
    if (!includeUnpublished && tenant.published !== true) continue;
    const cat = tenant.categorySlug ? await getBusinessCategoryBySlug(tenant.categorySlug) : null;
    items.push(toPublicBusiness(tenant, cat?.name));
  }
  return items;
}

export async function updateAutomotiveBusiness(
  tenantId: string,
  updates: Partial<AutomotiveBusinessProfile> & { hours?: string; vertical?: Record<string, unknown> }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (updates.name) {
    payload.name = updates.name;
    payload.companyName = updates.name;
  }
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.municipality !== undefined) payload.municipality = updates.municipality;
  if (updates.city !== undefined) payload.city = updates.city;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.phone !== undefined) payload.contactPhone = updates.phone;
  if (updates.contactEmail !== undefined) payload.contactEmail = updates.contactEmail;
  if (updates.specialtySlugs !== undefined) payload.specialtySlugs = normalizeSlugList(updates.specialtySlugs);
  if (updates.vehicleScopeSlugs !== undefined) payload.vehicleScopeSlugs = normalizeSlugList(updates.vehicleScopeSlugs);
  if (updates.published !== undefined) payload.published = updates.published;
  if (updates.verified !== undefined) payload.verified = updates.verified;
  if (updates.mobileService !== undefined) payload.mobileService = updates.mobileService;
  if (updates.categorySlug !== undefined) payload.categorySlug = slugifyBusiness(updates.categorySlug);
  if (updates.moduleKey !== undefined) payload.moduleKey = updates.moduleKey;
  if (updates.hours !== undefined || updates.vertical !== undefined) {
    payload.settings = {
      ...(updates.hours !== undefined ? { hours: updates.hours } : {}),
      ...(updates.vertical !== undefined ? { vertical: updates.vertical } : {}),
    };
  }
  if (updates.logoUrl !== undefined) {
    const snap = await getDb().collection('tenants').doc(tenantId).get();
    const existingBranding = (snap.data()?.branding as Record<string, unknown>) || {};
    payload.branding = {
      ...existingBranding,
      logo: updates.logoUrl || '',
      logoUrl: updates.logoUrl || '',
    };
  }

  const listingFieldsTouched =
    updates.published !== undefined ||
    updates.specialtySlugs !== undefined ||
    updates.vehicleScopeSlugs !== undefined;
  if (listingFieldsTouched) {
    const existing = await getDb().collection('tenants').doc(tenantId).get();
    const existingData = existing.data() || {};
    const nextSpecialties =
      updates.specialtySlugs !== undefined
        ? normalizeSlugList(updates.specialtySlugs)
        : normalizeSlugList(existingData.specialtySlugs);
    const nextScopes =
      updates.vehicleScopeSlugs !== undefined
        ? normalizeSlugList(updates.vehicleScopeSlugs)
        : normalizeSlugList(existingData.vehicleScopeSlugs);
    const willPublish =
      updates.published === true || (updates.published === undefined && existingData.published === true);
    if (willPublish && (!nextSpecialties.length || !nextScopes.length)) {
      throw new Error(
        'Antes de publicar, indica qué trabajos haces y en qué vehículos trabajas. Un listado vacío no significa que haces de todo.'
      );
    }
  }

  await getDb().collection('tenants').doc(tenantId).set(payload, { merge: true });
}

export async function ensureDefaultBusinessMemberships(): Promise<number> {
  const db = getDb();
  const existing = await db.collection('memberships').where('type', '==', 'business').limit(10).get();
  if (!existing.empty) return 0;

  const plans = [
    {
      name: 'Servicios Esencial',
      price: 29,
      features: {
        appointmentScheduling: true,
        crmAdvanced: false,
        socialMediaEnabled: false,
        paymentProcessing: false,
        aiEnabled: false,
        customSubdomain: false,
        customDomain: false,
        marketplaceEnabled: true,
      },
    },
    {
      name: 'Servicios Pro',
      price: 59,
      features: {
        appointmentScheduling: true,
        crmAdvanced: true,
        socialMediaEnabled: true,
        paymentProcessing: false,
        aiEnabled: true,
        customSubdomain: true,
        customDomain: false,
        marketplaceEnabled: true,
      },
    },
    {
      name: 'Servicios Premium',
      price: 99,
      features: {
        appointmentScheduling: true,
        crmAdvanced: true,
        socialMediaEnabled: true,
        paymentProcessing: true,
        aiEnabled: true,
        customSubdomain: true,
        customDomain: false,
        marketplaceEnabled: true,
        prioritySupport: true,
      },
    },
  ];

  let created = 0;
  for (const plan of plans) {
    await db.collection('memberships').add({
      name: plan.name,
      description: 'Membresía mensual para talleres, gomeras y servicios automotrices.',
      type: 'business',
      audience: 'automotive_services',
      price: plan.price,
      currency: 'USD',
      billingCycle: 'monthly',
      isActive: true,
      features: plan.features,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created += 1;
  }
  return created;
}
