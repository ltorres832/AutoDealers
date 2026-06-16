'use client';

import { useEffect, useState } from 'react';

export type NotificationPrefsPayload = {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    sound: boolean;
  };
  businessNotifications: {
    newLeads: boolean;
    newMessages: boolean;
    newAppointments: boolean;
    newSales: boolean;
    documents: boolean;
    tasks: boolean;
    catalogInterest: boolean;
    systemAlerts: boolean;
  };
  hasPhone: boolean;
};

type Props = {
  apiPath?: string;
  title?: string;
};

const defaults: NotificationPrefsPayload = {
  hasPhone: false,
  notifications: {
    push: true,
    email: true,
    sms: true,
    whatsapp: true,
    sound: true,
  },
  businessNotifications: {
    newLeads: true,
    newMessages: true,
    newAppointments: true,
    newSales: true,
    documents: true,
    tasks: true,
    catalogInterest: true,
    systemAlerts: true,
  },
};

export function NotificationSettingsForm({
  apiPath = '/api/settings/notifications',
  title = 'Notificaciones',
}: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefsPayload>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiPath, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudieron cargar las preferencias');
        const data = await res.json();
        if (!cancelled && data.prefs) {
          setPrefs({ ...defaults, ...data.prefs });
          if (data.prefs.notifications?.sound === false) {
            localStorage.setItem('notifications:sound', 'off');
          } else if (data.prefs.notifications?.sound !== false) {
            localStorage.removeItem('notifications:sound');
          }
        }
      } catch (e) {
        if (!cancelled) setMessage(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      if (prefs.notifications.sound) {
        localStorage.removeItem('notifications:sound');
      } else {
        localStorage.setItem('notifications:sound', 'off');
      }
      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notifications: prefs.notifications,
          businessNotifications: prefs.businessNotifications,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }
      setMessage('Preferencias guardadas.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(key: keyof NotificationPrefsPayload['notifications']) {
    setPrefs((p) => ({
      ...p,
      notifications: { ...p.notifications, [key]: !p.notifications[key] },
    }));
  }

  function toggleBusiness(key: keyof NotificationPrefsPayload['businessNotifications']) {
    setPrefs((p) => ({
      ...p,
      businessNotifications: { ...p.businessNotifications, [key]: !p.businessNotifications[key] },
    }));
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        Cargando preferencias…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-gray-600">
          Elige cómo quieres recibir alertas: en la app, push, correo, SMS y WhatsApp (según tu plan y
          teléfono en el perfil).
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Canales de envío</h2>
        <ul className="space-y-3">
          <ToggleRow
            label="Campana en la aplicación"
            hint="Siempre activa cuando hay eventos"
            checked
            disabled
            onChange={() => {}}
          />
          <ToggleRow
            label="Notificaciones push (navegador)"
            hint="Requiere permiso del navegador al iniciar sesión"
            checked={prefs.notifications.push}
            onChange={() => toggleChannel('push')}
          />
          <ToggleRow
            label="Correo electrónico"
            checked={prefs.notifications.email}
            onChange={() => toggleChannel('email')}
          />
          <ToggleRow
            label="SMS"
            hint={prefs.hasPhone ? undefined : 'Agrega teléfono en Perfil para SMS'}
            checked={prefs.notifications.sms}
            disabled={!prefs.hasPhone}
            onChange={() => toggleChannel('sms')}
          />
          <ToggleRow
            label="WhatsApp"
            hint={prefs.hasPhone ? undefined : 'Agrega teléfono en Perfil para WhatsApp'}
            checked={prefs.notifications.whatsapp}
            disabled={!prefs.hasPhone}
            onChange={() => toggleChannel('whatsapp')}
          />
          <ToggleRow
            label="Sonido en el navegador"
            hint="Al llegar una notificación nueva con la app abierta"
            checked={prefs.notifications.sound}
            onChange={() => toggleChannel('sound')}
          />
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de alertas del negocio</h2>
        <ul className="space-y-3">
          <ToggleRow label="Leads nuevos y asignaciones" checked={prefs.businessNotifications.newLeads} onChange={() => toggleBusiness('newLeads')} />
          <ToggleRow label="Mensajes y chats" checked={prefs.businessNotifications.newMessages} onChange={() => toggleBusiness('newMessages')} />
          <ToggleRow label="Interés en catálogo web" checked={prefs.businessNotifications.catalogInterest} onChange={() => toggleBusiness('catalogInterest')} />
          <ToggleRow label="Citas" checked={prefs.businessNotifications.newAppointments} onChange={() => toggleBusiness('newAppointments')} />
          <ToggleRow label="Ventas" checked={prefs.businessNotifications.newSales} onChange={() => toggleBusiness('newSales')} />
          <ToggleRow label="Documentos y F&I" checked={prefs.businessNotifications.documents} onChange={() => toggleBusiness('documents')} />
          <ToggleRow label="Tareas" checked={prefs.businessNotifications.tasks} onChange={() => toggleBusiness('tasks')} />
          <ToggleRow label="Alertas del sistema" checked={prefs.businessNotifications.systemAlerts} onChange={() => toggleBusiness('systemAlerts')} />
        </ul>
      </section>

      {message && (
        <p className={`text-sm ${message.includes('guardadas') ? 'text-green-700' : 'text-red-600'}`}>{message}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar preferencias'}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${checked ? 'bg-primary-600' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </li>
  );
}
