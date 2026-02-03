export interface MediaSpecs {
    image: {
        formats: string[];
        maxSize: number;
        dimensions: {
            width: number;
            height: number;
            aspectRatio: string;
        };
    };
    video?: {
        formats: string[];
        maxSize: number;
        maxDuration: number;
        dimensions: {
            width: number;
            height: number;
            aspectRatio: string;
        };
    };
}
export declare const PLACEMENT_SPECS: Record<'hero' | 'sidebar' | 'sponsors_section' | 'between_content', MediaSpecs>;
/**
 * Valida una imagen según las especificaciones del placement
 */
export declare function validateImage(file: File, placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'): {
    valid: boolean;
    error?: string;
};
/**
 * Valida un video según las especificaciones del placement
 */
export declare function validateVideo(file: File, placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'): {
    valid: boolean;
    error?: string;
};
/**
 * Obtiene las especificaciones formateadas para mostrar al usuario
 */
export declare function getSpecsDescription(placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'): {
    image: string;
    video?: string;
};
//# sourceMappingURL=advertiser-specs.d.ts.map