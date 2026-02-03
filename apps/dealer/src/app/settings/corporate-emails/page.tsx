'use client';

import { useState, useEffect } from 'react';

interface CorporateEmail {
  id: string;
  userId: string;
  userName?: string;
  email: string;
  emailAlias?: string;
  status: 'active' | 'suspended' | 'deleted';
  createdBy: 'user' | 'dealer';
  createdAt: string;
}

interface EmailUsage {
  tenantId: string;
  emailsUsed: number;
  emailsLimit: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CorporateEmailsPage() {
  const [emails, setEmails] = useState<CorporateEmail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [usage, setUsage] = useState<EmailUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<CorporateEmail | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  useEffect(() => {
    fetchEmails();
    fetchUsers();
  }, []);

  async function fetchEmails() {
    try {
      const response = await fetch('/api/corporate-email');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setUsage(data.usage || null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSuspend(emailId: string) {
    if (!confirm('¿Estás seguro de suspender este email?')) {
      return;
    }

    try {
      const response = await fetch(`/api/corporate-email/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' }),
      });

      if (response.ok) {
        alert('✅ Email suspendido exitosamente');
        fetchEmails();
        setShowActionsModal(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al suspender email'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function handleActivate(emailId: string) {
    try {
      const response = await fetch(`/api/corporate-email/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });

      if (response.ok) {
        alert('✅ Email activado exitosamente');
        fetchEmails();
        setShowActionsModal(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al activar email'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function handleDelete(emailId: string) {
    if (!confirm('¿Estás seguro de eliminar este email? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/corporate-email/${emailId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Email eliminado exitosamente');
        fetchEmails();
        setShowActionsModal(false);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al eliminar email'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeEmails = emails.filter((e) => e.status === 'active');
  const suspendedEmails = emails.filter((e) => e.status === 'suspended');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Emails Corporativos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los emails corporativos de tu equipo
          </p>
        </div>
        {usage && usage.emailsUsed < usage.emailsLimit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            ➕ Crear Email Corporativo
          </button>
        )}
      </div>

      {/* Uso de emails */}
      {usage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Emails usados</p>
              <p className="text-2xl font-bold text-blue-600">
                {usage.emailsUsed} / {usage.emailsLimit === 0 ? '∞' : usage.emailsLimit}
              </p>
            </div>
            <div className="flex-1">
              {usage.emailsLimit > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((usage.emailsUsed / usage.emailsLimit) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
          {usage.emailsUsed >= usage.emailsLimit && usage.emailsLimit > 0 && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Has alcanzado el límite de emails corporativos
            </p>
          )}
        </div>
      )}

      {/* Emails activos */}
      {activeEmails.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            Emails Activos ({activeEmails.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEmails.map((email) => {
              const user = users.find((u) => u.id === email.userId);
              return (
                <div
                  key={email.id}
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{email.email}</p>
                      {user && (
                        <p className="text-sm text-gray-600">{user.name}</p>
                      )}
                      {email.emailAlias && (
                        <p className="text-xs text-gray-500 mt-1">
                          Alias: {email.emailAlias}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      ✅ Activo
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedEmail(email);
                        setShowActionsModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      ⚙️ Acciones
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emails suspendidos */}
      {suspendedEmails.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            Emails Suspendidos ({suspendedEmails.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suspendedEmails.map((email) => {
              const user = users.find((u) => u.id === email.userId);
              return (
                <div
                  key={email.id}
                  className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-500"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{email.email}</p>
                      {user && (
                        <p className="text-sm text-gray-600">{user.name}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                      ⏸️ Suspendido
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedEmail(email);
                        setShowActionsModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      ⚙️ Acciones
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {emails.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-xl font-bold mb-2">No hay emails corporativos</h3>
          <p className="text-gray-600 mb-4">
            Crea emails corporativos para tu equipo
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Crear Email Corporativo
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateEmailModal
          users={users}
          usage={usage}
          onClose={() => {
            setShowCreateModal(false);
            fetchEmails();
          }}
        />
      )}

      {showActionsModal && selectedEmail && (
        <ActionsModal
          email={selectedEmail}
          onClose={() => {
            setShowActionsModal(false);
            setSelectedEmail(null);
          }}
          onSuspend={() => handleSuspend(selectedEmail.id)}
          onActivate={() => handleActivate(selectedEmail.id)}
          onDelete={() => handleDelete(selectedEmail.id)}
        />
      )}
    </div>
  );
}

function CreateEmailModal({
  users,
  usage,
  onClose,
}: {
  users: User[];
  usage: EmailUsage | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
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
        body: JSON.stringify({ emailAlias, userId }),
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
        <h2 className="text-2xl font-bold mb-4">Crear Email Corporativo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Usuario / Vendedor *
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Selecciona un usuario</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email}) - {user.role}
                </option>
              ))}
            </select>
          </div>

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

          {usage && usage.emailsUsed >= usage.emailsLimit && usage.emailsLimit > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-red-800">
                ⚠️ Has alcanzado el límite de emails corporativos ({usage.emailsLimit})
              </p>
            </div>
          )}

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
              disabled={loading || !emailAlias || !userId}
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

function ActionsModal({
  email,
  onClose,
  onSuspend,
  onActivate,
  onDelete,
}: {
  email: CorporateEmail;
  onClose: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Acciones - {email.email}</h2>
        <div className="space-y-2">
          {email.status === 'active' && (
            <button
              onClick={onSuspend}
              className="w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              ⏸️ Suspender Email
            </button>
          )}
          {email.status === 'suspended' && (
            <button
              onClick={onActivate}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ▶️ Activar Email
            </button>
          )}
          <button
            onClick={onDelete}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🗑️ Eliminar Email
          </button>
        </div>
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}



