import React from 'react';
interface HeaderProps {
    user?: {
        name: string;
        email: string;
        role: string;
        avatar?: string;
    };
    onLogout?: () => void;
    navigation?: Array<{
        name: string;
        href: string;
        icon?: React.ReactNode;
    }>;
}
export declare function Header({ user, onLogout, navigation }: HeaderProps): import("react/jsx-runtime").JSX.Element;
export {};
