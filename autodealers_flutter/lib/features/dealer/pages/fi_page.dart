// Página de FI (Financiamiento e Seguros) del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/fi_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerFIPage extends StatefulWidget {
  const DealerFIPage({super.key});

  @override
  State<DealerFIPage> createState() => _DealerFIPageState();
}

class _DealerFIPageState extends State<DealerFIPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final fiProvider = context.read<FIProvider>();
      if (authProvider.user?.tenantId != null) {
        fiProvider.initialize(authProvider.user!.tenantId, authProvider.user!.role.name);
      }
    });
  }

  Widget _buildMetricsTab(FIProvider fiProvider) {
    final totalRequests = fiProvider.fiRequests.length;
    final approvedRequests = fiProvider.fiRequests
        .where((r) => r['status'] == 'approved')
        .length;
    final pendingRequests = fiProvider.fiRequests
        .where((r) => r['status'] == 'pending')
        .length;
    final totalClients = fiProvider.fiClients.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Métricas FI',
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: DealerDrawer(),
      appBar: AppBar(
        title: const Text('Financiamiento e Seguros'),
      ),
      body: Consumer<FIProvider>(
        builder: (context, fiProvider, _) {
          return DefaultTabController(
            length: 3,
            child: Column(
              children: [
                const TabBar(
                  tabs: [
                    Tab(text: 'Solicitudes'),
                    Tab(text: 'Clientes'),
                    Tab(text: 'Métricas'),
                  ],
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      // Tab de Solicitudes
                      fiProvider.fiRequests.isEmpty
                          ? const Center(child: Text('No hay solicitudes'))
                          : ListView.builder(
                              itemCount: fiProvider.fiRequests.length,
                              itemBuilder: (context, index) {
                                final request = fiProvider.fiRequests[index];
                                return Card(
                                  margin: const EdgeInsets.all(8),
                                  child: ListTile(
                                    title: Text('Cliente: ${request['customerName'] ?? 'N/A'}'),
                                    subtitle: Text('Estado: ${request['status'] ?? 'unknown'}'),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => context.push('/dealer/fi/requests/${request['id']}'),
                                  ),
                                );
                              },
                            ),
                      // Tab de Clientes
                      fiProvider.fiClients.isEmpty
                          ? const Center(child: Text('No hay clientes'))
                          : ListView.builder(
                              itemCount: fiProvider.fiClients.length,
                              itemBuilder: (context, index) {
                                final client = fiProvider.fiClients[index];
                                return Card(
                                  margin: const EdgeInsets.all(8),
                                  child: ListTile(
                                    title: Text(client['name'] ?? 'Sin nombre'),
                                    subtitle: Text('Score: ${client['approvalScore'] ?? 'N/A'}'),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () => context.push('/dealer/fi/clients/${client['id']}'),
                                  ),
                                );
                              },
                            ),
                      // Tab de Métricas
                      _buildMetricsTab(fiProvider),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


