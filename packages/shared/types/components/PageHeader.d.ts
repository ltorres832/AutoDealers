import React from 'react';
interface PageHeaderProps {
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    breadcrumbs?: Array<{
        label: string;
        href?: string;
    }>;
}
export declare function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
