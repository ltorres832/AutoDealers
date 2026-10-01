import { type PublicTrustGalleryItem } from '../public-trust-gallery';
export type PublicTrustGalleryProps = {
    /** Legacy: lista de URLs */
    photos?: string[];
    /** Preferido: URL + descripción visible al público */
    items?: PublicTrustGalleryItem[];
    title?: string;
    subtitle?: string;
    resolveUrl?: (url: string) => string;
};
export declare function PublicTrustGallery({ photos, items, title, subtitle, resolveUrl, }: PublicTrustGalleryProps): import("react/jsx-runtime").JSX.Element;
