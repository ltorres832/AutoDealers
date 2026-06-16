import * as admin from 'firebase-admin';
import { getFirestore } from './firebase';

export type NewsletterSource =
  | 'landing_footer'
  | 'user_registration'
  | 'admin_import'
  | 'admin_sync';

export type NewsletterAudienceRow = {
  email: string;
  name?: string;
  role?: string;
  userId?: string;
  sources: string[];
  status: 'active' | 'unsubscribed';
  subscribedAt?: string;
};

export function normalizeNewsletterEmail(raw: unknown): string | null {
  const email = String(raw || '')
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function newsletterDocId(email: string): string {
  return email.replace(/[^a-z0-9@._-]/g, '_');
}

export async function upsertNewsletterSubscriber(params: {
  email: string;
  source: NewsletterSource;
  name?: string;
  role?: string;
  userId?: string;
}): Promise<void> {
  const email = normalizeNewsletterEmail(params.email);
  if (!email) return;

  const db = getFirestore();
  const ref = db.collection('newsletter_subscribers').doc(newsletterDocId(email));
  const existing = await ref.get();
  const prevSources = (existing.data()?.sources as string[] | undefined) || [];
  const sources = Array.from(new Set([...prevSources, params.source]));

  await ref.set(
    {
      email,
      status: existing.data()?.status === 'unsubscribed' ? 'unsubscribed' : 'active',
      sources,
      source: params.source,
      name: params.name?.trim() || existing.data()?.name || null,
      role: params.role || existing.data()?.role || null,
      userId: params.userId || existing.data()?.userId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : {
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
    },
    { merge: true }
  );
}

export async function getNewsletterAudience(options?: {
  includeUnsubscribed?: boolean;
}): Promise<NewsletterAudienceRow[]> {
  const db = getFirestore();
  const includeUnsubscribed = options?.includeUnsubscribed === true;

  const [subsSnap, usersSnap] = await Promise.all([
    db.collection('newsletter_subscribers').get(),
    db.collection('users').get(),
  ]);

  const byEmail = new Map<string, NewsletterAudienceRow>();

  for (const doc of subsSnap.docs) {
    const d = doc.data();
    const email = normalizeNewsletterEmail(d.email);
    if (!email) continue;
    const status = d.status === 'unsubscribed' ? 'unsubscribed' : 'active';
    if (!includeUnsubscribed && status === 'unsubscribed') continue;

    byEmail.set(email, {
      email,
      name: (d.name as string) || undefined,
      role: (d.role as string) || undefined,
      userId: (d.userId as string) || undefined,
      sources: Array.isArray(d.sources)
        ? (d.sources as string[])
        : d.source
          ? [String(d.source)]
          : ['landing_footer'],
      status,
      subscribedAt: d.subscribedAt?.toDate?.()?.toISOString?.() || undefined,
    });
  }

  for (const doc of usersSnap.docs) {
    const d = doc.data();
    const email = normalizeNewsletterEmail(d.email);
    if (!email) continue;

    const existing = byEmail.get(email);
    const sources = Array.from(
      new Set([...(existing?.sources || []), 'user_registration'])
    );

    byEmail.set(email, {
      email,
      name: (d.name as string) || existing?.name,
      role: (d.role as string) || existing?.role,
      userId: doc.id,
      sources,
      status: existing?.status === 'unsubscribed' ? 'unsubscribed' : 'active',
      subscribedAt: existing?.subscribedAt,
    });
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export async function syncRegisteredUsersToNewsletter(): Promise<{
  added: number;
  updated: number;
  totalUsers: number;
}> {
  const db = getFirestore();
  const usersSnap = await db.collection('users').get();
  let added = 0;
  let updated = 0;

  for (const doc of usersSnap.docs) {
    const d = doc.data();
    const email = normalizeNewsletterEmail(d.email);
    if (!email) continue;

    const ref = db.collection('newsletter_subscribers').doc(newsletterDocId(email));
    const existing = await ref.get();
    const prevSources = (existing.data()?.sources as string[] | undefined) || [];
    const sources = Array.from(new Set([...prevSources, 'user_registration', 'admin_sync']));

    if (!existing.exists) added += 1;
    else updated += 1;

    await ref.set(
      {
        email,
        status: existing.data()?.status === 'unsubscribed' ? 'unsubscribed' : 'active',
        sources,
        source: 'admin_sync',
        name: (d.name as string) || existing.data()?.name || null,
        role: (d.role as string) || existing.data()?.role || null,
        userId: doc.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(existing.exists
          ? {}
          : { subscribedAt: admin.firestore.FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
  }

  return { added, updated, totalUsers: usersSnap.size };
}
