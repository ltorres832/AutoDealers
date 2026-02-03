import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  className?: string;
}

export function Logo({ size = 'md', variant = 'color', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  // En producción, usarías una imagen real
  // Por ahora, usamos un SVG profesional
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <svg
        viewBox="0 0 200 200"
        className={`${sizeClasses[size]} ${variant === 'light' ? 'text-white' : variant === 'dark' ? 'text-gray-900' : ''}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Logo profesional de AutoDealers */}
        <rect width="200" height="200" rx="20" fill="url(#gradient)" />
        <path
          d="M60 80 L100 50 L140 80 L140 120 L100 150 L60 120 Z"
          fill="white"
          opacity="0.9"
        />
        <circle cx="100" cy="100" r="25" fill="url(#gradient)" />
        <path
          d="M85 100 L100 85 L115 100 L100 115 Z"
          fill="white"
        />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="200">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`ml-3 font-bold ${size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-3xl'} ${variant === 'light' ? 'text-white' : 'text-gray-900'}`}>
        AutoDealers
      </span>
    </div>
  );
}





