// Página de Gestión de Banners (Admin)
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../core/presentation/providers/banners_provider.dart';

class AdminBannersPage extends StatelessWidget {
  const AdminBannersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Banners Premium'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/admin/banners/create'),
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
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (banner['status'] == 'pending')
                        IconButton(
                          icon: const Icon(Icons.check),
                          onPressed: () => bannersProvider.approveBanner(banner['id'] as String),
                        ),
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => context.push('/admin/banners/${banner['id']}/edit'),
                      ),
                    ],
                  ),
                  onTap: () => context.push('/admin/banners/${banner['id']}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


