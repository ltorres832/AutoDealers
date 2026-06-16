var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var registration_facebook_announce_exports = {};
__export(registration_facebook_announce_exports, {
  DEFAULT_REGISTRATION_SOCIAL_SETTINGS: () => DEFAULT_REGISTRATION_SOCIAL_SETTINGS,
  announceNewRegistrationOnFacebook: () => announceNewRegistrationOnFacebook,
  getRegistrationSocialSettings: () => getRegistrationSocialSettings,
  publishPendingTenantRegistrationFacebookPost: () => publishPendingTenantRegistrationFacebookPost,
  saveRegistrationSocialSettings: () => saveRegistrationSocialSettings
});
module.exports = __toCommonJS(registration_facebook_announce_exports);
var import_shared = require("@autodealers/shared");
var admin = __toESM(require("firebase-admin"));
var import_platform_social = require("./platform-social");
const SETTINGS_DOC = "registration_social";
const DEFAULT_REGISTRATION_SOCIAL_SETTINGS = {
  platformFacebookEnabled: true,
  tenantFacebookEnabled: true,
  announceSellers: true,
  announceDealers: true,
  platformMessageTemplate: "\xA1Bienvenido/a {{name}}! Nuevo {{typeLabel}} en AutoDealers. Conoce m\xE1s: {{link}}",
  tenantMessageTemplate: "\xA1Ya estamos en AutoDealers! {{name}} \u2014 visita nuestro perfil: {{link}}",
  hashtags: ["AutoDealers", "Vehiculos"]
};
function getPublicWebBase() {
  return process.env.NEXT_PUBLIC_PUBLIC_WEB_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://autodealers-7f62e.web.app";
}
function typeLabel(accountType) {
  return accountType === "dealer" ? "concesionario" : "vendedor";
}
function applyTemplate(template, vars) {
  return template.replace(/\{\{name\}\}/g, vars.name).replace(/\{\{typeLabel\}\}/g, vars.typeLabel).replace(/\{\{link\}\}/g, vars.link);
}
function profileUrl(input) {
  const base = getPublicWebBase();
  if (input.accountType === "dealer") {
    return `${base}/dealer/${input.tenantId}`;
  }
  return `${base}/seller/${input.userId}`;
}
async function getRegistrationSocialSettings() {
  const snap = await (0, import_shared.getFirestore)().collection("system_settings").doc(SETTINGS_DOC).get();
  if (!snap.exists) return { ...DEFAULT_REGISTRATION_SOCIAL_SETTINGS };
  const data = snap.data() || {};
  return {
    ...DEFAULT_REGISTRATION_SOCIAL_SETTINGS,
    platformFacebookEnabled: data.platformFacebookEnabled !== false,
    tenantFacebookEnabled: data.tenantFacebookEnabled !== false,
    announceSellers: data.announceSellers !== false,
    announceDealers: data.announceDealers !== false,
    platformMessageTemplate: typeof data.platformMessageTemplate === "string" && data.platformMessageTemplate.trim() ? data.platformMessageTemplate.trim() : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.platformMessageTemplate,
    tenantMessageTemplate: typeof data.tenantMessageTemplate === "string" && data.tenantMessageTemplate.trim() ? data.tenantMessageTemplate.trim() : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.tenantMessageTemplate,
    hashtags: Array.isArray(data.hashtags) ? data.hashtags.map((h) => String(h).trim()).filter(Boolean) : DEFAULT_REGISTRATION_SOCIAL_SETTINGS.hashtags
  };
}
async function saveRegistrationSocialSettings(settings) {
  const current = await getRegistrationSocialSettings();
  const next = {
    ...current,
    ...settings,
    hashtags: settings.hashtags ?? current.hashtags
  };
  await (0, import_shared.getFirestore)().collection("system_settings").doc(SETTINGS_DOC).set(
    {
      ...next,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return next;
}
async function tenantAllowsOwnFacebookPost(tenantId) {
  const tenant = await (0, import_shared.getFirestore)().collection("tenants").doc(tenantId).get();
  const settings = tenant.data()?.settings;
  if (settings?.socialAnnounceOnFacebook === false) return false;
  return true;
}
async function markTenantAnnouncementState(tenantId, patch) {
  await (0, import_shared.getFirestore)().collection("tenants").doc(tenantId).set(
    {
      registrationSocialAnnouncement: {
        ...patch,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    },
    { merge: true }
  );
}
async function announceNewRegistrationOnFacebook(input) {
  const settings = await getRegistrationSocialSettings();
  const result = {};
  const allowedType = input.accountType === "dealer" ? settings.announceDealers : settings.announceSellers;
  if (!allowedType) {
    return result;
  }
  const name = input.displayName.trim() || "Nuevo miembro";
  const link = profileUrl(input);
  const label = typeLabel(input.accountType);
  await markTenantAnnouncementState(input.tenantId, {
    pendingTenantFacebook: settings.tenantFacebookEnabled,
    displayName: name,
    accountType: input.accountType,
    profileUrl: link,
    userId: input.userId
  });
  const { SocialPublisherService } = await import("@autodealers/messaging");
  const publisher = new SocialPublisherService();
  if (settings.platformFacebookEnabled) {
    const text = applyTemplate(settings.platformMessageTemplate, {
      name,
      typeLabel: label,
      link
    });
    const platformResult = await publisher.publishToFacebook(import_platform_social.PLATFORM_SOCIAL_TENANT_ID, {
      text,
      hashtags: settings.hashtags
    });
    result.platform = {
      success: platformResult.success,
      postId: platformResult.postId,
      error: platformResult.error
    };
    if (platformResult.success) {
      await markTenantAnnouncementState(input.tenantId, {
        platformPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        platformPostId: platformResult.postId || null
      });
    }
  }
  if (settings.tenantFacebookEnabled && await tenantAllowsOwnFacebookPost(input.tenantId)) {
    const text = applyTemplate(settings.tenantMessageTemplate, {
      name,
      typeLabel: label,
      link
    });
    const tenantResult = await publisher.publishToFacebook(input.tenantId, {
      text,
      hashtags: settings.hashtags
    });
    if (tenantResult.success) {
      result.tenant = {
        success: true,
        postId: tenantResult.postId
      };
      await markTenantAnnouncementState(input.tenantId, {
        pendingTenantFacebook: false,
        tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        tenantPostId: tenantResult.postId || null
      });
    } else {
      result.tenant = {
        success: false,
        deferred: true,
        error: tenantResult.error
      };
    }
  }
  return result;
}
async function publishPendingTenantRegistrationFacebookPost(tenantId) {
  const settings = await getRegistrationSocialSettings();
  if (!settings.tenantFacebookEnabled) {
    return { published: false, error: "Anuncio en p\xE1gina propia desactivado en Admin" };
  }
  if (!await tenantAllowsOwnFacebookPost(tenantId)) {
    return { published: false, error: "Tenant desactiv\xF3 anuncios en su Facebook" };
  }
  const tenantSnap = await (0, import_shared.getFirestore)().collection("tenants").doc(tenantId).get();
  const ann = tenantSnap.data()?.registrationSocialAnnouncement;
  if (!ann?.pendingTenantFacebook || ann.tenantPostId) {
    return { published: false };
  }
  const name = String(ann.displayName || tenantSnap.data()?.name || "Nuestro negocio");
  const link = String(ann.profileUrl || `${getPublicWebBase()}/`);
  const accountType = ann.accountType === "dealer" ? "dealer" : "seller";
  const text = applyTemplate(settings.tenantMessageTemplate, {
    name,
    typeLabel: typeLabel(accountType),
    link
  });
  const { SocialPublisherService } = await import("@autodealers/messaging");
  const publisher = new SocialPublisherService();
  const tenantResult = await publisher.publishToFacebook(tenantId, {
    text,
    hashtags: settings.hashtags
  });
  if (!tenantResult.success) {
    return { published: false, error: tenantResult.error };
  }
  await markTenantAnnouncementState(tenantId, {
    pendingTenantFacebook: false,
    tenantPostedAt: admin.firestore.FieldValue.serverTimestamp(),
    tenantPostId: tenantResult.postId || null
  });
  return { published: true };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_REGISTRATION_SOCIAL_SETTINGS,
  announceNewRegistrationOnFacebook,
  getRegistrationSocialSettings,
  publishPendingTenantRegistrationFacebookPost,
  saveRegistrationSocialSettings
});
