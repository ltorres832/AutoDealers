// Página de Archivos de Cliente del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/customer_files_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerCustomerFilesPage extends StatelessWidget {
  const DealerCustomerFilesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Archivos de Cliente'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/customer-files/create'),
          ),
        ],
      ),
      body: Consumer<CustomerFilesProvider>(
        builder: (context, customerFilesProvider, _) {
          if (customerFilesProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (customerFilesProvider.files.isEmpty) {
            return const Center(child: Text('No hay archivos'));
          }

          return ListView.builder(
            itemCount: customerFilesProvider.files.length,
            itemBuilder: (context, index) {
              final file = customerFilesProvider.files[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: const Icon(Icons.folder),
                  title: Text(file['customerName'] ?? 'Sin nombre'),
                  subtitle: Text('Estado: ${file['status'] ?? 'unknown'}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/dealer/customer-files/${file['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


