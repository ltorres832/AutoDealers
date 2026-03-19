// Página de Gestión de Vendedores (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminSellersPage extends StatefulWidget {
  const AdminSellersPage({super.key});

  @override
  State<AdminSellersPage> createState() => _AdminSellersPageState();
}

class _AdminSellersPageState extends State<AdminSellersPage> {
  final _searchController = TextEditingController();
  String _statusFilter = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadSellers();
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
        title: const Text('Vendedores'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/sellers/create'),
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
          // Lista de vendedores
          Expanded(
            child: Consumer<AdminProvider>(
              builder: (context, adminProvider, _) {
                if (adminProvider.isLoading && adminProvider.sellers.isEmpty) {
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
                          onPressed: () => adminProvider.loadSellers(),
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  );
                }

                var filteredSellers = adminProvider.sellers;
                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredSellers = filteredSellers.where((seller) {
                    return (seller['name'] ?? '').toString().toLowerCase().contains(searchLower) ||
                        (seller['email'] ?? '').toString().toLowerCase().contains(searchLower);
                  }).toList();
                }

                if (_statusFilter.isNotEmpty) {
                  filteredSellers = filteredSellers.where((seller) {
                    return seller['status'] == _statusFilter;
                  }).toList();
                }

                if (filteredSellers.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.person, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text('No hay vendedores disponibles'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => adminProvider.loadSellers(),
                          child: const Text('Cargar Vendedores'),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: filteredSellers.length,
                  itemBuilder: (context, index) {
                    final seller = filteredSellers[index];
                    final stats = seller['stats'] as Map<String, dynamic>?;
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text((seller['name'] ?? 'S')[0].toString().toUpperCase()),
                        ),
                        title: Text(seller['name'] ?? 'Sin nombre'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${seller['email'] ?? 'Sin email'} • ${seller['tenantId'] ?? 'Sin tenant'}'),
                            if (stats != null)
                              Text(
                                'Leads: ${stats['leads']} • Ventas: ${stats['sales']} • Ingresos: \$${stats['revenue']?.toStringAsFixed(2) ?? '0.00'}',
                                style: const TextStyle(fontSize: 12),
                              ),
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Chip(
                              label: Text(seller['status'] ?? 'unknown'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: () {
                                adminProvider.selectSeller(seller);
                                context.push('/admin/sellers/${seller['id']}/edit');
                              },
                            ),
                          ],
                        ),
                        onTap: () {
                          adminProvider.selectSeller(seller);
                          context.push('/admin/sellers/${seller['id']}');
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


