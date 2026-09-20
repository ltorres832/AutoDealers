'use client';

import { useState } from 'react';

export function ForgotPasswordPanel() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {!open ? (
        <button
          type="button"
          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
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
              const response = await fetch('/api/auth/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo enviar el correo');
              }
              setMsg(
                typeof data.message === 'string'
                  ? data.message
                  : 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también la carpeta de spam.'
              );
            } catch {
              setErr('No se pudo enviar el correo. Verifica el email e inténtalo de nuevo.');
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-2"
        >
          <p className="text-xs text-gray-600">
            Indica el correo con el que inicias sesión. Te enviaremos un enlace para restablecer tu contraseña.
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
              className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
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
