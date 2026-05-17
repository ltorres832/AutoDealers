import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../../../core/presentation/providers/customer_files_provider.dart';
import '../../../core/utils/customer_file_helpers.dart';
import '../widgets/seller_drawer.dart';

class SellerCustomerFilesPage extends StatefulWidget {
  const SellerCustomerFilesPage({super.key});

  @override
  State<SellerCustomerFilesPage> createState() => _SellerCustomerFilesPageState();
}

class _SellerCustomerFilesPageState extends State<SellerCustomerFilesPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final tenantId = context.read<AuthProvider>().user?.tenantId;
      if (tenantId != null) {
        context.read<CustomerFilesProvider>().initialize(tenantId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Casos de Cliente'),
      ),
      body: Consumer<CustomerFilesProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'No se pudo sincronizar: ${provider.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          if (provider.files.isEmpty) {
            return const Center(child: Text('No hay casos de cliente'));
          }

          return ListView.builder(
            itemCount: provider.files.length,
            itemBuilder: (context, index) {
              final file = provider.files[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.folder_open),
                  title: Text(customerFileDisplayName(file)),
                  subtitle: Text(
                    '${customerFileStatusLabel(file['status']?.toString())} · '
                    'Expedición: ${customerFileExpeditionLabel(file)}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/seller/customer-files/${file['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
