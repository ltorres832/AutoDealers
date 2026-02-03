'use client';

import { useState, useEffect } from 'react';

interface TenantLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TenantLogo({ size = 'md', className = '' }: TenantLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogo();
  }, []);

  async function fetchLogo() {
    try {
      const response = await fetch('/api/settings/branding');
      const data = await response.json();
      if (data.logo) {
        setLogoUrl(data.logo);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gray-100 rounded animate-pulse`}>
        <div className="h-4 w-24 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative`}>
        <img
          src={logoUrl}
          alt="Logo"
          className="h-full w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gradient-primary rounded-lg`}>
      <span className="text-white font-bold text-lg">AD</span>
    </div>
  );
}





