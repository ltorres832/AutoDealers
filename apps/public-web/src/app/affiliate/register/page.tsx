'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registrationInputClass, registrationLabelClass } from '@/lib/registration-form-styles';

function previewAffiliateReferralCode(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 24);
  return `${slug || 'AFILIADO'}${new Date().getFullYear()}`;
}

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo completar el registro');
        return;
      }
      router.push('/affiliate/dashboard');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🤝</div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Afiliado</h1>
          <p className="text-slate-900 mt-2 text-sm font-semibold">
            Crea tu cuenta y obtén tu código de referido para invitar nuevos usuarios
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-5 text-white shadow-lg">
          <p className="text-lg font-bold mb-3">💰 Gana por cada referido exitoso</p>
          <ul className="text-sm text-primary-50 space-y-2">
            <li className="flex gap-2">
              <span className="text-primary-200">✓</span>
              <span>Comisión en efectivo por cada vendedor o dealer que se una con tu código</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-200">✓</span>
              <span>Comparte tu link en WhatsApp, redes o con tus contactos del sector</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-200">✓</span>
              <span>Cobros automáticos vía Stripe cuando tu referido activa su membresía</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className={registrationLabelClass}>Nombre completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={registrationInputClass}
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className={registrationLabelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={registrationInputClass}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className={registrationLabelClass}>Teléfono (opcional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={registrationInputClass}
              placeholder="787-000-0000"
            />
          </div>

          <div className="rounded-lg border-2 border-slate-300 bg-white px-3 py-2">
            <p className="text-sm font-bold text-slate-900 mb-1">Tu código de referido</p>
            <p className="font-mono text-base font-bold text-slate-900">
              {name.trim() ? previewAffiliateReferralCode(name) : 'NOMBRE2026'}
            </p>
          </div>

          <div>
            <label className={registrationLabelClass}>Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={registrationInputClass}
            />
          </div>

          <div>
            <label className={registrationLabelClass}>Confirmar contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={registrationInputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta de afiliado'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/affiliate/login" className="text-primary-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="text-primary-600 hover:underline">
            Volver al sitio principal
          </Link>
        </p>
      </div>
    </div>
  );
}
