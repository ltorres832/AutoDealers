// Página de FI (Financiamiento e Seguros) del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/fi_provider.dart';
import '../../../core/presentation/providers/auth_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerFIPage extends StatefulWidget {
  const SellerFIPage({super.key});

  @override
  State<SellerFIPage> createState() => _SellerFIPageState();
}

class _SellerFIPageState extends State<SellerFIPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      final fiProvider = context.read<FIProvider>();
      if (authProvider.user?.tenantId != null) {
        fiProvider.initialize(authProvider.user!.tenantId, authProvider.user!.role.name);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Financiamiento e Seguros'),
      ),
      body: Consumer<FIProvider>(
        builder: (context, fiProvider, _) {
          if (fiProvider.fiRequests.isEmpty) {
            return const Center(child: Text('No hay solicitudes'));
          }

          return ListView.builder(
            itemCount: fiProvider.fiRequests.length,
            itemBuilder: (context, index) {
              final request = fiProvider.fiRequests[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  title: Text('Cliente: ${request['customerName'] ?? 'N/A'}'),
                  subtitle: Text('Estado: ${request['status'] ?? 'unknown'}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/seller/fi/requests/${request['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


