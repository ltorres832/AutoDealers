import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}
export declare function Button({ children, variant, size, loading, icon, fullWidth, className, disabled, ...props }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
