// Especificaciones de tamaño y formato para contenido patrocinado (versión cliente)

export interface MediaSpecs {
  image: {
    formats: string[]; // ['jpg', 'png', 'webp']
    maxSize: number; // en bytes
    dimensions: {
      width: number;
      height: number;
      aspectRatio: string; // '16:9', '1:1', etc.
    };
  };
  video?: {
    formats: string[]; // ['mp4', 'webm']
    maxSize: number; // en bytes
    maxDuration: number; // en segundos
    dimensions: {
      width: number;
      height: number;
      aspectRatio: string;
    };
  };
}

export const PLACEMENT_SPECS: Record<'hero' | 'sidebar' | 'sponsors_section' | 'between_content', MediaSpecs> = {
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
  },
};

/**
 * Valida una imagen según las especificaciones del placement
 */
export function validateImage(
  file: File,
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'
): { valid: boolean; error?: string } {
  const specs = PLACEMENT_SPECS[placement].image;

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
export function validateVideo(
  file: File,
  placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'
): { valid: boolean; error?: string } {
  const specs = PLACEMENT_SPECS[placement].video;
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
export function getSpecsDescription(placement: 'hero' | 'sidebar' | 'sponsors_section' | 'between_content'): {
  image: string;
  video?: string;
} {
  const specs = PLACEMENT_SPECS[placement];
  const imageSpecs = specs.image;
  const maxSizeMB = (imageSpecs.maxSize / (1024 * 1024)).toFixed(1);

  const imageDesc = `Imagen: ${imageSpecs.dimensions.width}x${imageSpecs.dimensions.height}px (${imageSpecs.dimensions.aspectRatio}), máximo ${maxSizeMB}MB. Formatos: ${imageSpecs.formats.join(', ').toUpperCase()}`;

  let videoDesc: string | undefined;
  if (specs.video) {
    const videoMaxSizeMB = (specs.video.maxSize / (1024 * 1024)).toFixed(1);
    videoDesc = `Video: ${specs.video.dimensions.width}x${specs.video.dimensions.height}px (${specs.video.dimensions.aspectRatio}), máximo ${videoMaxSizeMB}MB, duración máxima ${specs.video.maxDuration}s. Formatos: ${specs.video.formats.join(', ').toUpperCase()}`;
  }

  return {
    image: imageDesc,
    video: videoDesc,
  };
}

