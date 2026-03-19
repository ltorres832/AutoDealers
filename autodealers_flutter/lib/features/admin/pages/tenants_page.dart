// Página de Gestión de Tenants/Dealers (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminTenantsPage extends StatefulWidget {
  const AdminTenantsPage({super.key});

  @override
  State<AdminTenantsPage> createState() => _AdminTenantsPageState();
}

class _AdminTenantsPageState extends State<AdminTenantsPage> {
  final _searchController = TextEditingController();
  String _statusFilter = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadTenants();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestión de Tenants'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/tenants/create'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Buscar',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 16),
                DropdownButton<String>(
                  value: _statusFilter.isEmpty ? null : _statusFilter,
                  hint: const Text('Estado'),
                  items: const [
                    DropdownMenuItem(value: 'active', child: Text('Activo')),
                    DropdownMenuItem(value: 'inactive', child: Text('Inactivo')),
                    DropdownMenuItem(value: 'suspended', child: Text('Suspendido')),
                  ],
                  onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                ),
              ],
            ),
          ),
          // Lista de tenants
          Expanded(
            child: Consumer<AdminProvider>(
              builder: (context, adminProvider, _) {
                if (adminProvider.isLoading && adminProvider.tenants.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (adminProvider.error != null) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error, size: 64, color: Colors.red),
                        const SizedBox(height: 16),
                        Text('Error: ${adminProvider.error}'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => adminProvider.loadTenants(),
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  );
                }

                var filteredTenants = adminProvider.tenants;
                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredTenants = filteredTenants.where((tenant) {
                    return (tenant['name'] ?? '').toString().toLowerCase().contains(searchLower) ||
                        (tenant['subdomain'] ?? '').toString().toLowerCase().contains(searchLower);
                  }).toList();
                }

                if (_statusFilter.isNotEmpty) {
                  filteredTenants = filteredTenants.where((tenant) {
                    return tenant['status'] == _statusFilter;
                  }).toList();
                }

                if (filteredTenants.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.business, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text('No hay tenants disponibles'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => adminProvider.loadTenants(),
                          child: const Text('Cargar Tenants'),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: filteredTenants.length,
                  itemBuilder: (context, index) {
                    final tenant = filteredTenants[index];
                    final stats = tenant['stats'] as Map<String, dynamic>?;
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).primaryColor,
                          child: const Icon(Icons.business, color: Colors.white),
                        ),
                        title: Text(tenant['name'] ?? 'Sin nombre'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${tenant['subdomain'] ?? 'Sin subdominio'} • ${tenant['type'] ?? 'unknown'}'),
                            if (stats != null)
                              Text(
                                'Usuarios: ${stats['users']} • Vehículos: ${stats['vehicles']} • Leads: ${stats['leads']}',
                                style: const TextStyle(fontSize: 12),
                              ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Chip(
                              label: Text(tenant['status'] ?? 'unknown'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: () {
                                adminProvider.selectTenant(tenant);
                                context.push('/admin/tenants/${tenant['id']}/edit');
                              },
                            ),
                          ],
                        ),
                        onTap: () {
                          adminProvider.selectTenant(tenant);
                          context.push('/admin/tenants/${tenant['id']}');
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}


