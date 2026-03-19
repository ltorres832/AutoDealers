// Página de Workflows del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/workflows_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerWorkflowsPage extends StatelessWidget {
  const DealerWorkflowsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Workflows'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/workflows/create'),
          ),
        ],
      ),
      body: Consumer<WorkflowsProvider>(
        builder: (context, workflowsProvider, _) {
          if (workflowsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (workflowsProvider.workflows.isEmpty) {
            return const Center(child: Text('No hay workflows'));
          }

          return ListView.builder(
            itemCount: workflowsProvider.workflows.length,
            itemBuilder: (context, index) {
              final workflow = workflowsProvider.workflows[index];
              return ListTile(
                title: Text(workflow['name'] ?? 'Sin nombre'),
                subtitle: Text(workflow['description'] ?? ''),
                trailing: IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => context.push('/dealer/workflows/${workflow['id']}/edit'),
                ),
                onTap: () => context.push('/dealer/workflows/${workflow['id']}'),
              );
            },
          );
        },
      ),
    );
  }
}


