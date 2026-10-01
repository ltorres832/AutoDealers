export type DeleteActionResult = {
    ok: true;
    data?: unknown;
} | {
    ok: false;
    error: string;
};
export declare function confirmAndDelete(params: {
    url: string;
    confirmMessage: string;
    method?: 'DELETE' | 'POST' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    fetchFn?: typeof fetch;
}): Promise<DeleteActionResult>;
export declare function isCancelledPlatformStatus(status?: string | null): boolean;
export declare function filterPlatformRecords<T extends {
    status?: string | null;
}>(rows: T[], options?: {
    status?: string;
    includeCancelled?: boolean;
}): T[];
