'use client';

import { useState, useEffect } from 'react';

interface RealtimeIndicatorProps {
  isActive?: boolean;
  label?: string;
}

export function RealtimeIndicator({ isActive = true, label = 'En tiempo real' }: RealtimeIndicatorProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setPulse(true);
        setTimeout(() => setPulse(false), 500);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <div className={`relative w-2 h-2 ${pulse ? 'animate-pulse' : ''}`}>
        <div className="absolute inset-0 bg-green-500 rounded-full opacity-75 animate-ping" />
        <div className="relative w-2 h-2 bg-green-500 rounded-full" />
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}


