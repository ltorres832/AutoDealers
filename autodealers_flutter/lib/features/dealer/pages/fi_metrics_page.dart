// Página de Métricas FI del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/fi_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerFIMetricsPage extends StatefulWidget {
  const DealerFIMetricsPage({super.key});

  @override
  State<DealerFIMetricsPage> createState() => _DealerFIMetricsPageState();
}

class _DealerFIMetricsPageState extends State<DealerFIMetricsPage> {
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now().subtract(const Duration(days: 30));
    _endDate = DateTime.now();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final fiProvider = context.read<FIProvider>();
      if (authProvider.user?.tenantId != null) {
        fiProvider.initialize(authProvider.user!.tenantId, authProvider.user!.role.name);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Métricas FI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final authProvider = context.read<AuthProvider>();
              final fiProvider = context.read<FIProvider>();
              if (authProvider.user?.tenantId != null) {
                fiProvider.loadFIRequests();
                fiProvider.loadFIClients();
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
            // Métricas
            Consumer<FIProvider>(
              builder: (context, fiProvider, _) {
                if (fiProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                final totalRequests = fiProvider.fiRequests.length;
                final approvedRequests = fiProvider.fiRequests
                    .where((r) => r['status'] == 'approved')
                    .length;
                final pendingRequests = fiProvider.fiRequests
                    .where((r) => r['status'] == 'pending')
                    .length;
                final totalClients = fiProvider.fiClients.length;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Resumen FI',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 16),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      children: [
                        _buildMetricCard(
                          'Total Solicitudes',
                          '$totalRequests',
                          Icons.description,
                          Colors.blue,
                        ),
                        _buildMetricCard(
                          'Aprobadas',
                          '$approvedRequests',
                          Icons.check_circle,
                          Colors.green,
                        ),
                        _buildMetricCard(
                          'Pendientes',
                          '$pendingRequests',
                          Icons.pending,
                          Colors.orange,
                        ),
                        _buildMetricCard(
                          'Total Clientes',
                          '$totalClients',
                          Icons.people,
                          Colors.purple,
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

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
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
            Text(title, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}


