// Sistema de targeting para contenido patrocinado

import { SponsoredContent } from './advertisers';

export interface TargetingContext {
  userLocation?: string; // Ciudad, estado, país
  userVehicleType?: string; // Tipo de vehículo buscado
  userInterests?: string[]; // Intereses del usuario
  userBehavior?: {
    pagesViewed?: number;
    timeOnSite?: number;
    previousInteractions?: string[];
  };
}

/**
 * Verifica si el contenido patrocinado debe mostrarse según targeting básico
 */
export function matchesBasicTargeting(
  content: SponsoredContent,
  context: TargetingContext
): boolean {
  // Si no hay targeting configurado, mostrar a todos
  if (!content.targetLocation && !content.targetVehicleTypes) {
    return true;
  }

  // Verificar ubicación
  if (content.targetLocation && content.targetLocation.length > 0) {
    if (!context.userLocation) {
      // Si no tenemos ubicación del usuario, no mostrar (targeting básico requiere ubicación)
      return false;
    }

    const userLocationLower = context.userLocation.toLowerCase();
    const matchesLocation = content.targetLocation.some((location) =>
      userLocationLower.includes(location.toLowerCase()) ||
      location.toLowerCase().includes(userLocationLower)
    );

    if (!matchesLocation) {
      return false;
    }
  }

  // Verificar tipo de vehículo
  if (content.targetVehicleTypes && content.targetVehicleTypes.length > 0) {
    if (!context.userVehicleType) {
      // Si no tenemos tipo de vehículo, mostrar de todas formas (menos restrictivo)
      return true;
    }

    const userVehicleTypeLower = context.userVehicleType.toLowerCase();
    const matchesVehicleType = content.targetVehicleTypes.some((vehicleType) =>
      userVehicleTypeLower.includes(vehicleType.toLowerCase()) ||
      vehicleType.toLowerCase().includes(userVehicleTypeLower)
    );

    if (!matchesVehicleType) {
      return false;
    }
  }

  return true;
}

/**
 * Verifica si el contenido patrocinado debe mostrarse según targeting avanzado
 */
export function matchesAdvancedTargeting(
  content: SponsoredContent,
  context: TargetingContext
): boolean {
  // Primero verificar targeting básico
  if (!matchesBasicTargeting(content, context)) {
    return false;
  }

  // Targeting avanzado incluye análisis de comportamiento
  if (context.userBehavior) {
    // Priorizar contenido para usuarios más comprometidos
    if (context.userBehavior.pagesViewed && context.userBehavior.pagesViewed < 2) {
      // Usuarios nuevos pueden ver contenido general
      return true;
    }

    // Si el usuario ha interactuado antes con contenido similar, priorizar
    if (content.targetVehicleTypes && context.userBehavior.previousInteractions) {
      const hasRelevantInteraction = context.userBehavior.previousInteractions.some(
        (interaction) =>
          content.targetVehicleTypes?.some((vt) =>
            interaction.toLowerCase().includes(vt.toLowerCase())
          )
      );

      if (hasRelevantInteraction) {
        return true; // Priorizar contenido relevante
      }
    }
  }

  return true;
}

/**
 * Filtra contenido patrocinado según targeting
 */
export function filterContentByTargeting(
  content: SponsoredContent[],
  context: TargetingContext,
  useAdvancedTargeting: boolean = false
): SponsoredContent[] {
  return content.filter((item) => {
    if (useAdvancedTargeting) {
      return matchesAdvancedTargeting(item, context);
    } else {
      return matchesBasicTargeting(item, context);
    }
  });
}

