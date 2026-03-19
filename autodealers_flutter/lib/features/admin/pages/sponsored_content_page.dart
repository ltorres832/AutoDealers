// Página de Gestión de Contenido Patrocinado (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminSponsoredContentPage extends StatefulWidget {
  const AdminSponsoredContentPage({super.key});

  @override
  State<AdminSponsoredContentPage> createState() => _AdminSponsoredContentPageState();
}

class _AdminSponsoredContentPageState extends State<AdminSponsoredContentPage> {
  String _statusFilter = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contenido Patrocinado'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/sponsored-content/create'),
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
                    DropdownMenuItem(value: 'pending', child: Text('Pendiente')),
                    DropdownMenuItem(value: 'approved', child: Text('Aprobado')),
                    DropdownMenuItem(value: 'rejected', child: Text('Rechazado')),
                    DropdownMenuItem(value: 'active', child: Text('Activo')),
                  ],
                  onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                ),
              ],
            ),
          ),
          // Lista de contenido patrocinado
          Expanded(
            child: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                // Nota: Esta funcionalidad requiere una Cloud Function de admin
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.article, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text(
                        'Gestión de Contenido Patrocinado',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Esta funcionalidad requiere una Cloud Function\nde administración para gestionar contenido patrocinado.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Funcionalidad en desarrollo - Cloud Function requerida'),
                            ),
                          );
                        },
                        child: const Text('Cargar Contenido'),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}


