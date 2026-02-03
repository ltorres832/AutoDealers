'use client';

import Link from 'next/link';

export default function GuiaCredencialesMetaPage() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <Link
          href="/settings/integrations"
          className="text-blue-600 hover:underline flex items-center gap-2"
        >
          ← Volver a Integraciones
        </Link>
      </div>

      <div 
        className="bg-white rounded-lg shadow border border-gray-200 p-8" 
        style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text' }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📘 Guía: Cómo Obtener App ID y App Secret de Meta</h1>
        <p className="text-gray-600 mb-8">
          Esta guía te ayudará a obtener las credenciales necesarias para conectar tus cuentas de Facebook e Instagram en la plataforma.
        </p>

        <div 
          className="prose prose-lg max-w-none" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text' }}
        >
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🎯 ¿Qué necesitas?</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Una cuenta de Facebook</li>
              <li>Una página de Facebook (para Facebook)</li>
              <li>Una cuenta de Instagram Business o Creator (para Instagram)</li>
              <li>Acceso a Meta for Developers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📝 Paso 1: Crear una Aplicación en Meta for Developers</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>Ve a Meta for Developers</strong>
                <br />
                Abre tu navegador y visita:{' '}
                <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  https://developers.facebook.com
                </a>
              </li>
              <li>
                <strong>Crear Nueva Aplicación</strong>
                <br />
                Haz clic en <strong>"Mis aplicaciones"</strong> (arriba a la derecha) → <strong>"Crear aplicación"</strong>
              </li>
              <li>
                <strong>Selecciona el tipo</strong>
                <br />
                Elige tipo: <strong>"Negocio"</strong> o <strong>"Otro"</strong>
              </li>
              <li>
                <strong>Completa los datos</strong>
                <br />
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li><strong>Nombre de la aplicación</strong>: Ej: "Mi Concesionario" o "Mi Negocio de Autos"</li>
                  <li><strong>Email de contacto</strong>: Tu email</li>
                  <li><strong>Propósito</strong>: "Gestionar mi negocio"</li>
                </ul>
                Haz clic en <strong>"Crear aplicación"</strong>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔑 Paso 2: Obtener App ID y App Secret</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>En el Dashboard de tu Aplicación</strong>
                <br />
                Ve a <strong>"Configuración"</strong> → <strong>"Básico"</strong> (menú lateral izquierdo)
              </li>
              <li>
                <strong>App ID</strong>
                <br />
                El <strong>App ID</strong> está visible en la parte superior de la página.
                <br />
                Es un número largo (ej: <code className="bg-gray-100 px-2 py-1 rounded">1234567890123456</code>)
                <br />
                <strong>Cópialo</strong> - lo necesitarás para la plataforma
              </li>
              <li>
                <strong>App Secret</strong>
                <br />
                Busca la sección <strong>"Secreto de aplicación"</strong>
                <br />
                Haz clic en <strong>"Mostrar"</strong> (puede pedirte tu contraseña de Facebook)
                <br />
                <strong>Copia el App Secret</strong> - es una cadena larga de letras y números
                <br />
                <span className="text-red-600 font-semibold">⚠️ IMPORTANTE: Guárdalo en un lugar seguro, no lo compartas</span>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔧 Paso 3: Configurar Productos de la Aplicación</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Para Facebook:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                  <li>En el dashboard, busca <strong>"Facebook Login"</strong> o <strong>"Página"</strong></li>
                  <li>Haz clic en <strong>"Configurar"</strong> o <strong>"Agregar producto"</strong></li>
                  <li>Selecciona <strong>"Facebook Login"</strong> → <strong>"Configurar"</strong></li>
                </ol>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Para Instagram:</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                  <li>Busca <strong>"Instagram"</strong> en el dashboard</li>
                  <li>Haz clic en <strong>"Configurar"</strong></li>
                  <li>Sigue las instrucciones para conectar tu cuenta de Instagram Business</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🌐 Paso 4: Configurar URLs de Redirección</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                Ve a <strong>"Configuración"</strong> → <strong>"Básico"</strong>
              </li>
              <li>
                En <strong>"Dominios de la aplicación"</strong>, agrega:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>Tu dominio (si tienes uno)</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">localhost</code> (para pruebas)</li>
                </ul>
              </li>
              <li>
                Ve a <strong>"Configuración"</strong> → <strong>"Facebook Login"</strong> → <strong>"Configuración"</strong>
              </li>
              <li>
                En <strong>"URI de redirección de OAuth válidos"</strong>, agrega:
                <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-sm">
                  <div>http://localhost:3003/api/settings/integrations/callback</div>
                  <div>https://tu-dominio.com/api/settings/integrations/callback</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  (Reemplaza <code className="bg-gray-100 px-1 rounded">tu-dominio.com</code> con tu dominio real si lo tienes)
                </p>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">🔐 Paso 5: Configurar Permisos</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                Ve a <strong>"Configuración"</strong> → <strong>"Permisos y características"</strong>
              </li>
              <li>
                Solicita estos permisos (según lo que necesites):
                <div className="mt-3 space-y-2">
                  <div>
                    <strong>Para Facebook:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">pages_manage_posts</code> - Publicar en tu página</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">pages_read_engagement</code> - Ver interacciones</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">pages_messaging</code> - Gestionar mensajes</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Para Instagram:</strong>
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="bg-gray-100 px-2 py-1 rounded">instagram_basic</code> - Acceso básico</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">instagram_content_publish</code> - Publicar contenido</li>
                      <li><code className="bg-gray-100 px-2 py-1 rounded">instagram_manage_messages</code> - Gestionar mensajes</li>
                    </ul>
                  </div>
                </div>
              </li>
              <li>
                <strong>Nota</strong>: Algunos permisos requieren revisión de Meta (puede tardar días). Para desarrollo, puedes usar el modo de prueba.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📱 Paso 6: Conectar tu Página de Facebook</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Ve a tu página de Facebook</li>
              <li><strong>Configuración</strong> → <strong>Página</strong> → <strong>Asignar roles</strong></li>
              <li>Asigna tu aplicación como administrador de la página</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📸 Paso 7: Conectar Instagram Business</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Tu cuenta de Instagram debe ser <strong>Business</strong> o <strong>Creator</strong></li>
              <li>
                Conecta tu Instagram a tu página de Facebook:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>Ve a la configuración de tu página de Facebook</li>
                  <li><strong>Configuración</strong> → <strong>Instagram</strong></li>
                  <li>Conecta tu cuenta de Instagram</li>
                </ul>
              </li>
              <li>En Meta for Developers, asocia tu Instagram Business Account a la aplicación</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">✅ Paso 8: Usar las Credenciales en la Plataforma</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li><strong>Copia tu App ID y App Secret</strong> (del Paso 2)</li>
              <li>En la plataforma, ve a <strong>Configuración</strong> → <strong>Integraciones</strong></li>
              <li>Haz clic en <strong>"Conectar"</strong> en Facebook o Instagram</li>
              <li>
                Ingresa:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li><strong>App ID</strong>: Pega el App ID que copiaste</li>
                  <li><strong>App Secret</strong>: Pega el App Secret que copiaste</li>
                </ul>
              </li>
              <li>Haz clic en <strong>"Continuar"</strong></li>
              <li>Serás redirigido a Facebook para autorizar el acceso</li>
              <li>Selecciona la página que quieres conectar</li>
              <li>Autoriza los permisos</li>
              <li>¡Listo! Tu cuenta está conectada</li>
            </ol>
          </section>

          <section className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-yellow-900">🆘 Solución de Problemas</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">"App ID no válido"</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>Verifica que copiaste el App ID completo</li>
                  <li>Asegúrate de que la aplicación esté en modo "Desarrollo" o "Producción"</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">"App Secret incorrecto"</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>Verifica que copiaste el App Secret completo (sin espacios)</li>
                  <li>Asegúrate de que no haya expirado (los secrets pueden expirar)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">"Error al autorizar"</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>Verifica que agregaste la URL de redirección correcta</li>
                  <li>Asegúrate de que tu aplicación tenga los permisos necesarios</li>
                  <li>Verifica que tu página de Facebook esté conectada a la aplicación</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">"No puedo ver mi página en la autorización"</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>Asegúrate de que tu aplicación tenga acceso a tu página</li>
                  <li>Verifica que eres administrador de la página</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-red-900">🔒 Seguridad</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><span className="text-red-600 font-semibold">⚠️ NUNCA compartas tu App Secret</span> con nadie</li>
              <li><span className="text-red-600 font-semibold">⚠️ No lo subas a repositorios públicos</span> (GitHub, etc.)</li>
              <li>✅ Solo ingrésalo en la plataforma una vez</li>
              <li>✅ La plataforma lo guarda de forma segura encriptado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📞 ¿Necesitas Ayuda?</h2>
            <p className="text-gray-700 mb-4">
              Si tienes problemas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Revisa la documentación oficial: <a href="https://developers.facebook.com/docs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://developers.facebook.com/docs</a></li>
              <li>Verifica que tu aplicación esté configurada correctamente</li>
              <li>Contacta al soporte de la plataforma</li>
            </ul>
          </section>

          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">📋 Resumen Rápido</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>✅ Crear aplicación en <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developers.facebook.com</a></li>
              <li>✅ Obtener App ID y App Secret en Configuración → Básico</li>
              <li>✅ Agregar productos (Facebook Login, Instagram)</li>
              <li>✅ Configurar URLs de redirección</li>
              <li>✅ Solicitar permisos necesarios</li>
              <li>✅ Conectar página de Facebook e Instagram</li>
              <li>✅ Ingresar credenciales en la plataforma</li>
              <li>✅ Autorizar acceso</li>
            </ol>
            <p className="mt-4 text-lg font-semibold text-blue-900">
              ¡Listo para conectar tus redes sociales! 🎉
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Link
            href="/settings/integrations"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Volver a Integraciones
          </Link>
        </div>
      </div>
    </div>
  );
}

