// Página de Vendedores del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerSellersPage extends StatefulWidget {
  const DealerSellersPage({super.key});

  @override
  State<DealerSellersPage> createState() => _DealerSellersPageState();
}

class _DealerSellersPageState extends State<DealerSellersPage> {
  final _searchController = TextEditingController();
  String _statusFilter = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Vendedores'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/sellers/create'),
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
                  ],
                  onChanged: (value) => setState(() => _statusFilter = value ?? ''),
                ),
              ],
            ),
          ),
          // Lista de vendedores
          Expanded(
            child: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                // Nota: Esta funcionalidad requiere una Cloud Function
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.person, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text(
                        'Gestión de Vendedores',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Esta funcionalidad requiere una Cloud Function\npara listar y gestionar vendedores.',
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
                        child: const Text('Cargar Vendedores'),
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


