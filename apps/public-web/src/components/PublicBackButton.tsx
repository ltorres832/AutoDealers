'use client';

import { useRouter } from 'next/navigation';

type Props = {
  className?: string;
  children?: React.ReactNode;
  /**
   * Si no hay historial interno (p. ej. enlace externo o pestaña nueva),
   * navegar aquí en lugar de quedar sin destino útil.
   */
  fallbackHref?: string;
};

/**
 * Vuelve a la página anterior del historial (como el botón atrás del navegador).
 * Con `fallbackHref`, si el historial no permite «atrás», va a esa ruta.
 */
export default function PublicBackButton({
  className = '',
  children = '← Volver',
  fallbackHref = '/',
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === 'undefined') return;
        if (window.history.length > 1) {
          router.back();
        } else if (fallbackHref) {
          router.push(fallbackHref);
        } else {
          router.back();
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
