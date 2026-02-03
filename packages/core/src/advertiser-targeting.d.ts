import { SponsoredContent } from './advertisers';
export interface TargetingContext {
    userLocation?: string;
    userVehicleType?: string;
    userInterests?: string[];
    userBehavior?: {
        pagesViewed?: number;
        timeOnSite?: number;
        previousInteractions?: string[];
    };
}
/**
 * Verifica si el contenido patrocinado debe mostrarse según targeting básico
 */
export declare function matchesBasicTargeting(content: SponsoredContent, context: TargetingContext): boolean;
/**
 * Verifica si el contenido patrocinado debe mostrarse según targeting avanzado
 */
export declare function matchesAdvancedTargeting(content: SponsoredContent, context: TargetingContext): boolean;
/**
 * Filtra contenido patrocinado según targeting
 */
export declare function filterContentByTargeting(content: SponsoredContent[], context: TargetingContext, useAdvancedTargeting?: boolean): SponsoredContent[];
//# sourceMappingURL=advertiser-targeting.d.ts.map