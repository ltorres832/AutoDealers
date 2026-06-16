import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { PLATFORM_SOCIAL_TENANT_ID } from './platform-social';

const SETTINGS_DOC = 'registration_social';

export type RegistrationSocialSettings = {
  platformFacebookEnabled: boolean;
  tenantFacebookEnabled: boolean;
  announceSellers: boolean;
  announceDealers: boolean;
  platformMessageTemplate: string;
  tenantMessageTemplate: string;
  hashtags: string[];
};

export const DEFAULT_REGISTRATION_SOCIAL_SETTINGS: RegistrationSocialSettings = {
  platformFacebookEnabled: true,
  tenantFacebookEnabled: true,
  announceSellers: true,
  announceDealers: true,
  platformMessageTemplate:
    '¡Bienvenido/a {{name}}! Nuevo {{typeLabel}} en AutoDealers. Conoce más: {{link}}',
  tenantMessageTemplate:
    '¡Ya estamos en AutoDealers! {{name}} — visita nuestro perfil: {{link}}',
  hashtags: ['AutoDealers', 'Vehiculos'],
};

export type RegistrationAnnouncementInput = {
  tenantId: string;
  userId: string;
  displayName: string;
  accountType: 'seller' | 'dealer';
  companyName?: string;
};

export type RegistrationAnnouncementResult = {
  platform?: { success: boolean; postId?: string; error?: string };
  tenant?: { success: boolean; postId?: string; error?: string; deferred?: boolean };
};

function getPublicWebBase(): string {
  return (
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://autodealers-7f62e.web.app'
  );
}

function typeLabel(accountType: 'seller' | 'dealer'): string {
  return accountType === 'dealer' ? 'concesionario' : 'vendedor';
}

function applyTemplate(
  template: string,
  vars: { name: string; typeLabel: string; link: string }
): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{typeLabel\}\}/g, vars.typeLabel)
    .replace(/\{\{link\}\}/g, vars.link);
}

function profileUrl(input: RegistrationAnnouncementInput): string {
  const base = getPublicWebBase();
  if (input.accountType === 'dealer') {
    return `${base}/dealer/${input.tenantId}`;
  }
  return `${base}/seller/${input.userId}`;
}

export async function getRegistrationSocialSettings(): Promise<RegistrationSocialSettings> {
  const snap = await getFirestore().collection('system_settings').doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_REGISTRATION_SOCIAL_SETTINGS };
  const data = snap.data() || {};
  return {
    ...DEFAULT_REGISTRATION_SOCIAL_SETTINGS,
    platformFacebookEnabled: data.platformFacebookEnabled !== false,
    tenantFacebookEnabled: data.tenantFacebookEnabled !== false,
    announceSellers: data.announceSellers !== false,
    announceDealers: data.announceDealers !== false,
    platformMessageTemplate:
      typeof data.platformMessageTemplate === 'string' && data.platformMessageTemplate.trim()
        ? data.platformMessageTemplate.trim()
        : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.platformMessageTemplate,
    tenantMessageTemplate:
      typeof data.tenantMessageTemplate === 'string' && data.tenantMessageTemplate.trim()
        ? data.tenantMessageTemplate.trim()
        : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.tenantMessageTemplate,
    hashtags: Array.isArray(data.hashtags)
      ? data.hashtags.map((h) => String(h).trim()).filter(Boolean)
      : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.hashtags,
  };
}

export async function saveRegistrationSocialSettings(
  settings: Partial<RegistrationSocialSettings>
): Promise<RegistrationSocialSettings> {
  const current = await getRegistrationSocialSettings();
  const next: RegistrationSocialSettings = {
    ...current,
    ...settings,
    hashtags: settings.hashtags ?? current.hashtags,
  };
  await getFirestore()
    .collection('system_settings')
    .doc(SETTINGS_DOC)
    .set(
      {
        ...next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  return next;
}

async function tenantAllowsOwnFacebookPost(tenantId: string): Promise<boolean> {
  const tenant = await getFirestore().collection('tenants').doc(tenantId).get();
  const settings = tenant.data()?.settings as { socialAnnounceOnFacebook?: boolean } | undefined;
  if (settings?.socialAnnounceOnFacebook === false) return false;
  return true;
}

async function markTenantAnnouncementState(
  tenantId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await getFirestore()
    .collection('tenants')
    .doc(tenantId)
    .set(
      {
        registrationSocialAnnouncement: {
          ...patch,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
}

/**
 * Opción 1: página Facebook de AutoDealers (_platform).
 * Opción 2: página Facebook del tenant (si ya está conectada; si no, queda pendiente).
 */
export async function announceNewRegistrationOnFacebook(
  input: RegistrationAnnouncementInput
): Promise<RegistrationAnnouncementResult> {
  const settings = await getRegistrationSocialSettings();
  const result: RegistrationAnnouncementResult = {};

  const allowedType =
    input.accountType === 'dealer' ? settings.announceDealers : settings.announceSellers;
  if (!allowedType) {
    return result;
  }

  const name = input.displayName.trim() || 'Nuevo miembro';
  const link = profileUrl(input);
  const label = typeLabel(input.accountType);

  await markTenantAnnouncementState(input.tenantId, {
    pendingTenantFacebook: settings.tenantFacebookEnabled,
    displayName: name,
    accountType: input.accountType,
    profileUrl: link,
    userId: input.userId,
  });

  const { SocialPublisherService } = await import('@autodealers/messaging');
  const publisher = new SocialPublisherService();

  if (settings.platformFacebookEnabled) {
    const text = applyTemplate(settings.platformMessageTemplate, {
      name,
      typeLabel: label,
      link,
    });
    const platformResult = await publisher.publishToFacebook(PLATFORM_SOCIAL_TENANT_ID, {
      text,
      hashtags: settings.hashtags,
    });
    result.platform = {
      success: platformResult.success,
      postId: platformResult.postId,
      error: platformResult.error,
    };
    if (platformResult.success) {
      await markTenantAnnouncementState(input.tenantId, {
        platformPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        platformPostId: platformResult.postId || null,
      });
    }
  }

  if (settings.tenantFacebookEnabled && (await tenantAllowsOwnFacebookPost(input.tenantId))) {
    const text = applyTemplate(settings.tenantMessageTemplate, {
      name,
      typeLabel: label,
      link,
    });
    const tenantResult = await publisher.publishToFacebook(input.tenantId, {
      text,
      hashtags: settings.hashtags,
    });

    if (tenantResult.success) {
      result.tenant = {
        success: true,
        postId: tenantResult.postId,
      };
      await markTenantAnnouncementState(input.tenantId, {
        pendingTenantFacebook: false,
        tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        tenantPostId: tenantResult.postId || null,
      });
    } else {
      result.tenant = {
        success: false,
        deferred: true,
        error: tenantResult.error,
      };
    }
  }

  return result;
}

/** Publica el anuncio pendiente en la página del tenant tras conectar Facebook. */
export async function publishPendingTenantRegistrationFacebookPost(
  tenantId: string
): Promise<{ published: boolean; error?: string }> {
  const settings = await getRegistrationSocialSettings();
  if (!settings.tenantFacebookEnabled) {
    return { published: false, error: 'Anuncio en página propia desactivado en Admin' };
  }
  if (!(await tenantAllowsOwnFacebookPost(tenantId))) {
    return { published: false, error: 'Tenant desactivó anuncios en su Facebook' };
  }

  const tenantSnap = await getFirestore().collection('tenants').doc(tenantId).get();
  const ann = tenantSnap.data()?.registrationSocialAnnouncement as
    | {
        pendingTenantFacebook?: boolean;
        tenantPostId?: string;
        displayName?: string;
        accountType?: 'seller' | 'dealer';
        profileUrl?: string;
        userId?: string;
      }
    | undefined;

  if (!ann?.pendingTenantFacebook || ann.tenantPostId) {
    return { published: false };
  }

  const name = String(ann.displayName || tenantSnap.data()?.name || 'Nuestro negocio');
  const link = String(ann.profileUrl || `${getPublicWebBase()}/`);
  const accountType = ann.accountType === 'dealer' ? 'dealer' : 'seller';
  const text = applyTemplate(settings.tenantMessageTemplate, {
    name,
    typeLabel: typeLabel(accountType),
    link,
  });

  const { SocialPublisherService } = await import('@autodealers/messaging');
  const publisher = new SocialPublisherService();
  const tenantResult = await publisher.publishToFacebook(tenantId, {
    text,
    hashtags: settings.hashtags,
  });

  if (!tenantResult.success) {
    return { published: false, error: tenantResult.error };
  }

  await markTenantAnnouncementState(tenantId, {
    pendingTenantFacebook: false,
    tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),
    tenantPostId: tenantResult.postId || null,
  });

  return { published: true };
}
