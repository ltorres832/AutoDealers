'use client';

import { SocialIcon } from './SocialIcon';

type Props = {
  href: string;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'card' | 'compact';
};

/** Enlace a soporte por WhatsApp sin mostrar el número de teléfono. */
export function WhatsAppSupportLink({
  href,
  title = 'WhatsApp',
  description = 'Chatear con soporte',
  className = '',
  variant = 'card',
}: Props) {
  if (variant === 'compact') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}: ${description}`}
        className={`inline-flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900 transition-colors hover:bg-green-100 ${className}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <SocialIcon platform="whatsapp" size={28} />
        </span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-green-800">{description}</span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title}: ${description}`}
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:border-green-200 hover:shadow-md ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10">
        <SocialIcon platform="whatsapp" size={32} />
      </div>
      <h2 className="font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-green-700">{description}</p>
    </a>
  );
}
