interface SocialIconProps {
    platform: 'facebook' | 'instagram' | 'whatsapp' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube';
    size?: number;
    className?: string;
}
export declare function SocialIcon({ platform, size, className }: SocialIconProps): import("react/jsx-runtime").JSX.Element;
export {};
