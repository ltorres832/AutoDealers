'use client';

import { useEffect, useState } from 'react';

interface NewItemBadgeProps {
  isNew: boolean;
  children: React.ReactNode;
}

export function NewItemBadge({ isNew, children }: NewItemBadgeProps) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isNew) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <div className={`relative ${showAnimation ? 'animate-pulse' : ''}`}>
      {isNew && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
          !
        </span>
      )}
      {children}
    </div>
  );
}


