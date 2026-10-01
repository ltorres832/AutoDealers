export type SocialMediaMap = {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    [key: string]: string | undefined;
};
export declare function SocialMediaLinks({ socialMedia, className, iconClassName, showLabels, }: {
    socialMedia?: SocialMediaMap | null;
    className?: string;
    iconClassName?: string;
    /** Muestra el nombre de la red (Facebook, Instagram…) junto al icono. */
    showLabels?: boolean;
}): import("react/jsx-runtime").JSX.Element;
