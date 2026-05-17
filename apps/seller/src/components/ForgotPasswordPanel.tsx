'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export function ForgotPasswordPanel() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!auth || !(auth as { app?: unknown }).app) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {!open ? (
        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          onClick={() => setOpen(true)}
        >
          ¿Olvidaste tu contraseña?
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setMsg(null);
            setLoading(true);
            try {
              await sendPasswordResetEmail(auth, email.trim());
              setMsg(
                'Si existe una cuenta con ese correo, recibirás un enlace de Firebase para restablecer la contraseña.'
              );
            } catch (ex: unknown) {
              const code = ex && typeof ex === 'object' && 'code' in ex ? String((ex as { code: string }).code) : '';
              if (code === 'auth/user-not-found') {
                setMsg(
                  'Si existe una cuenta con ese correo, recibirás un enlace. Revisa también la carpeta de spam.'
                );
              } else {
                setErr(ex instanceof Error ? ex.message : 'No se pudo enviar el correo');
              }
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-2"
        >
          <p className="text-xs text-gray-600">
            Misma base de usuarios que el inicio de sesión: el enlace lo envía Firebase Auth.
          </p>
          <label className="block text-xs font-medium text-gray-700">Correo de la cuenta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          {err && <p className="text-xs text-red-600">{err}</p>}
          {msg && <p className="text-xs text-green-700">{msg}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <button
              type="button"
              className="text-sm text-gray-600 hover:underline"
              onClick={() => {
                setOpen(false);
                setErr(null);
                setMsg(null);
              }}
            >
              Cerrar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
