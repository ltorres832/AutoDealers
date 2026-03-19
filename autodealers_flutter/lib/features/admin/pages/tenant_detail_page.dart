// Página de Detalle de Tenant (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminTenantDetailPage extends StatefulWidget {
  final String tenantId;

  const AdminTenantDetailPage({super.key, required this.tenantId});

  @override
  State<AdminTenantDetailPage> createState() => _AdminTenantDetailPageState();
}

class _AdminTenantDetailPageState extends State<AdminTenantDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadTenant(widget.tenantId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle de Tenant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => context.push('/admin/tenants/${widget.tenantId}/edit'),
          ),
        ],
      ),
      body: Consumer<AdminProvider>(
        builder: (context, adminProvider, _) {
          if (adminProvider.isLoading && adminProvider.selectedTenant == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (adminProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${adminProvider.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => adminProvider.loadTenant(widget.tenantId),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          final t = adminProvider.selectedTenant;
          if (t == null) {
            return const Center(child: Text('Tenant no encontrado'));
          }
          final users = t['users'] as List? ?? [];
          final vehicles = t['vehicles'] as List? ?? [];
          final leads = t['leads'] as List? ?? [];
          final sales = t['sales'] as List? ?? [];
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t['name'] ?? 'Sin nombre', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text('Subdominio: ${t['subdomain'] ?? '-'}'),
                        Text('Tipo: ${t['type'] ?? '-'}'),
                        Text('Estado: ${t['status'] ?? '-'}'),
                        if (t['description'] != null) Text('Descripción: ${t['description']}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Resumen', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text('Usuarios: ${users.length}'),
                        Text('Vehículos: ${vehicles.length}'),
                        Text('Leads: ${leads.length}'),
                        Text('Ventas: ${sales.length}'),
                      ],
                    ),
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


