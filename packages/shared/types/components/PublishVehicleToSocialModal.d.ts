import { type MarketingVehicle } from '../vehicle-marketing';
export interface PublishSocialVehicle extends MarketingVehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    price: number;
    currency?: string;
    condition?: string;
    status?: string;
    mileage?: number;
    location?: string;
    features?: string[];
    photos?: string[];
    images?: string[];
    videos?: string[];
    generatedVideoUrl?: string;
    tenantId?: string;
}
export interface PublishVehicleToSocialModalProps {
    vehicle: PublishSocialVehicle;
    onClose: () => void;
    onPublished?: () => void;
    /** admin: publica en nombre del tenant del vehículo */
    mode?: 'tenant' | 'admin';
    integrationsPath?: string;
    aiGeneratePath?: string;
    publishPath?: string;
    scheduleCreatePath?: string;
    settingsIntegrationsHref?: string;
}
export declare function PublishVehicleToSocialModal({ vehicle, onClose, onPublished, mode, integrationsPath, aiGeneratePath, publishPath, scheduleCreatePath, settingsIntegrationsHref: settingsIntegrationsHrefProp, }: PublishVehicleToSocialModalProps): import("react/jsx-runtime").JSX.Element;
