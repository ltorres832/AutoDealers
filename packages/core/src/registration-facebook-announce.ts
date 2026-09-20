import { getFirestore } from '@autodealers/shared';

import * as admin from 'firebase-admin';

import { resolvePublicWebUrl } from '@autodealers/shared/platform-urls';

import { PLATFORM_SOCIAL_TENANT_ID } from './platform-social';

import {
  requirePostImage,
  resolveMemberProfileImageUrl,
  resolveMemberSocialAnnounceImage,
} from './social-post-image';



const SETTINGS_DOC = 'registration_social';



export type RegistrationSocialSettings = {

  platformFacebookEnabled: boolean;

  platformInstagramEnabled: boolean;

  tenantFacebookEnabled: boolean;

  tenantInstagramEnabled: boolean;

  announceSellers: boolean;

  announceDealers: boolean;

  platformMessageTemplate: string;

  tenantMessageTemplate: string;

  hashtags: string[];

};



export const DEFAULT_REGISTRATION_SOCIAL_SETTINGS: RegistrationSocialSettings = {

  platformFacebookEnabled: true,

  platformInstagramEnabled: true,

  tenantFacebookEnabled: true,

  tenantInstagramEnabled: true,

  announceSellers: true,

  announceDealers: true,

  platformMessageTemplate:

    '¡Bienvenido/a {{name}}! Nuevo {{typeLabel}} en AutoDealersOnline. Conoce su perfil, inventario y contáctalo directo: {{link}}',

  tenantMessageTemplate:

    '¡Ya estamos en AutoDealersOnline! {{name}} — conoce nuestro perfil y autos disponibles: {{link}}',

  hashtags: ['AutoDealersOnline', 'Vehiculos', 'PuertoRico'],

};



export type RegistrationAnnouncementInput = {

  tenantId: string;

  userId: string;

  displayName: string;

  accountType: 'seller' | 'dealer';

  companyName?: string;

  profileImageUrl?: string;

};



export type RegistrationAnnouncementResult = {

  platform?: {

    facebook?: { success: boolean; postId?: string; error?: string };

    instagram?: { success: boolean; postId?: string; error?: string };

  };

  tenant?: {

    facebook?: { success: boolean; postId?: string; error?: string; deferred?: boolean };

    instagram?: { success: boolean; postId?: string; error?: string; deferred?: boolean };

  };

};



function getPublicWebBase(): string {

  return resolvePublicWebUrl();

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

    return `${base}/dealer/${input.userId}`;

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

    platformInstagramEnabled: data.platformInstagramEnabled !== false,

    tenantFacebookEnabled: data.tenantFacebookEnabled !== false,

    tenantInstagramEnabled: data.tenantInstagramEnabled !== false,

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



async function tenantAllowsOwnSocialPost(tenantId: string): Promise<boolean> {

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



async function resolveAnnouncementImage(
  input: RegistrationAnnouncementInput
): Promise<string | null> {
  if (input.profileImageUrl?.trim()) {
    return requirePostImage({ text: '', imageUrl: input.profileImageUrl }).imageUrl;
  }

  return resolveMemberSocialAnnounceImage({
    tenantId: input.tenantId,
    userId: input.userId,
    accountType: input.accountType,
  });
}



/** Anuncia en Facebook e Instagram de AutoDealers + páginas del tenant (con imagen de perfil). */

export async function announceNewRegistrationOnSocial(

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

  const imageUrl = await resolveAnnouncementImage(input);

  if (!imageUrl) {
    await markTenantAnnouncementState(input.tenantId, {
      pendingPlatformSocialPhoto: true,
      pendingTenantFacebook: settings.tenantFacebookEnabled,
      pendingTenantInstagram: settings.tenantInstagramEnabled,
      displayName: name,
      accountType: input.accountType,
      profileUrl: link,
      userId: input.userId,
    });
    return result;
  }

  await markTenantAnnouncementState(input.tenantId, {
    pendingPlatformSocialPhoto: false,
    pendingTenantFacebook: settings.tenantFacebookEnabled,
    pendingTenantInstagram: settings.tenantInstagramEnabled,
    displayName: name,
    accountType: input.accountType,
    profileUrl: link,
    profileImageUrl: imageUrl,
    userId: input.userId,
  });



  const { SocialPublisherService } = await import('@autodealers/messaging');

  const publisher = new SocialPublisherService();



  const platformText = applyTemplate(settings.platformMessageTemplate, {

    name,

    typeLabel: label,

    link,

  });

  const postContent = requirePostImage({ text: platformText, imageUrl, hashtags: settings.hashtags });



  const platformPlatforms: ('facebook' | 'instagram')[] = [];

  if (settings.platformFacebookEnabled) platformPlatforms.push('facebook');

  if (settings.platformInstagramEnabled) platformPlatforms.push('instagram');



  if (platformPlatforms.length > 0) {

    const platformResults = await publisher.publishToMultiple(

      PLATFORM_SOCIAL_TENANT_ID,

      postContent,

      platformPlatforms

    );

    result.platform = {};

    for (const r of platformResults) {

      if (r.platform === 'facebook') {

        result.platform.facebook = { success: r.success, postId: r.postId, error: r.error };

      } else if (r.platform === 'instagram') {

        result.platform.instagram = { success: r.success, postId: r.postId, error: r.error };

      }

    }

    const anyPlatformOk = platformResults.some((r) => r.success);

    if (anyPlatformOk) {

      await markTenantAnnouncementState(input.tenantId, {
        pendingPlatformSocialPhoto: false,
        platformPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        platformPostId: platformResults.find((r) => r.success)?.postId || null,
        platformFacebookPostId:
          platformResults.find((r) => r.platform === 'facebook' && r.success)?.postId || null,
        platformInstagramPostId:
          platformResults.find((r) => r.platform === 'instagram' && r.success)?.postId || null,
      });

    }

  }



  if (await tenantAllowsOwnSocialPost(input.tenantId)) {

    const tenantText = applyTemplate(settings.tenantMessageTemplate, {

      name,

      typeLabel: label,

      link,

    });

    const tenantPost = requirePostImage({ text: tenantText, imageUrl, hashtags: settings.hashtags });

    result.tenant = {};



    if (settings.tenantFacebookEnabled) {

      const fb = await publisher.publishToFacebook(input.tenantId, tenantPost);

      result.tenant.facebook = fb.success

        ? { success: true, postId: fb.postId }

        : { success: false, deferred: true, error: fb.error };

    }



    if (settings.tenantInstagramEnabled) {

      const ig = await publisher.publishToInstagram(input.tenantId, tenantPost);

      result.tenant.instagram = ig.success

        ? { success: true, postId: ig.postId }

        : { success: false, deferred: true, error: ig.error };

    }



    const tenantFbOk = result.tenant.facebook?.success;

    const tenantIgOk = result.tenant.instagram?.success;

    if (tenantFbOk || tenantIgOk) {

      await markTenantAnnouncementState(input.tenantId, {

        pendingTenantFacebook: !tenantFbOk && settings.tenantFacebookEnabled,

        pendingTenantInstagram: !tenantIgOk && settings.tenantInstagramEnabled,

        tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),

        tenantFacebookPostId: tenantFbOk ? result.tenant.facebook?.postId : null,

        tenantInstagramPostId: tenantIgOk ? result.tenant.instagram?.postId : null,

      });

    }

  }



  return result;

}



/** Alias retrocompatible */

export const announceNewRegistrationOnFacebook = announceNewRegistrationOnSocial;



/** Publica anuncios pendientes cuando el tenant conecta Meta (Facebook/Instagram). */

export async function publishPendingTenantRegistrationSocialPosts(

  tenantId: string

): Promise<{ published: boolean; error?: string }> {

  const settings = await getRegistrationSocialSettings();

  if (!(settings.tenantFacebookEnabled || settings.tenantInstagramEnabled)) {

    return { published: false, error: 'Anuncios en redes del miembro desactivados en Admin' };

  }

  if (!(await tenantAllowsOwnSocialPost(tenantId))) {

    return { published: false, error: 'Tenant desactivó anuncios en sus redes' };

  }



  const tenantSnap = await getFirestore().collection('tenants').doc(tenantId).get();

  const ann = tenantSnap.data()?.registrationSocialAnnouncement as

    | {

        pendingTenantFacebook?: boolean;

        pendingTenantInstagram?: boolean;

        tenantFacebookPostId?: string;

        tenantInstagramPostId?: string;

        displayName?: string;

        accountType?: 'seller' | 'dealer';

        profileUrl?: string;

        profileImageUrl?: string;

        userId?: string;

      }

    | undefined;



  const needsFb = settings.tenantFacebookEnabled && ann?.pendingTenantFacebook && !ann.tenantFacebookPostId;

  const needsIg = settings.tenantInstagramEnabled && ann?.pendingTenantInstagram && !ann.tenantInstagramPostId;

  if (!needsFb && !needsIg) {

    return { published: false };

  }



  const name = String(ann?.displayName || tenantSnap.data()?.name || 'Nuestro negocio');

  const link = String(ann?.profileUrl || `${getPublicWebBase()}/`);

  const accountType = ann?.accountType === 'dealer' ? 'dealer' : 'seller';

  const imageUrl =
    ann?.profileImageUrl ||
    (await resolveMemberSocialAnnounceImage({
      tenantId,
      userId: String(ann?.userId || ''),
      accountType,
    }));

  if (!imageUrl) {
    return { published: false, error: 'Sin foto de perfil o logo para el anuncio' };
  }



  const text = applyTemplate(settings.tenantMessageTemplate, {

    name,

    typeLabel: typeLabel(accountType),

    link,

  });

  const postContent = requirePostImage({ text, imageUrl, hashtags: settings.hashtags });



  const { SocialPublisherService } = await import('@autodealers/messaging');

  const publisher = new SocialPublisherService();



  let publishedAny = false;

  let lastError: string | undefined;



  if (needsFb) {

    const fb = await publisher.publishToFacebook(tenantId, postContent);

    if (fb.success) {

      publishedAny = true;

      await markTenantAnnouncementState(tenantId, {

        pendingTenantFacebook: false,

        tenantFacebookPostId: fb.postId || null,

      });

    } else {

      lastError = fb.error;

    }

  }



  if (needsIg) {

    const ig = await publisher.publishToInstagram(tenantId, postContent);

    if (ig.success) {

      publishedAny = true;

      await markTenantAnnouncementState(tenantId, {

        pendingTenantInstagram: false,

        tenantInstagramPostId: ig.postId || null,

      });

    } else {

      lastError = ig.error;

    }

  }



  if (publishedAny) {

    await markTenantAnnouncementState(tenantId, {

      tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),

    });

    return { published: true };

  }



  return { published: false, error: lastError };

}



/** Alias retrocompatible */

export const publishPendingTenantRegistrationFacebookPost =

  publishPendingTenantRegistrationSocialPosts;


