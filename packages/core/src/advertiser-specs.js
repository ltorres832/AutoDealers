"use strict";
// Especificaciones de tamaño y formato para contenido patrocinado según placement
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLACEMENT_SPECS = void 0;
exports.validateImage = validateImage;
exports.validateVideo = validateVideo;
exports.getSpecsDescription = getSpecsDescription;
exports.PLACEMENT_SPECS = {
    hero: {
        image: {
            formats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: 5 * 1024 * 1024, // 5MB
            dimensions: {
                width: 1920,
                height: 600,
                aspectRatio: '16:5',
            },
        },
        video: {
            formats: ['mp4', 'webm'],
            maxSize: 50 * 1024 * 1024, // 50MB
            maxDuration: 30, // 30 segundos
            dimensions: {
                width: 1920,
                height: 600,
                aspectRatio: '16:5',
            },
        },
    },
    sidebar: {
        image: {
            formats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: 2 * 1024 * 1024, // 2MB
            dimensions: {
                width: 300,
                height: 250,
                aspectRatio: '6:5',
            },
        },
        video: {
            formats: ['mp4', 'webm'],
            maxSize: 10 * 1024 * 1024, // 10MB
            maxDuration: 15, // 15 segundos
            dimensions: {
                width: 300,
                height: 250,
                aspectRatio: '6:5',
            },
        },
    },
    sponsors_section: {
        image: {
            formats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: 3 * 1024 * 1024, // 3MB
            dimensions: {
                width: 400,
                height: 300,
                aspectRatio: '4:3',
            },
        },
        video: {
            formats: ['mp4', 'webm'],
            maxSize: 20 * 1024 * 1024, // 20MB
            maxDuration: 30, // 30 segundos
            dimensions: {
                width: 400,
                height: 300,
                aspectRatio: '4:3',
            },
        },
    },
    between_content: {
        image: {
            formats: ['jpg', 'jpeg', 'png', 'webp'],
            maxSize: 2 * 1024 * 1024, // 2MB
            dimensions: {
                width: 728,
                height: 90,
                aspectRatio: '728:90',
            },
        },
        video: {
            formats: ['mp4', 'webm'],
            maxSize: 10 * 1024 * 1024, // 10MB
            maxDuration: 15, // 15 segundos
            dimensions: {
                width: 728,
                height: 90,
                aspectRatio: '728:90',
            },
        },
    },
};
/**
 * Valida una imagen según las especificaciones del placement
 */
function validateImage(file, placement) {
    const specs = exports.PLACEMENT_SPECS[placement].image;
    // Validar formato
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !specs.formats.includes(extension)) {
        return {
            valid: false,
            error: `Formato no válido. Formatos permitidos: ${specs.formats.join(', ').toUpperCase()}`,
        };
    }
    // Validar tamaño
    if (file.size > specs.maxSize) {
        const maxSizeMB = (specs.maxSize / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`,
        };
    }
    // Validar dimensiones (esto requiere leer la imagen, se hace en el cliente)
    return { valid: true };
}
/**
 * Valida un video según las especificaciones del placement
 */
function validateVideo(file, placement) {
    const specs = exports.PLACEMENT_SPECS[placement].video;
    if (!specs) {
        return {
            valid: false,
            error: 'Los videos no están permitidos para este placement',
        };
    }
    // Validar formato
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !specs.formats.includes(extension)) {
        return {
            valid: false,
            error: `Formato no válido. Formatos permitidos: ${specs.formats.join(', ').toUpperCase()}`,
        };
    }
    // Validar tamaño
    if (file.size > specs.maxSize) {
        const maxSizeMB = (specs.maxSize / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`,
        };
    }
    return { valid: true };
}
/**
 * Obtiene las especificaciones formateadas para mostrar al usuario
 */
function getSpecsDescription(placement) {
    const specs = exports.PLACEMENT_SPECS[placement];
    const imageSpecs = specs.image;
    const maxSizeMB = (imageSpecs.maxSize / (1024 * 1024)).toFixed(1);
    const imageDesc = `Imagen: ${imageSpecs.dimensions.width}x${imageSpecs.dimensions.height}px (${imageSpecs.dimensions.aspectRatio}), máximo ${maxSizeMB}MB. Formatos: ${imageSpecs.formats.join(', ').toUpperCase()}`;
    let videoDesc;
    if (specs.video) {
        const videoMaxSizeMB = (specs.video.maxSize / (1024 * 1024)).toFixed(1);
        videoDesc = `Video: ${specs.video.dimensions.width}x${specs.video.dimensions.height}px (${specs.video.dimensions.aspectRatio}), máximo ${videoMaxSizeMB}MB, duración máxima ${specs.video.maxDuration}s. Formatos: ${specs.video.formats.join(', ').toUpperCase()}`;
    }
    return {
        image: imageDesc,
        video: videoDesc,
    };
}
