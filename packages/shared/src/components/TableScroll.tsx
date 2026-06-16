import type { ReactNode } from 'react';

/** Horizontal scroll wrapper for wide data tables on mobile/tablet. */
export function TableScroll({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`table-scroll custom-scrollbar ${className}`.trim()}>{children}</div>
  );
}
