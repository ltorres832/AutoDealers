// Política de Privacidad - Replica de Next.js
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'static_content_page.dart';

class PublicPrivacidadPage extends StatelessWidget {
  const PublicPrivacidadPage({super.key});

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
      title: 'Política de Privacidad',
      subtitle: 'Última actualización: ${_lastUpdated()}',
      sections: [
        ContentSection(
          title: '1. Información que Recopilamos',
          children: [
            const ContentParagraph('Recopilamos los siguientes tipos de información:'),
            ContentBulletList([
              'Información de cuenta: Nombre, email, teléfono, dirección',
              'Información del negocio: Nombre del concesionario, dirección, tipo de negocio',
              'Datos de uso: Cómo interactúas con la plataforma, páginas visitadas',
              'Datos de clientes: Información de leads y clientes que gestionas en la plataforma',
              'Datos de pago: Información de facturación procesada por proveedores seguros',
            ]),
          ],
        ),
        ContentSection(
          title: '2. Cómo Usamos tu Información',
          children: [
            const ContentParagraph('Utilizamos tu información para:'),
            ContentBulletList([
              'Proporcionar y mejorar nuestros servicios',
              'Procesar pagos y gestionar suscripciones',
              'Enviar notificaciones y actualizaciones del servicio',
              'Proporcionar soporte al cliente',
              'Analizar el uso de la plataforma para mejoras',
              'Cumplir con obligaciones legales',
            ]),
          ],
        ),
        ContentSection(
          title: '3. Compartir Información',
          children: [
            const ContentParagraph('No vendemos tu información personal. Podemos compartir información con:'),
            ContentBulletList([
              'Proveedores de servicios: Para procesar pagos, hosting, analytics',
              'Integraciones: Cuando conectas servicios de terceros (redes sociales, etc.)',
              'Requisitos legales: Cuando sea requerido por ley o para proteger nuestros derechos',
              'Con tu consentimiento: En cualquier otra situación con tu autorización explícita',
            ]),
          ],
        ),
        ContentSection(
          title: '4. Seguridad de Datos',
          children: [
            const ContentParagraph(
              'Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, '
              'incluyendo encriptación, controles de acceso y monitoreo continuo. Sin embargo, ningún '
              'sistema es 100% seguro y no podemos garantizar seguridad absoluta.',
            ),
          ],
        ),
        ContentSection(
          title: '5. Tus Derechos',
          children: [
            const ContentParagraph('Tienes derecho a:'),
            ContentBulletList([
              'Acceder a tus datos personales',
              'Corregir información inexacta',
              'Solicitar eliminación de tus datos',
              'Oponerte al procesamiento de tus datos',
              'Exportar tus datos en formato estándar',
              'Retirar tu consentimiento en cualquier momento',
            ]),
          ],
        ),
        ContentSection(
          title: '6. Cookies y Tecnologías Similares',
          children: [
            const ContentParagraph(
              'Utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso '
              'y personalizar contenido. Puedes gestionar las preferencias de cookies desde la configuración '
              'de tu navegador.',
            ),
          ],
        ),
        ContentSection(
          title: '7. Retención de Datos',
          children: [
            const ContentParagraph(
              'Conservamos tu información mientras tu cuenta esté activa o según sea necesario para '
              'proporcionar servicios. Después de cancelar tu cuenta, podemos retener cierta información '
              'según requerimientos legales o para resolver disputas.',
            ),
          ],
        ),
        ContentSection(
          title: '8. Transferencias Internacionales',
          children: [
            const ContentParagraph(
              'Tus datos pueden ser transferidos y procesados en países fuera de tu jurisdicción. '
              'Aseguramos que estas transferencias cumplan con estándares de protección de datos aplicables.',
            ),
          ],
        ),
        ContentSection(
          title: '9. Menores de Edad',
          children: [
            const ContentParagraph(
              'Nuestros servicios están dirigidos a empresas y no están diseñados para menores de 18 años. '
              'No recopilamos intencionalmente información de menores.',
            ),
          ],
        ),
        ContentSection(
          title: '10. Cambios a esta Política',
          children: [
            const ContentParagraph(
              'Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos '
              'por email o mediante un aviso en la plataforma. Te recomendamos revisar esta política periódicamente.',
            ),
          ],
        ),
        ContentSection(
          title: '11. Contacto',
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: RichText(
                text: TextSpan(
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.6, color: Colors.black87),
                  children: [
                    const TextSpan(text: 'Para ejercer tus derechos o hacer preguntas sobre esta política, contáctanos en: '),
                    WidgetSpan(
                      alignment: PlaceholderAlignment.baseline,
                      baseline: TextBaseline.alphabetic,
                      child: InkWell(
                        onTap: () => launchUrl(Uri.parse('mailto:privacidad@autodealers.com')),
                        child: Text(
                          'privacidad@autodealers.com',
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
          color: Colors.blue.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.blue.shade200),
        ),
        child: Text(
          'Nota importante: Esta política de privacidad describe cómo manejamos tu información. '
          'Al usar AutoDealers, aceptas esta política. Si no estás de acuerdo, no uses nuestros servicios.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5),
        ),
      ),
    );
  }
}


