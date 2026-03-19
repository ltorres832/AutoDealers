// Términos y Condiciones - Replica de Next.js
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'static_content_page.dart';

class PublicTerminosPage extends StatelessWidget {
  const PublicTerminosPage({super.key});

  static String _lastUpdated() {
    final now = DateTime.now();
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return '${now.day} de ${months[now.month - 1]} de ${now.year}';
  }

  @override
  Widget build(BuildContext context) {
    return StaticContentPage(
      title: 'Términos y Condiciones',
      subtitle: 'Última actualización: ${_lastUpdated()}',
      sections: [
        ContentSection(
          title: '1. Aceptación de los Términos',
          children: [
            const ContentParagraph(
              'Al acceder y utilizar AutoDealers, aceptas estar sujeto a estos Términos y Condiciones '
              'y a todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos '
              'términos, no debes usar nuestros servicios.',
            ),
          ],
        ),
        ContentSection(
          title: '2. Uso del Servicio',
          children: [
            const ContentParagraph('Eres responsable de:'),
            ContentBulletList([
              'Mantener la confidencialidad de tu cuenta y contraseña',
              'Todas las actividades que ocurran bajo tu cuenta',
              'Proporcionar información precisa y actualizada',
              'Usar el servicio de manera legal y ética',
              'No compartir tu cuenta con terceros',
            ]),
          ],
        ),
        ContentSection(
          title: '3. Suscripciones y Pagos',
          children: [
            const ContentParagraph('Los servicios de AutoDealers se proporcionan mediante suscripción. Al suscribirte:'),
            ContentBulletList([
              'Autorizas el cobro automático según tu plan seleccionado',
              'Los pagos se procesan mensual o anualmente según tu elección',
              'Puedes cancelar tu suscripción en cualquier momento',
              'No se realizan reembolsos por períodos ya pagados',
              'Los precios pueden cambiar con previo aviso de 30 días',
            ]),
          ],
        ),
        ContentSection(
          title: '4. Contenido y Datos',
          children: [
            const ContentParagraph('Retienes todos los derechos sobre tus datos y contenido. Al usar AutoDealers:'),
            ContentBulletList([
              'Nos otorgas licencia para almacenar y procesar tus datos para proporcionar el servicio',
              'Eres responsable del contenido que subas a la plataforma',
              'No debes subir contenido ilegal, ofensivo o que viole derechos de terceros',
              'Nos reservamos el derecho de eliminar contenido que viole estos términos',
            ]),
          ],
        ),
        ContentSection(
          title: '5. Propiedad Intelectual',
          children: [
            const ContentParagraph(
              'AutoDealers y todo su contenido, incluyendo pero no limitado a software, diseño, '
              'logos y marcas, son propiedad de AutoDealers y están protegidos por leyes de '
              'propiedad intelectual. No puedes copiar, modificar o distribuir nuestro contenido '
              'sin autorización escrita.',
            ),
          ],
        ),
        ContentSection(
          title: '6. Limitación de Responsabilidad',
          children: [
            const ContentParagraph(
              'AutoDealers se proporciona "tal cual" sin garantías de ningún tipo. No garantizamos '
              'que el servicio esté libre de errores o interrupciones. En ningún caso seremos '
              'responsables por daños indirectos, incidentales o consecuentes.',
            ),
          ],
        ),
        ContentSection(
          title: '7. Modificaciones',
          children: [
            const ContentParagraph(
              'Nos reservamos el derecho de modificar estos términos en cualquier momento. '
              'Te notificaremos de cambios significativos por email o mediante un aviso en '
              'la plataforma. El uso continuado del servicio después de los cambios constituye '
              'aceptación de los nuevos términos.',
            ),
          ],
        ),
        ContentSection(
          title: '8. Terminación',
          children: [
            const ContentParagraph(
              'Puedes cancelar tu cuenta en cualquier momento. Nos reservamos el derecho de '
              'suspender o terminar cuentas que violen estos términos. Al terminar, perderás '
              'acceso a tus datos después del período de gracia especificado en tu plan.',
            ),
          ],
        ),
        ContentSection(
          title: '9. Ley Aplicable',
          children: [
            const ContentParagraph(
              'Estos términos se rigen por las leyes del estado donde opera AutoDealers. '
              'Cualquier disputa será resuelta en los tribunales competentes de esa jurisdicción.',
            ),
          ],
        ),
        ContentSection(
          title: '10. Contacto',
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: RichText(
                text: TextSpan(
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6, color: Colors.black87),
                  children: [
                    const TextSpan(text: 'Si tienes preguntas sobre estos términos, puedes contactarnos en: '),
                    WidgetSpan(
                      alignment: PlaceholderAlignment.baseline,
                      baseline: TextBaseline.alphabetic,
                      child: InkWell(
                        onTap: () => launchUrl(Uri.parse('mailto:legal@autodealers.com')),
                        child: Text(
                          'legal@autodealers.com',
                          style: TextStyle(color: Colors.blue.shade700, decoration: TextDecoration.underline),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
      bottomNote: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'Al usar AutoDealers, confirmas que has leído, entendido y aceptas estos Términos y Condiciones.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5, color: Colors.grey.shade700),
        ),
      ),
    );
  }
}


