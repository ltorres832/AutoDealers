// Página de Archivos de Cliente del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/customer_files_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerCustomerFilesPage extends StatelessWidget {
  const SellerCustomerFilesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Archivos de Cliente'),
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
              return ListTile(
                title: Text(file['fileName'] ?? 'Sin nombre'),
                subtitle: Text(file['type'] ?? ''),
                trailing: const Icon(Icons.download),
              );
            },
          );
        },
      ),
    );
  }
}


