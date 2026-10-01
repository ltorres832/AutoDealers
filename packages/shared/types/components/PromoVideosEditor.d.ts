export type PromoVideosEditorProps = {
    urls: string[];
    onChange: (urls: string[]) => void;
    onUploadFile: (file: File) => Promise<string | null>;
    uploading?: boolean;
    saving?: boolean;
    onSave?: () => void;
    maxVideos?: number;
    title?: string;
    description?: string;
};
export declare function PromoVideosEditor({ urls, onChange, onUploadFile, uploading, saving, onSave, maxVideos, title, description, }: PromoVideosEditorProps): import("react/jsx-runtime").JSX.Element;
