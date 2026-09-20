import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Eliminación de datos | AutoDealersOnline',
  description:
    'Cómo solicitar la eliminación de tus datos y de las conexiones de Facebook e Instagram en AutoDealersOnline.',
};

const CONTACT_EMAIL = 'info@autodealers-online.com';

export default async function EliminarDatosPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const confirmationCode =
    typeof rawCode === 'string' && /^del_[a-f0-9]{8,}$/.test(rawCode) ? rawCode : null;

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent">
                AutoDealersOnline
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8 flex flex-wrap items-center gap-3 gap-y-2">
          <PublicBackButton className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            Volver
          </PublicBackButton>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
            Inicio
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-4">Eliminación de datos</h1>
          <p className="text-gray-600">
            Cómo eliminar tus datos y desconectar tus cuentas de Facebook e Instagram de
            AutoDealersOnline.
          </p>
        </div>

        {confirmationCode ? (
          <div className="mb-10 rounded-lg border border-green-200 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-1">
              Solicitud de eliminación recibida
            </h2>
            <p className="text-green-800">
              Hemos registrado tu solicitud. Tu código de confirmación es:
            </p>
            <p className="mt-2 font-mono text-green-900 text-lg break-all">{confirmationCode}</p>
            <p className="mt-3 text-sm text-green-800">
              Procesaremos la eliminación de tus datos en un plazo máximo de 30 días. Guarda este
              código por si necesitas dar seguimiento a tu solicitud.
            </p>
          </div>
        ) : null}

        <article className="prose prose-lg max-w-none text-gray-700">
          <h2>Qué datos almacenamos</h2>
          <p>
            Cuando conectas tu cuenta de Facebook o Instagram con AutoDealersOnline, guardamos los
            datos necesarios para publicar en tu nombre y gestionar tus mensajes/anuncios: el
            identificador de tu página, el nombre de la página, la cuenta de Instagram vinculada y
            los tokens de acceso proporcionados por Meta.
          </p>

          <h2>Cómo desconectar tus cuentas tú mismo</h2>
          <p>
            Puedes revocar el acceso en cualquier momento desde tu panel:
          </p>
          <ul>
            <li>
              Entra a tu cuenta (dealer o vendedor) → <strong>Configuración → Integraciones</strong>.
            </li>
            <li>
              Pulsa <strong>Desconectar</strong> en Facebook y/o Instagram. Esto elimina los tokens y
              la conexión guardada en nuestro sistema.
            </li>
            <li>
              También puedes quitar el permiso desde{' '}
              <a
                href="https://www.facebook.com/settings?tab=business_tools"
                target="_blank"
                rel="noopener noreferrer"
              >
                Configuración de Facebook → Integraciones de empresa
              </a>
              .
            </li>
          </ul>

          <h2>Cómo solicitar la eliminación completa de tus datos</h2>
          <p>Si deseas que eliminemos todos tus datos, tienes dos opciones:</p>
          <ol>
            <li>
              Escríbenos a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> desde el correo asociado a tu
              cuenta, con el asunto <em>“Eliminación de datos”</em>.
            </li>
            <li>
              O envíanos tu solicitud a través de nuestro{' '}
              <Link href="/contacto">formulario de contacto</Link>.
            </li>
          </ol>
          <p>
            Procesaremos tu solicitud y eliminaremos tus datos en un plazo máximo de{' '}
            <strong>30 días</strong>, salvo aquella información que debamos conservar por
            obligaciones legales.
          </p>

          <p className="text-sm text-gray-500">
            Consulta también nuestra <Link href="/privacidad">Política de Privacidad</Link>.
          </p>
        </article>
      </main>
    </div>
  );
}
