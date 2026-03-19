// Página de Contacto Público - Replica de Next.js (contacto)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/public_navbar.dart';
import '../widgets/contact_form_widget.dart';

class PublicContactPage extends StatelessWidget {
  const PublicContactPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: PublicNavbar()),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
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
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'Contáctanos',
                            style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos en menos de 24 horas.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 48),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final useTwoColumns = constraints.maxWidth > 768;
                        if (useTwoColumns) {
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 1,
                                child: _ContactInfo(theme: theme),
                              ),
                              const SizedBox(width: 48),
                              Expanded(
                                flex: 1,
                                child: Container(
                                  padding: const EdgeInsets.all(32),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.08),
                                        blurRadius: 24,
                                        offset: const Offset(0, 8),
                                      ),
                                    ],
                                  ),
                                  child: const ContactFormWidget(),
                                ),
                              ),
                            ],
                          );
                        }
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _ContactInfo(theme: theme),
                            const SizedBox(height: 32),
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const ContactFormWidget(),
                            ),
                          ],
                        );
                      },
                    ),
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

class _ContactInfo extends StatelessWidget {
  const _ContactInfo({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Información de Contacto',
          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        _InfoRow(icon: Icons.email, title: 'Email', value: 'contacto@autodealers.com'),
        const SizedBox(height: 16),
        _InfoRow(icon: Icons.phone, title: 'Teléfono', value: '+1 (234) 567-890'),
        const SizedBox(height: 16),
        _InfoRow(icon: Icons.chat_bubble_outline, title: 'Chat en Vivo', value: 'Lun-Vie: 9am - 6pm EST'),
        const SizedBox(height: 16),
        _InfoRow(icon: Icons.location_on, title: 'Oficina', value: '123 Business St, Suite 100\nCity, State 12345'),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '¿Necesitas ayuda inmediata?',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Nuestro equipo de soporte está disponible 24/7 para ayudarte.',
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go('/login'),
                child: const Text('Acceder al Soporte'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.blue.shade700),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

