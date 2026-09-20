'use client';

import { useEffect, useState } from 'react';
import { WhatsAppSupportOptions, type WhatsAppSupportOption } from './WhatsAppSupportOptions';

type SupportContact = {
  email: string;
  whatsappOptions: WhatsAppSupportOption[];
  hours: string | null;
};

type UserPrefill = {
  name: string;
  email: string;
  phone: string;
};

type Props = {
  apiPath?: string;
  title?: string;
};

export function PlatformSupportPanel({
  apiPath = '/api/settings/support',
  title = 'Soporte',
}: Props) {
  const [contact, setContact] = useState<SupportContact | null>(null);
  const [prefill, setPrefill] = useState<UserPrefill>({ name: '', email: '', phone: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(apiPath, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar soporte');
        if (!cancelled) {
          setContact(data.contact ?? null);
          if (data.user) {
            setPrefill({
              name: data.user.name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (message.trim().length < 10) {
      setError('Describe tu consulta con al menos 10 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje');

      setMessage('');
      setSuccess('Tu mensaje fue enviado. Te responderemos pronto.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-500">Cargando soporte…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600">
          Para soporte inmediato, elige un motivo y escríbenos por WhatsApp. También puedes
          enviarnos un mensaje desde tu cuenta o por email.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {contact?.whatsappOptions && contact.whatsappOptions.length > 0 && (
          <WhatsAppSupportOptions
            options={contact.whatsappOptions}
            title="Soporte por WhatsApp"
          />
        )}

        {contact?.email && (
          <a
            href={`mailto:${contact.email}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 text-2xl">✉️</div>
            <h2 className="font-semibold text-gray-900">Email</h2>
            <p className="mt-1 text-sm text-primary-600">{contact.email}</p>
          </a>
        )}
      </div>

      {contact?.hours && (
        <p className="mb-6 text-sm text-gray-500">Horario de atención: {contact.hours}</p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Soporte desde tu cuenta</h2>
        <p className="mb-4 text-sm text-gray-600">
          Envía un mensaje al equipo de soporte. Usaremos los datos de tu perfil para responderte.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={prefill.name}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={prefill.email}
                readOnly
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="support-message" className="mb-1 block text-sm font-medium text-gray-700">
              Mensaje *
            </label>
            <textarea
              id="support-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe tu problema, duda o pregunta…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
              minLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Enviar mensaje a soporte'}
          </button>
        </form>
      </div>
    </div>
  );
}
