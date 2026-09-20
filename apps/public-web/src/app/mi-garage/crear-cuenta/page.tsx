'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { auth } from '@/lib/firebase-config';

export default function CrearCuentaClientePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    acceptPlatformTerms: false,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token =
        typeof window !== 'undefined' ? window.localStorage.getItem('garageToken') || '' : '';
      const registerRes = await fetch('/api/public/garage/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setError(registerData.error || 'No se pudo crear la cuenta');
        setLoading(false);
        return;
      }

      if (registerData?.garage?.accessToken) {
        window.localStorage.setItem('garageToken', registerData.garage.accessToken);
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          serverAuthFallback: true,
        }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (loginData?.customToken && auth) {
        const cred = await signInWithCustomToken(auth, loginData.customToken);
        const idToken = await cred.user.getIdToken(true);
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        });
      }

      router.push('/mi-garage');
    } catch {
      setError('No se pudo crear la cuenta. Inténtalo de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/mi-garage" />
      <main className="max-w-xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Crear cuenta (opcional)</h1>
        <p className="text-slate-600 mb-6">
          No necesitas una cuenta para usar Mi garage. Créala solo si quieres volver después sin
          depender de este celular.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
            <p className="font-bold text-slate-900 mb-2">Con cuenta</p>
            <ul className="text-sm text-slate-700 space-y-1.5">
              <li>Entras con email y contraseña desde cualquier dispositivo</li>
              <li>Tus vehículos y recordatorios quedan ligados a ti</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-bold text-slate-900 mb-2">Sin cuenta</p>
            <ul className="text-sm text-slate-700 space-y-1.5">
              <li>Mi garage funciona igual, con el email o teléfono de tu consulta</li>
              <li>El acceso queda en este dispositivo; no pierdes el garage por no registrarte</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          ¿Prefieres no registrarte?{' '}
          <Link href="/mi-garage" className="text-primary-700 font-bold hover:underline">
            Seguir sin cuenta
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-6 grid gap-4">
          <input
            required
            className="rounded-xl border px-4 py-3"
            placeholder="Tu nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            className="rounded-xl border px-4 py-3"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            minLength={6}
            className="rounded-xl border px-4 py-3"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Teléfono (opcional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.acceptPlatformTerms}
              onChange={(e) => setForm({ ...form, acceptPlatformTerms: e.target.checked })}
            />
            <span>
              Acepto los{' '}
              <Link href="/terminos" className="text-primary-700 font-medium" target="_blank">
                Términos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" className="text-primary-700 font-medium" target="_blank">
                Política de Privacidad
              </Link>
              .
            </span>
          </label>
          {error ? <p className="text-red-600">{error}</p> : null}
          <button
            disabled={loading}
            className="rounded-xl bg-primary-600 text-white font-bold py-3 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <p className="text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login?redirect=/mi-garage" className="text-primary-700 font-medium">
              Iniciar sesión
            </Link>
          </p>
          <p className="text-sm text-slate-500">
            ¿Eres concesionario, vendedor o servicios (taller)? Usa el{' '}
            <Link href="/registro" className="text-primary-700 font-medium">
              registro de negocio
            </Link>
            , no esta página.
          </p>
        </form>
      </main>
      <LandingFooter />
    </div>
  );
}
