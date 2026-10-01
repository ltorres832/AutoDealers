import type { WebsiteHeroMediaMode } from '../website-hero-media';
export type WebsiteHeroMediaEditorProps = {
    mediaMode: WebsiteHeroMediaMode;
    backgroundImage?: string;
    backgroundVideoUrl?: string;
    showText?: boolean;
    onChange: (next: {
        mediaMode: WebsiteHeroMediaMode;
        backgroundImage?: string;
        backgroundVideoUrl?: string;
        showText?: boolean;
    }) => void;
    onUploadImage: (file: File) => Promise<string | null>;
    onUploadVideo: (file: File) => Promise<string | null>;
    uploading?: boolean;
    disabled?: boolean;
};
export declare function WebsiteHeroMediaEditor({ mediaMode, backgroundImage, backgroundVideoUrl, showText, onChange, onUploadImage, onUploadVideo, uploading, disabled, }: WebsiteHeroMediaEditorProps): import("react/jsx-runtime").JSX.Element;
