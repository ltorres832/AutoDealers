// Footer Público - Replica exacta de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class PublicFooter extends StatelessWidget {
  const PublicFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.grey.shade900,
            Colors.grey.shade800,
            Colors.grey.shade900,
          ],
        ),
      ),
      child: Column(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 768 ? 4 : 1;
              
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 48,
                mainAxisSpacing: 48,
                childAspectRatio: 1.5,
                children: [
                  // Logo y descripción
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.blue.shade600, Colors.purple.shade600],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Center(
                              child: Text(
                                'AD',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 20,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'AutoDealers',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'La plataforma más confiable para comprar y vender vehículos',
                        style: TextStyle(
                          color: Colors.grey.shade400,
                          fontSize: 14,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                  
                  // Navegación
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Navegación',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _FooterLink(label: 'Vehículos', onTap: () => context.go('/catalog')),
                      _FooterLink(label: 'Concesionarios', onTap: () => context.go('/dealers')),
                      _FooterLink(label: 'Promociones', onTap: () => context.go('/?section=promotions')),
                      _FooterLink(label: 'Contacto', onTap: () => context.go('/contact')),
                      _FooterLink(label: 'FAQ', onTap: () => context.go('/faq')),
                      _FooterLink(label: 'Precios', onTap: () => context.go('/precios')),
                    ],
                  ),
                  
                  // Contacto
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Contacto',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _FooterLink(
                        label: '+1 (555) 123-4567',
                        icon: Icons.phone,
                        onTap: () => launchUrl(Uri.parse('tel:+15551234567')),
                      ),
                      _FooterLink(
                        label: 'info@autodealers.com',
                        icon: Icons.email,
                        onTap: () => launchUrl(Uri.parse('mailto:info@autodealers.com')),
                      ),
                      _FooterLink(
                        label: '123 Main St, City',
                        icon: Icons.location_on,
                        onTap: () {},
                      ),
                      _FooterLink(
                        label: 'Lun-Vie: 9AM-6PM',
                        icon: Icons.access_time,
                        onTap: () {},
                      ),
                    ],
                  ),
                  
                  // Legal
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Legal',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _FooterLink(label: 'Términos y Condiciones', onTap: () => context.go('/terminos')),
                      _FooterLink(label: 'Política de Privacidad', onTap: () => context.go('/privacidad')),
                      _FooterLink(label: 'Política de Cookies', onTap: () => context.go('/privacidad')),
                    ],
                  ),
                ],
              );
            },
          ),
          
          const SizedBox(height: 48),
          
          // Divider
          Container(
            height: 1,
            color: Colors.grey.shade800,
          ),
          
          const SizedBox(height: 32),
          
          // Copyright
          Column(
            children: [
              Text(
                '© 2026 AutoDealers. Todos los derechos reservados.',
                style: TextStyle(
                  color: Colors.grey.shade400,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Actualizado: 7 feb 2026 — Calculadora encima de Reseñas',
                style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 11,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Toda la información es proporcionada "tal cual" sin garantías de ningún tipo.',
                style: TextStyle(
                  color: Colors.grey.shade500,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FooterLink extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback onTap;

  const _FooterLink({
    required this.label,
    this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 16,
                color: Colors.grey.shade400,
              ),
              const SizedBox(width: 8),
            ],
            Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}


