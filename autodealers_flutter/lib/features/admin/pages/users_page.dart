// Página de Gestión de Usuarios (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/admin_provider.dart';

class AdminUsersPage extends StatefulWidget {
  const AdminUsersPage({super.key});

  @override
  State<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends State<AdminUsersPage> {
  String _roleFilter = '';
  String _statusFilter = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().loadUsers();
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
        title: const Text('Gestión de Usuarios'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/users/create'),
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
                  value: _roleFilter.isEmpty ? null : _roleFilter,
                  hint: const Text('Rol'),
                  items: const [
                    DropdownMenuItem(value: 'admin', child: Text('Admin')),
                    DropdownMenuItem(value: 'dealer', child: Text('Dealer')),
                    DropdownMenuItem(value: 'seller', child: Text('Seller')),
                  ],
                  onChanged: (value) => setState(() => _roleFilter = value ?? ''),
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
          // Lista de usuarios
          Expanded(
            child: Consumer<AdminProvider>(
              builder: (context, adminProvider, _) {
                if (adminProvider.isLoading && adminProvider.users.isEmpty) {
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
                          onPressed: () => adminProvider.loadUsers(),
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  );
                }

                var filteredUsers = adminProvider.users;
                if (_searchController.text.isNotEmpty) {
                  final searchLower = _searchController.text.toLowerCase();
                  filteredUsers = filteredUsers.where((user) {
                    return (user['name'] ?? '').toString().toLowerCase().contains(searchLower) ||
                        (user['email'] ?? '').toString().toLowerCase().contains(searchLower);
                  }).toList();
                }

                if (filteredUsers.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.people, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        const Text('No hay usuarios disponibles'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => adminProvider.loadUsers(),
                          child: const Text('Cargar Usuarios'),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: filteredUsers.length,
                  itemBuilder: (context, index) {
                    final user = filteredUsers[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          child: Text((user['name'] ?? 'U')[0].toString().toUpperCase()),
                        ),
                        title: Text(user['name'] ?? 'Sin nombre'),
                        subtitle: Text('${user['email'] ?? 'Sin email'} • ${user['role'] ?? 'unknown'}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Chip(
                              label: Text(user['status'] ?? 'unknown'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: () {
                                adminProvider.selectUser(user);
                                context.push('/admin/users/${user['id']}/edit');
                              },
                            ),
                          ],
                        ),
                        onTap: () {
                          adminProvider.selectUser(user);
                          context.push('/admin/users/${user['id']}');
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


