/**
 * Paleta oficial de marca AutoDealers.
 * Primarios: negro, rojo, blanco, plata.
 * Secundarios: rojo brillante (hover/acentos), negro profundo (fondos).
 */
export declare const PLATFORM_COLORS: {
    /** Negro principal — fondos, headers, texto sobre blanco */
    readonly black: "#0A0A0A";
    /** Rojo marca — CTAs, links activos, acentos principales */
    readonly red: "#E10600";
    /** Blanco — texto sobre oscuro, tarjetas, superficies claras */
    readonly white: "#FFFFFF";
    /** Plata — bordes, texto secundario, metálico */
    readonly silver: "#C0C0C0";
    /** Rojo secundario — hover, badges, énfasis */
    readonly redBright: "#FF1A1A";
    /** Negro profundo — hero, footer, overlays */
    readonly blackDeep: "#050505";
};
/** Escala Tailwind `primary-*` derivada del rojo de marca */
export declare const PLATFORM_PRIMARY_SCALE: {
    readonly 50: "#fff1f1";
    readonly 100: "#ffe0df";
    readonly 200: "#ffb8b6";
    readonly 300: "#ff8a86";
    readonly 400: "#FF1A1A";
    readonly 500: "#f01510";
    readonly 600: "#E10600";
    readonly 700: "#b80500";
    readonly 800: "#8a0400";
    readonly 900: "#5c0300";
};
/** Valores por defecto para branding de tenants nuevos */
export declare const DEFAULT_TENANT_BRANDING: {
    readonly primaryColor: "#E10600";
    readonly secondaryColor: "#0A0A0A";
};
/** Variables CSS `:root` para apps web */
export declare const PLATFORM_CSS_VARIABLES: Record<string, string>;
