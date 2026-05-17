// Página de Solicitudes Multi-Dealer (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminMultiDealerRequestsPage extends StatefulWidget {
  const AdminMultiDealerRequestsPage({super.key});

  @override
  State<AdminMultiDealerRequestsPage> createState() => _AdminMultiDealerRequestsPageState();
}

class _AdminMultiDealerRequestsPageState extends State<AdminMultiDealerRequestsPage> {
  String _statusFilter = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Solicitudes Multi-Dealer'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Cargar solicitudes: configure la Cloud Function o API de admin para multi-dealer.',
                  ),
                  duration: Duration(seconds: 4),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: DropdownButtonFormField<String>(
              initialValue: _statusFilter.isEmpty ? null : _statusFilter,
              decoration: const InputDecoration(
                labelText: 'Estado',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'pending', child: Text('Pendiente')),
                DropdownMenuItem(value: 'approved', child: Text('Aprobada')),
                DropdownMenuItem(value: 'rejected', child: Text('Rechazada')),
              ],
              onChanged: (value) => setState(() => _statusFilter = value ?? ''),
            ),
          ),
          // Lista de solicitudes
          Expanded(
            child: Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                // Nota: Esta funcionalidad requiere una Cloud Function de admin
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.business_center, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text(
                        'Solicitudes Multi-Dealer',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Esta funcionalidad requiere una Cloud Function\nde administración para gestionar solicitudes multi-dealer.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Cuando exista la Cloud Function getMultiDealerRequests (o API GET /api/admin/multi-dealer-requests), aquí se cargarán las solicitudes.',
                              ),
                              duration: Duration(seconds: 5),
                            ),
                          );
                        },
                        child: const Text('Cargar Solicitudes'),
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


