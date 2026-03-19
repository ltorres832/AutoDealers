// Página de Dashboard
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../domain/models/user.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        final user = authProvider.user;

        if (user == null) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        // Redirigir según el rol del usuario
        WidgetsBinding.instance.addPostFrameCallback((_) {
          switch (user.role) {
            case UserRole.admin:
              if (context.mounted) context.go('/admin/users');
              break;
            case UserRole.dealer:
              if (context.mounted) context.go('/dealer/dashboard');
              break;
            case UserRole.seller:
              if (context.mounted) context.go('/seller/dashboard');
              break;
            case UserRole.advertiser:
              if (context.mounted) context.go('/advertiser/dashboard');
              break;
            default:
              // Mantener en dashboard genérico
              break;
          }
        });

        return SelectionArea(
          child: Scaffold(
            appBar: AppBar(
              title: SelectableText('Dashboard - ${user.role.name.toUpperCase()}'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () async {
                    await authProvider.signOut();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  },
                ),
              ],
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SelectableText(
                          'Aplicación: AutoDealers Flutter',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        SelectableText('Usuario: ${user.name}'),
                        SelectableText('Email: ${user.email}'),
                        SelectableText('Rol: ${user.role.name}'),
                        if (user.tenantId != null) SelectableText('Tenant ID: ${user.tenantId}'),
                        const SizedBox(height: 8),
                        SelectableText(
                          'Redirigiendo a la aplicación ${user.role.name}...',
                          style: TextStyle(color: Colors.blue.shade700),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const SelectableText(
                    'O selecciona una aplicación manualmente:',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.5,
                    children: [
                      _DashboardCard(
                        title: 'Pública',
                        icon: Icons.public,
                        onTap: () => context.go('/'),
                      ),
                      _DashboardCard(
                        title: 'Admin',
                        icon: Icons.admin_panel_settings,
                        onTap: () => context.go('/admin/users'),
                      ),
                      _DashboardCard(
                        title: 'Dealer',
                        icon: Icons.store,
                        onTap: () => context.go('/dealer/dashboard'),
                      ),
                      _DashboardCard(
                        title: 'Seller',
                        icon: Icons.person,
                        onTap: () => context.go('/seller/dashboard'),
                      ),
                      _DashboardCard(
                        title: 'Advertiser',
                        icon: Icons.campaign,
                        onTap: () => context.go('/advertiser/dashboard'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;

  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 40, color: Theme.of(context).primaryColor),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


