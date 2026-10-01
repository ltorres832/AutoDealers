import React from 'react';
interface StatsCardProps {
    title: string;
    value: string | number;
    change?: {
        value: number;
        type: 'increase' | 'decrease';
        period?: string;
    };
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}
export declare function StatsCard({ title, value, change, icon, trend }: StatsCardProps): import("react/jsx-runtime").JSX.Element;
export {};
