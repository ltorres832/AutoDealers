// Página de Dealers Asociados del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

void _showRequestAssociationDialog(BuildContext context) {
  final controller = TextEditingController();
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Solicitar asociación'),
      content: TextField(
        controller: controller,
        decoration: const InputDecoration(
          labelText: 'Email o ID del dealer',
          hintText: 'ejemplo@dealer.com',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () {
            Navigator.pop(ctx);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Solicitud enviada. Pendiente de aprobación del otro dealer.')),
            );
          },
          child: const Text('Enviar'),
        ),
      ],
    ),
  );
}

class DealerDealersPage extends StatefulWidget {
  const DealerDealersPage({super.key});

  @override
  State<DealerDealersPage> createState() => _DealerDealersPageState();
}

class _DealerDealersPageState extends State<DealerDealersPage> {
  final _searchController = TextEditingController();

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
        title: const Text('Dealers Asociados'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showRequestAssociationDialog(context),
          ),
        ],
      ),
      body: Column(
        children: [
          // Búsqueda
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                labelText: 'Buscar Dealer',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          // Lista de dealers asociados
          Expanded(
            child: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                // Nota: Esta funcionalidad requiere una Cloud Function
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.business, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text(
                        'Dealers Asociados',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Esta funcionalidad requiere una Cloud Function\npara gestionar asociaciones entre dealers.',
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
                        child: const Text('Cargar Dealers'),
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


