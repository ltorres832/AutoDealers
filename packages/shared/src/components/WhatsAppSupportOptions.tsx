'use client';

import { SocialIcon } from './SocialIcon';

export type WhatsAppSupportOption = {
  id: string;
  label: string;
  url: string;
};

type Props = {
  options: WhatsAppSupportOption[];
  title?: string;
  className?: string;
  variant?: 'card' | 'compact';
};

/** Opciones de mensaje para abrir WhatsApp sin mostrar el número. */
export function WhatsAppSupportOptions({
  options,
  title = 'Soporte por WhatsApp',
  className = '',
  variant = 'card',
}: Props) {
  if (options.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className={className}>
        <p className="mb-3 text-sm font-medium text-gray-700">{title}</p>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <a
              key={option.id}
              href={option.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp: ${option.label}`}
              className="inline-flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900 transition-colors hover:bg-green-100"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <SocialIcon platform="whatsapp" size={24} />
              </span>
              <span className="font-medium">{option.label}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10">
          <SocialIcon platform="whatsapp" size={32} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">Elige un motivo para iniciar el chat</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <a
            key={option.id}
            href={option.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp: ${option.label}`}
            className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50/80 px-4 py-3 text-green-900 transition-colors hover:border-green-200 hover:bg-green-100"
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-sm text-green-700">Abrir chat →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
