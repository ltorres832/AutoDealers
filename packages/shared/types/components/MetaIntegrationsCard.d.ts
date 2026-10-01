export type MetaTokenHealthSummary = {
    readyForOrganic: boolean;
    readyForPaidAds: boolean;
    readyForInstagram: boolean;
    missingScopes: string[];
    warnings: string[];
    adAccountId?: string;
    checkedAt?: string;
};
export type MetaIntegrationRow = {
    id: string;
    type: 'facebook' | 'instagram';
    status: 'active' | 'inactive' | 'error';
    pageName?: string;
    metaTokenHealth?: MetaTokenHealthSummary;
};
export declare function MetaIntegrationsCard({ facebook, instagram, connecting, onConnect, onConnectInstagram, onDisconnect, onVerifyPermissions, verifyingPermissions, }: {
    facebook: MetaIntegrationRow;
    instagram: MetaIntegrationRow;
    connecting: boolean;
    onConnect: (opts?: {
        reauthorize?: boolean;
    }) => void;
    onConnectInstagram?: () => void;
    onDisconnect: (integrationId: string) => void;
    onVerifyPermissions?: () => void;
    verifyingPermissions?: boolean;
}): import("react/jsx-runtime").JSX.Element;
