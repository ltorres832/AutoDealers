import { useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook que actualiza automáticamente el último acceso del usuario
 * cuando se monta el componente
 */
export function useUpdateLastAccess() {
  const { auth } = useAuth();

  useEffect(() => {
    if (!auth?.userId) return;

    // Actualizar último acceso (sin bloquear si falla)
    fetch('/api/users/update-last-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).catch(err => {
      // Silenciar errores - no es crítico si falla
      console.debug('No se pudo actualizar último acceso:', err);
    });
  }, [auth?.userId]);
}
