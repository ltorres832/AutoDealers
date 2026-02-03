'use client';

import { useState, useEffect } from 'react';

interface CorporateEmail {
  id: string;
  email: string;
  emailAlias?: string;
  status: 'active' | 'suspended' | 'deleted';
  emailSignature?: string;
  emailSignatureType?: 'basic' | 'advanced';
  passwordChanged: boolean;
  createdAt: string;
}

interface EmailUsage {
  tenantId: string;
  emailsUsed: number;
  emailsLimit: number;
}

export default function CorporateEmailPage() {
  const [emails, setEmails] = useState<CorporateEmail[]>([]);
  const [usage, setUsage] = useState<EmailUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [createReason, setCreateReason] = useState<string>('');

  useEffect(() => {
    fetchEmails();
    checkCanCreate();
  }, []);

  async function fetchEmails() {
    try {
      const response = await fetch('/api/corporate-email');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkCanCreate() {
    try {
      const response = await fetch('/api/corporate-email', {
        method: 'PUT',
      });
      if (response.ok) {
        const data = await response.json();
        setCanCreate(data.canCreate || false);
        setUsage(data.usage || null);
        setCreateReason(data.reason || '');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeEmail = emails.find((e) => e.status === 'active');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Corporativo</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu email corporativo profesional
          </p>
        </div>
        {!activeEmail && canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            ➕ Activar Email Corporativo
          </button>
        )}
      </div>

      {/* Uso de emails */}
      {usage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Emails disponibles</p>
              <p className="text-2xl font-bold text-blue-600">
                {usage.emailsLimit - usage.emailsUsed} / {usage.emailsLimit}
              </p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(usage.emailsUsed / usage.emailsLimit) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
          {!canCreate && createReason && (
            <p className="text-sm text-red-600 mt-2">{createReason}</p>
          )}
        </div>
      )}

      {/* Email activo */}
      {activeEmail ? (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Email Activo</h2>
              <p className="text-gray-600 text-lg">{activeEmail.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Dominio: @{activeEmail.email.split('@')[1]}
              </p>
            </div>
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              ✅ Activo
            </span>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cambiar Contraseña
                </label>
                <button
                  onClick={() => {
                    // Abrir modal para cambiar contraseña
                    const newPassword = prompt(
                      'Ingresa tu nueva contraseña (mínimo 8 caracteres):'
                    );
                    if (newPassword && newPassword.length >= 8) {
                      updatePassword(activeEmail.id, newPassword);
                    } else if (newPassword) {
                      alert('La contraseña debe tener al menos 8 caracteres');
                    }
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  🔑 Cambiar Contraseña
                </button>
                {!activeEmail.passwordChanged && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ Debes cambiar la contraseña temporal
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Firma de email */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Firma de Email</h3>
            <EmailSignatureEditor
              emailId={activeEmail.id}
              currentSignature={activeEmail.emailSignature || ''}
              signatureType={activeEmail.emailSignatureType || 'basic'}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-xl font-bold mb-2">No tienes email corporativo activo</h3>
          <p className="text-gray-600 mb-4">
            {canCreate
              ? 'Activa tu email corporativo profesional ahora'
              : createReason || 'Tu plan no incluye email corporativo'}
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
            >
              Activar Email Corporativo
            </button>
          )}
          {!canCreate && (
            <button
              onClick={() => {
                window.location.href = '/settings/membership';
              }}
              className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 font-medium"
            >
              Actualizar Plan
            </button>
          )}
        </div>
      )}

      {/* Emails suspendidos */}
      {emails.filter((e) => e.status === 'suspended').length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Emails Suspendidos</h2>
          <div className="grid grid-cols-1 gap-4">
            {emails
              .filter((e) => e.status === 'suspended')
              .map((email) => (
                <div
                  key={email.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{email.email}</p>
                      <p className="text-sm text-gray-600">
                        Suspendido - Contacta a tu administrador
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                      ⏸️ Suspendido
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateEmailModal
          onClose={() => {
            setShowCreateModal(false);
            fetchEmails();
            checkCanCreate();
          }}
        />
      )}
    </div>
  );

  async function updatePassword(emailId: string, newPassword: string) {
    try {
      const response = await fetch(`/api/corporate-email/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        alert('✅ Contraseña actualizada exitosamente');
        fetchEmails();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al cambiar contraseña'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }
}

function CreateEmailModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [emailAlias, setEmailAlias] = useState('');
  const [preview, setPreview] = useState('');
  const [domain, setDomain] = useState('autoplataforma.com');

  useEffect(() => {
    // Obtener dominio del tenant
    fetch('/api/tenants/current')
      .then((res) => res.json())
      .then((data) => {
        if (data.tenant?.subdomain) {
          setDomain(`${data.tenant.subdomain}.autoplataforma.com`);
          setPreview(`${emailAlias || 'usuario'}@${data.tenant.subdomain}.autoplataforma.com`);
        } else {
          setDomain('autoplataforma.com');
          setPreview(`${emailAlias || 'usuario'}@autoplataforma.com`);
        }
      });
  }, []);

  useEffect(() => {
    const tenantDomain = domain;
    setPreview(`${emailAlias || 'usuario'}@${tenantDomain}`);
  }, [emailAlias, domain]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/corporate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAlias }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Email corporativo creado exitosamente: ${data.email.email}`);
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al crear email corporativo'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Activar Email Corporativo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre de email *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={emailAlias}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setEmailAlias(value);
                }}
                className="flex-1 border rounded px-3 py-2"
                placeholder="juan"
                required
                pattern="[a-z0-9]+"
                title="Solo letras y números"
              />
              <span className="text-gray-600">@{domain}</span>
            </div>
            {preview && (
              <p className="text-sm text-gray-500 mt-2">
                Preview: <strong>{preview}</strong>
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Información:</strong>
              <br />
              • Recibirás una contraseña temporal
              <br />
              • Debes cambiar la contraseña después de la activación
              <br />
              • El email se activará automáticamente
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !emailAlias}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmailSignatureEditor({
  emailId,
  currentSignature,
  signatureType,
}: {
  emailId: string;
  currentSignature: string;
  signatureType: 'basic' | 'advanced';
}) {
  const [signature, setSignature] = useState(currentSignature);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/corporate-email/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          signatureType,
        }),
      });

      if (response.ok) {
        alert('✅ Firma actualizada exitosamente');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al actualizar firma'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Firma de Email</label>
        {signatureType === 'advanced' ? (
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={6}
            placeholder="HTML permitido para firma avanzada"
          />
        ) : (
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="Firma básica (solo texto)"
          />
        )}
        <p className="text-xs text-gray-500 mt-1">
          {signatureType === 'advanced'
            ? 'Puedes usar HTML para crear una firma avanzada'
            : 'Firma básica - Solo texto'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || signature === currentSignature}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Firma'}
        </button>
      </div>
    </div>
  );
}



