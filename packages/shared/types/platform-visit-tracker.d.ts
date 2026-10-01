export type PlatformVisitApp = 'public-web' | 'advertiser' | 'dealer' | 'seller' | 'admin' | 'business';
export declare function PlatformVisitTracker({ app, endpoint, }: {
    app: PlatformVisitApp;
    endpoint?: string;
}): any;
export default PlatformVisitTracker;
