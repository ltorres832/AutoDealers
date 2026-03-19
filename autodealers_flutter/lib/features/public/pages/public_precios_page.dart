// Precios Públicos - Replica de Next.js (vista sin auth, CTA a registro)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/public_navbar.dart';

class PublicPreciosPage extends StatelessWidget {
  const PublicPreciosPage({super.key});

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
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'Planes y Precios',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Elige el plan perfecto para tu negocio. Todos incluyen prueba gratuita de 14 días.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Regístrate para ver precios y características según tu tipo de cuenta (concesionario o vendedor).',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 32),
                          FilledButton.icon(
                            onPressed: () => context.go('/registro'),
                            icon: const Icon(Icons.app_registration),
                            label: const Text('Ver planes y registrarme'),
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () => context.go('/login'),
                            child: const Text('Ya tengo cuenta - Iniciar sesión'),
                          ),
                        ],
                      ),
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


