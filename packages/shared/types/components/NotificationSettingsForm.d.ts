export type NotificationPrefsPayload = {
    notifications: {
        push: boolean;
        email: boolean;
        sms: boolean;
        whatsapp: boolean;
        sound: boolean;
    };
    businessNotifications: {
        newLeads: boolean;
        newMessages: boolean;
        newAppointments: boolean;
        newSales: boolean;
        documents: boolean;
        tasks: boolean;
        catalogInterest: boolean;
        systemAlerts: boolean;
    };
    hasPhone: boolean;
};
type Props = {
    apiPath?: string;
    title?: string;
};
export declare function NotificationSettingsForm({ apiPath, title, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
