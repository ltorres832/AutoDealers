interface StripePaymentFormProps {
    amount: number;
    currency?: string;
    description?: string;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    metadata?: Record<string, string>;
    customerId?: string;
    subscriptionPriceId?: string;
    clientSecret?: string;
    intentType?: 'payment' | 'setup';
    submitLabel?: string;
    totalLabel?: string;
    /** Si no hay NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, se obtiene desde esta API (ej. Firestore). */
    publishableKeyUrl?: string;
    publishableKey?: string;
}
export declare function StripePaymentForm({ publishableKeyUrl, publishableKey: publishableKeyProp, ...props }: StripePaymentFormProps): import("react/jsx-runtime").JSX.Element;
export {};
