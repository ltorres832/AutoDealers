/**
 * Paleta oficial de marca AutoDealers.
 * Primarios: negro, rojo, blanco, plata.
 * Secundarios: rojo brillante (hover/acentos), negro profundo (fondos).
 */

export const PLATFORM_COLORS = {
  /** Negro principal — fondos, headers, texto sobre blanco */
  black: '#0A0A0A',
  /** Rojo marca — CTAs, links activos, acentos principales */
  red: '#E10600',
  /** Blanco — texto sobre oscuro, tarjetas, superficies claras */
  white: '#FFFFFF',
  /** Plata — bordes, texto secundario, metálico */
  silver: '#C0C0C0',
  /** Rojo secundario — hover, badges, énfasis */
  redBright: '#FF1A1A',
  /** Negro profundo — hero, footer, overlays */
  blackDeep: '#050505',
} as const;

/** Escala Tailwind `primary-*` derivada del rojo de marca */
export const PLATFORM_PRIMARY_SCALE = {
  50: '#fff1f1',
  100: '#ffe0df',
  200: '#ffb8b6',
  300: '#ff8a86',
  400: '#FF1A1A',
  500: '#f01510',
  600: '#E10600',
  700: '#b80500',
  800: '#8a0400',
  900: '#5c0300',
} as const;

/** Valores por defecto para branding de tenants nuevos */
export const DEFAULT_TENANT_BRANDING = {
  primaryColor: PLATFORM_COLORS.red,
  secondaryColor: PLATFORM_COLORS.black,
} as const;

/** Variables CSS `:root` para apps web */
export const PLATFORM_CSS_VARIABLES: Record<string, string> = {
  '--brand-black': PLATFORM_COLORS.black,
  '--brand-black-deep': PLATFORM_COLORS.blackDeep,
  '--brand-red': PLATFORM_COLORS.red,
  '--brand-red-bright': PLATFORM_COLORS.redBright,
  '--brand-silver': PLATFORM_COLORS.silver,
  '--brand-white': PLATFORM_COLORS.white,
  ...Object.fromEntries(
    Object.entries(PLATFORM_PRIMARY_SCALE).map(([step, hex]) => [`--primary-${step}`, hex])
  ),
};
