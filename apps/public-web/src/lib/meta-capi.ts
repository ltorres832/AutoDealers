import { createHash } from 'node:crypto';
import { getMetaCapiAccessToken } from '@autodealers/core';
import { META_PIXEL_ID } from '@/lib/meta-pixel';

const GRAPH_VERSION = 'v21.0';
const ALLOWED_EVENTS = new Set(['PageView', 'Lead', 'CompleteRegistration']);

export type MetaCapiEventName = 'PageView' | 'Lead' | 'CompleteRegistration';

export type MetaCapiUserHints = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
};

export type MetaCapiSendInput = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  user?: MetaCapiUserHints;
};

function sha256Norm(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function pickCustomData(raw?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function buildUserData(user?: MetaCapiUserHints): Record<string, unknown> {
  const userData: Record<string, unknown> = {};
  if (user?.clientIp) userData.client_ip_address = user.clientIp;
  if (user?.userAgent) userData.client_user_agent = user.userAgent;
  if (user?.fbp) userData.fbp = user.fbp;
  if (user?.fbc) userData.fbc = user.fbc;
  if (user?.email) userData.em = [sha256Norm(user.email)];
  if (user?.phone) {
    const phone = digitsOnly(user.phone);
    if (phone.length >= 7) userData.ph = [sha256Norm(phone)];
  }
  if (user?.firstName) userData.fn = [sha256Norm(user.firstName)];
  if (user?.lastName) userData.ln = [sha256Norm(user.lastName)];
  return userData;
}

export async function sendMetaCapiEvent(input: MetaCapiSendInput): Promise<{ ok: boolean; skipped?: string }> {
  if (!ALLOWED_EVENTS.has(input.eventName)) {
    return { ok: false, skipped: 'event' };
  }
  const eventId = input.eventId.trim();
  if (!eventId) {
    return { ok: false, skipped: 'event_id' };
  }

  const accessToken = await getMetaCapiAccessToken();
  if (!accessToken) {
    return { ok: false, skipped: 'token' };
  }

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    user_data: buildUserData(input.user),
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  const customData = pickCustomData(input.customData);
  if (customData) event.custom_data = customData;

  const body: Record<string, unknown> = { data: [event] };
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[meta-capi] Graph error', response.status, text.slice(0, 300));
    return { ok: false };
  }

  return { ok: true };
}
