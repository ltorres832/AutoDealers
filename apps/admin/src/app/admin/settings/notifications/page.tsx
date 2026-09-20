'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { NotificationSettingsForm } from '@autodealers/shared/client';

type Readiness = {
  push: { vapidConfigured: boolean; messagingSenderId: boolean };
  email: { configured: boolean; fromAddress: boolean };
  sms: { configured: boolean };
  whatsapp: { configured: boolean };
  profilePhone: boolean;
  tenantIdForRealtime: boolean;
};

export default function AdminNotificationSettingsPage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    fetch('/api/settings/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.readiness) setReadiness(d.readiness);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href="/admin/settings/general" className="text-sm text-primary-600 hover:underline">
          ← Credenciales del sistema
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Notificaciones</h1>
        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
          Esta pantalla muestra si el sistema puede enviar alertas.{' '}
          <strong>No hay un interruptor para &quot;email de afiliados&quot;</strong>: cuando un afiliado se
          registra, el correo se envía solo si el email del sistema está en verde abajo.
        </p>
      </div>

      {readiness && <ReadinessPanel readiness={readiness} />}

      <NotificationSettingsForm
        apiPath="/api/settings/notifications"
        title="Mis preferencias personales (opcional)"
      />
      <p className="text-xs text-gray-500 -mt-4">
        Los interruptores de abajo solo afectan alertas personales. No apagan el email de afiliados ni
        registros nuevos.
      </p>
    </div>
  );
}

function ReadinessPanel({ readiness }: { readiness: Readiness }) {
  const emailReady = readiness.email.configured && readiness.email.fromAddress;

  const items = [
    {
      ok: emailReady,
      label: 'Email automático: afiliados, registros y pagos',
      hint: emailReady
        ? 'Siempre activo. Cada admin con audiencia Plataforma o Todas recibe campana + correo.'
        : 'Configura emailApiKey y remitente en Credenciales del sistema (General).',
      action: emailReady ? undefined : { href: '/admin/settings/general', text: 'Configurar email' },
    },
    {
      ok: emailReady,
      label: 'Quién recibe alertas de afiliados',
      hint: emailReady
        ? 'Cada usuario admin debe tener audiencia Todas o Plataforma (Admin → Usuarios).'
        : 'Primero configura el email del sistema.',
      action: { href: '/admin/users', text: 'Ver usuarios admin' },
    },
    {
      ok: readiness.push.vapidConfigured && readiness.push.messagingSenderId,
      label: 'Push web (VAPID + Firebase Messaging)',
      hint: readiness.push.vapidConfigured
        ? 'VAPID detectada en el servidor'
        : 'Falta secret NEXT_PUBLIC_FIREBASE_VAPID_KEY en App Hosting',
      action: { href: '/admin/settings/general', text: 'Ver credenciales' },
    },
    {
      ok: readiness.email.configured && readiness.email.fromAddress,
      label: 'Email (Resend / SendGrid)',
      hint: readiness.email.configured
        ? readiness.email.fromAddress
          ? 'API y remitente configurados'
          : 'Falta emailFromAddress'
        : 'Falta emailApiKey en Admin → General',
      action: { href: '/admin/settings/general', text: 'Configurar email' },
    },
    {
      ok: readiness.sms.configured,
      label: 'SMS (Twilio)',
      hint: readiness.sms.configured
        ? 'Twilio en system_settings/credentials'
        : 'Faltan twilioAccountSid, authToken o phoneNumber',
      action: { href: '/admin/settings/general', text: 'Configurar Twilio' },
    },
    {
      ok: readiness.whatsapp.configured,
      label: 'WhatsApp (Meta)',
      hint: readiness.whatsapp.configured
        ? 'Token y phoneNumberId configurados'
        : 'Faltan whatsappAccessToken o whatsappPhoneNumberId',
      action: { href: '/admin/settings/general', text: 'Configurar WhatsApp' },
    },
    {
      ok: readiness.profilePhone,
      label: 'Tu teléfono en perfil (SMS/WhatsApp a ti)',
      hint: readiness.profilePhone
        ? 'Teléfono en tu usuario'
        : 'Edita tu usuario admin y agrega teléfono',
      action: { href: '/admin/admin-users', text: 'Usuarios admin' },
    },
    {
      ok: readiness.tenantIdForRealtime,
      label: 'Campana en tiempo real (Firestore)',
      hint: readiness.tenantIdForRealtime
        ? 'tenantId asignado — campana activa'
        : 'Admin sin tenantId: prefs y push sí; campana puede estar vacía',
      optional: true,
    },
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Estado del sistema de alertas</h2>
      <p className="mt-1 text-sm text-gray-600">
        Qué está listo en producción para enviar notificaciones a todos los perfiles.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex flex-wrap items-start justify-between gap-2 rounded-lg border px-4 py-3 ${
              item.ok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div>
              <p className="font-medium text-gray-900">
                {item.ok ? '✅' : '⚠️'} {item.label}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{item.hint}</p>
            </div>
            {!item.ok && item.action && (
              <Link
                href={item.action.href}
                className="text-sm font-medium text-primary-600 hover:underline shrink-0"
              >
                {item.action.text}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
