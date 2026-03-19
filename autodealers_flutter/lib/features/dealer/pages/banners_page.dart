// Página de Banners del Dealer
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/banners_provider.dart';
import '../widgets/dealer_drawer.dart';

class DealerBannersPage extends StatelessWidget {
  const DealerBannersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DealerDrawer(),
      appBar: AppBar(
        title: const Text('Banners'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/dealer/banners/purchase'),
          ),
        ],
      ),
      body: Consumer<BannersProvider>(
        builder: (context, bannersProvider, _) {
          if (bannersProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (bannersProvider.tenantBanners.isEmpty) {
            return const Center(child: Text('No hay banners'));
          }

          return ListView.builder(
            itemCount: bannersProvider.tenantBanners.length,
            itemBuilder: (context, index) {
              final banner = bannersProvider.tenantBanners[index];
              return Card(
                margin: const EdgeInsets.all(8),
                child: ListTile(
                  leading: banner['imageUrl'] != null
                      ? Image.network(banner['imageUrl'] as String, width: 60, height: 60, fit: BoxFit.cover)
                      : const Icon(Icons.image),
                  title: Text(banner['title'] ?? 'Sin título'),
                  subtitle: Text('Estado: ${banner['status'] ?? 'unknown'}'),
                  onTap: () => context.push('/dealer/banners/${banner['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


