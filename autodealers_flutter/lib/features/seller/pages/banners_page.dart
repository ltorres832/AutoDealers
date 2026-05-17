// Página de Banners del Seller
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/banners_provider.dart';
import '../widgets/seller_drawer.dart';

class SellerBannersPage extends StatelessWidget {
  const SellerBannersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const SellerDrawer(),
      appBar: AppBar(
        title: const Text('Banners'),
      ),
      body: Consumer<BannersProvider>(
        builder: (context, bannersProvider, _) {
          if (bannersProvider.isLoading && bannersProvider.tenantBanners.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (bannersProvider.error != null) {
            return Center(
              child: Text('Error: ${bannersProvider.error}'),
            );
          }

          if (bannersProvider.tenantBanners.isEmpty) {
            return const Center(
              child: Text('No hay banners disponibles'),
            );
          }

          return ListView.builder(
            itemCount: bannersProvider.tenantBanners.length,
            itemBuilder: (context, index) {
              final banner = bannersProvider.tenantBanners[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: banner['imageUrl'] != null
                      ? Image.network(
                          banner['imageUrl'] as String,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return const Icon(Icons.image, size: 60);
                          },
                        )
                      : const Icon(Icons.image, size: 60),
                  title: Text(banner['title'] ?? 'Sin título'),
                  subtitle: Text('Estado: ${banner['status'] ?? 'unknown'}'),
                  trailing: Chip(
                    label: Text(banner['status'] ?? 'unknown'),
                  ),
                  onTap: () {
                    context.push('/seller/banners/${banner['id']}');
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}


