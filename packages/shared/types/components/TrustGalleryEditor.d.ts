export type TrustGalleryEditorProps = {
    photos: string[];
    onChange: (photos: string[]) => void;
    onUploadFile: (file: File) => Promise<string | null>;
    onUploadComplete?: (photos: string[]) => void | Promise<void>;
    uploading?: boolean;
    saving?: boolean;
    onSave?: () => void;
    maxPhotos?: number;
    uploadError?: string | null;
};
export declare function TrustGalleryEditor({ photos, onChange, onUploadFile, onUploadComplete, uploading, saving, onSave, maxPhotos, uploadError, }: TrustGalleryEditorProps): import("react/jsx-runtime").JSX.Element;
