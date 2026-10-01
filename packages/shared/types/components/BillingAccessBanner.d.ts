type BillingAccessBannerProps = {
    status: string;
    daysPastDue?: number;
    graceDays?: number;
    settingsHref: string;
    reason?: string;
};
/**
 * Banner cuando la suscripción está past_due o suspendida.
 */
export declare function BillingAccessBanner({ status, daysPastDue, graceDays, settingsHref, reason, }: BillingAccessBannerProps): import("react/jsx-runtime").JSX.Element;
export {};
