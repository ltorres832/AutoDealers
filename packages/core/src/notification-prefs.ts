/** Preferencias por defecto para usuarios dealer/seller/admin. */

export type UserChannelPrefs = {
  push?: boolean;
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  sound?: boolean;
};

export type UserBusinessNotificationPrefs = {
  newLeads?: boolean;
  newMessages?: boolean;
  newAppointments?: boolean;
  newSales?: boolean;
  documents?: boolean;
  tasks?: boolean;
  catalogInterest?: boolean;
  systemAlerts?: boolean;
};

export const DEFAULT_USER_NOTIFICATION_PREFS: UserChannelPrefs = {
  push: true,
  email: true,
  sms: true,
  whatsapp: true,
  sound: true,
};

export const DEFAULT_BUSINESS_NOTIFICATION_PREFS: UserBusinessNotificationPrefs = {
  newLeads: true,
  newMessages: true,
  newAppointments: true,
  newSales: true,
  documents: true,
  tasks: true,
  catalogInterest: true,
  systemAlerts: true,
};

export function mergeNotificationPrefs(existing?: {
  notifications?: UserChannelPrefs;
  businessNotifications?: UserBusinessNotificationPrefs;
}): {
  notifications: UserChannelPrefs;
  businessNotifications: UserBusinessNotificationPrefs;
} {
  return {
    notifications: {
      ...DEFAULT_USER_NOTIFICATION_PREFS,
      ...(existing?.notifications || {}),
    },
    businessNotifications: {
      ...DEFAULT_BUSINESS_NOTIFICATION_PREFS,
      ...(existing?.businessNotifications || {}),
    },
  };
}
