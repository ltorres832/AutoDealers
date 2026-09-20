'use client';

import { COMING_SOON_FEATURE_LABEL } from '../membership-display';

export function ComingSoonBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ${className}`.trim()}
    >
      {COMING_SOON_FEATURE_LABEL}
    </span>
  );
}
