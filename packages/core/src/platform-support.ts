import { getFirestore } from '@autodealers/shared';
import {
  PLATFORM_SUPPORT_WHATSAPP_MESSAGE,
  PLATFORM_SUPPORT_WHATSAPP_OPTIONS,
  buildWhatsAppSupportUrl,
  isPlaceholderWhatsAppNumber,
} from '@autodealers/shared/platform-support-whatsapp';
import {
  resolveDealerUrl,
  resolveSellerUrl,
} from '@autodealers/shared/platform-urls';

export {
  PLATFORM_SUPPORT_WHATSAPP_MESSAGE,
  PLATFORM_SUPPORT_WHATSAPP_OPTIONS,
  buildPlatformSupportWhatsAppOptions,
  buildWhatsAppSupportUrl,
} from '@autodealers/shared/platform-support-whatsapp';

export interface PlatformSupportContact {
  email: string;
  whatsapp: string | null;
  phone: string | null;
  hours: string | null;
}

const DEFAULT_SUPPORT: PlatformSupportContact = {
  email: 'info@autodealers.com',
  whatsapp: null,
  phone: null,
  hours: null,
};

export function buildWhatsAppUrl(whatsapp: string, message?: string): string {
  if (!message) {
    return buildWhatsAppSupportUrl(whatsapp, PLATFORM_SUPPORT_WHATSAPP_MESSAGE);
  }
  return buildWhatsAppSupportUrl(whatsapp, message);
}

/** @deprecated Usar isPlaceholderWhatsAppNumber de @autodealers/shared/platform-support-whatsapp */
export function isPlaceholderWhatsApp(value: string): boolean {
  return isPlaceholderWhatsAppNumber(value);
}

export function resolveInAppSupportUrl(role: string): string | undefined {
  if (role === 'seller') return `${resolveSellerUrl()}/settings/support`;
  if (role === 'dealer' || role === 'dealer_admin' || role === 'manager') {
    return `${resolveDealerUrl()}/settings/support`;
  }
  return undefined;
}

export async function getPlatformSupportContact(): Promise<PlatformSupportContact> {
  const db = getFirestore();

  try {
    const siteDoc = await db.collection('site_config').doc('public_site_info').get();
    const contact = siteDoc.data()?.contact as
      | { email?: string; whatsapp?: string; phone?: string; hours?: string }
      | undefined;

    if (contact) {
      return {
        email:
          typeof contact.email === 'string' && contact.email.includes('@')
            ? contact.email.trim()
            : DEFAULT_SUPPORT.email,
        whatsapp:
          typeof contact.whatsapp === 'string' &&
          contact.whatsapp.trim() &&
          !isPlaceholderWhatsApp(contact.whatsapp)
            ? contact.whatsapp.trim()
            : null,
        phone:
          typeof contact.phone === 'string' && contact.phone.trim() ? contact.phone.trim() : null,
        hours:
          typeof contact.hours === 'string' && contact.hours.trim() ? contact.hours.trim() : null,
      };
    }
  } catch {
    /* non-critical */
  }

  try {
    const mainDoc = await db.collection('system_settings').doc('main').get();
    const platformEmail = mainDoc.data()?.platformEmail;
    if (typeof platformEmail === 'string' && platformEmail.includes('@')) {
      return { ...DEFAULT_SUPPORT, email: platformEmail.trim() };
    }
  } catch {
    /* non-critical */
  }

  const env = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (env?.includes('@')) {
    return { ...DEFAULT_SUPPORT, email: env };
  }

  return DEFAULT_SUPPORT;
}
