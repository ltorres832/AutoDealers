// Página de Gestión de Membresías (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/billing_provider.dart';

class AdminMembershipsPage extends StatefulWidget {
  const AdminMembershipsPage({super.key});

  @override
  State<AdminMembershipsPage> createState() => _AdminMembershipsPageState();
}

class _AdminMembershipsPageState extends State<AdminMembershipsPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BillingProvider>().loadMemberships();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestión de Membresías'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/memberships/create'),
          ),
        ],
      ),
      body: Consumer<BillingProvider>(
        builder: (context, billingProvider, _) {
          if (billingProvider.isLoading && billingProvider.memberships.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (billingProvider.error != null) {
            return Center(
              child: Text('Error: ${billingProvider.error}'),
            );
          }

          if (billingProvider.memberships.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.card_membership, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text(
                    'No hay membresías disponibles',
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      context.push('/admin/memberships/create');
                    },
                    child: const Text('Crear Membresía'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            itemCount: billingProvider.memberships.length,
            itemBuilder: (context, index) {
              final membership = billingProvider.memberships[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor,
                    child: const Icon(Icons.card_membership, color: Colors.white),
                  ),
                  title: Text(membership['name'] ?? 'Sin nombre'),
                  subtitle: Text(
                    '${membership['price'] ?? 0} ${membership['currency'] ?? 'USD'}/${membership['billingPeriod'] ?? 'mes'}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Chip(
                        label: Text(membership['type'] ?? 'unknown'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/memberships/${membership['id']}/edit'),
                      ),
                    ],
                  ),
                  onTap: () => context.push('/admin/memberships/${membership['id']}/edit'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


