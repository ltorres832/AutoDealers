// Página de Estadísticas Globales (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reports_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminGlobalStatsPage extends StatefulWidget {
  const AdminGlobalStatsPage({super.key});

  @override
  State<AdminGlobalStatsPage> createState() => _AdminGlobalStatsPageState();
}

class _AdminGlobalStatsPageState extends State<AdminGlobalStatsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final reportsProvider = context.read<ReportsProvider>();
      if (authProvider.user?.tenantId != null) {
        reportsProvider.initialize(authProvider.user!.tenantId);
        reportsProvider.generateLeadsReport();
        reportsProvider.generateSalesReport();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Estadísticas Globales'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final authProvider = context.read<AuthProvider>();
              final reportsProvider = context.read<ReportsProvider>();
              if (authProvider.user?.tenantId != null) {
                reportsProvider.generateLeadsReport();
                reportsProvider.generateSalesReport();
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Consumer<ReportsProvider>(
              builder: (context, reportsProvider, _) {
                if (reportsProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Resumen General',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      children: [
                        _buildStatCard(
                          'Total Leads',
                          '${reportsProvider.leadsReport?['total'] ?? 0}',
                          Icons.people,
                          Colors.blue,
                        ),
                        _buildStatCard(
                          'Leads Nuevos',
                          '${reportsProvider.leadsReport?['new'] ?? 0}',
                          Icons.person_add,
                          Colors.green,
                        ),
                        _buildStatCard(
                          'Leads Contactados',
                          '${reportsProvider.leadsReport?['contacted'] ?? 0}',
                          Icons.phone,
                          Colors.orange,
                        ),
                        _buildStatCard(
                          'Leads Calificados',
                          '${reportsProvider.leadsReport?['qualified'] ?? 0}',
                          Icons.check_circle,
                          Colors.purple,
                        ),
                        _buildStatCard(
                          'Total Ventas',
                          '${reportsProvider.salesReport?['total'] ?? 0}',
                          Icons.shopping_cart,
                          Colors.teal,
                        ),
                        _buildStatCard(
                          'Ingresos Totales',
                          '\$${reportsProvider.salesReport?['revenue'] ?? 0}',
                          Icons.attach_money,
                          Colors.indigo,
                        ),
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(title),
          ],
        ),
      ),
    );
  }
}


