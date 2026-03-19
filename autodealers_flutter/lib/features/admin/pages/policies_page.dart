// Página de Gestión de Políticas (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/policies_provider.dart';

class AdminPoliciesPage extends StatelessWidget {
  const AdminPoliciesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Políticas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/policies/create'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<PoliciesProvider>().initializePolicies(),
            tooltip: 'Inicializar Políticas por Defecto',
          ),
        ],
      ),
      body: Consumer<PoliciesProvider>(
        builder: (context, policiesProvider, _) {
          if (policiesProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (policiesProvider.policies.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No hay políticas'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => policiesProvider.initializePolicies(),
                    child: const Text('Inicializar Políticas por Defecto'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: policiesProvider.policies.length,
            itemBuilder: (context, index) {
              final policy = policiesProvider.policies[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: Icon(_getPolicyIcon(policy['type'])),
                  title: Text(policy['title'] ?? 'Sin título'),
                  subtitle: Text(policy['type'] ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => context.push('/admin/policies/${policy['id']}/edit'),
                  ),
                  onTap: () => context.push('/admin/policies/${policy['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _getPolicyIcon(String? type) {
    switch (type) {
      case 'privacy':
        return Icons.privacy_tip;
      case 'terms':
        return Icons.description;
      case 'refund':
        return Icons.money_off;
      default:
        return Icons.policy;
    }
  }
}


