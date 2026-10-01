import React from 'react';
interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}
export declare function Card({ children, className, hover, padding }: CardProps): import("react/jsx-runtime").JSX.Element;
export {};
