'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
  /** Texto del botón */
  label?: string;
  /** Si se pasa, se ejecuta en lugar de volver atrás */
  onClick?: () => void;
}

/**
 * Vuelve a la página anterior del historial del navegador (mismo comportamiento que el botón atrás del navegador).
 */
export default function BackButton({ label = 'Volver', onClick }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          router.back();
        }
      }}
      className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group"
    >
      <svg
        className="w-5 h-5 transition-transform group-hover:-translate-x-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
