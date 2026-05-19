'use client';

import { SocialIcon } from './SocialIcon';

export type MetaIntegrationRow = {
  id: string;
  type: 'facebook' | 'instagram';
  status: 'active' | 'inactive' | 'error';
  pageName?: string;
};

export function MetaIntegrationsCard({
  facebook,
  instagram,
  connecting,
  onConnect,
  onDisconnect,
}: {
  facebook: MetaIntegrationRow;
  instagram: MetaIntegrationRow;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: (integrationId: string) => void;
}) {
  const fbActive = facebook.status === 'active';
  const igActive = instagram.status === 'active';
  const anyActive = fbActive || igActive;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-lg font-bold">
            M
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Meta — Facebook e Instagram</h3>
            <p className="text-gray-600 text-sm mt-1 max-w-xl leading-relaxed">
              Un solo inicio de sesión en Meta (se abre facebook.com). Autorizas tu página de Facebook y, si está
              vinculada, tu Instagram Business al mismo tiempo. No hay dos logins distintos.
            </p>
          </div>
        </div>
        {!anyActive ? (
          <button
            type="button"
            disabled={connecting}
            onClick={onConnect}
            className="shrink-0 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-60"
          >
            {connecting ? 'Abriendo Meta…' : 'Conectar con Meta'}
          </button>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={onConnect}
            className="shrink-0 px-5 py-2.5 border border-primary-200 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 font-medium text-sm disabled:opacity-60"
          >
            {connecting ? 'Abriendo Meta…' : 'Actualizar permisos'}
          </button>
        )}
      </div>

      <ol className="mt-5 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-4 list-decimal list-inside">
        <li>
          Pulsa <strong>Conectar con Meta</strong> (solo una vez).
        </li>
        <li>
          Inicia sesión en Meta y elige la <strong>página de Facebook</strong> de tu negocio.
        </li>
        <li>
          Acepta los permisos. Activamos Facebook; Instagram solo si tu página tiene Instagram Business vinculado.
        </li>
      </ol>

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
          label="Instagram Business"
          active={igActive}
          detail={
            igActive
              ? 'Vinculado a tu página'
              : fbActive
                ? 'No detectado — vincula IG en Meta Business Suite y pulsa Actualizar permisos'
                : 'Se activa al conectar Meta si tu página tiene Instagram Business'
          }
          showDisconnect={igActive}
          integrationId={instagram.id}
          onDisconnect={onDisconnect}
        />
      </div>
    </div>
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
          {active ? 'Conectado' : 'Pendiente'}
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
