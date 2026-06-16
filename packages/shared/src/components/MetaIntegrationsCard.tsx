'use client';

import { SocialIcon } from './SocialIcon';

export type MetaTokenHealthSummary = {
  readyForOrganic: boolean;
  readyForPaidAds: boolean;
  readyForInstagram: boolean;
  missingScopes: string[];
  warnings: string[];
  adAccountId?: string;
  checkedAt?: string;
};

export type MetaIntegrationRow = {
  id: string;
  type: 'facebook' | 'instagram';
  status: 'active' | 'inactive' | 'error';
  pageName?: string;
  metaTokenHealth?: MetaTokenHealthSummary;
};

export function MetaIntegrationsCard({
  facebook,
  instagram,
  connecting,
  onConnect,
  onConnectInstagram,
  onDisconnect,
  onVerifyPermissions,
  verifyingPermissions,
}: {
  facebook: MetaIntegrationRow;
  instagram: MetaIntegrationRow;
  connecting: boolean;
  onConnect: (opts?: { reauthorize?: boolean }) => void;
  onConnectInstagram?: () => void;
  onDisconnect: (integrationId: string) => void;
  onVerifyPermissions?: () => void;
  verifyingPermissions?: boolean;
}) {
  const fbActive = facebook.status === 'active';
  const igActive = instagram.status === 'active';
  const anyActive = fbActive || igActive;
  const health = facebook.metaTokenHealth;
  const needsReconnect =
    fbActive &&
    health &&
    (health.missingScopes.length > 0 || !health.readyForOrganic || !health.readyForPaidAds);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-600 text-white text-lg font-bold">
            M
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Meta — Facebook e Instagram</h3>
            <p className="text-gray-600 text-sm mt-1 max-w-xl leading-relaxed">
              Un solo inicio de sesión solicita permisos para <strong>publicar en el feed</strong>,{' '}
              <strong>mensajes</strong> y <strong>anuncios de pago</strong> (cuenta publicitaria en Meta).
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {!anyActive ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => onConnect()}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-60"
            >
              {connecting ? 'Abriendo Meta…' : 'Conectar Facebook (Meta)'}
            </button>
          ) : (
            <button
              type="button"
              disabled={connecting}
              onClick={() => onConnect({ reauthorize: true })}
              className="px-5 py-2.5 border border-primary-200 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 font-medium text-sm disabled:opacity-60"
            >
              {connecting ? 'Abriendo Meta…' : 'Actualizar permisos de Facebook'}
            </button>
          )}
          {fbActive && onVerifyPermissions ? (
            <button
              type="button"
              disabled={verifyingPermissions}
              onClick={onVerifyPermissions}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-800 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-60"
            >
              {verifyingPermissions ? 'Verificando…' : 'Verificar permisos ahora'}
            </button>
          ) : null}
          {fbActive && !igActive && onConnectInstagram ? (
            <button
              type="button"
              disabled={connecting}
              onClick={onConnectInstagram}
              className="px-5 py-2.5 border border-gray-300 bg-white text-gray-800 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-60"
            >
              {connecting ? 'Abriendo Meta…' : 'Conectar Instagram (opcional)'}
            </button>
          ) : null}
        </div>
      </div>

      {needsReconnect ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <p className="font-medium">Faltan permisos o la cuenta publicitaria no está lista</p>
          {health!.missingScopes.length > 0 ? (
            <p className="mt-1 text-xs">
              No concedidos: <code className="text-[11px]">{health!.missingScopes.join(', ')}</code>
            </p>
          ) : null}
          {health!.warnings.slice(0, 2).map((w) => (
            <p key={w} className="mt-1 text-xs">
              {w}
            </p>
          ))}
          <p className="mt-2 text-xs">
            Pulsa <strong>Actualizar permisos de Facebook</strong> y acepta todos los permisos en la pantalla de Meta.
          </p>
        </div>
      ) : null}

      {fbActive && health ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
          <HealthPill ok={health.readyForOrganic} label="Posts orgánicos" />
          <HealthPill ok={health.readyForPaidAds} label="Anuncios de pago" />
          <HealthPill ok={health.readyForInstagram} label="Instagram" />
        </div>
      ) : null}

      <ol className="mt-5 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4 list-decimal list-inside">
        <li>
          Pulsa <strong>Conectar Facebook (Meta)</strong> — se piden permisos de página, mensajes y publicidad.
        </li>
        <li>
          Inicia sesión en Meta y elige la <strong>página de Facebook</strong> de tu negocio (debes ser administrador).
        </li>
        <li>
          Acepta <strong>todos</strong> los permisos. Si antes conectaste con permisos limitados, usa{' '}
          <strong>Actualizar permisos</strong>.
        </li>
      </ol>

      <details className="mt-3 text-xs text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-800">Permisos que solicita la plataforma</summary>
        <ul className="mt-2 list-disc list-inside space-y-0.5 pl-1">
          <li>
            <code>pages_manage_posts</code>, <code>pages_show_list</code> — publicar en Facebook
          </li>
          <li>
            <code>ads_management</code>, <code>ads_read</code>, <code>business_management</code> — campañas de pago
          </li>
          <li>
            <code>instagram_content_publish</code> — publicar en Instagram (opcional)
          </li>
        </ul>
      </details>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetaRow
          platform="facebook"
          label="Facebook (página)"
          active={fbActive}
          detail={fbActive && facebook.pageName ? facebook.pageName : undefined}
          showDisconnect={fbActive}
          integrationId={facebook.id}
          onDisconnect={onDisconnect}
        />
        <MetaRow
          platform="instagram"
          label="Instagram Business (opcional)"
          active={igActive}
          detail={
            igActive
              ? 'Vinculado a tu página'
              : fbActive
                ? 'Opcional — usa el botón si tienes cuenta profesional vinculada'
                : 'Opcional — conecta Facebook primero'
          }
          showDisconnect={igActive}
          integrationId={instagram.id}
          onDisconnect={onDisconnect}
        />
      </div>
    </div>
  );
}

function HealthPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 font-medium ${
        ok ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function MetaRow({
  platform,
  label,
  active,
  detail,
  integrationId,
  showDisconnect,
  onDisconnect,
}: {
  platform: 'facebook' | 'instagram';
  label: string;
  active: boolean;
  detail?: string;
  integrationId: string;
  showDisconnect: boolean;
  onDisconnect: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      <SocialIcon platform={platform} size={28} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        {detail ? <p className="text-xs text-gray-600 mt-0.5 leading-snug">{detail}</p> : null}
        <span
          className={`inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
            active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {active ? 'Conectado' : 'No conectado'}
        </span>
      </div>
      {showDisconnect ? (
        <button
          type="button"
          onClick={() => onDisconnect(integrationId)}
          className="text-xs text-red-600 hover:underline shrink-0"
        >
          Desconectar
        </button>
      ) : null}
    </div>
  );
}
