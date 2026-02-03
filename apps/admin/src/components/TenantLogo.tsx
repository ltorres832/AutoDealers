'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TenantLogoProps {
  tenantId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallback?: React.ReactNode;
}

export function TenantLogo({ tenantId, size = 'md', className = '', fallback }: TenantLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchTenantLogo();
    } else {
      fetchSystemLogo();
    }
  }, [tenantId]);

  async function fetchTenantLogo() {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/branding`);
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

  async function fetchSystemLogo() {
    try {
      const response = await fetch('/api/admin/settings/branding');
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
        <Image
          src={logoUrl}
          alt="Logo"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    fallback || (
      <div className={`${sizeClasses[size]} ${className} flex items-center justify-center bg-gradient-primary rounded-lg`}>
        <span className="text-white font-bold text-lg">AD</span>
      </div>
    )
  );
}





