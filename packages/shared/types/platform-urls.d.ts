/** Dominio raíz de producción (DNS real en Firebase App Hosting). */
export declare const PLATFORM_APEX = "autodealers-online.com";
/** URLs HTTPS de cada app en producción. */
export declare const PLATFORM_URLS: {
    readonly public: "https://www.autodealers-online.com";
    readonly publicApex: "https://autodealers-online.com";
    readonly admin: "https://admin.autodealers-online.com";
    readonly dealer: "https://dealer.autodealers-online.com";
    readonly seller: "https://seller.autodealers-online.com";
    readonly advertiser: "https://advertiser.autodealers-online.com";
    readonly business: "https://business.autodealers-online.com";
};
export declare function stripTrailingSlash(url: string): string;
/** Primer valor no vacío de la lista, o fallback final. */
export declare function pickPlatformUrl(fallback: string, ...candidates: (string | undefined | null)[]): string;
export declare function resolvePublicWebUrl(): string;
export declare function resolveAdminUrl(): string;
export declare function resolveDealerUrl(): string;
export declare function resolveSellerUrl(): string;
export declare function resolveAdvertiserUrl(): string;
export declare function resolveBusinessUrl(): string;
/** Apex para mini-sitios de tenants (ej. pedroortiz.autodealers-online.com). */
export declare function resolvePlatformApex(): string;
/** Sufijo UI: `.autodealers-online.com` */
export declare function tenantHostSuffix(): string;
export declare function formatTenantHostname(subdomain: string): string;
export declare function buildTenantSiteUrl(subdomain: string): string;
/** Base URL del sitio público (www). Nunca usar el origin del panel dealer/seller. */
export declare function getPublicWebBaseUrl(): string;
export declare function buildPublicWebUrl(path: string): string;
export declare function buildReviewInvitePublicUrl(token: string): string;
