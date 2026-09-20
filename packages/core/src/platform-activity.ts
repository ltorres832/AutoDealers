import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'node:crypto';
import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';

export const PLATFORM_ACTIVITY_COLLECTION = 'platform_daily_activity';
export const PUBLIC_WEB_VISITS_COLLECTION = 'public_web_daily_visits';
export const PLATFORM_ACTIVITY_TIME_ZONE = 'America/Puerto_Rico';

export const PLATFORM_APPS = ['public-web', 'advertiser', 'dealer', 'seller', 'admin', 'business'] as const;
export type PlatformApp = (typeof PLATFORM_APPS)[number];

export const PLATFORM_APP_LABELS: Record<PlatformApp, string> = {
  'public-web': 'Sitio público',
  advertiser: 'Anunciante',
  dealer: 'Dealer',
  seller: 'Vendedor',
  admin: 'Admin',
  business: 'Negocio',
};

const MAX_PATH_LENGTH = 300;
const MAX_PATHS_PER_DAY = 200;
const RATE_LIMIT_PER_MINUTE = 80;
const OTHER_PATH = '/__other__';
const OTHER_PATH_FIELD = 'other';

const PUBLIC_WEB_ROOTS = new Set([
  'plataforma',
  'precios',
  'register',
  'registro',
  'contacto',
  'login',
  'advertise',
  'dealers',
  'dealer',
  'seller',
  'search',
  'servicios',
  'faq',
  'caracteristicas',
  'sobre-nosotros',
  'privacidad',
  'terminos',
  'publicar-gratis',
  'compare',
  'mis-anuncios',
  'demo-dealer',
  'demo-vendedor',
  'affiliate',
  'partners',
  'promo',
  'policies',
  'anuncio',
  'category',
  'home-seller',
  'ads-preview',
  'auth',
  'contracts',
  'documents',
  'eliminar-datos',
  'evaluar',
  'fi',
  'review',
  'setup-firebase',
  'survey',
  'upload-documents',
  'dashboard',
  'admin',
]);

const PATH_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/plataforma': 'Plataforma',
  '/precios': 'Membresías / precios',
  '/register': 'Registro',
  '/register/membership': 'Registro / membresía',
  '/register/success': 'Registro / éxito',
  '/register/multi-dealer': 'Registro multi-dealer',
  '/register/multi-dealer/success': 'Registro multi-dealer / éxito',
  '/registro': 'Registro (legacy)',
  '/contacto': 'Contacto',
  '/login': 'Login',
  '/advertise': 'Publicitar',
  '/dealers': 'Dealers',
  '/search': 'Búsqueda / inventario',
  '/faq': 'FAQ',
  '/caracteristicas': 'Características',
  '/sobre-nosotros': 'Sobre nosotros',
  '/demo-dealer': 'Demo dealer',
  '/demo-vendedor': 'Demo vendedor',
  '/publicar-gratis': 'Publicar gratis',
  '/privacidad': 'Privacidad',
  '/terminos': 'Términos',
  '/compare': 'Comparar',
  '/mis-anuncios': 'Mis anuncios',
  '/dashboard': 'Dashboard',
  '/dashboard/ads': 'Anuncios',
  '/dashboard/ads/create': 'Crear anuncio',
  '/dashboard/ads/:id': 'Detalle de anuncio',
  '/dashboard/billing': 'Facturación',
  '/dashboard/payments': 'Pagos',
  '/dashboard/plan': 'Plan',
  '/dashboard/profile': 'Perfil',
  '/dashboard/metrics': 'Métricas',
  '/dashboard/policies': 'Políticas',
  '/inventory': 'Inventario',
  '/inventory/:id': 'Inventario / detalle',
  '/leads': 'Leads',
  '/settings': 'Ajustes',
  '/settings/membership': 'Ajustes / membresía',
  '/:subdomain': 'Sitio de dealer',
  '/:subdomain/vehicle/:id': 'Ficha de vehículo',
  '/vehicle/:id': 'Ficha de vehículo',
  '/dealer/:id': 'Página de dealer',
  '/seller/:id': 'Página de vendedor',
  '/anuncio/:id': 'Anuncio público',
  [OTHER_PATH]: 'Otras páginas',
};

export const HIGHLIGHT_PATHS: Array<{ app: PlatformApp; path: string }> = [
  { app: 'public-web', path: '/plataforma' },
  { app: 'public-web', path: '/precios' },
  { app: 'public-web', path: '/register' },
  { app: 'public-web', path: '/register/membership' },
  { app: 'public-web', path: '/registro' },
  { app: 'public-web', path: '/contacto' },
  { app: 'public-web', path: '/' },
  { app: 'public-web', path: '/search' },
  { app: 'advertiser', path: '/login' },
  { app: 'advertiser', path: '/register' },
  { app: 'advertiser', path: '/dashboard' },
  { app: 'advertiser', path: '/dashboard/ads' },
  { app: 'advertiser', path: '/dashboard/billing' },
  { app: 'dealer', path: '/login' },
  { app: 'dealer', path: '/dashboard' },
  { app: 'seller', path: '/login' },
  { app: 'seller', path: '/dashboard' },
];

type AppTotals = {
  uniqueVisitors: number;
  pageViews: number;
};

export type PlatformPathRow = {
  app: PlatformApp;
  path: string;
  label: string;
  pageViews: number;
};

export type PlatformDayRow = {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
  byApp: Record<PlatformApp, AppTotals>;
  paths: PlatformPathRow[];
};

type RateWindow = { count: number; resetAt: number };
const rateWindows = new Map<string, RateWindow>();

export function dateKeyInTimeZone(date = new Date(), timeZone = PLATFORM_ACTIVITY_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addDaysToDateKey(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfMonthKey(todayKey: string): string {
  return `${todayKey.slice(0, 7)}-01`;
}

export function isPlatformApp(value: unknown): value is PlatformApp {
  return typeof value === 'string' && (PLATFORM_APPS as readonly string[]).includes(value);
}

export function labelPlatformPath(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  if (path.startsWith('/register')) return 'Registro / membresía';
  if (path.startsWith('/plataforma')) return 'Plataforma';
  if (path.startsWith('/precios')) return 'Membresías / precios';
  if (path.startsWith('/dashboard/ads')) return 'Anuncios';
  if (path.startsWith('/dashboard/billing')) return 'Facturación';
  if (path.startsWith('/settings/membership')) return 'Ajustes / membresía';
  return path;
}

export function normalizePlatformPath(raw: string, app: PlatformApp): string {
  const withoutQuery = String(raw || '/').split('?')[0].split('#')[0].trim() || '/';
  const withSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  const trimmed = withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const segments = trimmed === '/' ? [] : trimmed.slice(1).split('/');

  const normalized = segments.map((segment, index) => {
    if (isDynamicSegment(segment)) return ':id';
    if (app === 'public-web' && index === 0 && !PUBLIC_WEB_ROOTS.has(segment.toLowerCase())) {
      return ':subdomain';
    }
    return segment;
  });

  const path = normalized.length ? `/${normalized.join('/')}` : '/';
  return path.slice(0, MAX_PATH_LENGTH);
}

function isDynamicSegment(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  if (/^[0-9a-f]{20,}$/i.test(segment)) return true;
  if (/^\d{4,}$/.test(segment)) return true;
  if (/^[A-Za-z0-9_-]{22,}$/.test(segment)) return true;
  return false;
}

function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function isLikelyBot(userAgent: string): boolean {
  return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview/i.test(
    userAgent
  );
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || '';
  return request.headers.get('x-real-ip') || '';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (rateWindows.size > 4000) {
    for (const [id, window] of rateWindows) {
      if (now >= window.resetAt) rateWindows.delete(id);
    }
  }
  const existing = rateWindows.get(key);
  if (!existing || now >= existing.resetAt) {
    rateWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  existing.count += 1;
  return existing.count > RATE_LIMIT_PER_MINUTE;
}

function emptyAppTotals(): Record<PlatformApp, AppTotals> {
  return {
    'public-web': { uniqueVisitors: 0, pageViews: 0 },
    advertiser: { uniqueVisitors: 0, pageViews: 0 },
    dealer: { uniqueVisitors: 0, pageViews: 0 },
    seller: { uniqueVisitors: 0, pageViews: 0 },
    admin: { uniqueVisitors: 0, pageViews: 0 },
  };
}

function asTotals(value: unknown): AppTotals {
  const row = (value || {}) as Record<string, unknown>;
  return {
    uniqueVisitors: Number(row.uniqueVisitors || 0),
    pageViews: Number(row.pageViews || 0),
  };
}

function pathFieldKey(path: string): string {
  if (path === '/') return 'home';
  return path.replace(/^\//, '').replace(/\//g, '__').replace(/[^A-Za-z0-9._~-]/g, '_') || 'home';
}

function pathFromFieldKey(key: string): string {
  if (key === 'home') return '/';
  if (key === OTHER_PATH_FIELD) return OTHER_PATH;
  return `/${String(key).replace(/__/g, '/')}`;
}

function countStoredPaths(byPath: Record<string, Record<string, number>> | undefined): number {
  if (!byPath) return 0;
  return Object.values(byPath).reduce((sum, paths) => sum + Object.keys(paths || {}).length, 0);
}

function eachDateKey(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd, 12));
  for (let i = 0; i < 120; i += 1) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`;
    keys.push(key);
    if (key >= endKey) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export async function recordPlatformVisit(input: {
  app?: unknown;
  path?: unknown;
  referrer?: unknown;
  visitorId?: unknown;
  userAgent: string;
  ip: string;
  refererHeader?: string | null;
  defaultApp: PlatformApp;
}): Promise<{ ok: true; ignored?: boolean } | { ok: false; status: number }> {
  const userAgent = input.userAgent || '';
  if (!userAgent || isLikelyBot(userAgent)) {
    return { ok: true, ignored: true };
  }

  const app = isPlatformApp(input.app) ? input.app : input.defaultApp;
  const rawPath = typeof input.path === 'string' && input.path.trim() ? input.path.trim() : '/';
  if (rawPath.length > MAX_PATH_LENGTH) {
    return { ok: true, ignored: true };
  }
  const path = normalizePlatformPath(rawPath, app);
  const referrer =
    typeof input.referrer === 'string' && input.referrer.trim()
      ? input.referrer.trim().slice(0, 500)
      : input.refererHeader?.slice(0, 500) || null;

  const rateKey = hash(`${input.ip || 'unknown'}:${app}`).slice(0, 24);
  if (isRateLimited(rateKey)) {
    return { ok: true, ignored: true };
  }

  const visitorSeed =
    typeof input.visitorId === 'string' && input.visitorId.trim()
      ? input.visitorId.trim()
      : `${input.ip || 'unknown'}:${userAgent}`;
  const visitorHash = hash(visitorSeed).slice(0, 48);

  const db = getFirestore();
  const day = dateKeyInTimeZone();
  const dayRef = db.collection(PLATFORM_ACTIVITY_COLLECTION).doc(day);
  const visitorRef = dayRef.collection('visitors').doc(visitorHash);
  const increment = admin.firestore.FieldValue.increment;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const [visitorDoc, dayDoc] = await Promise.all([tx.get(visitorRef), tx.get(dayRef)]);
    const existingApps = ((visitorDoc.data()?.apps || {}) as Record<string, boolean>) || {};
    const isNewVisitor = !visitorDoc.exists;
    const isNewAppVisitor = isNewVisitor || !existingApps[app];

    const storedByPath = (dayDoc.data()?.byPath || {}) as Record<string, Record<string, number>>;
    const appPaths = storedByPath[app] || {};
    const preferredKey = pathFieldKey(path);
    const pathExists = Object.prototype.hasOwnProperty.call(appPaths, preferredKey);
    const pathKey =
      pathExists || countStoredPaths(storedByPath) < MAX_PATHS_PER_DAY ? preferredKey : OTHER_PATH_FIELD;

    if (isNewVisitor) {
      tx.set(visitorRef, {
        visitorHash,
        apps: { [app]: true },
        firstApp: app,
        firstPath: path,
        firstReferrer: referrer,
        userAgent: userAgent.slice(0, 240),
        createdAt: now,
        lastSeenAt: now,
        pageViews: 1,
      });
    } else {
      tx.update(visitorRef, {
        lastSeenAt: now,
        pageViews: increment(1),
        [`apps.${app}`]: true,
      });
    }

    const payload: Record<string, unknown> = {
      date: day,
      pageViews: increment(1),
      [`byApp.${app}.pageViews`]: increment(1),
      [`byPath.${app}.${pathKey}`]: increment(1),
      updatedAt: now,
      createdAt: now,
    };
    if (isNewVisitor) {
      payload.uniqueVisitors = increment(1);
    }
    if (isNewAppVisitor) {
      payload[`byApp.${app}.uniqueVisitors`] = increment(1);
    }

    tx.set(dayRef, payload, { merge: true });
  });

  if (app === 'public-web') {
    try {
      const legacyRef = db.collection(PUBLIC_WEB_VISITS_COLLECTION).doc(day);
      const legacyVisitorRef = legacyRef.collection('visitors').doc(visitorHash);
      await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
        const visitorDoc = await tx.get(legacyVisitorRef);
        const legacyPayload: Record<string, unknown> = {
          date: day,
          pageViews: increment(1),
          updatedAt: now,
          createdAt: now,
        };
        if (!visitorDoc.exists) {
          legacyPayload.uniqueVisitors = increment(1);
          tx.set(legacyVisitorRef, {
            visitorHash,
            firstPath: path,
            firstReferrer: referrer,
            userAgent: userAgent.slice(0, 240),
            createdAt: now,
            lastSeenAt: now,
            pageViews: 1,
          });
        } else {
          tx.update(legacyVisitorRef, {
            lastSeenAt: now,
            pageViews: increment(1),
          });
        }
        tx.set(legacyRef, legacyPayload, { merge: true });
      });
    } catch (error) {
      console.warn('legacy public_web_daily_visits write skipped', error);
    }
  }

  return { ok: true };
}

export async function handlePlatformVisitPost(request: NextRequest, defaultApp: PlatformApp) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      app?: string;
      path?: string;
      referrer?: string;
      visitorId?: string;
    };

    const result = await recordPlatformVisit({
      app: body.app,
      path: body.path,
      referrer: body.referrer,
      visitorId: body.visitorId,
      userAgent: request.headers.get('user-agent') || '',
      ip: getClientIp(request),
      refererHeader: request.headers.get('referer'),
      defaultApp,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false }, { status: result.status || 500 });
    }
    return NextResponse.json({ ok: true, ignored: result.ignored === true });
  } catch (error) {
    console.error('POST platform analytics visit', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function mapPlatformDay(id: string, data: FirebaseFirestore.DocumentData): PlatformDayRow {
  const byAppRaw = (data.byApp || {}) as Record<string, unknown>;
  const byApp = emptyAppTotals();
  for (const app of PLATFORM_APPS) {
    byApp[app] = asTotals(byAppRaw[app]);
  }

  const byPathRaw = (data.byPath || {}) as Record<string, Record<string, number>>;
  const paths: PlatformPathRow[] = [];
  for (const app of PLATFORM_APPS) {
    const appPaths = byPathRaw[app] || {};
    for (const [encodedPath, views] of Object.entries(appPaths)) {
      const path = pathFromFieldKey(encodedPath);
      paths.push({
        app,
        path,
        label: labelPlatformPath(path),
        pageViews: Number(views || 0),
      });
    }
  }
  paths.sort((a, b) => b.pageViews - a.pageViews);

  return {
    date: String(data.date || id),
    uniqueVisitors: Number(data.uniqueVisitors || 0),
    pageViews: Number(data.pageViews || 0),
    byApp,
    paths,
  };
}

function mapLegacyPublicDay(id: string, data: FirebaseFirestore.DocumentData): PlatformDayRow {
  const totals = {
    uniqueVisitors: Number(data.uniqueVisitors || 0),
    pageViews: Number(data.pageViews || 0),
  };
  const byApp = emptyAppTotals();
  byApp['public-web'] = totals;
  return {
    date: String(data.date || id),
    uniqueVisitors: totals.uniqueVisitors,
    pageViews: totals.pageViews,
    byApp,
    paths: [],
  };
}

async function getDocsById(collectionName: string, keys: string[]) {
  const db = getFirestore();
  const refs = keys.map((key) => db.collection(collectionName).doc(key));
  if (typeof db.getAll === 'function') {
    const snaps: FirebaseFirestore.DocumentSnapshot[] = [];
    for (let i = 0; i < refs.length; i += 80) {
      snaps.push(...(await db.getAll(...refs.slice(i, i + 80))));
    }
    return snaps;
  }
  return Promise.all(refs.map((ref: FirebaseFirestore.DocumentReference) => ref.get()));
}

function mergeLegacyPublicWeb(platform: PlatformDayRow, legacy: PlatformDayRow | null): PlatformDayRow {
  if (!legacy) return platform;
  const platformPublic = platform.byApp['public-web'] || { uniqueVisitors: 0, pageViews: 0 };
  const legacyPublic = legacy.byApp['public-web'] || { uniqueVisitors: 0, pageViews: 0 };
  if (legacyPublic.pageViews <= platformPublic.pageViews && legacyPublic.uniqueVisitors <= platformPublic.uniqueVisitors) {
    return platform;
  }
  const byApp = {
    ...platform.byApp,
    'public-web': {
      uniqueVisitors: Math.max(platformPublic.uniqueVisitors, legacyPublic.uniqueVisitors),
      pageViews: Math.max(platformPublic.pageViews, legacyPublic.pageViews),
    },
  };
  const otherApps = PLATFORM_APPS.filter((app) => app !== 'public-web').reduce(
    (sum, app) => ({
      uniqueVisitors: sum.uniqueVisitors + (byApp[app]?.uniqueVisitors || 0),
      pageViews: sum.pageViews + (byApp[app]?.pageViews || 0),
    }),
    { uniqueVisitors: 0, pageViews: 0 }
  );
  return {
    ...platform,
    byApp,
    uniqueVisitors: otherApps.uniqueVisitors + byApp['public-web'].uniqueVisitors,
    pageViews: otherApps.pageViews + byApp['public-web'].pageViews,
  };
}

export async function listPlatformActivityDays(startKey: string, endKey: string): Promise<PlatformDayRow[]> {
  const keys = eachDateKey(startKey, endKey);
  if (keys.length === 0) return [];

  const [platformSnaps, legacySnaps] = await Promise.all([
    getDocsById(PLATFORM_ACTIVITY_COLLECTION, keys),
    getDocsById(PUBLIC_WEB_VISITS_COLLECTION, keys),
  ]);

  return keys.map((key, index) => {
    const platformDoc = platformSnaps[index];
    const legacyDoc = legacySnaps[index];
    const platformRow = platformDoc?.exists
      ? mapPlatformDay(platformDoc.id, platformDoc.data() || {})
      : {
          date: key,
          uniqueVisitors: 0,
          pageViews: 0,
          byApp: emptyAppTotals(),
          paths: [],
        };
    const legacyRow = legacyDoc?.exists ? mapLegacyPublicDay(legacyDoc.id, legacyDoc.data() || {}) : null;
    if (!platformDoc?.exists && legacyRow) return legacyRow;
    return mergeLegacyPublicWeb(platformRow, legacyRow);
  });
}

export function filterPlatformDays(days: PlatformDayRow[], app: PlatformApp | 'all'): PlatformDayRow[] {
  if (app === 'all') return days;
  return days.map((day) => {
    const totals = day.byApp[app] || { uniqueVisitors: 0, pageViews: 0 };
    return {
      ...day,
      uniqueVisitors: totals.uniqueVisitors,
      pageViews: totals.pageViews,
      paths: day.paths.filter((row) => row.app === app),
      byApp: {
        ...emptyAppTotals(),
        [app]: totals,
      } as Record<PlatformApp, AppTotals>,
    };
  });
}

export function sumPlatformDays(days: PlatformDayRow[]): AppTotals {
  return days.reduce(
    (acc, day) => ({
      uniqueVisitors: acc.uniqueVisitors + day.uniqueVisitors,
      pageViews: acc.pageViews + day.pageViews,
    }),
    { uniqueVisitors: 0, pageViews: 0 }
  );
}

export function sumPlatformDaysByApp(days: PlatformDayRow[]): Record<PlatformApp, AppTotals> {
  const totals = emptyAppTotals();
  for (const day of days) {
    for (const app of PLATFORM_APPS) {
      totals[app].uniqueVisitors += day.byApp[app]?.uniqueVisitors || 0;
      totals[app].pageViews += day.byApp[app]?.pageViews || 0;
    }
  }
  return totals;
}

export function aggregatePlatformPaths(days: PlatformDayRow[], limit = 40): PlatformPathRow[] {
  const map = new Map<string, PlatformPathRow>();
  for (const day of days) {
    for (const row of day.paths) {
      const key = `${row.app}:${row.path}`;
      const existing = map.get(key);
      if (existing) {
        existing.pageViews += row.pageViews;
      } else {
        map.set(key, { ...row });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, limit);
}

export async function getContactInquirySummary(): Promise<{ total: number; unread: number }> {
  try {
    const db = getFirestore();
    const [totalSnap, unreadSnap] = await Promise.all([
      db.collection('contact_inquiries').count().get(),
      db.collection('contact_inquiries').where('status', '==', 'new').count().get(),
    ]);
    return {
      total: Number(totalSnap.data().count || 0),
      unread: Number(unreadSnap.data().count || 0),
    };
  } catch (error) {
    console.warn('contact inquiry summary skipped', error);
    return { total: 0, unread: 0 };
  }
}
