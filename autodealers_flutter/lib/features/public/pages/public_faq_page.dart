// FAQ Pública - Replica de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/public_navbar.dart';

class _FaqItem {
  final String q;
  final String a;
  _FaqItem(this.q, this.a);
}

class _FaqCategory {
  final String category;
  final List<_FaqItem> questions;
  _FaqCategory(this.category, this.questions);
}

class PublicFaqPage extends StatelessWidget {
  const PublicFaqPage({super.key});

  static List<_FaqCategory> _faqData() {
    return [
      _FaqCategory('General', [
        _FaqItem(
          '¿Qué es AutoDealers?',
          'AutoDealers es una plataforma completa de gestión para concesionarios que incluye CRM, inventario, marketing automatizado, IA integrada y más, todo en un solo lugar.',
        ),
        _FaqItem(
          '¿Necesito conocimientos técnicos para usar AutoDealers?',
          'No, AutoDealers está diseñado para ser intuitivo y fácil de usar. Nuestro equipo también ofrece entrenamiento y soporte para ayudarte a comenzar.',
        ),
        _FaqItem(
          '¿Puedo probar antes de comprar?',
          'Sí, ofrecemos una prueba gratuita de 14 días sin necesidad de tarjeta de crédito. Puedes explorar todas las características durante este período.',
        ),
      ]),
      _FaqCategory('Precios y Planes', [
        _FaqItem(
          '¿Puedo cambiar de plan después?',
          'Sí, puedes actualizar o degradar tu plan en cualquier momento desde el dashboard. Los cambios se aplican inmediatamente y se prorratean.',
        ),
        _FaqItem(
          '¿Hay descuentos por pago anual?',
          'Sí, ofrecemos 2 meses gratis al pagar anualmente. Contacta a nuestro equipo de ventas para más información sobre planes anuales.',
        ),
        _FaqItem(
          '¿Qué pasa si excedo los límites de mi plan?',
          'Te notificaremos cuando te acerques a los límites. Puedes actualizar tu plan o comprar add-ons según necesites. No bloqueamos tu cuenta.',
        ),
        _FaqItem(
          '¿Hay costos ocultos?',
          'No, todos los precios son transparentes. El único costo adicional sería si eliges características premium o servicios adicionales como entrenamiento personalizado.',
        ),
      ]),
      _FaqCategory('Características', [
        _FaqItem(
          '¿La IA funciona automáticamente?',
          'Sí, una vez configurada, la IA puede responder automáticamente a clientes, clasificar leads y generar contenido. También puedes revisar y aprobar antes de publicar.',
        ),
        _FaqItem(
          '¿Puedo integrar con mi sitio web existente?',
          'Sí, AutoDealers ofrece API completa y webhooks para integrar con sistemas existentes. También puedes usar nuestro sitio web incluido.',
        ),
        _FaqItem(
          '¿Cómo funciona la publicación en redes sociales?',
          'Conectas tus cuentas de Facebook e Instagram, y AutoDealers puede publicar automáticamente o programar posts. También analiza el engagement y optimiza el contenido.',
        ),
        _FaqItem(
          '¿Puedo personalizar el CRM?',
          'Sí, puedes personalizar campos, etapas del pipeline, recordatorios y más según las necesidades específicas de tu negocio.',
        ),
      ]),
      _FaqCategory('Soporte', [
        _FaqItem(
          '¿Qué tipo de soporte incluye?',
          'Todos los planes incluyen soporte por email. Los planes Professional y Enterprise incluyen soporte prioritario, chat en vivo y gerente dedicado.',
        ),
        _FaqItem(
          '¿Ofrecen entrenamiento?',
          'Sí, ofrecemos documentación completa, videos tutoriales y webinars. Los planes Enterprise incluyen entrenamiento personalizado.',
        ),
        _FaqItem(
          '¿Hay comunidad de usuarios?',
          'Sí, tenemos un foro de comunidad donde los usuarios comparten consejos, mejores prácticas y ayudan entre sí.',
        ),
      ]),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final faqs = _faqData();
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: PublicNavbar()),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 900),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () => context.go('/'),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: Row(
                          children: [
                            Icon(Icons.arrow_back, size: 20, color: theme.textTheme.bodyMedium?.color),
                            const SizedBox(width: 8),
                            Text(
                              'Volver al inicio',
                              style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Text(
                      'Preguntas Frecuentes',
                      style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Encuentra respuestas a las preguntas más comunes sobre AutoDealers.',
                      style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 32),
                    ...faqs.map((cat) => Padding(
                          padding: const EdgeInsets.only(bottom: 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                cat.category,
                                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 12),
                              ...cat.questions.map(
                                (item) => Theme(
                                  data: theme.copyWith(dividerColor: Colors.transparent),
                                  child: ExpansionTile(
                                    tilePadding: const EdgeInsets.symmetric(vertical: 4, horizontal: 0),
                                    title: Text(
                                      item.q,
                                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                    ),
                                    children: [
                                      Padding(
                                        padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                                        child: Align(
                                          alignment: Alignment.centerLeft,
                                          child: Text(
                                            item.a,
                                            style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}


