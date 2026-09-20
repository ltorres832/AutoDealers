import Link from 'next/link';

type DemoPreviewNoticeProps = {
  registerHref: string;
  registerLabel: string;
};

export function DemoPreviewNotice({ registerHref, registerLabel }: DemoPreviewNoticeProps) {
  return (
    <div className="sticky top-16 z-40 border-b border-amber-300 bg-amber-50 sm:top-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-amber-950">
          <span className="mr-2 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-950">
            Preview
          </span>
          Esto es solo una vista previa. La versión completa está disponible cuando te registras.
        </p>
        <Link
          href={registerHref}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {registerLabel}
        </Link>
      </div>
    </div>
  );
}

export function DemoPreviewBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-950 ${className}`.trim()}
    >
      Preview · no es el panel real
    </span>
  );
}
