// Página de Workflows del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/workflows_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerWorkflowsPage extends StatelessWidget {
  const SellerWorkflowsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Workflows'),
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
                onTap: () => context.push('/seller/workflows/${workflow['id']}'),
              );
            },
          );
        },
      ),
    );
  }
}


