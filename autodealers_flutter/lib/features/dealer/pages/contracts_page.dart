// Página de Contratos del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/contracts_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerContractsPage extends StatelessWidget {
  const DealerContractsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Contratos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/contracts/create'),
          ),
        ],
      ),
      body: Consumer<ContractsProvider>(
        builder: (context, contractsProvider, _) {
          if (contractsProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (contractsProvider.contracts.isEmpty) {
            return const Center(child: Text('No hay contratos'));
          }

          return ListView.builder(
            itemCount: contractsProvider.contracts.length,
            itemBuilder: (context, index) {
              final contract = contractsProvider.contracts[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text(contract['title'] ?? 'Sin título'),
                  subtitle: Text('Estado: ${contract['status'] ?? 'unknown'}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/dealer/contracts/${contract['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


