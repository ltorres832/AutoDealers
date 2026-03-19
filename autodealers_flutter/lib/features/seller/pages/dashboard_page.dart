// Página de Dashboard del Seller - datos desde Firestore
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/dashboard_provider.dart';
import '../../../core/data/services/firestore_service.dart';
import '../widgets/seller_drawer.dart';

class SellerDashboardPage extends StatefulWidget {
  const SellerDashboardPage({super.key});

  @override
  State<SellerDashboardPage> createState() => _SellerDashboardPageState();
}

class _SellerDashboardPageState extends State<SellerDashboardPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  Future<void> _loadDashboard() async {
    final auth = context.read<AuthProvider>();
    String? tenantId = auth.user?.tenantId;
    if (tenantId == null || tenantId.isEmpty) {
      tenantId = await FirestoreService().getCurrentTenantId();
    }
    if (tenantId != null && mounted) {
      context.read<DashboardProvider>().loadStats(tenantId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Dashboard'),
      ),
      body: Consumer2<AuthProvider, DashboardProvider>(
        builder: (context, authProvider, dashboardProvider, _) {
          final stats = dashboardProvider.stats;

          return RefreshIndicator(
            onRefresh: _loadDashboard,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Bienvenido Vendedor',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text('Usuario: ${authProvider.user?.email ?? 'N/A'}'),
                          if (authProvider.user?.name != null)
                            Text('${authProvider.user!.name}', style: TextStyle(color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (dashboardProvider.isLoading && dashboardProvider.stats == null)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      children: [
                        _StatCard(
                          title: 'Mis Leads',
                          value: '${stats?.totalLeads ?? 0}',
                          icon: Icons.people,
                          onTap: () => context.go('/seller/leads'),
                        ),
                        _StatCard(
                          title: 'Ventas',
                          value: '${stats?.totalSales ?? 0}',
                          icon: Icons.shopping_cart,
                          onTap: () => context.go('/seller/sales'),
                        ),
                        _StatCard(
                          title: 'Citas hoy',
                          value: '${stats?.appointmentsToday ?? 0}',
                          icon: Icons.calendar_today,
                          onTap: () => context.go('/seller/appointments'),
                        ),
                        _StatCard(
                          title: 'Mensajes',
                          value: '${stats?.unreadMessages ?? 0}',
                          icon: Icons.message,
                          onTap: () => context.go('/seller/messages'),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final VoidCallback? onTap;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final child = Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(title, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
    if (onTap != null) {
      return InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: child);
    }
    return child;
  }
}

