export interface ToastData {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
    duration?: number;
}
interface ToastNotificationProps {
    toast: ToastData | null;
    onClose: () => void;
}
export declare function ToastNotification({ toast, onClose }: ToastNotificationProps): import("react/jsx-runtime").JSX.Element;
export {};
