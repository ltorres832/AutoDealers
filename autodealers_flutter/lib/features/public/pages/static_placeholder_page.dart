// Página placeholder para rutas estáticas (características, sobre-nosotros, advertise, etc.)
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../widgets/public_navbar.dart';

class StaticPlaceholderPage extends StatelessWidget {
  final String title;
  final String slug;

  const StaticPlaceholderPage({super.key, required this.title, required this.slug});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(child: PublicNavbar()),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  InkWell(
                    onTap: () => context.go('/'),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Row(
                        children: [
                          Icon(Icons.arrow_back, size: 20, color: Theme.of(context).textTheme.bodyMedium?.color),
                          const SizedBox(width: 8),
                          Text('Volver al inicio', style: Theme.of(context).textTheme.bodyMedium),
                        ],
                      ),
                    ),
                  ),
                  Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Text('Contenido en construcción. Próximamente.', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}


