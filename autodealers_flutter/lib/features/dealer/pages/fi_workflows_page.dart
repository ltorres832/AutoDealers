// Página de Workflows FI del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/workflows_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerFIWorkflowsPage extends StatefulWidget {
  const DealerFIWorkflowsPage({super.key});

  @override
  State<DealerFIWorkflowsPage> createState() => _DealerFIWorkflowsPageState();
}

class _DealerFIWorkflowsPageState extends State<DealerFIWorkflowsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final workflowsProvider = context.read<WorkflowsProvider>();
      if (authProvider.user?.tenantId != null) {
        workflowsProvider.initialize(authProvider.user!.tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Workflows FI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              context.push('/workflows/create?type=fi');
            },
          ),
        ],
      ),
      body: Consumer<WorkflowsProvider>(
        builder: (context, workflowsProvider, _) {
          if (workflowsProvider.isLoading && workflowsProvider.workflows.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (workflowsProvider.error != null) {
            return Center(
              child: Text('Error: ${workflowsProvider.error}'),
            );
          }

          // Filtrar workflows relacionados con FI
          final fiWorkflows = workflowsProvider.workflows.where((workflow) {
            return workflow['type'] == 'fi' || workflow['name']?.toLowerCase().contains('fi') == true;
          }).toList();

          if (fiWorkflows.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.work, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text(
                    'No hay workflows FI configurados',
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        context.push('/workflows/create?type=fi');
                      },
                      child: const Text('Crear Workflow FI'),
                    ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: fiWorkflows.length,
            itemBuilder: (context, index) {
              final workflow = fiWorkflows[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: const Icon(Icons.work, size: 40),
                  title: Text(workflow['name'] ?? 'Sin nombre'),
                  subtitle: Text(workflow['description'] ?? 'Sin descripción'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Switch(
                        value: workflow['active'] == true,
                        onChanged: (value) async {
                          final ok = await workflowsProvider.updateWorkflow(
                            workflowId: workflow['id'] as String,
                            updates: {'active': value},
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(ok ? 'Workflow actualizado' : 'Error: ${workflowsProvider.error}')),
                            );
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () {
                          context.push('/dealer/fi/workflows/${workflow['id']}');
                        },
                      ),
                    ],
                  ),
                  onTap: () {
                    context.push('/dealer/fi/workflows/${workflow['id']}');
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


