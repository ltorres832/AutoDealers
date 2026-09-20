'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type VoiceIncentive = {
  id: string;
  title: string;
  description: string;
  condition?: string;
  active: boolean;
};

type VoiceConfigState = {
  enabled: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  persona: {
    agentName: string;
    businessName: string;
    gender: 'female' | 'male' | 'neutral';
    voiceId: string;
    tone: 'cercano' | 'profesional' | 'entusiasta';
    extraStyleInstructions?: string;
  };
  recordingDisclosure: string;
  service: {
    serviceAppointmentsEnabled: boolean;
    serviceSlotMinutes: number;
    servicesOffered?: string[];
  };
  incentives: VoiceIncentive[];
  socialAutoCall: {
    metaLeadAdsEnabled: boolean;
    whatsappEnabled: boolean;
    messengerEnabled: boolean;
    instagramEnabled: boolean;
    delayMinutes: number;
    onlyBusinessHours: boolean;
  };
  twilioPhoneNumber?: string;
  businessRules?: string;
  guardrails?: string;
  escalationPhoneNumber?: string;
  provisioning?: {
    status?: 'ready' | 'pending' | 'error' | 'skipped';
    twilioSid?: string;
    error?: string;
  };
};

type MembershipFlags = {
  voiceAIEnabled: boolean;
  voiceInboundEnabled: boolean;
  voiceOutboundEnabled: boolean;
  voiceServiceCallsEnabled: boolean;
  voiceCampaignsEnabled: boolean;
};

const VOICE_OPTIONS = [
  { id: 'marin', label: 'Marin (femenina, cálida)' },
  { id: 'cedar', label: 'Cedar (masculina, natural)' },
  { id: 'alloy', label: 'Alloy (neutra)' },
  { id: 'echo', label: 'Echo (masculina)' },
  { id: 'shimmer', label: 'Shimmer (femenina)' },
];

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>
        <span className="font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

export default function VoiceAgentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<VoiceConfigState | null>(null);
  const [membership, setMembership] = useState<MembershipFlags | null>(null);
  const [servicesText, setServicesText] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchWithAuth('/api/settings/voice-agent', {});
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config);
          setMembership(data.membership);
          setServicesText((data.config?.service?.servicesOffered || []).join(', '));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const payload = {
        ...config,
        service: {
          ...config.service,
          servicesOffered: servicesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };
      const res = await fetchWithAuth('/api/settings/voice-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        alert('Configuración del agente de voz guardada');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(typeof err?.error === 'string' ? err.error : 'Error al guardar');
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<VoiceConfigState>) {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function addIncentive() {
    if (!config) return;
    update({
      incentives: [
        ...config.incentives,
        {
          id: `inc_${Date.now()}`,
          title: '',
          description: '',
          condition: '',
          active: true,
        },
      ],
    });
  }

  function updateIncentive(id: string, patch: Partial<VoiceIncentive>) {
    if (!config) return;
    update({
      incentives: config.incentives.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }

  function removeIncentive(id: string) {
    if (!config) return;
    update({ incentives: config.incentives.filter((i) => i.id !== id) });
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Cargando agente de voz…</div>;
  }

  if (!membership?.voiceAIEnabled) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">🎙️ Agente de Voz IA</h1>
          <p className="mt-2 text-gray-700">
            Tu plan actual no incluye el Agente de Voz IA. Con esta función, un agente con voz
            humana atiende y hace llamadas de seguimiento a tus clientes, agenda citas y registra
            todo en tu CRM con grabación y transcripción.
          </p>
          <Link
            href="/settings/membership"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-5 py-2 text-white hover:bg-primary-700"
          >
            Mejorar mi plan
          </Link>
        </div>
      </div>
    );
  }

  if (!config) {
    return <div className="p-8 text-center text-gray-600">No se pudo cargar la configuración.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900">🎙️ Agente de Voz IA</h1>
      <p className="mt-1 text-sm text-gray-600">
        Configura la persona, los incentivos y las reglas del agente que llama y atiende a tus
        clientes con voz humana en español. Todas las llamadas quedan grabadas y transcritas en tu CRM.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        {/* Activación */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Activación</h2>
          <Toggle
            label="Agente de voz activo"
            checked={config.enabled}
            onChange={(v) => update({ enabled: v })}
            hint="Interruptor general: si está apagado no se atienden ni se hacen llamadas."
          />
          {membership.voiceInboundEnabled && (
            <Toggle
              label="Atender llamadas entrantes"
              checked={config.inboundEnabled}
              onChange={(v) => update({ inboundEnabled: v })}
            />
          )}
          {membership.voiceOutboundEnabled && (
            <Toggle
              label="Hacer llamadas salientes (seguimientos automáticos)"
              checked={config.outboundEnabled}
              onChange={(v) => update({ outboundEnabled: v })}
            />
          )}
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700">Línea de voz (incluida en tu plan)</label>
            {config.provisioning?.status === 'ready' && config.twilioPhoneNumber ? (
              <>
                <input
                  type="tel"
                  value={config.twilioPhoneNumber}
                  readOnly
                  className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-gray-900"
                />
                <p className="mt-1 text-xs text-green-700">
                  Lista y asignada a tu negocio. Las llamadas a este número las atiende tu agente
                  con el nombre e inventario de tu cuenta. Incluida en la membresía (la plataforma
                  cubre Twilio/OpenAI dentro de los límites del plan).
                </p>
              </>
            ) : config.provisioning?.status === 'error' ? (
              <>
                <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No se pudo asignar la línea automáticamente:{' '}
                  {config.provisioning.error || 'error desconocido'}. Recarga esta página o contacta
                  soporte.
                </p>
                <input
                  type="tel"
                  value={config.twilioPhoneNumber || ''}
                  onChange={(e) => update({ twilioPhoneNumber: e.target.value })}
                  placeholder="+17875551234"
                  className="mt-2 w-full rounded border px-3 py-2"
                />
              </>
            ) : (
              <>
                <input
                  type="tel"
                  value={config.twilioPhoneNumber || ''}
                  onChange={(e) => update({ twilioPhoneNumber: e.target.value })}
                  placeholder="Se asigna al activar el plan…"
                  className="mt-1 w-full rounded border px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Al tener Agente de Voz en tu membresía, el sistema asigna un número Twilio propio
                  y deja el agente listo. Si aún no aparece, guarda y recarga.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Persona */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Persona del agente</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del agente</label>
              <input
                type="text"
                value={config.persona.agentName}
                onChange={(e) =>
                  update({ persona: { ...config.persona, agentName: e.target.value } })
                }
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del negocio</label>
              <input
                type="text"
                value={config.persona.businessName}
                onChange={(e) =>
                  update({ persona: { ...config.persona, businessName: e.target.value } })
                }
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Voz</label>
              <select
                value={config.persona.voiceId}
                onChange={(e) =>
                  update({ persona: { ...config.persona, voiceId: e.target.value } })
                }
                className="mt-1 w-full rounded border px-3 py-2"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tono</label>
              <select
                value={config.persona.tone}
                onChange={(e) =>
                  update({ persona: { ...config.persona, tone: e.target.value as any } })
                }
                className="mt-1 w-full rounded border px-3 py-2"
              >
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
                <option value="entusiasta">Entusiasta</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Instrucciones adicionales de estilo (opcional)
            </label>
            <textarea
              value={config.persona.extraStyleInstructions || ''}
              onChange={(e) =>
                update({ persona: { ...config.persona, extraStyleInstructions: e.target.value } })
              }
              rows={2}
              placeholder="Ej: Menciona siempre que somos negocio familiar con 20 años en Caguas."
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </section>

        {/* Aviso de grabación */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Aviso de grabación (obligatorio)</h2>
          <textarea
            value={config.recordingDisclosure}
            onChange={(e) => update({ recordingDisclosure: e.target.value })}
            rows={2}
            className="w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            El agente lo dice después de confirmar que habla con la persona correcta. No puede quedar vacío.
          </p>
        </section>

        {/* Llamadas automáticas por redes sociales */}
        {membership.voiceOutboundEnabled && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Llamada automática a leads de redes sociales</h2>
            <p className="mb-3 text-sm text-gray-600">
              Cuando llega un lead nuevo por estos canales, el agente lo llama automáticamente con
              contexto de lo que preguntó.
            </p>
            <Toggle
              label="Meta Lead Ads (formularios de anuncios)"
              checked={config.socialAutoCall.metaLeadAdsEnabled}
              onChange={(v) =>
                update({ socialAutoCall: { ...config.socialAutoCall, metaLeadAdsEnabled: v } })
              }
            />
            <Toggle
              label="WhatsApp"
              checked={config.socialAutoCall.whatsappEnabled}
              onChange={(v) =>
                update({ socialAutoCall: { ...config.socialAutoCall, whatsappEnabled: v } })
              }
            />
            <Toggle
              label="Facebook Messenger"
              checked={config.socialAutoCall.messengerEnabled}
              onChange={(v) =>
                update({ socialAutoCall: { ...config.socialAutoCall, messengerEnabled: v } })
              }
            />
            <Toggle
              label="Instagram DM"
              checked={config.socialAutoCall.instagramEnabled}
              onChange={(v) =>
                update({ socialAutoCall: { ...config.socialAutoCall, instagramEnabled: v } })
              }
            />
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minutos de espera antes de llamar
                </label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={config.socialAutoCall.delayMinutes}
                  onChange={(e) =>
                    update({
                      socialAutoCall: {
                        ...config.socialAutoCall,
                        delayMinutes: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </div>
              <div className="flex items-end">
                <Toggle
                  label="Solo llamar en horario laboral"
                  checked={config.socialAutoCall.onlyBusinessHours}
                  onChange={(v) =>
                    update({ socialAutoCall: { ...config.socialAutoCall, onlyBusinessHours: v } })
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* Servicio y mantenimiento */}
        {membership.voiceServiceCallsEnabled && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Citas de servicio y mantenimiento</h2>
            <Toggle
              label="Permitir que el agente agende citas de servicio"
              checked={config.service.serviceAppointmentsEnabled}
              onChange={(v) =>
                update({ service: { ...config.service, serviceAppointmentsEnabled: v } })
              }
            />
            {config.service.serviceAppointmentsEnabled && (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Duración por cita (minutos)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={config.service.serviceSlotMinutes}
                    onChange={(e) =>
                      update({
                        service: {
                          ...config.service,
                          serviceSlotMinutes: parseInt(e.target.value, 10) || 60,
                        },
                      })
                    }
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Servicios ofrecidos (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={servicesText}
                    onChange={(e) => setServicesText(e.target.value)}
                    placeholder="Cambio de aceite, gomas, frenos"
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Incentivos */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Incentivos que el agente puede mencionar</h2>
            <button
              type="button"
              onClick={addIncentive}
              className="rounded-lg border border-primary-600 px-3 py-1 text-sm text-primary-700 hover:bg-primary-50"
            >
              + Añadir
            </button>
          </div>
          {config.incentives.length === 0 && (
            <p className="text-sm text-gray-500">
              Sin incentivos. Añade ofertas o bonos que el agente pueda usar para motivar la visita.
            </p>
          )}
          <div className="space-y-3">
            {config.incentives.map((inc) => (
              <div key={inc.id} className="rounded-lg border border-gray-200 p-3">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    type="text"
                    value={inc.title}
                    onChange={(e) => updateIncentive(inc.id, { title: e.target.value })}
                    placeholder="Título (ej: $500 de bono trade-in)"
                    className="rounded border px-3 py-2"
                  />
                  <input
                    type="text"
                    value={inc.condition || ''}
                    onChange={(e) => updateIncentive(inc.id, { condition: e.target.value })}
                    placeholder="Condición (ej: solo este mes)"
                    className="rounded border px-3 py-2"
                  />
                </div>
                <textarea
                  value={inc.description}
                  onChange={(e) => updateIncentive(inc.id, { description: e.target.value })}
                  placeholder="Descripción del incentivo"
                  rows={2}
                  className="mt-2 w-full rounded border px-3 py-2"
                />
                <div className="mt-2 flex items-center justify-between">
                  <Toggle
                    label="Activo"
                    checked={inc.active}
                    onChange={(v) => updateIncentive(inc.id, { active: v })}
                  />
                  <button
                    type="button"
                    onClick={() => removeIncentive(inc.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reglas y límites */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Reglas de negocio y límites</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reglas de negocio</label>
            <textarea
              value={config.businessRules || ''}
              onChange={(e) => update({ businessRules: e.target.value })}
              rows={3}
              placeholder="Ej: No negociar precios por teléfono; siempre invitar a visitar el dealer."
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700">
              Temas prohibidos / límites (guardrails)
            </label>
            <textarea
              value={config.guardrails || ''}
              onChange={(e) => update({ guardrails: e.target.value })}
              rows={2}
              placeholder="Ej: Nunca prometer aprobación de financiamiento."
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700">
              Número para transferir a un humano (opcional)
            </label>
            <input
              type="tel"
              value={config.escalationPhoneNumber || ''}
              onChange={(e) => update({ escalationPhoneNumber: e.target.value })}
              placeholder="+17875551234"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
          <Link href="/settings" className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50">
            Volver
          </Link>
        </div>
      </form>
    </div>
  );
}
