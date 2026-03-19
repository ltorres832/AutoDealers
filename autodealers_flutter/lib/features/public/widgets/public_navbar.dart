// Navbar Público - Replica EXACTA de Next.js
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/public_promotions_provider.dart';

void _showMobileMenu(BuildContext context) {
  showModalBottomSheet(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.directions_car),
            title: const Text('Vehículos'),
            onTap: () {
              Navigator.pop(ctx);
              context.go('/catalog');
            },
          ),
          ListTile(
            leading: const Icon(Icons.local_offer),
            title: const Text('Promociones'),
            onTap: () {
              Navigator.pop(ctx);
              context.go('/?section=promotions');
            },
          ),
          ListTile(
            leading: const Icon(Icons.contact_page),
            title: const Text('Contacto'),
            onTap: () {
              Navigator.pop(ctx);
              context.go('/?section=contact');
            },
          ),
          ListTile(
            leading: const Icon(Icons.store),
            title: const Text('Concesionarios'),
            onTap: () {
              Navigator.pop(ctx);
              context.go('/dealers');
            },
          ),
          ListTile(
            leading: const Icon(Icons.search),
            title: const Text('Catálogo'),
            onTap: () {
              Navigator.pop(ctx);
              context.go('/catalog');
            },
          ),
        ],
      ),
    ),
  );
}

class PublicNavbar extends StatelessWidget {
  final bool scrolled;
  /// Llamar cuando estamos en home y se pulsa Promociones (scroll a sección)
  final VoidCallback? scrollToPromotions;
  /// Llamar cuando estamos en home y se pulsa Contacto (scroll a sección)
  final VoidCallback? scrollToContact;

  const PublicNavbar({
    super.key,
    this.scrolled = false,
    this.scrollToPromotions,
    this.scrollToContact,
  });

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      floating: true,
      pinned: true,
      elevation: scrolled ? 4 : 0,
      backgroundColor: scrolled ? Colors.white : Colors.white.withOpacity(0.8),
      flexibleSpace: Container(
        decoration: BoxDecoration(
          color: scrolled ? Colors.white : Colors.white.withOpacity(0.8),
          border: scrolled 
              ? Border(bottom: BorderSide(color: Colors.grey.shade200, width: 1))
              : null,
        ),
      ),
      leadingWidth: 200,
      leading: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: InkWell(
            onTap: () => context.go('/'),
            borderRadius: BorderRadius.circular(8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text(
                      'AD',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'AutoDealers',
                    style: TextStyle(
                      color: Color(0xFF0F172A),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    'Plataforma de Confianza',
                    style: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 10,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      ),
      actions: [
        // Enlaces de navegación (ocultos en móvil)
        LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 1024) {
              // Menú móvil
              return IconButton(
                icon: const Icon(Icons.menu, color: Color(0xFF475569)), // slate-600
                onPressed: () {
                  _showMobileMenu(context);
                },
              );
            }
            
            // Menú desktop (FittedBox evita overflow en pantallas estrechas)
            return Consumer<PublicPromotionsProvider>(
              builder: (context, promotionsProvider, _) {
                final promotionsCount = promotionsProvider.promotions.length;
                
                return FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                    // Vehículos -> Catálogo
                    TextButton(
                      onPressed: () => context.go('/catalog'),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF475569), // slate-700
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text(
                        'Vehículos',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    // Promociones con badge
                    TextButton(
                      onPressed: () {
                        final path = GoRouterState.of(context).uri.path;
                        if (path == '/' && scrollToPromotions != null) {
                          scrollToPromotions!();
                        } else {
                          context.go('/?section=promotions');
                        }
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF475569), // slate-700
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Promociones',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          if (promotionsCount > 0) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B), // amber-500
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                promotionsCount.toString(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // Concesionarios
                    TextButton(
                      onPressed: () => context.go('/dealers'),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF475569), // slate-700
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text(
                        'Concesionarios',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    // Contacto
                    TextButton(
                      onPressed: () {
                        final path = GoRouterState.of(context).uri.path;
                        if (path == '/' && scrollToContact != null) {
                          scrollToContact!();
                        } else {
                          context.go('/contact');
                        }
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF475569), // slate-700
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text(
                        'Contacto',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Botón Iniciar Sesión
                    ElevatedButton(
                      onPressed: () => context.go('/login'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A), // slate-900
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Iniciar Sesión',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                ),
                );
              },
            );
          },
        ),
      ],
    );
  }
}


