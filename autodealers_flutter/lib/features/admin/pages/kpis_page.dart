// Página de KPIs (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/reports_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminKPIsPage extends StatefulWidget {
  const AdminKPIsPage({super.key});

  @override
  State<AdminKPIsPage> createState() => _AdminKPIsPageState();
}

class _AdminKPIsPageState extends State<AdminKPIsPage> {
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now().subtract(const Duration(days: 30));
    _endDate = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final reportsProvider = context.read<ReportsProvider>();
      if (authProvider.user?.tenantId != null) {
        reportsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KPIs'),
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
            // Selector de fechas
            Row(
              children: [
                Expanded(
                  child: ListTile(
                    title: const Text('Fecha Inicio'),
                    subtitle: Text(_startDate == null ? 'Seleccionar' : _formatDate(_startDate!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _startDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) setState(() => _startDate = picked);
                    },
                  ),
                ),
                Expanded(
                  child: ListTile(
                    title: const Text('Fecha Fin'),
                    subtitle: Text(_endDate == null ? 'Seleccionar' : _formatDate(_endDate!)),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _endDate ?? DateTime.now(),
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now(),
                      );
                      if (picked != null) setState(() => _endDate = picked);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // KPIs Cards
            Consumer<ReportsProvider>(
              builder: (context, reportsProvider, _) {
                if (reportsProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  children: [
                    _buildKPICard(
                      'Total Leads',
                      '${reportsProvider.leadsReport?['total'] ?? 0}',
                      Icons.people,
                      Colors.blue,
                    ),
                    _buildKPICard(
                      'Leads Nuevos',
                      '${reportsProvider.leadsReport?['new'] ?? 0}',
                      Icons.person_add,
                      Colors.green,
                    ),
                    _buildKPICard(
                      'Total Ventas',
                      '${reportsProvider.salesReport?['total'] ?? 0}',
                      Icons.shopping_cart,
                      Colors.orange,
                    ),
                    _buildKPICard(
                      'Ingresos',
                      '\$${reportsProvider.salesReport?['revenue'] ?? 0}',
                      Icons.attach_money,
                      Colors.purple,
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

  Widget _buildKPICard(String title, String value, IconData icon, Color color) {
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

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}


