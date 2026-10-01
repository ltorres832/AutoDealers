import React from 'react';
interface SidebarItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
}
interface SidebarProps {
    items: SidebarItem[];
    user?: {
        name: string;
        email: string;
        role: string;
    };
    collapsed?: boolean;
}
export declare function Sidebar({ items, user, collapsed }: SidebarProps): import("react/jsx-runtime").JSX.Element;
export {};
