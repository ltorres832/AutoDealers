export type WhatsAppSupportOption = {
    id: string;
    label: string;
    url: string;
};
type Props = {
    options: WhatsAppSupportOption[];
    title?: string;
    className?: string;
    variant?: 'card' | 'compact';
};
/** Opciones de mensaje para abrir WhatsApp sin mostrar el número. */
export declare function WhatsAppSupportOptions({ options, title, className, variant, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
