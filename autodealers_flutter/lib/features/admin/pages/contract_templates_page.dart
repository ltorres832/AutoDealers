// Página de Plantillas de Contratos (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/contracts_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';

class AdminContractTemplatesPage extends StatefulWidget {
  const AdminContractTemplatesPage({super.key});

  @override
  State<AdminContractTemplatesPage> createState() => _AdminContractTemplatesPageState();
}

class _AdminContractTemplatesPageState extends State<AdminContractTemplatesPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final contractsProvider = context.read<ContractsProvider>();
      if (authProvider.user?.tenantId != null) {
        contractsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plantillas de Contratos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/contract-templates/create'),
          ),
        ],
      ),
      body: Consumer<ContractsProvider>(
        builder: (context, contractsProvider, _) {
          if (contractsProvider.isLoading && contractsProvider.contracts.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (contractsProvider.error != null) {
            return Center(
              child: Text('Error: ${contractsProvider.error}'),
            );
          }

          // Filtrar solo plantillas (templates)
          final templates = contractsProvider.contracts.where((contract) {
            return contract['isTemplate'] == true;
          }).toList();

          if (templates.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.description, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text(
                    'No hay plantillas de contratos',
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => context.push('/admin/contract-templates/create'),
                    child: const Text('Crear Plantilla'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: templates.length,
            itemBuilder: (context, index) {
              final template = templates[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: const Icon(Icons.description, size: 40),
                  title: Text(template['title'] ?? 'Sin título'),
                  subtitle: Text(template['description'] ?? 'Sin descripción'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () {
                          context.push('/admin/contract-templates/${template['id']}/edit');
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () async {
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Eliminar Plantilla'),
                              content: const Text('¿Estás seguro de eliminar esta plantilla?'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context, false),
                                  child: const Text('Cancelar'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, true),
                                  child: const Text('Eliminar'),
                                ),
                              ],
                            ),
                          );
                          if (confirmed == true) {
                            final ok = await contractsProvider.deleteContract(template['id'] as String);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(ok ? 'Plantilla eliminada' : 'Error: ${contractsProvider.error}')),
                              );
                            }
                          }
                        },
                      ),
                    ],
                  ),
                  onTap: () {
                    context.push('/admin/contract-templates/${template['id']}');
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}


